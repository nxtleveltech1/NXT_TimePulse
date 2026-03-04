"use server"

import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"
import { addDays, format } from "date-fns"
import { prisma } from "@/lib/prisma"
import { requireCapability } from "@/lib/auth"

export async function bulkApproveTimesheets(timesheetIds: string[]) {
  const access = await requireCapability("users.write")
  if (!access) throw new Error("Forbidden")

  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  if (!timesheetIds.length) throw new Error("No timesheets selected")
  if (timesheetIds.length > 100) throw new Error("Cannot bulk-approve more than 100 timesheets at once")

  const updated = await prisma.timesheet.updateMany({
    where: {
      id: { in: timesheetIds },
      project: { orgId: access.orgId },
      status: "pending",
    },
    data: {
      status: "approved",
      approvedById: userId,
      approvedAt: new Date(),
      updatedAt: new Date(),
    },
  })

  await prisma.auditLog.create({
    data: {
      userId,
      action: "timesheets.bulk_approved",
      entityType: "timesheet",
      entityId: timesheetIds.join(","),
      details: `Bulk approved ${updated.count} timesheets`,
    },
  })

  revalidatePath("/dashboard/timesheets")
  revalidatePath("/dashboard/timesheets/weekly")
  return { count: updated.count }
}

export async function bulkRejectTimesheets(timesheetIds: string[], reason?: string) {
  const access = await requireCapability("users.write")
  if (!access) throw new Error("Forbidden")

  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  if (!timesheetIds.length) throw new Error("No timesheets selected")

  const updated = await prisma.timesheet.updateMany({
    where: {
      id: { in: timesheetIds },
      project: { orgId: access.orgId },
      status: "pending",
    },
    data: {
      status: "rejected",
      notes: reason ?? null,
      updatedAt: new Date(),
    },
  })

  revalidatePath("/dashboard/timesheets")
  revalidatePath("/dashboard/timesheets/weekly")
  return { count: updated.count }
}

export async function exportTimesheetsCsv(filters: {
  projectId?: string
  userId?: string
  from?: string
  to?: string
  status?: string
}) {
  const access = await requireCapability("financials.read")
  if (!access) throw new Error("Forbidden")

  const timesheets = await prisma.timesheet.findMany({
    where: {
      project: { orgId: access.orgId },
      ...(filters.projectId && { projectId: filters.projectId }),
      ...(filters.userId && { userId: filters.userId }),
      ...(filters.status && { status: filters.status }),
      ...(filters.from || filters.to
        ? {
            date: {
              ...(filters.from && { gte: filters.from }),
              ...(filters.to && { lte: filters.to }),
            },
          }
        : {}),
    },
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
      project: { select: { name: true } },
      geozone: { select: { name: true } },
    },
    orderBy: [{ date: "desc" }],
  })

  const header = "Date,User,Project,Geozone,Clock In,Clock Out,Duration (mins),Status,Source\n"
  const rows = timesheets.map((t) => {
    const name = [t.user.firstName, t.user.lastName].filter(Boolean).join(" ") || t.user.email || t.userId
    return [
      t.date,
      `"${name}"`,
      `"${t.project.name}"`,
      `"${t.geozone?.name ?? ""}"`,
      t.clockIn.toISOString(),
      t.clockOut?.toISOString() ?? "",
      t.durationMinutes,
      t.status,
      t.source,
    ].join(",")
  })

  return header + rows.join("\n")
}

export async function bulkApproveWeek(targetUserId: string, weekStartDate: string) {
  const access = await requireCapability("users.write")
  if (!access) throw new Error("Forbidden")

  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  if (!targetUserId) throw new Error("Worker is required")
  if (!weekStartDate) throw new Error("Week start date is required")

  const weekStart = new Date(`${weekStartDate}T00:00:00`)
  const weekEnd = format(addDays(weekStart, 6), "yyyy-MM-dd")

  const updated = await prisma.timesheet.updateMany({
    where: {
      userId: targetUserId,
      project: { orgId: access.orgId },
      status: "pending",
      date: { gte: weekStartDate, lte: weekEnd },
    },
    data: {
      status: "approved",
      approvedById: userId,
      approvedAt: new Date(),
      updatedAt: new Date(),
    },
  })

  await prisma.auditLog.create({
    data: {
      userId,
      action: "timesheets.week_approved",
      entityType: "timesheet",
      entityId: targetUserId,
      details: `Bulk approved ${updated.count} timesheets for week ${weekStartDate} – ${weekEnd}`,
    },
  })

  revalidatePath("/dashboard/timesheets")
  revalidatePath("/dashboard/timesheets/weekly")
  return { count: updated.count }
}

export async function bulkRejectDay(targetUserId: string, date: string, reason: string) {
  const access = await requireCapability("users.write")
  if (!access) throw new Error("Forbidden")

  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  if (!targetUserId) throw new Error("Worker is required")
  if (!date) throw new Error("Date is required")
  if (!reason.trim()) throw new Error("Reason is required for rejection")

  const updated = await prisma.timesheet.updateMany({
    where: {
      userId: targetUserId,
      project: { orgId: access.orgId },
      status: "pending",
      date,
    },
    data: {
      status: "rejected",
      notes: reason.trim(),
      updatedAt: new Date(),
    },
  })

  await prisma.auditLog.create({
    data: {
      userId,
      action: "timesheets.day_rejected",
      entityType: "timesheet",
      entityId: targetUserId,
      details: `Rejected ${updated.count} timesheets for ${date}: ${reason.trim()}`,
    },
  })

  revalidatePath("/dashboard/timesheets")
  revalidatePath("/dashboard/timesheets/weekly")
  return { count: updated.count }
}

export async function getPendingTimesheetCount(
  targetUserId: string,
  dateFrom: string,
  dateTo: string
) {
  const access = await requireCapability("users.write")
  if (!access) return 0

  return prisma.timesheet.count({
    where: {
      userId: targetUserId,
      project: { orgId: access.orgId },
      status: "pending",
      date: { gte: dateFrom, lte: dateTo },
    },
  })
}
