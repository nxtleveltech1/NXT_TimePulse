import { Prisma, type AdminChangeRequest, type ChangeType } from "@/generated/prisma"
import { prisma } from "@/lib/prisma"
import { createAssignmentSchema, endAssignmentSchema, updateAssignmentSchema } from "@/lib/schemas/assignment"
import { createRateCardSchema, updateRateCardSchema } from "@/lib/schemas/rate"

type CreateChangeRequestInput = {
  orgId: string
  requestedById: string
  changeType: ChangeType
  targetType: string
  targetId?: string | null
  payload: Record<string, unknown>
  criticalReason?: string | null
}

function dateOnly(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function previousDay(date: string): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - 1)
  return dateOnly(d)
}

export async function createChangeRequest(input: CreateChangeRequestInput) {
  return prisma.adminChangeRequest.create({
    data: {
      orgId: input.orgId,
      changeType: input.changeType,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      payload: input.payload as Prisma.InputJsonValue,
      criticalReason: input.criticalReason ?? null,
      requestedById: input.requestedById,
      status: "pending",
    },
  })
}

async function applyRateChange(
  tx: Prisma.TransactionClient,
  request: AdminChangeRequest,
  reviewerId: string
) {
  const payload = request.payload as { operation?: string; data?: unknown; rateCardId?: string }
  if (payload.operation === "create") {
    const parsed = createRateCardSchema.parse(payload.data)
    const scopeProjectId = parsed.projectId ?? null
    const fromDate = parsed.effectiveFrom

    await tx.rateCard.updateMany({
      where: {
        orgId: request.orgId,
        userId: parsed.userId,
        projectId: scopeProjectId,
        status: { in: ["active", "superseded"] },
        effectiveFrom: { lte: new Date(fromDate) },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: new Date(fromDate) } }],
      },
      data: {
        status: "superseded",
        effectiveTo: new Date(previousDay(fromDate)),
      },
    })

    const created = await tx.rateCard.create({
      data: {
        orgId: request.orgId,
        userId: parsed.userId,
        projectId: scopeProjectId,
        payRate: parsed.payRate,
        billRate: parsed.billRate ?? null,
        currency: parsed.currency.toUpperCase(),
        effectiveFrom: new Date(parsed.effectiveFrom),
        effectiveTo: parsed.effectiveTo ? new Date(parsed.effectiveTo) : null,
        status: "active",
        changeReason: parsed.changeReason ?? request.criticalReason ?? "Approved rate change",
        requestedById: request.requestedById,
        approvedById: reviewerId,
        approvedAt: new Date(),
      },
    })

    if (scopeProjectId) {
      await tx.projectAllocation.updateMany({
        where: { userId: parsed.userId, projectId: scopeProjectId },
        data: { hourlyRate: parsed.payRate },
      })
    }

    return created.id
  }

  if (payload.operation === "update") {
    const parsed = updateRateCardSchema.parse(payload.data)
    const rateCardId = payload.rateCardId
    if (!rateCardId || typeof rateCardId !== "string") {
      throw new Error("Missing rateCardId")
    }
    const updated = await tx.rateCard.update({
      where: { id: rateCardId },
      data: {
        ...(parsed.payRate !== undefined ? { payRate: parsed.payRate } : {}),
        ...(parsed.billRate !== undefined ? { billRate: parsed.billRate } : {}),
        ...(parsed.currency !== undefined ? { currency: parsed.currency } : {}),
        ...(parsed.effectiveFrom !== undefined ? { effectiveFrom: new Date(parsed.effectiveFrom) } : {}),
        ...(parsed.effectiveTo !== undefined
          ? { effectiveTo: parsed.effectiveTo ? new Date(parsed.effectiveTo) : null }
          : {}),
        ...(parsed.status !== undefined ? { status: parsed.status } : {}),
        ...(parsed.changeReason !== undefined ? { changeReason: parsed.changeReason } : {}),
        approvedById: reviewerId,
        approvedAt: new Date(),
      },
    })
    if (updated.projectId && parsed.payRate !== undefined) {
      await tx.projectAllocation.updateMany({
        where: { userId: updated.userId, projectId: updated.projectId },
        data: { hourlyRate: parsed.payRate },
      })
    }
    return updated.id
  }

  throw new Error(`Unsupported rate change operation: ${payload.operation ?? "unknown"}`)
}

