"use server"

import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireCapability } from "@/lib/auth"

export async function approveTimesheet(timesheetId: string) {
  const access = await requireCapability("users.write")
  if (!access) throw new Error("Forbidden")

  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  const updated = await prisma.timesheet.update({
    where: { id: timesheetId },
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
      action: "timesheet.approved",
      entityType: "timesheet",
      entityId: timesheetId,
      details: "Timesheet approved",
    },
  })

  revalidatePath("/dashboard/timesheets")
  revalidatePath("/dashboard/timesheets/weekly")
  return updated
}

export async function rejectTimesheet(timesheetId: string, reason?: string) {
  const access = await requireCapability("users.write")
  if (!access) throw new Error("Forbidden")

  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  const updated = await prisma.timesheet.update({
    where: { id: timesheetId },
    data: {
      status: "rejected",
      notes: reason ?? null,
      updatedAt: new Date(),
    },
  })

  await prisma.auditLog.create({
    data: {
      userId,
      action: "timesheet.rejected",
      entityType: "timesheet",
      entityId: timesheetId,
      details: reason ? `Rejected: ${reason}` : "Timesheet rejected",
    },
  })

  revalidatePath("/dashboard/timesheets")
  revalidatePath("/dashboard/timesheets/weekly")
  return updated
}

export async function clockIn(projectId: string, geozoneId?: string) {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  const existing = await prisma.timesheet.findFirst({
    where: { userId, clockOut: null },
  })
  if (existing) throw new Error("Already clocked in")

  const now = new Date()
  const timesheet = await prisma.timesheet.create({
    data: {
      userId,
      projectId,
      geozoneId: geozoneId ?? null,
      date: now.toISOString().split("T")[0],
      clockIn: now,
      source: "manual",
      status: "pending",
      durationMinutes: 0,
      breakMinutes: 0,
      overtimeMinutes: 0,
      updatedAt: now,
    },
  })

  revalidatePath("/dashboard/worker")
  revalidatePath("/dashboard/timesheets")
  revalidatePath("/dashboard/timesheets/weekly")
  return timesheet
}

export async function clockOut(timesheetId: string) {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  const timesheet = await prisma.timesheet.findFirst({
    where: { id: timesheetId, userId, clockOut: null },
  })
  if (!timesheet) throw new Error("No open timesheet found")

  const now = new Date()
  const durationMs = now.getTime() - timesheet.clockIn.getTime()
  const durationMinutes = Math.floor(durationMs / 60000)

  const updated = await prisma.timesheet.update({
    where: { id: timesheetId },
    data: { clockOut: now, durationMinutes, updatedAt: now },
  })

  revalidatePath("/dashboard/worker")
  revalidatePath("/dashboard/timesheets")
  revalidatePath("/dashboard/timesheets/weekly")
  return updated
}
