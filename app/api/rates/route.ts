import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireCapability } from "@/lib/auth"
import { createRateCardSchema } from "@/lib/schemas/rate"
import { createChangeRequest } from "@/lib/change-requests"
import { serializeForClient } from "@/lib/serialize"
import { checkDistributedRateLimit } from "@/lib/distributed-rate-limit"

function todayDate(): string {
  return new Date().toISOString().slice(0, 10)
}

export async function GET(req: Request) {
  const auth = await requireCapability("compensation.read")
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
    where.effectiveFrom = {}
    if (from) (where.effectiveFrom as Record<string, unknown>).gte = new Date(from)
    if (to) (where.effectiveFrom as Record<string, unknown>).lte = new Date(to)
  }

  const rows = await prisma.rateCard.findMany({
    where,
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
      project: { select: { id: true, name: true } },
      requestedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      approvedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
    orderBy: [{ effectiveFrom: "desc" }, { createdAt: "desc" }],
    take: 500,
  })

  return NextResponse.json(serializeForClient(rows))
}

export async function POST(req: Request) {
  const auth = await requireCapability("compensation.write")
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const rateLimit = await checkDistributedRateLimit(`${auth.orgId}:rates:${auth.userId}`, 120, 60_000)
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
  const parsed = createRateCardSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const input = parsed.data
  const [user, project] = await Promise.all([
    prisma.user.findFirst({ where: { id: input.userId, orgId: auth.orgId }, select: { id: true } }),
    input.projectId
      ? prisma.project.findFirst({ where: { id: input.projectId, orgId: auth.orgId }, select: { id: true } })
      : Promise.resolve({ id: null }),
  ])
  if (!user || (input.projectId && !project?.id)) {
    return NextResponse.json(
      { error: "User or project not found in organization" },
      { status: 404 }
    )
  }

  const requestRow = await createChangeRequest({
    orgId: auth.orgId,
    requestedById: auth.userId,
    changeType: "rate_change",
    targetType: "rate_card",
    payload: { operation: "create", data: input },
    criticalReason:
      input.effectiveFrom < todayDate()
        ? "Backdated rate change requires approval"
        : "Rate change requires maker-checker approval",
  })
  return NextResponse.json(
    {
      status: "pending_approval",
      changeRequestId: requestRow.id,
      message: "Rate change submitted for approval",
    },
    { status: 202 }
  )
}