async function applyAssignmentChange(
  tx: Prisma.TransactionClient,
  request: AdminChangeRequest,
  reviewerId: string
) {
  const payload = request.payload as {
    operation?: string
    data?: unknown
    assignmentId?: string
  }
  if (payload.operation === "create") {
    const parsed = createAssignmentSchema.parse(payload.data)
    const created = await tx.projectAssignment.create({
      data: {
        orgId: request.orgId,
        userId: parsed.userId,
        projectId: parsed.projectId,
        roleOnProject: parsed.roleOnProject,
        allocationPct: parsed.allocationPct,
        startDate: new Date(parsed.startDate),
        endDate: parsed.endDate ? new Date(parsed.endDate) : null,
        status: "active",
        createdById: request.requestedById,
        updatedById: reviewerId,
      },
    })

    const project = await tx.project.findUnique({
      where: { id: parsed.projectId },
      select: { defaultRate: true },
    })
    await tx.projectAllocation.upsert({
      where: {
        userId_projectId: {
          userId: parsed.userId,
          projectId: parsed.projectId,
        },
      },
      create: {
        userId: parsed.userId,
        projectId: parsed.projectId,
        roleOnProject: parsed.roleOnProject,
        hourlyRate: project?.defaultRate ?? 0,
        startDate: new Date(parsed.startDate),
        endDate: parsed.endDate ? new Date(parsed.endDate) : null,
        isActive: true,
      },
      update: {
        roleOnProject: parsed.roleOnProject,
        startDate: new Date(parsed.startDate),
        endDate: parsed.endDate ? new Date(parsed.endDate) : null,
        isActive: true,
      },
    })

    return created.id
  }

  if (payload.operation === "update") {
    if (!payload.assignmentId || typeof payload.assignmentId !== "string") {
      throw new Error("Missing assignmentId")
    }
    const parsed = updateAssignmentSchema.parse(payload.data)
    const existing = await tx.projectAssignment.findUnique({
      where: { id: payload.assignmentId },
      select: { id: true, userId: true, projectId: true },
    })
    if (!existing) throw new Error("Assignment not found")
    const updated = await tx.projectAssignment.update({
      where: { id: payload.assignmentId },
      data: {
        ...(parsed.roleOnProject !== undefined ? { roleOnProject: parsed.roleOnProject } : {}),
        ...(parsed.allocationPct !== undefined ? { allocationPct: parsed.allocationPct } : {}),
        ...(parsed.startDate !== undefined ? { startDate: new Date(parsed.startDate) } : {}),
        ...(parsed.endDate !== undefined
          ? { endDate: parsed.endDate ? new Date(parsed.endDate) : null }
          : {}),
        ...(parsed.status !== undefined ? { status: parsed.status } : {}),
        updatedById: reviewerId,
      },
    })

    await tx.projectAllocation.updateMany({
      where: {
        userId: existing.userId,
        projectId: existing.projectId,
      },
      data: {
        ...(parsed.roleOnProject !== undefined ? { roleOnProject: parsed.roleOnProject } : {}),
        ...(parsed.startDate !== undefined ? { startDate: new Date(parsed.startDate) } : {}),
        ...(parsed.endDate !== undefined
          ? { endDate: parsed.endDate ? new Date(parsed.endDate) : null }
          : {}),
        ...(parsed.status !== undefined
          ? { isActive: parsed.status === "active" || parsed.status === "paused" }
          : {}),
      },
    })

    return updated.id
  }

  if (payload.operation === "end") {
    if (!payload.assignmentId || typeof payload.assignmentId !== "string") {
      throw new Error("Missing assignmentId")
    }
    const parsed = endAssignmentSchema.parse(payload.data)
    const existing = await tx.projectAssignment.findUnique({
      where: { id: payload.assignmentId },
      select: { id: true, userId: true, projectId: true },
    })
    if (!existing) throw new Error("Assignment not found")

    const updated = await tx.projectAssignment.update({
      where: { id: payload.assignmentId },
      data: {
        status: "ended",
        endDate: new Date(parsed.endDate),
        updatedById: reviewerId,
      },
    })
    await tx.projectAllocation.updateMany({
      where: { userId: existing.userId, projectId: existing.projectId },
      data: {
        endDate: new Date(parsed.endDate),
        isActive: false,
      },
    })
    return updated.id
  }

  throw new Error(`Unsupported assignment change operation: ${payload.operation ?? "unknown"}`)
}

