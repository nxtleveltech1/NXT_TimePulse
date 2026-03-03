"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Clock, MapPin, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { LiveTimer } from "@/components/time-capture/live-timer"
import { BreakControls } from "@/components/time-capture/break-controls"

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
      setActiveTimesheet({ ...ts, project: allocations.find(a => a.projectId === projectId)?.project ?? { name: "Project" } })
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

  return (
    <Card>
      <CardHeader className="p-4 md:p-6">
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Clock status
        </CardTitle>
        <CardDescription>
          {clockedIn && activeTimesheet
            ? `Clocked in — ${activeTimesheet.project.name}`
            : "Not clocked in"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-4 md:p-6 pt-0">
        {clockedIn && activeTimesheet ? (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-3 rounded-xl border bg-muted/30 py-6">
              <LiveTimer clockInIso={typeof activeTimesheet.clockIn === "string" ? activeTimesheet.clockIn : activeTimesheet.clockIn.toISOString()} />
              <p className="text-xs text-muted-foreground">
                Since {format(new Date(typeof activeTimesheet.clockIn === "string" ? activeTimesheet.clockIn : activeTimesheet.clockIn.toISOString()), "HH:mm")}
              </p>
              {activeTimesheet.geozone && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {activeTimesheet.geozone.name}
                </p>
              )}
            </div>
            <BreakControls
              timesheetId={activeTimesheet.id}
              initialBreakMinutes={activeTimesheet.breakMinutes}
            />
            <Button
              onClick={manualClockOut}
              disabled={loading}
              variant="destructive"
              size="lg"
              className="w-full min-h-[44px]"
            >
              {loading ? "Clocking out..." : "Clock out"}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {lastTimesheet && (
              <Button
                variant="secondary"
                size="lg"
                className="w-full min-h-[44px] gap-2"
                disabled={loading}
                onClick={() => manualClockIn(lastTimesheet.projectId, null)}
              >
                <RotateCcw className="h-4 w-4" />
                Resume: {lastTimesheet.project.name}
              </Button>
            )}
            <p className="text-sm text-muted-foreground">
              Clock in with a project:
            </p>
            <div className="flex items-center gap-2">
              <Checkbox
                id="billable"
                checked={isBillable}
                onCheckedChange={(c) => setIsBillable(!!c)}
              />
              <label htmlFor="billable" className="text-sm cursor-pointer">Billable</label>
            </div>
            {allocations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No project allocations. Contact your manager.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {allocations.map((a) => (
                  <Button
                    key={a.id}
                    variant="outline"
                    size="touch"
                    disabled={loading}
                    onClick={() => manualClockIn(a.projectId, null)}
                  >
                    <MapPin className="mr-1 h-3 w-3" />
                    {a.project.name}
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
