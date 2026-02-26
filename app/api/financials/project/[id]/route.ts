import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { isAdminOrManager } from "@/lib/auth"
import { getOvertimeMultiplier, getOvertimePolicy } from "@/lib/payroll"
import { decimalToNumber } from "@/lib/serialize"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { orgId, orgRole } = await auth()
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!isAdminOrManager(orgRole as string)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const project = await prisma.project.findUnique({
    where: { id, orgId },
    select: { id: true, name: true, defaultRate: true, clientRate: true, budget: true },
  })
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { searchParams } = new URL(_req.url)
  const from = searchParams.get("from") ?? new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0]
  const to = searchParams.get("to") ?? new Date().toISOString().split("T")[0]

  const [timesheets, allocations, overtimePolicy] = await Promise.all([
    prisma.timesheet.findMany({
      where: { projectId: id, date: { gte: from, lte: to } },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    prisma.projectAllocation.findMany({
      where: {
        projectId: id,
        isActive: true,
      },
      select: { userId: true, hourlyRate: true },
    }),
    getOvertimePolicy(orgId),
  ])
  const allocMap = new Map(allocations.map((a) => [a.userId, decimalToNumber(a.hourlyRate)]))

  const clientRate = decimalToNumber((project as { clientRate?: unknown }).clientRate) || decimalToNumber(project.defaultRate)
  const budget = decimalToNumber((project as { budget?: unknown }).budget)

  let revenue = 0
  let labourCost = 0

  for (const t of timesheets) {
    const baseRate = allocMap.get(t.userId) ?? decimalToNumber(project.defaultRate)
    const mult = getOvertimeMultiplier(t.date, overtimePolicy)
    const hours = t.durationMinutes / 60
    const isBillable = (t as { isBillable?: boolean }).isBillable !== false
    if (isBillable) revenue += hours * clientRate
    labourCost += hours * baseRate * mult
  }

  const margin = revenue - labourCost
  const marginPct = revenue > 0 ? (margin / revenue) * 100 : 0

  return NextResponse.json({
    project: { id: project.id, name: project.name },
    from,
    to,
    revenue: Math.round(revenue * 100) / 100,
    labourCost: Math.round(labourCost * 100) / 100,
    margin: Math.round(margin * 100) / 100,
    marginPct: Math.round(marginPct * 10) / 10,
    budget: budget || null,
    budgetVsActual: budget ? Math.round((labourCost / budget) * 1000) / 10 : null,
  })
}
