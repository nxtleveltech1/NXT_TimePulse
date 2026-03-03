import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireCapability } from "@/lib/auth"
import { resolveRate } from "@/lib/rates"
import { z } from "zod"

const resolveRateQuerySchema = z.object({
  userId: z.string().min(1),
  projectId: z.string().min(1),
})

export async function GET(req: Request) {
  const auth = await requireCapability("compensation.read")
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const parsed = resolveRateQuerySchema.safeParse({
    userId: searchParams.get("userId"),
    projectId: searchParams.get("projectId"),
  })
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { userId, projectId } = parsed.data

  const [user, allocation] = await Promise.all([
    prisma.user.findFirst({
      where: { id: userId, orgId: auth.orgId },
      select: { baseRate: true, currency: true },
    }),
    prisma.projectAllocation.findFirst({
      where: { userId, projectId },
      select: { billRate: true },
    }),
  ])

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

  const resolved = resolveRate({
    userBaseRate: user.baseRate,
    userCurrency: user.currency,
    allocationBillRate: allocation?.billRate,
  })

  return NextResponse.json(resolved)
}
