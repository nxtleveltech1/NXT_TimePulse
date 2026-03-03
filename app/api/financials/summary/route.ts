import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { isAdminOrManager } from "@/lib/auth"
import { getOvertimeMultiplier, getOvertimePolicy } from "@/lib/payroll"
import { resolveRateFromCards } from "@/lib/rates"
import { getRateCardsByUser } from "@/lib/rate-card-map"

export async function GET(req: Request) {
  const { orgId, orgRole } = await auth()
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!isAdminOrManager(orgRole as string)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const from = searchParams.get("from") ?? new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0]
  const to = searchParams.get("to") ?? new Date().toISOString().split("T")[0]

  const [timesheets, overtimePolicy] = await Promise.all([
    prisma.timesheet.findMany({
      where: {
        date: { gte: from, lte: to },
        project: { orgId },
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        project: { select: { id: true, name: true, defaultRate: true, clientRate: true } },
      },
    }),
    getOvertimePolicy(orgId),
  ])
  const userIds = [...new Set(timesheets.map((t) => t.userId))]
  const projectIds = [...new Set(timesheets.map((t) => t.projectId))]
  const rateCardsByUser = await getRateCardsByUser(orgId, userIds, projectIds)

  let billableRevenue = 0
  let labourCost = 0
  const projectRevenue: Record<string, number> = {}
  const projectCost: Record<string, number> = {}
  const userCost: Record<string, number> = {}

  for (const t of timesheets) {
    const resolved = resolveRateFromCards({
      date: t.date,
      projectId: t.projectId,
      projectDefaultRate: t.project.defaultRate,
      projectClientRate: (t.project as { clientRate?: unknown }).clientRate,
      rateCards: rateCardsByUser.get(t.userId) ?? [],
    })
    const mult = getOvertimeMultiplier(t.date, overtimePolicy)
    const hours = t.durationMinutes / 60
    const isBillable = (t as { isBillable?: boolean }).isBillable !== false

    if (isBillable) {
      const rev = hours * resolved.billRate
      billableRevenue += rev
      projectRevenue[t.project.id] = (projectRevenue[t.project.id] ?? 0) + rev
    }
    const cost = hours * resolved.payRate * mult
    labourCost += cost
    projectCost[t.project.id] = (projectCost[t.project.id] ?? 0) + cost
    userCost[t.userId] = (userCost[t.userId] ?? 0) + cost
  }

  const grossMargin = billableRevenue - labourCost
  const marginPct = billableRevenue > 0 ? (grossMargin / billableRevenue) * 100 : 0

  const topProjectsByRevenue = Object.entries(projectRevenue)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
  const topProjectsByCost = Object.entries(projectCost)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)

  const projectNames = Object.fromEntries(
    (await prisma.project.findMany({
      where: { id: { in: [...Object.keys(projectRevenue), ...Object.keys(projectCost)] } },
      select: { id: true, name: true },
    })).map((p) => [p.id, p.name])
  )
  const userNames = Object.fromEntries(
    (await prisma.user.findMany({
      where: { id: { in: Object.keys(userCost) } },
      select: { id: true, firstName: true, lastName: true },
    })).map((u) => [u.id, [u.firstName, u.lastName].filter(Boolean).join(" ") || u.id])
  )

  return NextResponse.json({
    from,
    to,
    billableRevenue: Math.round(billableRevenue * 100) / 100,
    labourCost: Math.round(labourCost * 100) / 100,
    grossMargin: Math.round(grossMargin * 100) / 100,
    marginPct: Math.round(marginPct * 10) / 10,
    topProjectsByRevenue: topProjectsByRevenue.map(([id, v]) => ({
      project: projectNames[id] ?? id,
      revenue: Math.round(v * 100) / 100,
    })),
    topProjectsByCost: topProjectsByCost.map(([id, v]) => ({
      project: projectNames[id] ?? id,
      cost: Math.round(v * 100) / 100,
    })),
    labourByUser: Object.entries(userCost).map(([id, v]) => ({
      user: userNames[id] ?? id,
      cost: Math.round(v * 100) / 100,
    })),
  })
}
