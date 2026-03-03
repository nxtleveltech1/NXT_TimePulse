import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireCapability } from "@/lib/auth"
import { createAssignmentSchema } from "@/lib/schemas/assignment"
import { createChangeRequest } from "@/lib/change-requests"
import { serializeForClient } from "@/lib/serialize"
import { checkDistributedRateLimit } from "@/lib/distributed-rate-limit"

function todayDate(): string {
  return new Date().toISOString().slice(0, 10)
}

export async function GET(req: Request) {
  const auth = await requireCapability("assignments.read")
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const userId = searchParams.get("userId")
  const projectId = searchParams.get("projectId")
  const status = searchParams.get("status")
  const from = searchParams.get("from")
  const to = searchParams.get("to")

  const where: Record<string, unknown> = { orgId: auth.orgId }
  if (userId) where.userId = userId
  if (projectId) where.projectId = projectId
  if (status) where.status = status
  if (from || to) {
    where.startDate = {}
    if (from) (where.startDate as Record<string, unknown>).gte = new Date(from)
    if (to) (where.startDate as Record<string, unknown>).lte = new Date(to)
  }

  const assignments = await prisma.projectAssignment.findMany({
    where,
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
      project: { select: { id: true, name: true } },
    },
    orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
    take: 500,
  })
  return NextResponse.json(serializeForClient(assignments))
}

export async function POST(req: Request) {
  const auth = await requireCapability("assignments.write")
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const rateLimit = await checkDistributedRateLimit(`${auth.orgId}:assignments:${auth.userId}`, 150, 60_000)
  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "Rate limit exceeded", resetAt: rateLimit.resetAt },
      { status: 429 }
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = createAssignmentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const input = parsed.data
  const [user, project] = await Promise.all([
    prisma.user.findFirst({
      where: { id: input.userId, orgId: auth.orgId },
      select: { id: true },
    }),
    prisma.project.findFirst({
      where: { id: input.projectId, orgId: auth.orgId },
      select: { id: true, defaultRate: true },
    }),
  ])
  if (!user || !project) {
    return NextResponse.json(
      { error: "User or project not found in organization" },
      { status: 404 }
    )
  }

  const isCritical = input.startDate < todayDate()
  if (isCritical) {
    const requestRow = await createChangeRequest({
      orgId: auth.orgId,
      requestedById: auth.userId,
      changeType: "assignment_change",
      targetType: "project_assignment",
      payload: { operation: "create", data: input },
      criticalReason: "Backdated assignment change requires approval",
    })
    return NextResponse.json(
      {
        status: "pending_approval",
        changeRequestId: requestRow.id,
        message: "Backdated assignment change submitted for approval",
      },
      { status: 202 }
    )
  }

  const assignment = await prisma.$transaction(async (tx) => {
    const created = await tx.projectAssignment.create({
      data: {
        orgId: auth.orgId,
        userId: input.userId,
        projectId: input.projectId,
        roleOnProject: input.roleOnProject,
        allocationPct: input.allocationPct,
        startDate: new Date(input.startDate),
        endDate: input.endDate ? new Date(input.endDate) : null,
        status: "active",
        createdById: auth.userId,
        updatedById: auth.userId,
      },
    })

    await tx.projectAllocation.upsert({
      where: {
        userId_projectId: {
          userId: input.userId,
          projectId: input.projectId,
        },
      },
      create: {
        userId: input.userId,
        projectId: input.projectId,
        roleOnProject: input.roleOnProject,
        hourlyRate: project.defaultRate,
        startDate: new Date(input.startDate),
        endDate: input.endDate ? new Date(input.endDate) : null,
        isActive: true,
      },
      update: {
        roleOnProject: input.roleOnProject,
        startDate: new Date(input.startDate),
        endDate: input.endDate ? new Date(input.endDate) : null,
        isActive: true,
      },
    })

    await tx.auditLog.create({
      data: {
        userId: auth.userId,
        action: "assignment.created",
        entityType: "project_assignment",
        entityId: created.id,
        details: `Assignment created for user ${input.userId} on project ${input.projectId}`,
      },
    })
    return created
  })

  return NextResponse.json(serializeForClient(assignment))
}
