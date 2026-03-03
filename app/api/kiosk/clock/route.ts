import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

const KIOSK_SECRET = process.env.KIOSK_SECRET

export async function POST(req: Request) {
  const secret = req.headers.get("x-kiosk-secret")
  if (KIOSK_SECRET && secret !== KIOSK_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const b = body as Record<string, unknown>
  const userId = typeof b.userId === "string" ? b.userId : ""
  const action = typeof b.action === "string" ? b.action : ""
  const projectId = typeof b.projectId === "string" ? b.projectId : ""
  const timesheetId = typeof b.timesheetId === "string" ? b.timesheetId : ""

  if (!userId || !["clockIn", "clockOut"].includes(action)) {
    return NextResponse.json({ error: "userId and action required" }, { status: 400 })
  }

  // Verify user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, status: true },
  })
  if (!user || user.status !== "active") {
    return NextResponse.json({ error: "User not found or inactive" }, { status: 404 })
  }

  if (action === "clockIn") {
    if (!projectId) return NextResponse.json({ error: "projectId required for clockIn" }, { status: 400 })

    // Prevent double clock-in
    const existing = await prisma.timesheet.findFirst({
      where: { userId, clockOut: null },
    })
    if (existing) {
      return NextResponse.json({ error: "Already clocked in" }, { status: 409 })
    }

    const now = new Date()
    const timesheet = await prisma.timesheet.create({
      data: {
        userId,
        projectId,
        date: now.toISOString().split("T")[0],
        clockIn: now,
        durationMinutes: 0,
        source: "kiosk",
        status: "pending",
      },
    })
    await prisma.auditLog.create({
      data: {
        userId,
        action: "timesheet.kiosk_clock_in",
        entityType: "timesheet",
        entityId: timesheet.id,
        details: `Kiosk clock-in for project ${projectId}`,
      },
    })
    return NextResponse.json({ timesheet })
  }

  if (action === "clockOut") {
    if (!timesheetId) return NextResponse.json({ error: "timesheetId required for clockOut" }, { status: 400 })

    const timesheet = await prisma.timesheet.findUnique({ where: { id: timesheetId } })
    if (!timesheet || timesheet.userId !== userId) {
      return NextResponse.json({ error: "Timesheet not found" }, { status: 404 })
    }

    const now = new Date()
    const durationMinutes = Math.max(
      0,
      Math.floor((now.getTime() - timesheet.clockIn.getTime()) / 60000) - timesheet.breakMinutes
    )

    const updated = await prisma.timesheet.update({
      where: { id: timesheetId },
      data: { clockOut: now, durationMinutes },
    })
    await prisma.auditLog.create({
      data: {
        userId,
        action: "timesheet.kiosk_clock_out",
        entityType: "timesheet",
        entityId: timesheetId,
        details: `Kiosk clock-out, duration ${durationMinutes}m`,
      },
    })
    return NextResponse.json({ timesheet: updated })
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 })
}
