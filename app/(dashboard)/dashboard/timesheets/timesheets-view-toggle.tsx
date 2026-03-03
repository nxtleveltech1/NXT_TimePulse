"use client"

import { useState } from "react"
import { List, CalendarDays } from "lucide-react"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { TimesheetCalendar, type CalendarEntry } from "@/components/timesheet-calendar"

interface TimesheetsViewToggleProps {
  tableView: React.ReactNode
  entries: CalendarEntry[]
}

export function TimesheetsViewToggle({ tableView, entries }: TimesheetsViewToggleProps) {
  const [view, setView] = useState<"list" | "calendar">("list")

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v as "list" | "calendar")}>
          <ToggleGroupItem value="list" aria-label="List view">
            <List className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="calendar" aria-label="Calendar view">
            <CalendarDays className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      {view === "list" ? tableView : <TimesheetCalendar entries={entries} />}
    </div>
  )
}
