import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getNotificationSettings } from "@/lib/notification-settings"
import { sendPushToUser } from "@/lib/web-push"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgs = await prisma.organization.findMany({
    select: { id: true, settings: true },
  })

  let totalCreated = 0

  for (const org of orgs) {
    const settings = await getNotificationSettings(org.id)
    if (!settings.enabled) continue

    const now = new Date(
      new Date().toLocaleString("en-US", { timeZone: settings.timezone })
    )
    const currentHour = now.getHours()
    const currentDay = now.getDay()
    const todayStr = formatDate(now)

    const clockInHour = parseInt(settings.clockInTime.split(":")[0], 10)
    const clockOutHour = parseInt(settings.clockOutTime.split(":")[0], 10)
    const submitHour = parseInt(settings.timesheetSubmitTime.split(":")[0], 10)

    const activeUsers = await prisma.user.findMany({
      where: { orgId: org.id, status: "active" },
      select: { id: true, firstName: true },
    })

    if (activeUsers.length === 0) continue

    // Weekday clock-in reminder (morning hours)
    if (
      currentDay >= 1 &&
      currentDay <= 5 &&
      currentHour >= clockInHour &&
      currentHour < clockOutHour
    ) {
      const usersWithTimesheetToday = await prisma.timesheet.findMany({
        where: {
          date: todayStr,
          project: { orgId: org.id },
        },
        select: { userId: true },
        distinct: ["userId"],
      })
      const clockedInIds = new Set(usersWithTimesheetToday.map((t) => t.userId))

      for (const user of activeUsers) {
        if (clockedInIds.has(user.id)) continue

        const existing = await prisma.notification.findFirst({
          where: {
            userId: user.id,
            orgId: org.id,
            type: "clock_in_reminder",
            resolvedAt: null,
            createdAt: { gte: startOfDay(now) },
          },
        })

        if (existing) {
          await sendPushToUser(user.id, {
            title: "Reminder: Clock In",
            body: "You haven't clocked in yet today.",
            url: "/dashboard/timesheets",
          })
          continue
        }

        await prisma.notification.create({
          data: {
            userId: user.id,
            orgId: org.id,
            type: "clock_in_reminder",
            title: "Clock In Reminder",
            description: "You haven't clocked in yet today. Tap to clock in now.",
            level: currentHour > clockInHour + 1 ? "warning" : "info",
            href: "/dashboard/timesheets",
          },
        })
        totalCreated++

        await sendPushToUser(user.id, {
          title: "Clock In Reminder",
          body: "You haven't clocked in yet today.",
          url: "/dashboard/timesheets",
        })
      }
    }

    // Weekday clock-out reminder (evening hours)
    if (
      currentDay >= 1 &&
      currentDay <= 5 &&
      currentHour >= clockOutHour
    ) {
      const openTimesheets = await prisma.timesheet.findMany({
        where: {
          date: todayStr,
          clockOut: null,
          project: { orgId: org.id },
        },
        select: { userId: true },
        distinct: ["userId"],
      })
      const openUserIds = new Set(openTimesheets.map((t) => t.userId))

      for (const user of activeUsers) {
        if (!openUserIds.has(user.id)) continue

        const existing = await prisma.notification.findFirst({
          where: {
            userId: user.id,
            orgId: org.id,
            type: "clock_out_reminder",
            resolvedAt: null,
            createdAt: { gte: startOfDay(now) },
          },
        })

        if (existing) {
          await sendPushToUser(user.id, {
            title: "Reminder: Clock Out",
            body: "You're still clocked in. Don't forget to clock out.",
            url: "/dashboard/timesheets",
          })
          continue
        }

        await prisma.notification.create({
          data: {
            userId: user.id,
            orgId: org.id,
            type: "clock_out_reminder",
            title: "Clock Out Reminder",
            description:
              "You're still clocked in. Don't forget to clock out for the day.",
            level: currentHour > clockOutHour + 1 ? "warning" : "info",
            href: "/dashboard/timesheets",
          },
        })
        totalCreated++

        await sendPushToUser(user.id, {
          title: "Clock Out Reminder",
          body: "You're still clocked in. Don't forget to clock out.",
          url: "/dashboard/timesheets",
        })
      }
    }

    // Weekly timesheet submission reminder (configured day, e.g. Saturday)
    if (currentDay === settings.timesheetSubmitDay && currentHour >= submitHour) {
      const weekStart = getWeekStart(now)
      const weekEnd = todayStr

      const usersWithPending = await prisma.timesheet.findMany({
        where: {
          project: { orgId: org.id },
          status: "pending",
          date: { gte: weekStart, lte: weekEnd },
        },
        select: { userId: true },
        distinct: ["userId"],
      })
      const pendingUserIds = new Set(usersWithPending.map((t) => t.userId))

      for (const user of activeUsers) {
        if (!pendingUserIds.has(user.id)) continue

        const weekStartDate = new Date(weekStart + "T00:00:00")
        const existing = await prisma.notification.findFirst({
          where: {
            userId: user.id,
            orgId: org.id,
            type: "timesheet_submit_reminder",
            resolvedAt: null,
            createdAt: { gte: weekStartDate },
          },
        })

        if (existing) {
          await sendPushToUser(user.id, {
            title: "Reminder: Submit Timesheets",
            body: "You have pending timesheets for this week.",
            url: "/dashboard/timesheets",
          })
          continue
        }

        await prisma.notification.create({
          data: {
            userId: user.id,
            orgId: org.id,
            type: "timesheet_submit_reminder",
            title: "Submit Timesheets",
            description:
              "You have pending timesheets for this week. Please submit them for approval.",
            level: currentHour > submitHour + 2 ? "warning" : "info",
            href: "/dashboard/timesheets",
          },
        })
        totalCreated++

        await sendPushToUser(user.id, {
          title: "Submit Timesheets",
          body: "You have pending timesheets for this week.",
          url: "/dashboard/timesheets",
        })
      }
    }
  }

  return NextResponse.json({ ok: true, created: totalCreated })
}

function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function startOfDay(d: Date): Date {
  const s = new Date(d)
  s.setHours(0, 0, 0, 0)
  return s
}

function getWeekStart(d: Date): string {
  const s = new Date(d)
  const day = s.getDay()
  const diff = day === 0 ? 6 : day - 1
  s.setDate(s.getDate() - diff)
  return formatDate(s)
}
