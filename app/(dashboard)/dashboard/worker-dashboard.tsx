import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { WorkerClock } from "./worker/worker-clock"
import { WorkerQuickActions } from "./worker-quick-actions"
import { WorkerTodaySummary } from "./worker-today-summary"
import { WorkerWeekSummary } from "./worker-week-summary"
import { WorkerRecentEntries } from "./worker-recent-entries"
import { WorkerUpcomingLeave } from "./worker-upcoming-leave"
import { serializeForClient } from "@/lib/serialize"

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

export async function WorkerDashboard() {
  const { userId } = await auth()
  if (!userId) return null

  const today = new Date()
  const todayStr = format(today, "yyyy-MM-dd")
  const weekStart = startOfWeek(today, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 })
  const weekDates = eachDayOfInterval({ start: weekStart, end: weekEnd }).map((d) =>
    format(d, "yyyy-MM-dd")
  )

  const [
    userRecord,
    openTimesheet,
    allocations,
    todayTimesheets,
    weekTimesheets,
    recentTimesheets,
    upcomingLeave,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    }),
    prisma.timesheet.findFirst({
      where: { userId, clockOut: null },
      include: {
        project: { select: { name: true } },
        geozone: { select: { name: true } },
      },
      orderBy: { clockIn: "desc" },
    }),
    prisma.projectAllocation.findMany({
      where: { userId, isActive: true },
      include: { project: { select: { id: true, name: true } } },
    }),
    prisma.timesheet.findMany({
      where: { userId, date: todayStr },
      select: { durationMinutes: true, breakMinutes: true, clockOut: true },
    }),
    prisma.timesheet.findMany({
      where: { userId, date: { in: weekDates } },
      select: { date: true, durationMinutes: true, clockOut: true },
    }),
    prisma.timesheet.findMany({
      where: { userId },
      include: { project: { select: { name: true } } },
      orderBy: [{ date: "desc" }, { clockIn: "desc" }],
      take: 5,
    }),
    prisma.leaveRequest.findMany({
      where: {
        userId,
        status: { in: ["pending", "approved"] },
        endDate: { gte: today },
      },
      orderBy: { startDate: "asc" },
      take: 5,
    }),
  ])

  const lastCompletedTimesheet =
    recentTimesheets.find((t) => t.clockOut !== null && t.id !== openTimesheet?.id) ?? null

  const firstName = userRecord?.firstName ?? "there"
  const isClockedIn = openTimesheet !== null

  const recentEntries = recentTimesheets.map((t) => ({
    id: t.id,
    date: t.date,
    clockIn: t.clockIn instanceof Date ? t.clockIn.toISOString() : t.clockIn,
    clockOut: t.clockOut instanceof Date ? t.clockOut.toISOString() : (t.clockOut ?? null),
    durationMinutes: t.durationMinutes,
    source: t.source,
    status: t.status,
    project: { name: t.project.name },
  }))

  const leaveItems = upcomingLeave.map((l) => ({
    id: l.id,
    startDate: format(l.startDate, "yyyy-MM-dd"),
    endDate: format(l.endDate, "yyyy-MM-dd"),
    type: l.type,
    status: l.status,
    reason: l.reason ?? null,
  }))

  const todayData = todayTimesheets.map((t) => ({
    durationMinutes: t.durationMinutes,
    breakMinutes: t.breakMinutes,
    clockOut: t.clockOut instanceof Date ? t.clockOut.toISOString() : (t.clockOut ?? null),
  }))

  const weekData = weekTimesheets.map((t) => ({
    date: t.date,
    durationMinutes: t.durationMinutes,
    clockOut: t.clockOut instanceof Date ? t.clockOut.toISOString() : (t.clockOut ?? null),
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {getGreeting()}, {firstName}
          </h1>
          <p className="text-sm text-muted-foreground">
            {format(today, "EEEE, MMMM d, yyyy")}
          </p>
        </div>
        <Badge
          variant="outline"
          className={
            isClockedIn
              ? "border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400"
              : "border-muted text-muted-foreground"
          }
        >
          <span
            className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${isClockedIn ? "bg-green-500 animate-pulse" : "bg-muted-foreground"}`}
          />
          {isClockedIn ? "Clocked In" : "Off Clock"}
        </Badge>
      </div>

      {/* Clock Widget — hero */}
      <WorkerClock
        openTimesheet={serializeForClient(openTimesheet)}
        allocations={serializeForClient(allocations)}
        lastTimesheet={
          lastCompletedTimesheet
            ? serializeForClient({
                projectId: lastCompletedTimesheet.projectId,
                project: lastCompletedTimesheet.project,
              })
            : undefined
        }
      />

      {/* Quick Actions */}
      <WorkerQuickActions allocations={serializeForClient(allocations)} />

      {/* Today + Week summary — side by side on wider screens */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <WorkerTodaySummary timesheets={todayData} />
        <WorkerWeekSummary timesheets={weekData} />
      </div>

      {/* Recent Entries + Upcoming Leave — side by side on wider screens */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <WorkerRecentEntries entries={recentEntries} />
        <WorkerUpcomingLeave leaves={leaveItems} />
      </div>
    </div>
  )
}
