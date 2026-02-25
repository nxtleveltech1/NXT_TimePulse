import { auth } from "@clerk/nextjs/server"
import { clerkClient } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { isAdminOrManager } from "@/lib/auth"
import { z } from "zod"
import { randomBytes } from "crypto"

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

  try {
    const clerk = await clerkClient()
    const newUser = await clerk.users.createUser({
      emailAddress: [email],
      firstName,
      lastName,
      ...(phone?.trim() ? { phoneNumber: [phone.trim()] } : {}),
      password,
      skipPasswordChecks: true,
      skipLegalChecks: true,
      publicMetadata: { requirePasswordChange: true },
    })

    await clerk.organizations.createOrganizationMembership({
      organizationId: org,
      userId: newUser.id,
      role: clerkRole,
    })

    await prisma.user.upsert({
      where: { id: newUser.id },
      create: {
        id: newUser.id,
        email,
        orgId: org,
        role,
        firstName,
        lastName,
        phone: phone ?? null,
        status: "active",
        updatedAt: new Date(),
      },
      update: {
        orgId: org,
        role,
        firstName,
        lastName,
        phone: phone ?? null,
        status: "active",
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({
      id: newUser.id,
      email,
      firstName,
      lastName,
      role,
      temporaryPassword: password,
      message: "User created. Share the temporary password securely. User should change it on first login.",
    })
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("[POST /api/users/create]", err)
    }
    let message = "Failed to create user"
    if (err instanceof Error) {
      message = err.message
      // Extract Clerk API error details
      const clerkErr = err as { clerkError?: boolean; errors?: Array<{ message?: string; longMessage?: string }> }
      if (clerkErr.clerkError && Array.isArray(clerkErr.errors) && clerkErr.errors.length > 0) {
        const first = clerkErr.errors[0]
        message = first?.longMessage ?? first?.message ?? message
      }
    }
    if (message.includes("already exists") || message.includes("duplicate") || message.includes("form_identifier_exists")) {
      return NextResponse.json(
        { error: "A user with this email or phone already exists" },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
