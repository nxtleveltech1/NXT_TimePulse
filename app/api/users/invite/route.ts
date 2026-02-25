import { auth } from "@clerk/nextjs/server"
import { clerkClient } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { isAdminOrManager } from "@/lib/auth"
import { z } from "zod"

const inviteSchema = z.object({
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

  const parsed = inviteSchema.safeParse(body)
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
    const invitation = await clerk.organizations.createOrganizationInvitation({
      organizationId: org,
      emailAddress: email,
      role: clerkRole,
      expiresInDays: 7,
    })
    return NextResponse.json({
      id: invitation.id,
      email,
      role,
      status: invitation.status,
      message: `Invitation sent to ${email}`,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to invite"
    if (message.includes("already a member") || message.includes("already in")) {
      return NextResponse.json(
        { error: "User is already a member of this organization" },
        { status: 409 }
      )
    }
    if (message.includes("already invited") || message.includes("pending")) {
      return NextResponse.json(
        { error: "An invitation is already pending for this email" },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
