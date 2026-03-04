"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { format, startOfWeek, endOfWeek, eachDayOfInterval, parseISO } from "date-fns"

type WeekTimesheet = {
  date: string
  durationMinutes: number
  clockOut: string | null
}

interface WorkerWeekSummaryProps {
  timesheets: WeekTimesheet[]
}

export function WorkerWeekSummary({ timesheets }: WorkerWeekSummaryProps) {
  const today = new Date()
  const weekStart = startOfWeek(today, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd })

  const todayStr = format(today, "yyyy-MM-dd")

  const hoursPerDay = days.map((day) => {
    const dateStr = format(day, "yyyy-MM-dd")
    const dayEntries = timesheets.filter(
      (t) => t.date === dateStr && t.clockOut !== null
    )
    const totalMinutes = dayEntries.reduce((s, t) => s + t.durationMinutes, 0)
    return {
      day,
      dateStr,
      totalMinutes,
      hours: totalMinutes / 60,
      isToday: dateStr === todayStr,
      isFuture: day > today,
    }
  })

  const weekTotal = hoursPerDay.reduce((s, d) => s + d.totalMinutes, 0)
  const weekHours = Math.floor(weekTotal / 60)
  const weekMins = weekTotal % 60
  const weekDisplay = weekTotal === 0 ? "0h" : weekMins === 0 ? `${weekHours}h` : `${weekHours}h ${weekMins}m`

  const maxHours = Math.max(...hoursPerDay.map((d) => d.hours), 8)

  return (
    <Card>
      <CardHeader className="p-4 pb-2 md:p-6 md:pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">This week</CardTitle>
          <span className="text-xl font-bold tabular-nums">{weekDisplay}</span>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
        <div className="flex items-end gap-1.5 h-16">
          {hoursPerDay.map(({ day, hours, isToday, isFuture, totalMinutes }) => {
            const barHeight = maxHours > 0 ? Math.max((hours / maxHours) * 100, hours > 0 ? 8 : 0) : 0
            const label = totalMinutes === 0
              ? "—"
              : `${Math.floor(totalMinutes / 60)}h${totalMinutes % 60 > 0 ? ` ${totalMinutes % 60}m` : ""}`

            return (
              <div
                key={day.toISOString()}
                className="flex flex-1 flex-col items-center gap-1"
                title={`${format(day, "EEEE")}: ${label}`}
              >
                <div className="flex w-full flex-1 items-end">
                  <div
                    className={cn(
                      "w-full rounded-t-sm transition-all",
                      isToday
                        ? "bg-primary"
                        : isFuture
                          ? "bg-muted"
                          : hours > 0
                            ? "bg-primary/40"
                            : "bg-muted/40"
                    )}
                    style={{ height: `${barHeight}%`, minHeight: barHeight > 0 ? "3px" : "0" }}
                  />
                </div>
                <span
                  className={cn(
                    "text-[10px] font-medium",
                    isToday ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {format(day, "EEEEE")}
                </span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
