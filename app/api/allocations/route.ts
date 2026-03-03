import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { hasCapability, requireCapability } from "@/lib/auth"
import { serializeForClient } from "@/lib/serialize"
import { resolveRateFromCards } from "@/lib/rates"
import { createChangeRequest } from "@/lib/change-requests"
import { checkDistributedRateLimit } from "@/lib/distributed-rate-limit"

function deprecationHeaders(extra?: Record<string, string>) {
  return {
    Deprecation: "true",
    Sunset: "Tue, 30 Jun 2026 00:00:00 GMT",
    Link: '</api/assignments>; rel="successor-version"',
    ...extra,
  }
}

function todayDate() {
  return new Date().toISOString().slice(0, 10)
}

export async function GET(req: Request) {
  const auth = await requireCapability("assignments.read")
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const canReadComp = hasCapability(auth.orgRole, "compensation.read")

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get("projectId")
  const userIdParam = searchParams.get("userId")

  const where: Record<string, unknown> = { orgId: auth.orgId, status: { in: ["active", "paused"] } }
  if (projectId) where.projectId = projectId
  if (userIdParam) where.userId = userIdParam

  const assignments = await prisma.projectAssignment.findMany({
    where,
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
      project: { select: { id: true, name: true, defaultRate: true, clientRate: true } },
    },
    orderBy: { startDate: "desc" },
  })

  const userIds = [...new Set(assignments.map((a) => a.userId))]
  const projectIds = [...new Set(assignments.map((a) => a.projectId))]
  const cards = await prisma.rateCard.findMany({
    where: {
      orgId: auth.orgId,
      userId: { in: userIds.length ? userIds : ["__none__"] },
      OR: [
        { projectId: { in: projectIds.length ? projectIds : ["__none__"] } },
        { projectId: null },
      ],
    },
    select: {
      id: true,
      userId: true,
      projectId: true,
      payRate: true,
      billRate: true,
      currency: true,
      effectiveFrom: true,
      effectiveTo: true,
      status: true,
    },
  })
  const cardByUser = new Map<string, typeof cards>()
  for (const c of cards) {
    const key = c.userId
    if (!cardByUser.has(key)) cardByUser.set(key, [])
    cardByUser.get(key)?.push(c)
  }

  const compat = assignments.map((a) => {
    const rate = resolveRateFromCards({
      date: a.startDate.toISOString().slice(0, 10),
      projectId: a.projectId,
      projectDefaultRate: a.project.defaultRate,
      projectClientRate: a.project.clientRate,
      rateCards: cardByUser.get(a.userId) ?? [],
    })
    return {
      id: a.id,
      userId: a.userId,
      projectId: a.projectId,
      roleOnProject: a.roleOnProject,
      hourlyRate: canReadComp ? rate.payRate : 0,
      startDate: a.startDate,
      endDate: a.endDate,
      isActive: a.status === "active" || a.status === "paused",
      user: a.user,
      project: { id: a.project.id, name: a.project.name },
    }
  })

  return NextResponse.json(serializeForClient(compat), { headers: deprecationHeaders() })
}

