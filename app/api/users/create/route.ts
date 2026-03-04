import { auth } from "@clerk/nextjs/server"
import { clerkClient } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { isAdminOrManager } from "@/lib/auth"
import { z } from "zod"
import { randomBytes } from "crypto"
import { logLifecycleEvent } from "@/lib/lifecycle"

const createSchema = z.object({
  firstName: z.string().min(1, "First name required"),
  lastName: z.string().min(1, "Last name required"),
  email: z.string().email(),
  phone: z.string().optional(),
  role: z.enum(["admin", "manager", "worker"]).default("worker"),
})

const roleToClerk = {
  admin: "org:admin",
  manager: "org:manager",
  worker: "org:member",
} as const

function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%"
  const bytes = randomBytes(16)
  let s = ""
  for (let i = 0; i < 16; i++) {
    s += chars[bytes[i]! % chars.length]
  }
  return s
}

/** Normalize local phone to E.164. Strips whitespace/dashes, converts leading 0 → +27 (ZA). */
function normalizePhone(raw: string | undefined): string | undefined {
  if (!raw?.trim()) return undefined
  const stripped = raw.replace(/[\s\-().]/g, "")
  if (stripped.startsWith("+")) return stripped
  if (stripped.startsWith("0")) return `+27${stripped.slice(1)}`
  if (/^\d{10,15}$/.test(stripped)) return `+${stripped}`
  return stripped
}

export async function POST(req: Request) {
  const { userId, orgId, orgRole } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!isAdminOrManager(orgRole as string)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const org = orgId ?? process.env.CLERK_ORG_ID ?? "org_default"
  if (org === "org_default") {
    return NextResponse.json(
      { error: "No organization context. Ensure you are in an organization." },
      { status: 400 }
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { firstName, lastName, email, phone, role } = parsed.data
  const password = generatePassword()
  const clerkRole = roleToClerk[role]

  const normalizedPhone = normalizePhone(phone)

  try {
    const clerk = await clerkClient()

    // Check if a Clerk user already exists with this email (e.g. previously offboarded)
    let clerkUser: Awaited<ReturnType<typeof clerk.users.createUser>> | null = null
    const { data: existingUsers } = await clerk.users.getUserList({
      emailAddress: [email],
    })

    if (existingUsers.length > 0) {
      clerkUser = existingUsers[0]!
      // Update their profile in case name/phone changed
      await clerk.users.updateUser(clerkUser.id, {
        firstName,
        lastName,
      })
    } else {
      clerkUser = await clerk.users.createUser({
        emailAddress: [email],
        firstName,
        lastName,
        password,
        skipPasswordChecks: true,
        skipLegalChecks: true,
        publicMetadata: { requirePasswordChange: true },
      })
    }

    // Add to org — if already a member, update their role instead
    try {
      await clerk.organizations.createOrganizationMembership({
        organizationId: org,
        userId: clerkUser.id,
        role: clerkRole,
      })
    } catch (memErr) {
      const msg = memErr instanceof Error ? memErr.message : ""
      if (msg.includes("already") || msg.includes("member")) {
        await clerk.organizations.updateOrganizationMembership({
          organizationId: org,
          userId: clerkUser.id,
          role: clerkRole,
        })
      } else {
        throw memErr
      }
    }

    await prisma.user.upsert({
      where: { id: clerkUser.id },
      create: {
        id: clerkUser.id,
        email,
        orgId: org,
        role,
        firstName,
        lastName,
        phone: normalizedPhone ?? null,
        status: "active",
        updatedAt: new Date(),
      },
      update: {
        orgId: org,
        role,
        firstName,
        lastName,
        phone: normalizedPhone ?? null,
        status: "active",
        updatedAt: new Date(),
      },
    })

    await logLifecycleEvent({
      orgId: org,
      userId: clerkUser.id,
      actorUserId: userId,
      eventType: "created",
      metadata: { source: "create_user", role, reused: existingUsers.length > 0 },
    }).catch(() => {})

    return NextResponse.json({
      id: clerkUser.id,
      email,
      firstName,
      lastName,
      role,
      message: existingUsers.length > 0
        ? "Existing account re-activated in this organization."
        : "User created. Ask the user to complete a password reset on first sign-in.",
    })
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("[POST /api/users/create]", err)
    }
    let message = "Failed to create user"
    if (err instanceof Error) {
      message = err.message
      const clerkErr = err as { clerkError?: boolean; errors?: Array<{ message?: string; longMessage?: string }> }
      if (clerkErr.clerkError && Array.isArray(clerkErr.errors) && clerkErr.errors.length > 0) {
        const first = clerkErr.errors[0]
        message = first?.longMessage ?? first?.message ?? message
      }
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
