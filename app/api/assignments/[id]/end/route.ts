import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireCapability } from "@/lib/auth"
import { endAssignmentSchema } from "@/lib/schemas/assignment"
import { createChangeRequest } from "@/lib/change-requests"
import { serializeForClient } from "@/lib/serialize"
import { checkDistributedRateLimit } from "@/lib/distributed-rate-limit"

function todayDate(): string {
  return new Date().toISOString().slice(0, 10)
}

export async function POST(
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
  const parsed = endAssignmentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { endDate, reason } = parsed.data
  if (endDate < todayDate()) {
    const requestRow = await createChangeRequest({
      orgId: auth.orgId,
      requestedById: auth.userId,
      changeType: "assignment_change",
      targetType: "project_assignment",
      targetId: id,
      payload: { operation: "end", assignmentId: id, data: { endDate, reason } },
      criticalReason: "Retroactive assignment end requires approval",
    })
    return NextResponse.json(
      {
        status: "pending_approval",
        changeRequestId: requestRow.id,
        message: "Retroactive assignment end submitted for approval",
      },
      { status: 202 }
    )
  }

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.projectAssignment.update({
      where: { id },
      data: {
        endDate: new Date(endDate),
        status: "ended",
        updatedById: auth.userId,
      },
    })
    await tx.projectAllocation.updateMany({
      where: { userId: existing.userId, projectId: existing.projectId },
      data: {
        endDate: new Date(endDate),
        isActive: false,
      },
    })
    await tx.auditLog.create({
      data: {
        userId: auth.userId,
        action: "assignment.ended",
        entityType: "project_assignment",
        entityId: id,
        details: reason ?? `Assignment ended effective ${endDate}`,
      },
    })
    return next
  })

  return NextResponse.json(serializeForClient(updated))
}
