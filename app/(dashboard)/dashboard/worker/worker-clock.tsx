"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Clock, MapPin } from "lucide-react"
import { toast } from "sonner"

type OpenTimesheet = {
  id: string
  project: { name: string }
  geozone: { name: string } | null
} | null

type Allocation = {
  id: string
  project: { id: string; name: string }
  projectId: string
}

export function WorkerClock({
  openTimesheet,
  allocations,
}: {
  openTimesheet: OpenTimesheet
  allocations: Allocation[]
}) {
  const [loading, setLoading] = useState(false)
  const [clockedIn, setClockedIn] = useState(!!openTimesheet)
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
          source: "manual",
          notes: "Manual clock-in",
          isBillable,
        }),
      })
      if (!res.ok) throw new Error("Failed")
      setClockedIn(true)
      toast.success("Clocked in")
      window.location.reload()
    } catch {
      toast.error("Failed to clock in")
    } finally {
      setLoading(false)
    }
  }

  async function manualClockOut() {
    if (!openTimesheet) return
    setLoading(true)
    try {
      const res = await fetch(`/api/timesheets/${openTimesheet.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clockOut: new Date().toISOString(),
          status: "pending",
        }),
      })
      if (!res.ok) throw new Error("Failed")
      setClockedIn(false)
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
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Clock status
        </CardTitle>
        <CardDescription>
          {clockedIn
            ? `Clocked in at ${openTimesheet?.project.name}`
            : "Not clocked in"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {clockedIn && openTimesheet ? (
          <Button
            onClick={manualClockOut}
            disabled={loading}
            variant="destructive"
            className="w-full"
          >
            {loading ? "Clocking out..." : "Clock out"}
          </Button>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Manual clock-in (use geofence when on site for automatic):
            </p>
            <div className="flex items-center gap-2">
              <Checkbox id="billable" checked={isBillable} onCheckedChange={(c) => setIsBillable(!!c)} />
              <label htmlFor="billable" className="text-sm">Billable</label>
            </div>
            {allocations.length === 0 ? (
              <p className="text-sm">No project allocations. Contact your manager.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {allocations.map((a) => (
                  <Button
                    key={a.id}
                    variant="outline"
                    size="sm"
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
