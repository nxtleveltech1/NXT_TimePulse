import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { isAdminOrManager } from "@/lib/auth"
import { getOvertimeMultiplier, getOvertimePolicy } from "@/lib/payroll"
import { resolveRate } from "@/lib/rates"
import { getRateCardsByUser, getEffectiveRateCard } from "@/lib/rate-card-map"

export async function GET(req: Request) {
  const { orgId, orgRole } = await auth()
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!isAdminOrManager(orgRole as string)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const from = searchParams.get("from") ?? new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0]
  const to = searchParams.get("to") ?? new Date().toISOString().split("T")[0]
  const groupBy = searchParams.get("groupBy") ?? "month"

  const [timesheets, overtimePolicy] = await Promise.all([
    prisma.timesheet.findMany({
      where: {
        date: { gte: from, lte: to },
        project: { orgId },
      },
      include: {
        user: { select: { id: true, baseRate: true, currency: true } },
        project: { select: { id: true } },
      },
    }),
    getOvertimePolicy(orgId),
  ])

  const userIds = [...new Set(timesheets.map((t) => t.userId))]
  const projectIds = [...new Set(timesheets.map((t) => t.projectId))]

  const [allocations, rateCardsByUser] = await Promise.all([
    userIds.length
      ? prisma.projectAllocation.findMany({
          where: { userId: { in: userIds }, projectId: { in: projectIds } },
          select: { userId: true, projectId: true, billRate: true },
        })
      : Promise.resolve([]),
    getRateCardsByUser(orgId, userIds, projectIds),
  ])

  const allocationKey = (userId: string, projectId: string) => `${userId}::${projectId}`
  const allocationMap = new Map(allocations.map((a) => [allocationKey(a.userId, a.projectId), a.billRate]))

  const revenueByPeriod: Record<string, number> = {}
  const costByPeriod: Record<string, number> = {}
  const billableHoursByPeriod: Record<string, number> = {}
  const nonBillableHoursByPeriod: Record<string, number> = {}

  function periodKey(dateStr: string): string {
    const d = new Date(dateStr + "T12:00:00Z")
    if (groupBy === "week") {
      const start = new Date(d)
      start.setUTCDate(d.getUTCDate() - d.getUTCDay())
      return start.toISOString().split("T")[0]
    }
    return dateStr.slice(0, 7)
  }

  for (const t of timesheets) {
    const key = periodKey(t.date)
    const rc = getEffectiveRateCard(rateCardsByUser.get(t.userId), t.projectId, t.date)
    const resolved = resolveRate({
      userBaseRate: t.user.baseRate,
      userCurrency: t.user.currency,
      allocationBillRate: allocationMap.get(allocationKey(t.userId, t.projectId)),
      rateCardPayRate: rc?.payRate,
      rateCardBillRate: rc?.billRate,
    })
    const mult = getOvertimeMultiplier(t.date, overtimePolicy)
    const hours = t.durationMinutes / 60
    const isBillable = (t as { isBillable?: boolean }).isBillable !== false

    if (isBillable) {
      revenueByPeriod[key] = (revenueByPeriod[key] ?? 0) + hours * resolved.billRate
      billableHoursByPeriod[key] = (billableHoursByPeriod[key] ?? 0) + hours
    } else {
      nonBillableHoursByPeriod[key] = (nonBillableHoursByPeriod[key] ?? 0) + hours
    }
    costByPeriod[key] = (costByPeriod[key] ?? 0) + hours * resolved.payRate * mult
  }

  const periods = [...new Set([...Object.keys(revenueByPeriod), ...Object.keys(costByPeriod)])].sort()
  const trend = periods.map((p) => ({
    period: p,
    revenue: Math.round((revenueByPeriod[p] ?? 0) * 100) / 100,
    cost: Math.round((costByPeriod[p] ?? 0) * 100) / 100,
    billableHours: Math.round((billableHoursByPeriod[p] ?? 0) * 10) / 10,
    nonBillableHours: Math.round((nonBillableHoursByPeriod[p] ?? 0) * 10) / 10,
  }))

  return NextResponse.json({ trend })
}
