"use client"

import { useState } from "react"
import { motion } from "motion/react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { MapPin, RotateCcw, LogOut, Timer } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { LiveTimer } from "@/components/time-capture/live-timer"
import { BreakControls } from "@/components/time-capture/break-controls"
import { cn } from "@/lib/utils"

type OpenTimesheet = {
  id: string
  clockIn: string | Date
  breakMinutes: number
  project: { name: string }
  geozone: { name: string } | null
} | null

type Allocation = {
  id: string
  project: { id: string; name: string }
  projectId: string
}

type RecentTimesheet = {
  projectId: string
  project: { name: string }
} | null

export function WorkerClock({
  openTimesheet,
  allocations,
  lastTimesheet,
}: {
  openTimesheet: OpenTimesheet
  allocations: Allocation[]
  lastTimesheet?: RecentTimesheet
}) {
  const [loading, setLoading] = useState(false)
  const [clockedIn, setClockedIn] = useState(!!openTimesheet)
  const [activeTimesheet, setActiveTimesheet] = useState(openTimesheet)
  const [isBillable, setIsBillable] = useState(true)

  async function manualClockIn(projectId: string, geozoneId: string | null) {
    setLoading(true)
    try {
      const res = await fetch("/api/timesheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          geozoneId,
          clockIn: new Date().toISOString(),
          source: "timer",
          notes: "",
          isBillable,
        }),
      })
      if (!res.ok) throw new Error("Failed")
      const ts = await res.json()
      setActiveTimesheet({
        ...ts,
        project: allocations.find((a) => a.projectId === projectId)?.project ?? { name: "Project" },
      })
      setClockedIn(true)
      toast.success("Clocked in")
    } catch {
      toast.error("Failed to clock in")
    } finally {
      setLoading(false)
    }
  }

  async function manualClockOut() {
    if (!activeTimesheet) return
    setLoading(true)
    try {
      const res = await fetch(`/api/timesheets/${activeTimesheet.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clockOut: new Date().toISOString(),
          status: "pending",
        }),
      })
      if (!res.ok) throw new Error("Failed")
      setClockedIn(false)
      setActiveTimesheet(null)
      toast.success("Clocked out")
      window.location.reload()
    } catch {
      toast.error("Failed to clock out")
    } finally {
      setLoading(false)
    }
  }

  const clockInIso =
    activeTimesheet
      ? typeof activeTimesheet.clockIn === "string"
        ? activeTimesheet.clockIn
        : activeTimesheet.clockIn.toISOString()
      : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn(
        "rounded-2xl border p-6 md:p-8 transition-all duration-500",
        clockedIn
          ? "border-green-500/30 bg-green-500/5 shadow-[0_0_40px_-12px] shadow-green-500/20 dark:shadow-green-500/10"
          : "border-border bg-card"
      )}
    >
      {clockedIn && activeTimesheet && clockInIso ? (
        /* ── CLOCKED IN STATE ── */
        <div className="flex flex-col items-center gap-6">
          {/* Status pill */}
          <div className="flex items-center gap-2 rounded-full border border-green-500/30 bg-green-500/10 px-4 py-1.5">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium text-green-600 dark:text-green-400">Live Session</span>
          </div>

          {/* Project name */}
          <div className="text-center">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">
              Active project
            </p>
            <h2 className="text-xl font-bold">{activeTimesheet.project.name}</h2>
            {activeTimesheet.geozone && (
              <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground mt-1">
                <MapPin className="h-3 w-3" />
                {activeTimesheet.geozone.name}
              </p>
            )}
          </div>

          {/* Hero timer */}
          <div className="flex flex-col items-center gap-2">
            <LiveTimer clockInIso={clockInIso} size="hero" />
            <p className="text-xs text-muted-foreground">
              Started at {format(new Date(clockInIso), "HH:mm")}
            </p>
          </div>

          {/* Break controls */}
          <div className="w-full max-w-sm">
            <BreakControls
              timesheetId={activeTimesheet.id}
              initialBreakMinutes={activeTimesheet.breakMinutes}
            />
          </div>

          {/* Clock out */}
          <Button
            onClick={manualClockOut}
            disabled={loading}
            variant="destructive"
            size="lg"
            className="w-full max-w-sm min-h-[56px] gap-2 text-base font-semibold"
          >
            <LogOut className="h-5 w-5" />
            {loading ? "Clocking out…" : "Clock Out"}
          </Button>
        </div>
      ) : (
        /* ── CLOCKED OUT STATE ── */
        <div className="flex flex-col gap-6">
          {/* Header row */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
              <Timer className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Ready to clock in?</h2>
              <p className="text-sm text-muted-foreground">Select a project to start your session</p>
            </div>
          </div>

          {/* Resume last project */}
          {lastTimesheet && (
            <Button
              variant="secondary"
              size="lg"
              className="w-full min-h-[56px] gap-2 text-base font-semibold justify-start px-5"
              disabled={loading}
              onClick={() => manualClockIn(lastTimesheet.projectId, null)}
            >
              <RotateCcw className="h-5 w-5 shrink-0" />
              <span>
                Resume <span className="font-bold">{lastTimesheet.project.name}</span>
              </span>
            </Button>
          )}

          {/* Billable toggle + project label */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Clock in with a project</p>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <Checkbox
                id="billable"
                checked={isBillable}
                onCheckedChange={(c) => setIsBillable(!!c)}
              />
              <span className="text-sm">Billable</span>
            </label>
          </div>

          {/* Project buttons */}
          {allocations.length === 0 ? (
            <p className="text-sm text-muted-foreground rounded-lg border border-dashed p-4 text-center">
              No project allocations. Contact your manager.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {allocations.map((a) => (
                <motion.div
                  key={a.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                >
                  <Button
                    variant="outline"
                    disabled={loading}
                    onClick={() => manualClockIn(a.projectId, null)}
                    className="w-full min-h-[52px] justify-start gap-3 px-4 text-sm font-semibold hover:border-primary/40 hover:bg-primary/5"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                    </span>
                    {a.project.name}
                  </Button>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}
