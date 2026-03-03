import { NextResponse } from "next/server"
import { requireCapability } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { renderToBuffer } from "@react-pdf/renderer"
import { createElement } from "react"
import { PayrollPdfDocument } from "@/components/reports/payroll-pdf"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const access = await requireCapability("financials.read")
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const from = searchParams.get("from")
  const to = searchParams.get("to")

  const timesheets = await prisma.timesheet.findMany({
    where: {
      project: { orgId: access.orgId },
      status: "approved",
      ...(from || to
        ? { date: { ...(from && { gte: from }), ...(to && { lte: to }) } }
        : {}),
    },
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
      project: { select: { name: true } },
    },
    orderBy: [{ date: "asc" }],
  })

  const rows = timesheets.map((t) => ({
    id: t.id,
    date: t.date,
    userName: [t.user.firstName, t.user.lastName].filter(Boolean).join(" ") || t.user.email || "",
    projectName: t.project.name,
    clockIn: t.clockIn.toISOString(),
    clockOut: t.clockOut?.toISOString() ?? "",
    durationMinutes: t.durationMinutes,
    status: t.status,
  }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = createElement(PayrollPdfDocument, { timesheets: rows, from: from ?? undefined, to: to ?? undefined }) as any
  const buffer = await renderToBuffer(element)

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="payroll-report-${from ?? "all"}.pdf"`,
    },
  })
}
