import { prisma } from "@/lib/prisma"

export async function resolveNotifications(
  userId: string,
  type: "clock_in_reminder" | "clock_out_reminder" | "timesheet_submit_reminder",
  since?: Date
): Promise<void> {
  const sinceDate = since ?? startOfToday()

  await prisma.notification.updateMany({
    where: {
      userId,
      type,
      resolvedAt: null,
      createdAt: { gte: sinceDate },
    },
    data: { resolvedAt: new Date(), read: true },
  })
}

function startOfToday(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export function getWeekStartDate(): Date {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? 6 : day - 1
  d.setDate(d.getDate() - diff)
  d.setHours(0, 0, 0, 0)
  return d
}
