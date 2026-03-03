"use client"

import { useState } from "react"
import {
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
} from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export interface CalendarEntry {
  id: string
  date: string
  label: string
  status: string
  color?: "primary" | "success" | "warning" | "destructive"
}

interface TimesheetCalendarProps {
  entries: CalendarEntry[]
}

const statusColor: Record<string, string> = {
  approved: "bg-green-500",
  pending: "bg-yellow-500",
  rejected: "bg-destructive",
  flagged: "bg-orange-500",
}

export function TimesheetCalendar({ entries }: TimesheetCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  const entriesByDay = entries.reduce<Record<string, CalendarEntry[]>>((acc, entry) => {
    const key = entry.date.slice(0, 10)
    if (!acc[key]) acc[key] = []
    acc[key].push(entry)
    return acc
  }, {})

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{format(currentMonth, "MMMM yyyy")}</h3>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(new Date())}>
              Today
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 text-center text-xs font-medium text-muted-foreground">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border bg-border">
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd")
            const dayEntries = entriesByDay[key] ?? []
            const inMonth = isSameMonth(day, currentMonth)
            const today = isToday(day)

            return (
              <div
                key={key}
                className={cn(
                  "min-h-[72px] bg-background p-1.5",
                  !inMonth && "bg-muted/30",
                  today && "ring-1 ring-inset ring-primary"
                )}
              >
                <div className={cn(
                  "mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs",
                  today && "bg-primary text-primary-foreground font-bold",
                  !inMonth && "text-muted-foreground/50",
                )}>
                  {format(day, "d")}
                </div>
                <div className="space-y-0.5">
                  {dayEntries.slice(0, 3).map((entry) => (
                    <Tooltip key={entry.id}>
                      <TooltipTrigger asChild>
                        <div className={cn(
                          "flex items-center gap-1 truncate rounded px-1 py-0.5 text-[10px]",
                          "bg-primary/10 text-primary cursor-default"
                        )}>
                          <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", statusColor[entry.status] ?? "bg-primary")} />
                          <span className="truncate">{entry.label}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{entry.label}</p>
                        <p className="capitalize text-muted-foreground">{entry.status}</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                  {dayEntries.length > 3 && (
                    <Badge variant="secondary" className="h-4 w-full justify-center text-[10px]">
                      +{dayEntries.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {Object.entries(statusColor).map(([status, color]) => (
            <div key={status} className="flex items-center gap-1">
              <span className={cn("h-2 w-2 rounded-full", color)} />
              <span className="capitalize">{status}</span>
            </div>
          ))}
        </div>
      </div>
    </TooltipProvider>
  )
}
