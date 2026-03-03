import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireCapability } from "@/lib/auth"
import { updateAssignmentSchema } from "@/lib/schemas/assignment"
import { createChangeRequest } from "@/lib/change-requests"
import { serializeForClient } from "@/lib/serialize"
import { checkDistributedRateLimit } from "@/lib/distributed-rate-limit"

function todayDate(): string {
  return new Date().toISOString().slice(0, 10)
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireCapability("assignments.write")
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const rateLimit = await checkDistributedRateLimit(`${auth.orgId}:assignments:${auth.userId}`, 150, 60_000)
  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "Rate limit exceeded", resetAt: rateLimit.resetAt },
      { status: 429 }
    )
  }

  const { id } = await params
  const existing = await prisma.projectAssignment.findFirst({
    where: { id, orgId: auth.orgId },
  })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = updateAssignmentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const data = parsed.data
  const critical =
    (data.startDate !== undefined && data.startDate < todayDate()) ||
    (data.endDate !== undefined && data.endDate !== null && data.endDate < todayDate())

  if (critical) {
    const requestRow = await createChangeRequest({
      orgId: auth.orgId,
      requestedById: auth.userId,
      changeType: "assignment_change",
      targetType: "project_assignment",
      targetId: id,
      payload: { operation: "update", assignmentId: id, data },
      criticalReason: "Backdated assignment change requires approval",
    })
    return NextResponse.json(
      {
        status: "pending_approval",
        changeRequestId: requestRow.id,
        message: "Backdated assignment update submitted for approval",
      },
      { status: 202 }
    )
  }

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.projectAssignment.update({
      where: { id },
      data: {
        ...(data.roleOnProject !== undefined ? { roleOnProject: data.roleOnProject } : {}),
        ...(data.allocationPct !== undefined ? { allocationPct: data.allocationPct } : {}),
        ...(data.startDate !== undefined ? { startDate: new Date(data.startDate) } : {}),
        ...(data.endDate !== undefined
          ? { endDate: data.endDate ? new Date(data.endDate) : null }
          : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        updatedById: auth.userId,
      },
    })

    await tx.projectAllocation.updateMany({
      where: { userId: existing.userId, projectId: existing.projectId },
      data: {
        ...(data.roleOnProject !== undefined ? { roleOnProject: data.roleOnProject } : {}),
        ...(data.startDate !== undefined ? { startDate: new Date(data.startDate) } : {}),
        ...(data.endDate !== undefined
          ? { endDate: data.endDate ? new Date(data.endDate) : null }
          : {}),
        ...(data.status !== undefined
          ? { isActive: data.status === "active" || data.status === "paused" }
          : {}),
      },
    })

    await tx.auditLog.create({
      data: {
        userId: auth.userId,
        action: "assignment.updated",
        entityType: "project_assignment",
        entityId: id,
        details: `Assignment updated: ${Object.keys(data).join(", ")}`,
      },
    })
    return next
  })

  return NextResponse.json(serializeForClient(updated))
}
