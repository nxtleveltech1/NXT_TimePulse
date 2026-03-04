"use server"

import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"
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
