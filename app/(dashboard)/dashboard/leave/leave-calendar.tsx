"use client"

import { TimesheetCalendar, type CalendarEntry } from "@/components/timesheet-calendar"

interface LeaveEntry {
  id: string
  startDate: string
  endDate: string
  type: string
  status: string
}

function expandLeaveToCalendarEntries(leaves: LeaveEntry[]): CalendarEntry[] {
  const entries: CalendarEntry[] = []
  for (const leave of leaves) {
    const start = new Date(leave.startDate)
    const end = new Date(leave.endDate)
    const current = new Date(start)
    while (current <= end) {
      entries.push({
        id: `${leave.id}-${current.toISOString().slice(0, 10)}`,
        date: current.toISOString().slice(0, 10),
        label: leave.type,
        status: leave.status,
      })
      current.setDate(current.getDate() + 1)
    }
  }
  return entries
}

export function LeaveCalendar({ leaves }: { leaves: LeaveEntry[] }) {
  const entries = expandLeaveToCalendarEntries(leaves)
  return <TimesheetCalendar entries={entries} />
}
