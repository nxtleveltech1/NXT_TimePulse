import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { isAdminOrManager } from "@/lib/auth"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, orgRole } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const timesheet = await prisma.timesheet.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
      project: { select: { id: true, name: true } },
      geozone: { select: { id: true, name: true } },
    },
  })
  if (!timesheet) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const isAdmin = isAdminOrManager(orgRole as string)
  if (!isAdmin && timesheet.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  return NextResponse.json(timesheet)
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, orgRole } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const timesheet = await prisma.timesheet.findUnique({ where: { id } })
  if (!timesheet) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const isAdmin = isAdminOrManager(orgRole as string)
  if (!isAdmin && timesheet.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const b = body as Record<string, unknown>
  const data: Record<string, unknown> = {}
  if (typeof b.clockOut === "string") data.clockOut = new Date(b.clockOut)
  if (typeof b.notes === "string") data.notes = b.notes
  if (typeof b.isBillable === "boolean") data.isBillable = b.isBillable
  if (typeof b.status === "string" && ["pending", "approved", "rejected", "flagged"].includes(b.status)) {
    data.status = b.status
  }
  const adjustmentReason = typeof b.adjustmentReason === "string" ? b.adjustmentReason : null
  if (adjustmentReason) data.adjustmentReason = adjustmentReason

  const statusChanged = data.status !== undefined && data.status !== timesheet.status
  if (statusChanged && isAdmin && !adjustmentReason) {
    return NextResponse.json(
      { error: "adjustmentReason required when changing status" },
      { status: 400 }
    )
  }

  if (data.status === "approved" && isAdmin) {
    data.approvedById = userId
    data.approvedAt = new Date()
  }

  if (Object.keys(data).length > 0) {
    await prisma.auditLog.create({
      data: {
        userId,
        action: data.status === "approved" ? "approve" : "edit",
        entityType: "timesheet",
        entityId: id,
        details: adjustmentReason
          ? `Timesheet ${data.status ?? "updated"}: ${adjustmentReason}`
          : `Timesheet ${data.status ?? "updated"}`,
        previousValue: timesheet.status,
        newValue: (data.status as string) ?? timesheet.status,
      },
    })
  }

  if (data.clockOut && timesheet.clockIn) {
    data.durationMinutes = Math.floor(
      ((data.clockOut as Date).getTime() - timesheet.clockIn.getTime()) / 60000
    )
  }

  const updated = await prisma.timesheet.update({
    where: { id },
    data: data as Parameters<typeof prisma.timesheet.update>[0]["data"],
  })
  return NextResponse.json(updated)
}
