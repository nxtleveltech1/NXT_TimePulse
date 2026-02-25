import { auth } from "@clerk/nextjs/server"
import { clerkClient } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { isAdminOrManager } from "@/lib/auth"
import { userUpdateSchema } from "@/lib/schemas/user"

const roleToClerk = {
  admin: "org:admin",
  manager: "org:manager",
  worker: "org:member",
} as const

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, orgId, orgRole } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!isAdminOrManager(orgRole as string)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const org = orgId ?? "org_default"
  const { id } = await params

  let body: unknown
  try {
    body = await _req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = userUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const existing = await prisma.user.findFirst({
    where: { id, orgId: org },
  })
  if (!existing) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const { role, status } = parsed.data
  const updates: { role?: string; status?: string } = {}
  if (role !== undefined) updates.role = role
  if (status !== undefined) updates.status = status

  const previous = { role: existing.role, status: existing.status }
  const updated = await prisma.user.update({
    where: { id },
    data: updates,
  })

  // Sync role to Clerk org membership
  if (role !== undefined && org !== "org_default") {
    try {
      const clerk = await clerkClient()
      await clerk.organizations.updateOrganizationMembership({
        organizationId: org,
        userId: id,
        role: roleToClerk[role as keyof typeof roleToClerk],
      })
    } catch {
      // DB updated; Clerk sync failed - log but don't fail
    }
  }

  await prisma.auditLog.create({
    data: {
      userId,
      action: "user.updated",
      entityType: "user",
      entityId: id,
      details: `User updated: ${[role, status].filter(Boolean).join(", ")}`,
      previousValue: JSON.stringify(previous),
      newValue: JSON.stringify({ role: updated.role, status: updated.status }),
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, orgId, orgRole } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!isAdminOrManager(orgRole as string)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const org = orgId ?? "org_default"
  const { id } = await params

  if (id === userId) {
    return NextResponse.json(
      { error: "You cannot remove yourself" },
      { status: 400 }
    )
  }

  const existing = await prisma.user.findFirst({
    where: { id, orgId: org },
  })
  if (!existing) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  // Remove from Clerk org
  if (org !== "org_default") {
    try {
      const clerk = await clerkClient()
      await clerk.organizations.deleteOrganizationMembership({
        organizationId: org,
        userId: id,
      })
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Failed to remove from organization" },
        { status: 500 }
      )
    }
  }

  // Deactivate in DB (keep for audit)
  await prisma.user.update({
    where: { id },
    data: { status: "inactive", orgId: "org_removed" },
  })

  await prisma.auditLog.create({
    data: {
      userId,
      action: "user.removed",
      entityType: "user",
      entityId: id,
      details: `User removed: ${existing.email ?? id}`,
    },
  })

  return NextResponse.json({ success: true })
}
