import { auth } from "@clerk/nextjs/server"
import { clerkClient } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { isAdminOrManager } from "@/lib/auth"
import { z } from "zod"

const addSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "manager", "worker"]).default("worker"),
})

const roleToClerk = {
  admin: "org:admin",
  manager: "org:manager",
  worker: "org:member",
} as const

export async function POST(req: Request) {
  const { userId, orgId, orgRole } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!isAdminOrManager(orgRole as string)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const org = orgId ?? "org_default"
  if (org === "org_default") {
    return NextResponse.json({ error: "No organization context" }, { status: 400 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = addSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { email, role } = parsed.data
  const clerkRole = roleToClerk[role]

  try {
    const clerk = await clerkClient()
    const { data: users } = await clerk.users.getUserList({
      emailAddress: [email],
      limit: 1,
    })
    if (!users.length) {
      return NextResponse.json(
        { error: "User not found. Use Invite to send an invitation instead." },
        { status: 404 }
      )
    }
    const targetUser = users[0]

    const { data: existing } = await clerk.organizations.getOrganizationMembershipList({
      organizationId: org,
      userId: [targetUser.id],
      limit: 1,
    })
    if (existing.length) {
      return NextResponse.json(
        { error: "User is already a member of this organization" },
        { status: 409 }
      )
    }

    await clerk.organizations.createOrganizationMembership({
      organizationId: org,
      userId: targetUser.id,
      role: clerkRole,
    })

    await prisma.user.upsert({
      where: { id: targetUser.id },
      create: {
        id: targetUser.id,
        email: targetUser.emailAddresses[0]?.emailAddress ?? email,
        orgId: org,
        role,
        firstName: targetUser.firstName ?? null,
        lastName: targetUser.lastName ?? null,
        status: "active",
        updatedAt: new Date(),
      },
      update: {
        orgId: org,
        role,
        status: "active",
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({
      id: targetUser.id,
      email,
      role,
      message: `Added ${email} to organization`,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to add user"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
