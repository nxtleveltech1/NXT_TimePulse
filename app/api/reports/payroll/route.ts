import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { isAdminOrManager } from "@/lib/auth"
import { getOvertimeMultiplier, getOvertimePolicy } from "@/lib/payroll"
import { decimalToNumber } from "@/lib/serialize"

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

  const [timesheets, allocations, overtimePolicy] = await Promise.all([
    prisma.timesheet.findMany({
    where,
    include: {
      user: { select: { id: true, employeeCode: true, firstName: true, lastName: true } },
      project: { select: { id: true, name: true, defaultRate: true } },
    },
    orderBy: [{ date: "asc" }, { clockIn: "asc" }],
  }),
    prisma.projectAllocation.findMany({
      where: {
        project: { orgId },
        isActive: true,
      },
      select: { userId: true, projectId: true, hourlyRate: true },
    }),
    getOvertimePolicy(orgId),
  ])
  const allocationMap = new Map<string, number>()
  for (const a of allocations) {
    allocationMap.set(`${a.userId}:${a.projectId}`, decimalToNumber(a.hourlyRate))
  }

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
    const baseRate =
      allocationMap.get(`${t.userId}:${t.projectId}`) ?? decimalToNumber(t.project.defaultRate)
    const mult = getOvertimeMultiplier(t.date, overtimePolicy)
    const effectiveRate = baseRate * mult
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
      baseRate.toFixed(2),
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
