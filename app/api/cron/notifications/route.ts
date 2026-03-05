import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getNotificationSettings } from "@/lib/notification-settings"
import { sendPushToUser } from "@/lib/web-push"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const TAG = "[cron/notifications]"

export async function GET(req: Request) {
  const start = Date.now()
  const utcNow = new Date()
  console.log(
    `${TAG} Cron fired — UTC: ${utcNow.toISOString()}, hour: ${utcNow.getUTCHours()}`
  )

  if (!process.env.CRON_SECRET) {
    console.error(`${TAG} CRON_SECRET env var is not set — aborting`)
    return NextResponse.json(
      { error: "Server misconfigured" },
      { status: 500 }
    )
  }

  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.warn(`${TAG} Unauthorized request — invalid or missing bearer token`)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgs = await prisma.organization.findMany({
    select: { id: true, name: true, settings: true },
  })

  console.log(`${TAG} Found ${orgs.length} org(s)`)

  let totalCreated = 0
  let totalPushSent = 0
  const orgResults: Record<string, { created: number; pushed: number; skipped: string | null }> = {}

  for (const org of orgs) {
    const settings = await getNotificationSettings(org.id)

    if (!settings.enabled) {
      console.log(`${TAG} [${org.name}] notifications disabled — skipping`)
      orgResults[org.name ?? org.id] = { created: 0, pushed: 0, skipped: "disabled" }
      continue
    }

    const now = new Date(
      new Date().toLocaleString("en-US", { timeZone: settings.timezone })
    )
    const currentHour = now.getHours()
    const currentDay = now.getDay()
    const todayStr = formatDate(now)

    console.log(
      `${TAG} [${org.name}] tz=${settings.timezone} localHour=${currentHour} day=${currentDay} date=${todayStr}`
    )

    const clockInHour = parseInt(settings.clockInTime.split(":")[0], 10)
    const clockOutHour = parseInt(settings.clockOutTime.split(":")[0], 10)
    const submitHour = parseInt(settings.timesheetSubmitTime.split(":")[0], 10)

    const activeUsers = await prisma.user.findMany({
      where: { orgId: org.id, status: "active" },
      select: { id: true, firstName: true },
    })

    if (activeUsers.length === 0) {
      console.log(`${TAG} [${org.name}] no active users — skipping`)
      orgResults[org.name ?? org.id] = { created: 0, pushed: 0, skipped: "no_users" }
      continue
    }

    console.log(`${TAG} [${org.name}] ${activeUsers.length} active user(s)`)

    let orgCreated = 0
    let orgPushed = 0

    // ── Weekday clock-in reminder (morning hours) ──
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
      const needsReminder = activeUsers.filter((u) => !clockedInIds.has(u.id))

      console.log(
        `${TAG} [${org.name}] clock-in: ${clockedInIds.size} clocked in, ${needsReminder.length} need reminder`
      )

      for (const user of needsReminder) {
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
          orgPushed++
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
        orgCreated++

        await sendPushToUser(user.id, {
          title: "Clock In Reminder",
          body: "You haven't clocked in yet today.",
          url: "/dashboard/timesheets",
        })
        orgPushed++
      }
    }

    // ── Weekday clock-out reminder (evening hours) ──
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
      const stillClockedIn = activeUsers.filter((u) => openUserIds.has(u.id))

      console.log(
        `${TAG} [${org.name}] clock-out: ${openUserIds.size} still clocked in`
      )

      for (const user of stillClockedIn) {
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
          orgPushed++
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
        orgCreated++

        await sendPushToUser(user.id, {
          title: "Clock Out Reminder",
          body: "You're still clocked in. Don't forget to clock out.",
          url: "/dashboard/timesheets",
        })
        orgPushed++
      }
    }

    // ── Weekly timesheet submission reminder ──
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
      const needsSubmit = activeUsers.filter((u) => pendingUserIds.has(u.id))

      console.log(
        `${TAG} [${org.name}] timesheet-submit: ${pendingUserIds.size} with pending timesheets`
      )

      for (const user of needsSubmit) {
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
          orgPushed++
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
        orgCreated++

        await sendPushToUser(user.id, {
          title: "Submit Timesheets",
          body: "You have pending timesheets for this week.",
          url: "/dashboard/timesheets",
        })
        orgPushed++
      }
    }

    totalCreated += orgCreated
    totalPushSent += orgPushed
    orgResults[org.name ?? org.id] = { created: orgCreated, pushed: orgPushed, skipped: null }

    console.log(
      `${TAG} [${org.name}] done — ${orgCreated} created, ${orgPushed} push attempts`
    )
  }

  const elapsed = Date.now() - start
  console.log(
    `${TAG} Complete — ${totalCreated} notifications created, ${totalPushSent} push attempts, ${elapsed}ms`
  )

  return NextResponse.json({
    ok: true,
    created: totalCreated,
    pushed: totalPushSent,
    orgs: orgResults,
    elapsed,
  })
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
