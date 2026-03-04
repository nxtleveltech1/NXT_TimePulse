"use client"

import { useState, useCallback, useMemo } from "react"
import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  format,
  eachDayOfInterval,
} from "date-fns"
import { ChevronLeft, ChevronRight, Copy, Send, AlertCircle, Pencil, Check, Clock, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

type Allocation = {
  id: string
  projectId: string
  project: { id: string; name: string; isBillable: boolean }
}

type ExistingEntry = {
  id: string
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
  originalHours: string
  existingId: string | null
  existingStatus: string | null
}

type GridState = Record<string, Record<string, GridCell>>

const DEFAULT_CLOCK_IN = "09:00"

function hoursToClockOut(date: string, hours: number): string {
  const clockIn = new Date(`${date}T${DEFAULT_CLOCK_IN}`)
  return new Date(clockIn.getTime() + hours * 3600000).toISOString()
}

const STATUS_CONFIG = {
  approved: {
    border: "border-l-green-500",
    bg: "bg-green-500/8",
    ring: "ring-green-500/30",
    dot: "bg-green-500",
    label: "Approved",
    icon: Check,
  },
  rejected: {
    border: "border-l-destructive",
    bg: "bg-destructive/8",
    ring: "ring-destructive/30",
    dot: "bg-destructive",
    label: "Rejected",
    icon: X,
  },
  pending: {
    border: "border-l-amber-500",
    bg: "bg-amber-500/8",
    ring: "ring-amber-500/30",
    dot: "bg-amber-500",
    label: "Pending",
    icon: Clock,
  },
  flagged: {
    border: "border-l-orange-500",
    bg: "bg-orange-500/8",
    ring: "ring-orange-500/30",
    dot: "bg-orange-500",
    label: "Flagged",
    icon: AlertCircle,
  },
} as const

type StatusKey = keyof typeof STATUS_CONFIG

function getStatusConfig(status: string | null) {
  if (!status) return null
  return STATUS_CONFIG[status as StatusKey] ?? STATUS_CONFIG.pending
}

export function WeeklyGrid({ allocations, existingEntries }: WeeklyGridProps) {
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )
  const [grid, setGrid] = useState<GridState>(() =>
    buildGrid(allocations, existingEntries, startOfWeek(new Date(), { weekStartsOn: 1 }))
  )
  const [loading, setLoading] = useState(false)

  const weekDays = useMemo(
    () => eachDayOfInterval({ start: weekStart, end: endOfWeek(weekStart, { weekStartsOn: 1 }) }),
    [weekStart]
  )

  function buildGrid(allocs: Allocation[], entries: ExistingEntry[], ws: Date): GridState {
    const days = eachDayOfInterval({ start: ws, end: endOfWeek(ws, { weekStartsOn: 1 }) })
    const g: GridState = {}
    for (const alloc of allocs) {
      g[alloc.projectId] = {}
      for (const day of days) {
        const dateStr = format(day, "yyyy-MM-dd")
        const existing = entries.find(
          (e) => e.date === dateStr && e.projectId === alloc.projectId
        )
        const hrs = existing ? (existing.durationMinutes / 60).toFixed(1) : ""
        g[alloc.projectId][dateStr] = {
          hours: hrs,
          originalHours: hrs,
          existingId: existing?.id ?? null,
          existingStatus: existing?.status ?? null,
        }
      }
    }
    return g
  }

  function navigate(direction: "prev" | "next") {
    const next = direction === "prev" ? subWeeks(weekStart, 1) : addWeeks(weekStart, 1)
    setWeekStart(next)
    setGrid(buildGrid(allocations, existingEntries, next))
  }

  const setCell = useCallback((projectId: string, date: string, value: string) => {
    setGrid((prev) => ({
      ...prev,
      [projectId]: {
        ...prev[projectId],
        [date]: { ...prev[projectId][date], hours: value },
      },
    }))
  }, [])

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
          const current = updated[alloc.projectId][currentDate]
          if (prevEntry && !current?.existingId) {
            updated[alloc.projectId][currentDate] = {
              ...current,
              hours: (prevEntry.durationMinutes / 60).toFixed(1),
            }
          }
        })
      }
      return updated
    })
    toast.info("Previous week hours copied")
  }

  function isDirty(cell: GridCell | undefined): boolean {
    if (!cell) return false
    if (cell.existingId) return cell.hours !== cell.originalHours
    return cell.hours !== "" && parseFloat(cell.hours) > 0
  }

  const { newEntries, modifiedEntries } = useMemo(() => {
    const newE: { projectId: string; date: string; hours: number; isBillable: boolean }[] = []
    const modE: { id: string; hours: number; date: string }[] = []

    for (const alloc of allocations) {
      for (const day of weekDays) {
        const dateStr = format(day, "yyyy-MM-dd")
        const cell = grid[alloc.projectId]?.[dateStr]
        if (!cell) continue
        const hours = parseFloat(cell.hours)
        if (isNaN(hours) || hours < 0) continue

        if (cell.existingId && cell.hours !== cell.originalHours) {
          modE.push({ id: cell.existingId, hours, date: dateStr })
        } else if (!cell.existingId && hours > 0) {
          newE.push({ projectId: alloc.projectId, date: dateStr, hours, isBillable: alloc.project.isBillable })
        }
      }
    }
    return { newEntries: newE, modifiedEntries: modE }
  }, [grid, allocations, weekDays])

  const dirtyCount = newEntries.length + modifiedEntries.length

  async function submitWeek() {
    if (dirtyCount === 0) {
      toast.warning("No changes to submit")
      return
    }

    setLoading(true)
    try {
      const promises: Promise<Response>[] = []

      if (newEntries.length > 0) {
        const batchPayload = newEntries.map((e) => ({
          projectId: e.projectId,
          date: e.date,
          clockIn: new Date(`${e.date}T${DEFAULT_CLOCK_IN}`).toISOString(),
          clockOut: hoursToClockOut(e.date, e.hours),
          isBillable: e.isBillable,
        }))
        promises.push(
          fetch("/api/timesheets/batch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ entries: batchPayload }),
          })
        )
      }

      for (const entry of modifiedEntries) {
        const clockIn = new Date(`${entry.date}T${DEFAULT_CLOCK_IN}`).toISOString()
        const clockOut = hoursToClockOut(entry.date, entry.hours)
        promises.push(
          fetch(`/api/timesheets/${entry.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ clockIn, clockOut }),
          })
        )
      }

      const results = await Promise.all(promises)
      const failed = results.filter((r) => !r.ok)

      if (failed.length > 0) {
        const errors = await Promise.all(failed.map((r) => r.json().catch(() => ({ error: "Unknown" }))))
        throw new Error(errors.map((e) => e.error).join(", "))
      }

      const parts: string[] = []
      if (newEntries.length > 0) parts.push(`${newEntries.length} created`)
      if (modifiedEntries.length > 0) parts.push(`${modifiedEntries.length} updated`)
      toast.success(`Entries ${parts.join(", ")}`)
      window.location.reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to submit")
    } finally {
      setLoading(false)
    }
  }

  function rowTotal(projectId: string): number {
    return weekDays.reduce((sum, day) => {
      const h = parseFloat(grid[projectId]?.[format(day, "yyyy-MM-dd")]?.hours ?? "0")
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
  const isCurrentWeek =
    format(weekStart, "yyyy-MM-dd") ===
    format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd")

  return (
    <TooltipProvider delayDuration={200}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Weekly Timesheet</CardTitle>
              <CardDescription>
                {format(weekStart, "MMM d")} –{" "}
                {format(endOfWeek(weekStart, { weekStartsOn: 1 }), "MMM d, yyyy")}
                {isCurrentWeek && (
                  <Badge variant="secondary" className="ml-2">
                    Current week
                  </Badge>
                )}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => navigate("prev")}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => navigate("next")}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {allocations.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No project allocations. Contact your manager to be assigned to projects.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="py-2 pr-4 text-left font-medium text-muted-foreground w-44">
                        Project
                      </th>
                      {weekDays.map((day) => {
                        const isToday =
                          format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
                        return (
                          <th key={day.toISOString()} className="py-2 px-1 text-center font-medium w-[72px]">
                            <div className="text-xs text-muted-foreground">
                              {format(day, "EEE")}
                            </div>
                            <div className={isToday ? "text-primary font-semibold" : ""}>
                              {format(day, "d")}
                            </div>
                          </th>
                        )
                      })}
                      <th className="py-2 pl-4 text-right font-medium text-muted-foreground w-16">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {allocations.map((alloc) => (
                      <tr key={alloc.projectId} className="border-b last:border-0">
                        <td className="py-2 pr-4">
                          <span
                            className="truncate font-medium block max-w-[170px]"
                            title={alloc.project.name}
                          >
                            {alloc.project.name}
                          </span>
                        </td>
                        {weekDays.map((day) => {
                          const dateStr = format(day, "yyyy-MM-dd")
                          const cell = grid[alloc.projectId]?.[dateStr]
                          const status = getStatusConfig(cell?.existingStatus ?? null)
                          const modified = isDirty(cell)
                          const hasExisting = !!cell?.existingId

                          return (
                            <td key={dateStr} className="py-1.5 px-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div
                                    className={`relative rounded-md overflow-hidden ${
                                      hasExisting && status
                                        ? `border-l-[3px] ${status.border} ${status.bg}`
                                        : ""
                                    } ${modified ? "ring-1 ring-primary/50" : ""}`}
                                  >
                                    <Input
                                      type="number"
                                      min={0}
                                      max={24}
                                      step={0.5}
                                      placeholder="—"
                                      value={cell?.hours ?? ""}
                                      onChange={(e) =>
                                        setCell(alloc.projectId, dateStr, e.target.value)
                                      }
                                      className={`h-8 w-[64px] text-center text-sm px-1 border-0 shadow-none focus-visible:ring-1 ${
                                        hasExisting ? "bg-transparent" : ""
                                      }`}
                                    />
                                    {hasExisting && status && (
                                      <div className="absolute top-0.5 right-0.5">
                                        <div
                                          className={`h-1.5 w-1.5 rounded-full ${status.dot}`}
                                        />
                                      </div>
                                    )}
                                    {modified && (
                                      <div className="absolute bottom-0.5 right-0.5">
                                        <Pencil className="h-2.5 w-2.5 text-primary/60" />
                                      </div>
                                    )}
                                  </div>
                                </TooltipTrigger>
                                {hasExisting && status && (
                                  <TooltipContent side="top" className="text-xs">
                                    <div className="flex items-center gap-1.5">
                                      <status.icon className="h-3 w-3" />
                                      <span>{status.label}</span>
                                      {modified && (
                                        <span className="text-primary ml-1">· Modified</span>
                                      )}
                                    </div>
                                  </TooltipContent>
                                )}
                              </Tooltip>
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
                      <td className="py-2 pr-4 text-xs text-muted-foreground font-medium">
                        Daily total
                      </td>
                      {weekDays.map((day) => {
                        const dateStr = format(day, "yyyy-MM-dd")
                        const total = colTotal(dateStr)
                        return (
                          <td
                            key={dateStr}
                            className="py-2 px-1 text-center text-xs tabular-nums text-muted-foreground"
                          >
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
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {(["approved", "pending", "rejected"] as const).map((key) => {
                    const cfg = STATUS_CONFIG[key]
                    return (
                      <span key={key} className="flex items-center gap-1.5">
                        <span
                          className={`h-2 w-2 rounded-full ${cfg.dot} inline-block`}
                        />
                        {cfg.label}
                      </span>
                    )
                  })}
                  {(newEntries.length > 0 || modifiedEntries.length > 0) && (
                    <span className="flex items-center gap-1.5 text-primary">
                      <Pencil className="h-3 w-3" />
                      {newEntries.length > 0 && `${newEntries.length} new`}
                      {newEntries.length > 0 && modifiedEntries.length > 0 && ", "}
                      {modifiedEntries.length > 0 && `${modifiedEntries.length} modified`}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={copyPreviousWeek} className="gap-2">
                    <Copy className="h-3.5 w-3.5" />
                    Copy prev. week
                  </Button>
                  <Button
                    size="sm"
                    disabled={loading || dirtyCount === 0}
                    onClick={submitWeek}
                    className="gap-2"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {loading
                      ? "Submitting…"
                      : `Submit${dirtyCount > 0 ? ` (${dirtyCount})` : ""}`}
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}