async function applyUserAccessChange(
  tx: Prisma.TransactionClient,
  request: AdminChangeRequest,
  reviewerId: string
) {
  const payload = request.payload as {
    operation?: string
    userId?: string
    data?: { effectiveDate?: string; reason?: string; status?: string; role?: string }
  }
  if (!payload.userId) throw new Error("Missing userId")

  if (payload.operation === "offboard") {
    const effectiveDate = payload.data?.effectiveDate ?? dateOnly(new Date())
    await tx.projectAssignment.updateMany({
      where: {
        orgId: request.orgId,
        userId: payload.userId,
        status: { in: ["active", "paused"] },
      },
      data: {
        status: "ended",
        endDate: new Date(effectiveDate),
        updatedById: reviewerId,
      },
    })
    await tx.projectAllocation.updateMany({
      where: { userId: payload.userId, project: { orgId: request.orgId } },
      data: { isActive: false, endDate: new Date(effectiveDate) },
    })
    await tx.user.update({
      where: { id: payload.userId },
      data: {
        status: "offboarded",
        offboardedAt: new Date(effectiveDate),
      },
    })
    await tx.userLifecycleEvent.create({
      data: {
        orgId: request.orgId,
        userId: payload.userId,
        actorUserId: reviewerId,
        eventType: "offboarded",
        metadata: {
          reason: payload.data?.reason ?? null,
          viaChangeRequest: request.id,
        },
      },
    })
    return payload.userId
  }

  if (payload.operation === "user_update") {
    const updates: Record<string, unknown> = {}
    if (payload.data?.status) updates.status = payload.data.status
    if (payload.data?.role) updates.role = payload.data.role
    await tx.user.update({
      where: { id: payload.userId },
      data: updates,
    })
    await tx.userLifecycleEvent.create({
      data: {
        orgId: request.orgId,
        userId: payload.userId,
        actorUserId: reviewerId,
        eventType: "access_updated",
        metadata: {
          status: payload.data?.status ?? null,
          role: payload.data?.role ?? null,
          viaChangeRequest: request.id,
        },
      },
    })
    return payload.userId
  }

  throw new Error(`Unsupported user access change operation: ${payload.operation ?? "unknown"}`)
}

export async function approveChangeRequest(changeRequestId: string, reviewerId: string, orgId: string) {
  return prisma.$transaction(async (tx) => {
    const request = await tx.adminChangeRequest.findFirst({
      where: { id: changeRequestId, orgId },
    })
    if (!request) throw new Error("Change request not found")
    if (request.status !== "pending") throw new Error("Change request is not pending")
    if (request.requestedById === reviewerId) {
      throw new Error("Requester cannot approve their own change request")
    }

    let affectedId: string | null = null
    if (request.changeType === "rate_change") {
      affectedId = await applyRateChange(tx, request, reviewerId)
    } else if (request.changeType === "assignment_change") {
      affectedId = await applyAssignmentChange(tx, request, reviewerId)
    } else if (request.changeType === "user_access_change") {
      affectedId = await applyUserAccessChange(tx, request, reviewerId)
    } else {
      throw new Error(`Unsupported change type: ${request.changeType}`)
    }

    const updated = await tx.adminChangeRequest.update({
      where: { id: request.id },
      data: {
        status: "approved",
        reviewedById: reviewerId,
        reviewedAt: new Date(),
      },
    })

    await tx.auditLog.create({
      data: {
        userId: reviewerId,
        action: "change_request.approved",
        entityType: "admin_change_request",
        entityId: request.id,
        details: `Approved ${request.changeType} request`,
        newValue: JSON.stringify({ affectedId }),
      },
    })

    return updated
  })
}

export async function rejectChangeRequest(changeRequestId: string, reviewerId: string, orgId: string, reason: string) {
  return prisma.$transaction(async (tx) => {
    const request = await tx.adminChangeRequest.findFirst({
      where: { id: changeRequestId, orgId },
    })
    if (!request) throw new Error("Change request not found")
    if (request.status !== "pending") throw new Error("Change request is not pending")
    if (request.requestedById === reviewerId) {
      throw new Error("Requester cannot reject their own change request")
    }

    const updated = await tx.adminChangeRequest.update({
      where: { id: request.id },
      data: {
        status: "rejected",
        reviewedById: reviewerId,
        reviewedAt: new Date(),
        payload: {
          ...(request.payload as Record<string, unknown>),
          review: {
            reason,
            reviewedById: reviewerId,
            reviewedAt: new Date().toISOString(),
          },
        },
      },
    })

    await tx.auditLog.create({
      data: {
        userId: reviewerId,
        action: "change_request.rejected",
        entityType: "admin_change_request",
        entityId: request.id,
        details: reason,
      },
    })

    return updated
  })
}
