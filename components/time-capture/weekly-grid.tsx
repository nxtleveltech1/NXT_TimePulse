"use client"

import { useState, useCallback } from "react"
import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  format,
  eachDayOfInterval,
  parseISO,
} from "date-fns"
import { ChevronLeft, ChevronRight, Copy, Send, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

type Allocation = {
  id: string
  projectId: string
  project: { id: string; name: string }
}

type ExistingEntry = {
  date: string
  projectId: string
  durationMinutes: number
  status: string
}

interface WeeklyGridProps {
  allocations: Allocation[]
  existingEntries: ExistingEntry[]
}

type GridCell = {
  hours: string
  hasExisting: boolean
  existingStatus?: string
}

type GridState = Record<string, Record<string, GridCell>>

const DEFAULT_CLOCK_IN = "09:00"

function hoursToClockOut(date: Date, hours: number): string {
  const ms = hours * 3600000
  const clockIn = new Date(`${format(date, "yyyy-MM-dd")}T${DEFAULT_CLOCK_IN}`)
  return new Date(clockIn.getTime() + ms).toISOString()
}

export function WeeklyGrid({ allocations, existingEntries }: WeeklyGridProps) {
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )
  const [grid, setGrid] = useState<GridState>(() => initGrid(allocations, existingEntries, startOfWeek(new Date(), { weekStartsOn: 1 })))
  const [loading, setLoading] = useState(false)

  const weekDays = eachDayOfInterval({ start: weekStart, end: endOfWeek(weekStart, { weekStartsOn: 1 }) })

  function initGrid(
    allocs: Allocation[],
    entries: ExistingEntry[],
    ws: Date
  ): GridState {
    const days = eachDayOfInterval({ start: ws, end: endOfWeek(ws, { weekStartsOn: 1 }) })
    const g: GridState = {}
    for (const alloc of allocs) {
      g[alloc.projectId] = {}
      for (const day of days) {
        const dateStr = format(day, "yyyy-MM-dd")
        const existing = entries.find(
          (e) => e.date === dateStr && e.projectId === alloc.projectId
        )
        g[alloc.projectId][dateStr] = {
          hours: existing ? (existing.durationMinutes / 60).toFixed(1) : "",
          hasExisting: !!existing,
          existingStatus: existing?.status,
        }
      }
    }
    return g
  }

  function navigate(direction: "prev" | "next") {
    const newWeekStart = direction === "prev" ? subWeeks(weekStart, 1) : addWeeks(weekStart, 1)
    setWeekStart(newWeekStart)
    setGrid(initGrid(allocations, existingEntries, newWeekStart))
  }

  function setCell(projectId: string, date: string, value: string) {
    setGrid((prev) => ({
      ...prev,
      [projectId]: {
        ...prev[projectId],
        [date]: { ...prev[projectId][date], hours: value },
      },
    }))
  }

  function copyPreviousWeek() {
    const prevWeekStart = subWeeks(weekStart, 1)
    const prevDays = eachDayOfInterval({
      start: prevWeekStart,
      end: endOfWeek(prevWeekStart, { weekStartsOn: 1 }),
    })
    setGrid((prev) => {
      const updated = { ...prev }
      for (const alloc of allocations) {
        updated[alloc.projectId] = { ...updated[alloc.projectId] }
        weekDays.forEach((day, i) => {
          const prevDate = format(prevDays[i], "yyyy-MM-dd")
          const currentDate = format(day, "yyyy-MM-dd")
          const prevEntry = existingEntries.find(
            (e) => e.date === prevDate && e.projectId === alloc.projectId
          )
          if (prevEntry && !updated[alloc.projectId][currentDate]?.hasExisting) {
            updated[alloc.projectId][currentDate] = {
              ...updated[alloc.projectId][currentDate],
              hours: (prevEntry.durationMinutes / 60).toFixed(1),
            }
          }
        })
      }
      return updated
    })
    toast.info("Previous week hours copied")
  }

  async function submitWeek() {
    const entries: {
      projectId: string
      date: string
      clockIn: string
      clockOut: string
      isBillable: boolean
    }[] = []

    for (const alloc of allocations) {
      for (const day of weekDays) {
        const dateStr = format(day, "yyyy-MM-dd")
        const cell = grid[alloc.projectId]?.[dateStr]
        if (!cell?.hours || cell.hasExisting) continue
        const hours = parseFloat(cell.hours)
        if (isNaN(hours) || hours <= 0) continue

        const clockIn = new Date(`${dateStr}T${DEFAULT_CLOCK_IN}`).toISOString()
        const clockOut = hoursToClockOut(day, hours)
        entries.push({ projectId: alloc.projectId, date: dateStr, clockIn, clockOut, isBillable: true })
      }
    }

    if (entries.length === 0) {
      toast.warning("No new entries to submit")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/timesheets/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? "Failed")
      }
      const { created } = await res.json()
      toast.success(`${created} entries submitted`)
      window.location.reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to submit")
    } finally {
      setLoading(false)
    }
  }

  function rowTotal(projectId: string): number {
    return weekDays.reduce((sum, day) => {
      const dateStr = format(day, "yyyy-MM-dd")
      const h = parseFloat(grid[projectId]?.[dateStr]?.hours ?? "0")
      return sum + (isNaN(h) ? 0 : h)
    }, 0)
  }

  function colTotal(date: string): number {
    return allocations.reduce((sum, alloc) => {
      const h = parseFloat(grid[alloc.projectId]?.[date]?.hours ?? "0")
      return sum + (isNaN(h) ? 0 : h)
    }, 0)
  }

  const grandTotal = allocations.reduce((sum, alloc) => sum + rowTotal(alloc.projectId), 0)
  const pendingCount = weekDays.reduce((sum, day) => {
    const dateStr = format(day, "yyyy-MM-dd")
    return sum + allocations.reduce((s, alloc) => {
      const cell = grid[alloc.projectId]?.[dateStr]
      const h = parseFloat(cell?.hours ?? "0")
      return s + (h > 0 && !cell?.hasExisting ? 1 : 0)
    }, 0)
  }, 0)

  const isCurrentWeek = format(weekStart, "yyyy-MM-dd") === format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd")

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle>Weekly Timesheet</CardTitle>
            <CardDescription>
              {format(weekStart, "MMM d")} – {format(endOfWeek(weekStart, { weekStartsOn: 1 }), "MMM d, yyyy")}
              {isCurrentWeek && <Badge variant="secondary" className="ml-2">Current week</Badge>}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigate("prev")}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("next")}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {allocations.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>No project allocations. Contact your manager to be assigned to projects.</AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 pr-4 text-left font-medium text-muted-foreground w-40">Project</th>
                    {weekDays.map((day) => (
                      <th key={day.toISOString()} className="py-2 px-2 text-center font-medium w-20">
                        <div className="text-xs text-muted-foreground">{format(day, "EEE")}</div>
                        <div className={format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd") ? "text-primary font-semibold" : ""}>
                          {format(day, "d")}
                        </div>
                      </th>
                    ))}
                    <th className="py-2 pl-4 text-right font-medium text-muted-foreground w-16">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {allocations.map((alloc) => (
                    <tr key={alloc.projectId} className="border-b last:border-0">
                      <td className="py-2 pr-4">
                        <span className="truncate font-medium block max-w-[160px]" title={alloc.project.name}>
                          {alloc.project.name}
                        </span>
                      </td>
                      {weekDays.map((day) => {
                        const dateStr = format(day, "yyyy-MM-dd")
                        const cell = grid[alloc.projectId]?.[dateStr]
                        const isExisting = cell?.hasExisting
                        return (
                          <td key={dateStr} className="py-1.5 px-2">
                            <div className="relative">
                              <Input
                                type="number"
                                min={0}
                                max={24}
                                step={0.5}
                                placeholder="—"
                                value={cell?.hours ?? ""}
                                disabled={isExisting}
                                onChange={(e) => setCell(alloc.projectId, dateStr, e.target.value)}
                                className={`h-8 w-16 text-center text-sm px-1 ${
                                  isExisting
                                    ? "bg-muted/50 cursor-not-allowed"
                                    : ""
                                }`}
                              />
                              {isExisting && (
                                <div className="absolute -top-1.5 -right-1.5">
                                  <div
                                    className={`h-2 w-2 rounded-full ${
                                      cell?.existingStatus === "approved"
                                        ? "bg-green-500"
                                        : cell?.existingStatus === "rejected"
                                          ? "bg-destructive"
                                          : "bg-amber-500"
                                    }`}
                                    title={cell?.existingStatus}
                                  />
                                </div>
                              )}
                            </div>
                          </td>
                        )
                      })}
                      <td className="py-2 pl-4 text-right tabular-nums font-medium">
                        {rowTotal(alloc.projectId).toFixed(1)}h
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t">
                    <td className="py-2 pr-4 text-xs text-muted-foreground font-medium">Daily total</td>
                    {weekDays.map((day) => {
                      const dateStr = format(day, "yyyy-MM-dd")
                      const total = colTotal(dateStr)
                      return (
                        <td key={dateStr} className="py-2 px-2 text-center text-xs tabular-nums text-muted-foreground">
                          {total > 0 ? `${total.toFixed(1)}h` : "—"}
                        </td>
                      )
                    })}
                    <td className="py-2 pl-4 text-right text-sm font-semibold tabular-nums">
                      {grandTotal.toFixed(1)}h
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2 border-t">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-green-500 inline-block" /> Approved
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-amber-500 inline-block" /> Pending
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-destructive inline-block" /> Rejected
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={copyPreviousWeek} className="gap-2">
                  <Copy className="h-3.5 w-3.5" />
                  Copy prev. week
                </Button>
                <Button size="sm" disabled={loading || pendingCount === 0} onClick={submitWeek} className="gap-2">
                  <Send className="h-3.5 w-3.5" />
                  {loading ? "Submitting..." : `Submit ${pendingCount > 0 ? `(${pendingCount})` : ""}`}
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
