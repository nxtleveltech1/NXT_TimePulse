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
  const from = searchParams.get("from")
  const to = searchParams.get("to")
  const userId = searchParams.get("userId")

  if (!from || !to) {
    return NextResponse.json({ error: "from and to (YYYY-MM-DD) required" }, { status: 400 })
  }

  const where: { date: { gte: string; lte: string }; project: { orgId: string }; userId?: string } = {
    date: { gte: from, lte: to },
    project: { orgId },
  }
  if (userId) where.userId = userId

  const [timesheets, overtimePolicy] = await Promise.all([
    prisma.timesheet.findMany({
    where,
    include: {
      user: { select: { id: true, employeeCode: true, firstName: true, lastName: true } },
      project: { select: { id: true, name: true, defaultRate: true } },
    },
    orderBy: [{ date: "asc" }, { clockIn: "asc" }],
  }),
    getOvertimePolicy(orgId),
  ])
  const userIds = [...new Set(timesheets.map((t) => t.userId))]
  const projectIds = [...new Set(timesheets.map((t) => t.projectId))]
  const rateCardsByUser = await getRateCardsByUser(orgId, userIds, projectIds)

  const rows: string[][] = [
    [
      "Employee ID",
      "Employee Name",
      "Pay Period Start",
      "Pay Period End",
      "Date",
      "Project",
      "Hours",
      "Base Rate",
      "Multiplier",
      "Effective Rate",
      "Amount",
      "Billable",
    ],
  ]

  for (const t of timesheets) {
    const resolved = resolveRateFromCards({
      date: t.date,
      projectId: t.projectId,
      projectDefaultRate: t.project.defaultRate,
      projectClientRate: t.project.defaultRate,
      rateCards: rateCardsByUser.get(t.userId) ?? [],
    })
    const mult = getOvertimeMultiplier(t.date, overtimePolicy)
    const effectiveRate = resolved.payRate * mult
    const hours = t.durationMinutes / 60
    const amount = hours * effectiveRate
    const name = [t.user.firstName, t.user.lastName].filter(Boolean).join(" ") || t.user.id
    rows.push([
      t.user.employeeCode ?? t.user.id,
      name,
      from,
      to,
      t.date,
      t.project.name,
      hours.toFixed(2),
      resolved.payRate.toFixed(2),
      mult.toString(),
      effectiveRate.toFixed(2),
      amount.toFixed(2),
      (t as { isBillable?: boolean }).isBillable === false ? "N" : "Y",
    ])
  }

  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n")
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="payroll-${from}-${to}.csv"`,
    },
  })
}
