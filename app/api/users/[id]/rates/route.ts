import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { hasCapability } from "@/lib/auth"
import { userRateUpdateSchema } from "@/lib/schemas/user"
import { decimalToNumber } from "@/lib/serialize"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { orgId, orgRole } = await auth()
  if (!orgId || !hasCapability(orgRole as string, "compensation.read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const user = await prisma.user.findFirst({
    where: { id, orgId },
    select: { id: true, baseRate: true, currency: true },
  })
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json({
    baseRate: decimalToNumber(user.baseRate),
    currency: user.currency.trim(),
  })
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId: actorId, orgId, orgRole } = await auth()
  if (!orgId || !actorId || !hasCapability(orgRole as string, "compensation.write")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = userRateUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const existing = await prisma.user.findFirst({
    where: { id, orgId },
    select: { id: true, baseRate: true, currency: true },
  })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const updated = await prisma.user.update({
    where: { id },
    data: {
      baseRate: parsed.data.baseRate,
      currency: parsed.data.currency,
    },
    select: { id: true, baseRate: true, currency: true },
  })

  await prisma.auditLog.create({
    data: {
      userId: actorId,
      action: "user.rate_updated",
      entityType: "user",
      entityId: id,
      previousValue: JSON.stringify({
        baseRate: decimalToNumber(existing.baseRate),
        currency: existing.currency.trim(),
      }),
      newValue: JSON.stringify({
        baseRate: parsed.data.baseRate,
        currency: parsed.data.currency,
      }),
    },
  })

  return NextResponse.json({
    baseRate: decimalToNumber(updated.baseRate),
    currency: updated.currency.trim(),
  })
}
