import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireCapability } from "@/lib/auth"
import { createChangeRequest } from "@/lib/change-requests"
import { checkDistributedRateLimit } from "@/lib/distributed-rate-limit"

const offboardSchema = z.object({
  effectiveDate: z.string().date().optional(),
  reason: z.string().min(3).max(1000),
})

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireCapability("users.offboard")
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const rateLimit = await checkDistributedRateLimit(`${auth.orgId}:users:${auth.userId}`, 120, 60_000)
  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "Rate limit exceeded", resetAt: rateLimit.resetAt },
      { status: 429 }
    )
  }

  const { id } = await params
  if (id === auth.userId) {
    return NextResponse.json({ error: "You cannot offboard yourself" }, { status: 400 })
  }

  const user = await prisma.user.findFirst({
    where: { id, orgId: auth.orgId },
    select: { id: true, status: true },
  })
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const parsed = offboardSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const effectiveDate = parsed.data.effectiveDate ?? new Date().toISOString().slice(0, 10)

  const requestRow = await createChangeRequest({
    orgId: auth.orgId,
    requestedById: auth.userId,
    changeType: "user_access_change",
    targetType: "user",
    targetId: id,
    payload: {
      operation: "offboard",
      userId: id,
      data: {
        reason: parsed.data.reason,
        effectiveDate,
      },
    },
    criticalReason: "Offboarding requires maker-checker approval",
  })

  await prisma.auditLog.create({
    data: {
      userId: auth.userId,
      action: "offboard.requested",
      entityType: "user",
      entityId: id,
      details: parsed.data.reason,
    },
  }).catch(() => {})

  return NextResponse.json(
    {
      status: "pending_approval",
      changeRequestId: requestRow.id,
      message: "Offboarding request submitted for approval",
    },
    { status: 202 }
  )
}
