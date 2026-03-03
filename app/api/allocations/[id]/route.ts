import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { hasCapability, requireCapability } from "@/lib/auth"
import { serializeForClient } from "@/lib/serialize"
import { checkDistributedRateLimit } from "@/lib/distributed-rate-limit"

function todayDate() {
  return new Date().toISOString().slice(0, 10)
}

function deprecationHeaders(extra?: Record<string, string>) {
  return {
    Deprecation: "true",
    Sunset: "Tue, 30 Jun 2026 00:00:00 GMT",
    Link: '</api/assignments>; rel="successor-version"',
    ...extra,
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireCapability("assignments.write")
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const rateLimit = await checkDistributedRateLimit(`${auth.orgId}:allocations:${auth.userId}`, 150, 60_000)
  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "Rate limit exceeded", resetAt: rateLimit.resetAt },
      { status: 429 }
    )
  }
  const canWriteComp = hasCapability(auth.orgRole, "compensation.write")

  const { id } = await params
  const assignment = await prisma.projectAssignment.findFirst({
    where: { id, orgId: auth.orgId },
  })
  if (!assignment) return NextResponse.json({ error: "Not found" }, { status: 404 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const b = body as Record<string, unknown>
  const roleOnProject = typeof b.roleOnProject === "string" ? b.roleOnProject : undefined
  // Accept both billRate (new) and hourlyRate (legacy)
  const billRateRaw = b.billRate ?? b.hourlyRate
  const billRate = typeof billRateRaw === "number" ? billRateRaw : undefined
  const startDate = typeof b.startDate === "string" ? b.startDate : undefined
  const endDate = b.endDate === null ? null : typeof b.endDate === "string" ? b.endDate : undefined
  const isActive = typeof b.isActive === "boolean" ? b.isActive : undefined

  if (billRate !== undefined && !canWriteComp) {
    return NextResponse.json(
      { error: "Only admins can set compensation rates" },
      { status: 403 }
    )
  }

  const assignmentCritical =
    (startDate !== undefined && startDate < todayDate()) ||
    (endDate !== undefined && endDate !== null && endDate < todayDate())
  if (assignmentCritical) {
    const { createChangeRequest } = await import("@/lib/change-requests")
    const requestRow = await createChangeRequest({
      orgId: auth.orgId,
      requestedById: auth.userId,
      changeType: "assignment_change",
      targetType: "project_assignment",
      targetId: id,
      payload: {
        operation: "update",
        assignmentId: id,
        data: {
          ...(roleOnProject !== undefined ? { roleOnProject } : {}),
          ...(startDate !== undefined ? { startDate } : {}),
          ...(endDate !== undefined ? { endDate } : {}),
          ...(isActive !== undefined ? { status: isActive ? "active" : "ended" } : {}),
        },
      },
      criticalReason: "Backdated assignment update requires approval",
    })
    return NextResponse.json(
      { status: "pending_approval", changeRequestId: requestRow.id },
      { status: 202, headers: deprecationHeaders() }
    )
  }

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.projectAssignment.update({
      where: { id },
      data: {
        ...(roleOnProject !== undefined ? { roleOnProject } : {}),
        ...(startDate !== undefined ? { startDate: new Date(startDate) } : {}),
        ...(endDate !== undefined ? { endDate: endDate ? new Date(endDate) : null } : {}),
        ...(isActive !== undefined ? { status: isActive ? "active" : "ended" } : {}),
        updatedById: auth.userId,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        project: { select: { id: true, name: true } },
      },
    })

    await tx.projectAllocation.updateMany({
      where: { userId: assignment.userId, projectId: assignment.projectId },
      data: {
        ...(roleOnProject !== undefined ? { roleOnProject } : {}),
        ...(startDate !== undefined ? { startDate: new Date(startDate) } : {}),
        ...(endDate !== undefined ? { endDate: endDate ? new Date(endDate) : null } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
        ...(canWriteComp && billRate !== undefined ? { billRate } : {}),
      },
    })

    await tx.auditLog.create({
      data: {
        userId: auth.userId,
        action: "allocation.updated",
        entityType: "project_assignment",
        entityId: id,
        details: "Updated via compatibility allocations endpoint",
      },
    })
    return row
  })

  return NextResponse.json(
    serializeForClient({
      id: updated.id,
      userId: updated.userId,
      projectId: updated.projectId,
      roleOnProject: updated.roleOnProject,
      billRate: billRate ?? null,
      hourlyRate: billRate ?? 0,
      startDate: updated.startDate,
      endDate: updated.endDate,
      isActive: updated.status === "active" || updated.status === "paused",
      user: updated.user,
      project: updated.project,
    }),
    { headers: deprecationHeaders() }
  )
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireCapability("assignments.write")
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const rateLimit = await checkDistributedRateLimit(`${auth.orgId}:allocations:${auth.userId}`, 150, 60_000)
  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "Rate limit exceeded", resetAt: rateLimit.resetAt },
      { status: 429 }
    )
  }

  const { id } = await params
  const assignment = await prisma.projectAssignment.findFirst({
    where: { id, orgId: auth.orgId },
  })
  if (!assignment) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.$transaction(async (tx) => {
    await tx.projectAssignment.update({
      where: { id },
      data: { status: "ended", endDate: new Date(), updatedById: auth.userId },
    })
    await tx.projectAllocation.deleteMany({
      where: { userId: assignment.userId, projectId: assignment.projectId },
    })
    await tx.auditLog.create({
      data: {
        userId: auth.userId,
        action: "allocation.deleted",
        entityType: "project_assignment",
        entityId: id,
        details: "Deleted via compatibility allocations endpoint",
      },
    })
  })

  return NextResponse.json({ success: true }, { headers: deprecationHeaders() })
}