export async function POST(req: Request) {
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

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const b = body as Record<string, unknown>
  const userIdParam = typeof b.userId === "string" ? b.userId : ""
  const projectId = typeof b.projectId === "string" ? b.projectId : ""
  const roleOnProject = typeof b.roleOnProject === "string" ? b.roleOnProject : ""
  const startDate = typeof b.startDate === "string" ? b.startDate : todayDate()
  const endDate = typeof b.endDate === "string" ? b.endDate : null
  const hourlyRate = typeof b.hourlyRate === "number" ? b.hourlyRate : null

  if (!userIdParam || !projectId || !roleOnProject) {
    return NextResponse.json(
      { error: "userId, projectId, roleOnProject required" },
      { status: 400 }
    )
  }
  if (!canWriteComp && hourlyRate !== null) {
    return NextResponse.json(
      { error: "Only admins can set compensation rates" },
      { status: 403 }
    )
  }

  const [project, user] = await Promise.all([
    prisma.project.findFirst({
      where: { id: projectId, orgId: auth.orgId },
      select: { id: true, defaultRate: true },
    }),
    prisma.user.findFirst({ where: { id: userIdParam, orgId: auth.orgId }, select: { id: true } }),
  ])
  if (!project || !user) {
    return NextResponse.json(
      { error: "Project or user not found in organization" },
      { status: 404 }
    )
  }

  const assignmentCritical = startDate < todayDate()
  if (assignmentCritical) {
    const changeRequest = await createChangeRequest({
      orgId: auth.orgId,
      requestedById: auth.userId,
      changeType: "assignment_change",
      targetType: "project_assignment",
      payload: {
        operation: "create",
        data: {
          userId: userIdParam,
          projectId,
          roleOnProject,
          allocationPct: 100,
          startDate,
          endDate,
        },
      },
      criticalReason: "Backdated assignment change requires approval",
    })
    return NextResponse.json(
      {
        status: "pending_approval",
        changeRequestId: changeRequest.id,
      },
      { status: 202, headers: deprecationHeaders() }
    )
  }

  const existing = await prisma.projectAssignment.findFirst({
    where: {
      orgId: auth.orgId,
      userId: userIdParam,
      projectId,
      status: { in: ["active", "paused"] },
    },
    select: { id: true },
  })
  if (existing) {
    return NextResponse.json(
      { error: "This user is already actively assigned to this project." },
      { status: 409, headers: deprecationHeaders() }
    )
  }

  const assignment = await prisma.$transaction(async (tx) => {
    const created = await tx.projectAssignment.create({
      data: {
        orgId: auth.orgId,
        userId: userIdParam,
        projectId,
        roleOnProject,
        allocationPct: 100,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        status: "active",
        createdById: auth.userId,
        updatedById: auth.userId,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        project: { select: { id: true, name: true } },
      },
    })

    await tx.projectAllocation.upsert({
      where: {
        userId_projectId: {
          userId: userIdParam,
          projectId,
        },
      },
      create: {
        userId: userIdParam,
        projectId,
        roleOnProject,
        hourlyRate: hourlyRate ?? project.defaultRate,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        isActive: true,
      },
      update: {
        roleOnProject,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        isActive: true,
      },
    })

    await tx.auditLog.create({
      data: {
        userId: auth.userId,
        action: "allocation.created",
        entityType: "project_assignment",
        entityId: created.id,
        details: `Compatibility allocation created for ${userIdParam}:${projectId}`,
      },
    })
    return created
  })

  let rateChangeRequestId: string | null = null
  if (hourlyRate !== null && canWriteComp) {
    const rateRequest = await createChangeRequest({
      orgId: auth.orgId,
      requestedById: auth.userId,
      changeType: "rate_change",
      targetType: "rate_card",
      payload: {
        operation: "create",
        data: {
          userId: userIdParam,
          projectId,
          payRate: hourlyRate,
          billRate: null,
          currency: "USD",
          effectiveFrom: startDate,
          effectiveTo: endDate,
          changeReason: "Submitted via legacy allocations endpoint",
        },
      },
      criticalReason: "Rate change requires maker-checker approval",
    })
    rateChangeRequestId = rateRequest.id
  }

  const compatResponse = {
    id: assignment.id,
    userId: assignment.userId,
    projectId: assignment.projectId,
    roleOnProject: assignment.roleOnProject,
    hourlyRate: hourlyRate ?? 0,
    startDate: assignment.startDate,
    endDate: assignment.endDate,
    isActive: assignment.status === "active" || assignment.status === "paused",
    user: assignment.user,
    project: assignment.project,
    ...(rateChangeRequestId ? { rateChangeRequestId } : {}),
  }

  return NextResponse.json(serializeForClient(compatResponse), {
    headers: deprecationHeaders(rateChangeRequestId ? { "X-Rate-Change-Request-Id": rateChangeRequestId } : {}),
  })
}
