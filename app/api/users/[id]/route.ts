import { auth } from "@clerk/nextjs/server"
import { clerkClient } from "@clerk/nextjs/server"
import { type UserLifecycleStatus } from "@/generated/prisma"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { requireCapability, requireAuth, isAdmin } from "@/lib/auth"
import { userUpdateSchema } from "@/lib/schemas/user"
import { createChangeRequest } from "@/lib/change-requests"
import { logLifecycleEvent } from "@/lib/lifecycle"
import { checkDistributedRateLimit } from "@/lib/distributed-rate-limit"
import { notifyOffboardRequest } from "@/lib/notifications"

const roleToClerk = {
  admin: "org:admin",
  manager: "org:manager",
  worker: "org:member",
} as const

const roleOrder = {
  worker: 1,
  manager: 2,
  admin: 3,
} as const

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await requireAuth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgId } = await auth()
  const { id } = await params

  if (id !== userId) {
    const { orgRole } = await auth()
    const { hasCapability } = await import("@/lib/auth")
    if (!hasCapability(orgRole ?? undefined, "users.read")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
  }

  const user = await prisma.user.findFirst({
    where: { id, ...(orgId ? { orgId } : {}) },
    include: {
      _count: { select: { timesheets: true, allocations: true, leaveRequests: true } },
    },
  })

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  return NextResponse.json(user)
}

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireCapability("users.write")
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const rateLimit = await checkDistributedRateLimit(`${access.orgId}:users:${access.userId}`, 120, 60_000)
  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "Rate limit exceeded", resetAt: rateLimit.resetAt },
      { status: 429 }
    )
  }

  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const org = access.orgId
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
  const updates: { role?: string; status?: UserLifecycleStatus } = {}
  if (role !== undefined) updates.role = role
  if (status !== undefined) updates.status = status

  const roleDowngrade =
    role !== undefined &&
    existing.role in roleOrder &&
    role in roleOrder &&
    roleOrder[role as keyof typeof roleOrder] < roleOrder[existing.role as keyof typeof roleOrder]
  const statusDowngrade =
    status !== undefined && ["suspended", "offboarded", "archived"].includes(status)

  // Managers: downgrades go through maker-checker. Admins: apply immediately.
  if ((roleDowngrade || statusDowngrade) && !isAdmin(access.orgRole)) {
    try {
      const requestRow = await createChangeRequest({
        orgId: org,
        requestedById: userId,
        changeType: "user_access_change",
        targetType: "user",
        targetId: id,
        payload: {
          operation: "user_update",
          userId: id,
          data: {
            ...(role !== undefined ? { role } : {}),
            ...(status !== undefined ? { status } : {}),
          },
        },
        criticalReason: "User access downgrade requires maker-checker approval",
      })
      return NextResponse.json(
        {
          status: "pending_approval",
          changeRequestId: requestRow.id,
          message: "User access change submitted for approval",
        },
        { status: 202 }
      )
    } catch (err) {
      console.error("[users PATCH] Failed to create change request:", err)
      const message = err instanceof Error ? err.message : "Failed to submit change request"
      return NextResponse.json({ error: message }, { status: 500 })
    }
  }

  const previous = { role: existing.role, status: existing.status }

  // Sync role to Clerk org membership before committing DB change
  if (role !== undefined) {
    try {
      const clerk = await clerkClient()
      await clerk.organizations.updateOrganizationMembership({
        organizationId: org,
        userId: id,
        role: roleToClerk[role as keyof typeof roleToClerk],
      })
    } catch (clerkErr) {
      console.error("[users PATCH] Clerk sync failed, aborting DB update:", clerkErr)
      return NextResponse.json(
        { error: "Failed to sync role with identity provider. No changes were saved." },
        { status: 502 }
      )
    }
  }

  const updated = await prisma.user.update({
    where: { id },
    data: updates,
  })

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
  if (status && status !== existing.status) {
    await logLifecycleEvent({
      orgId: org,
      userId: id,
      actorUserId: userId,
      eventType: status === "active" ? "activated" : status,
      metadata: { previousStatus: existing.status, nextStatus: status },
    }).catch(() => {})
  }
  if (role && role !== existing.role) {
    await logLifecycleEvent({
      orgId: org,
      userId: id,
      actorUserId: userId,
      eventType: "role_changed",
      metadata: { previousRole: existing.role, nextRole: role },
    }).catch(() => {})
  }

  return NextResponse.json(updated)
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireCapability("users.offboard")
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const rateLimit = await checkDistributedRateLimit(`${access.orgId}:users:${access.userId}`, 120, 60_000)
  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "Rate limit exceeded", resetAt: rateLimit.resetAt },
      { status: 429 }
    )
  }

  const org = access.orgId
  const userId = access.userId
  const { id } = await params

  if (id === userId) {
    return NextResponse.json(
      { error: "You cannot offboard yourself" },
      { status: 400 }
    )
  }

  const existing = await prisma.user.findFirst({
    where: { id, orgId: org },
  })
  if (!existing) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  if (existing.status === "offboarded" || existing.status === "archived") {
    return NextResponse.json(
      { error: "User is already offboarded" },
      { status: 409 }
    )
  }

  // Invited / suspended users with no data: immediate removal (no approval needed)
  if (existing.status === "invited" || existing.status === "suspended") {
    const counts = await prisma.user.findUnique({
      where: { id },
      select: {
        _count: { select: { timesheets: true, allocations: true } },
      },
    })
    const hasData = (counts?._count.timesheets ?? 0) > 0 || (counts?._count.allocations ?? 0) > 0

    if (!hasData) {
      const clerk = await clerkClient()
      try {
        await clerk.organizations.deleteOrganizationMembership({
          organizationId: org,
          userId: id,
        })
      } catch (e) {
        console.warn("[users DELETE] Clerk membership removal failed (may not exist):", e)
      }
      try {
        await clerk.users.deleteUser(id)
      } catch (e) {
        console.warn("[users DELETE] Clerk user deletion failed (may not exist):", e)
      }

      await prisma.user.delete({ where: { id } }).catch(() => {
        return prisma.user.update({
          where: { id },
          data: { status: "archived", offboardedAt: new Date() },
        })
      })

      await prisma.auditLog.create({
        data: {
          userId,
          action: "user.removed",
          entityType: "user",
          entityId: id,
          details: `User removed: ${existing.email ?? id} (was ${existing.status})`,
        },
      })

      return NextResponse.json({ success: true, status: "removed" })
    }
  }

  // Admin: execute offboard directly (no approval needed)
  if (isAdmin(access.orgRole)) {
    try {
      const effectiveDate = new Date()

      await prisma.projectAssignment.updateMany({
        where: { orgId: org, userId: id, status: { in: ["active", "paused"] } },
        data: { status: "ended", endDate: effectiveDate, updatedById: userId },
      })
      await prisma.projectAllocation.updateMany({
        where: { userId: id, project: { orgId: org } },
        data: { isActive: false, endDate: effectiveDate },
      })
      await prisma.user.update({
        where: { id },
        data: { status: "offboarded", offboardedAt: effectiveDate },
      })

      const clerk = await clerkClient()
      try {
        await clerk.organizations.deleteOrganizationMembership({
          organizationId: org,
          userId: id,
        })
      } catch (e) {
        console.warn("[users DELETE] Clerk membership removal failed:", e)
      }
      try {
        await clerk.users.deleteUser(id)
      } catch (e) {
        console.warn("[users DELETE] Clerk user deletion failed:", e)
      }

      await prisma.auditLog.create({
        data: {
          userId,
          action: "user.offboarded",
          entityType: "user",
          entityId: id,
          details: `User offboarded by admin: ${existing.email ?? id}`,
        },
      })
      await logLifecycleEvent({
        orgId: org,
        userId: id,
        actorUserId: userId,
        eventType: "offboarded",
        metadata: { reason: "Admin direct offboard", previousStatus: existing.status },
      }).catch(() => {})

      return NextResponse.json({ success: true, status: "removed" })
    } catch (err) {
      console.error("[users DELETE] Admin offboard failed:", err)
      const message = err instanceof Error ? err.message : "Failed to offboard user"
      return NextResponse.json({ error: message }, { status: 500 })
    }
  }

  // Manager: maker-checker offboard flow (requires admin approval)
  try {
    const requestRow = await createChangeRequest({
      orgId: org,
      requestedById: userId,
      changeType: "user_access_change",
      targetType: "user",
      targetId: id,
      payload: {
        operation: "offboard",
        userId: id,
        data: {
          reason: `Remove from org requested by ${userId}`,
          effectiveDate: new Date().toISOString().slice(0, 10),
        },
      },
      criticalReason: "User offboarding requires maker-checker approval",
    })

    await prisma.auditLog.create({
      data: {
        userId,
        action: "user.offboard_requested",
        entityType: "user",
        entityId: id,
        details: `Offboarding requested: ${existing.email ?? id}`,
      },
    })

    await notifyOffboardRequest({
      orgId: org,
      targetUserId: id,
      targetUserEmail: existing.email,
      requestedById: userId,
    }).catch(() => {})

    return NextResponse.json(
      {
        success: true,
        status: "pending_approval",
        changeRequestId: requestRow.id,
      },
      { status: 202 }
    )
  } catch (err) {
    console.error("[users DELETE] Failed to create offboard request:", err)
    const message = err instanceof Error ? err.message : "Failed to create offboard request"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
