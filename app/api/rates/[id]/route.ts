import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireCapability } from "@/lib/auth"
import { updateRateCardSchema } from "@/lib/schemas/rate"
import { createChangeRequest } from "@/lib/change-requests"
import { serializeForClient } from "@/lib/serialize"
import { checkDistributedRateLimit } from "@/lib/distributed-rate-limit"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireCapability("compensation.write")
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const rateLimit = await checkDistributedRateLimit(`${auth.orgId}:rates:${auth.userId}`, 120, 60_000)
  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "Rate limit exceeded", resetAt: rateLimit.resetAt },
      { status: 429 }
    )
  }

  const { id } = await params
  const existing = await prisma.rateCard.findFirst({
    where: { id, orgId: auth.orgId },
  })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const parsed = updateRateCardSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const requestRow = await createChangeRequest({
    orgId: auth.orgId,
    requestedById: auth.userId,
    changeType: "rate_change",
    targetType: "rate_card",
    targetId: id,
    payload: {
      operation: "update",
      rateCardId: id,
      data: parsed.data,
    },
    criticalReason: "Rate card update requires maker-checker approval",
  })

  return NextResponse.json(
    {
      status: "pending_approval",
      changeRequestId: requestRow.id,
      message: "Rate card update submitted for approval",
    },
    { status: 202 }
  )
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireCapability("compensation.read")
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const rateCard = await prisma.rateCard.findFirst({
    where: { id, orgId: auth.orgId },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
      project: { select: { id: true, name: true } },
      requestedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      approvedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  })
  if (!rateCard) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(serializeForClient(rateCard))
}
