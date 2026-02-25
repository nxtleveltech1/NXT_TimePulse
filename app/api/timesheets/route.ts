import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { isAdminOrManager } from "@/lib/auth"

export async function GET(req: Request) {
  const { userId, orgId, orgRole } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get("projectId")
  const status = searchParams.get("status")
  const from = searchParams.get("from")
  const to = searchParams.get("to")

  const isAdmin = isAdminOrManager(orgRole as string)
  const org = orgId ?? "org_default"

  const where: Record<string, unknown> = {
    project: { orgId: org },
  }
  if (!isAdmin) where.userId = userId
  if (projectId) where.projectId = projectId
  if (status) where.status = status
  if (from || to) {
    where.date = {}
    if (from) (where.date as Record<string, string>).gte = from
    if (to) (where.date as Record<string, string>).lte = to
  }

  const timesheets = await prisma.timesheet.findMany({
    where,
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
      project: { select: { id: true, name: true } },
      geozone: { select: { id: true, name: true } },
    },
    orderBy: [{ date: "desc" }, { clockIn: "desc" }],
    take: 100,
  })
  return NextResponse.json(timesheets)
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const b = body as Record<string, unknown>
  const projectId = typeof b.projectId === "string" ? b.projectId : ""
  const geozoneId = typeof b.geozoneId === "string" && b.geozoneId ? b.geozoneId : null
  const clockIn = b.clockIn ? new Date(b.clockIn as string) : new Date()
  const clockOut = b.clockOut ? new Date(b.clockOut as string) : null

  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 })

  const dateStr = clockIn.toISOString().split("T")[0]
  const durationMinutes = clockOut
    ? Math.floor((clockOut.getTime() - clockIn.getTime()) / 60000)
    : 0

  const timesheet = await prisma.timesheet.create({
    data: {
      userId,
      projectId,
      geozoneId,
      date: dateStr,
      clockIn,
      clockOut,
      durationMinutes,
      source: "manual",
      status: "pending",
      notes: typeof b.notes === "string" ? b.notes : "",
      breakMinutes: typeof b.breakMinutes === "number" ? b.breakMinutes : 0,
      overtimeMinutes: typeof b.overtimeMinutes === "number" ? b.overtimeMinutes : 0,
      isBillable: typeof b.isBillable === "boolean" ? b.isBillable : true,
    },
  })
  await prisma.auditLog.create({
    data: {
      userId,
      action: "timesheet.created",
      entityType: "timesheet",
      entityId: timesheet.id,
      details: `Timesheet created for project ${projectId}`,
    },
  })
  return NextResponse.json(timesheet)
}
