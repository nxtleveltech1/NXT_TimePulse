"use client"

import { useState, useEffect } from "react"
import { Delete, CheckCircle2, XCircle, LogOut } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LiveTimer } from "./live-timer"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

type WorkerState = {
  userId: string
  name: string
  allocations: { id: string; projectId: string; project: { id: string; name: string } }[]
  openTimesheet: { id: string; projectName: string; clockIn: string } | null
}

interface KioskClockProps {
  orgId: string
  kioskSecret?: string
}

const PIN_LENGTH = 6

export function KioskClock({ orgId, kioskSecret }: KioskClockProps) {
  const [pin, setPin] = useState("")
  const [worker, setWorker] = useState<WorkerState | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  // Auto-logout after 30s of inactivity when clocked in/out confirmed
  useEffect(() => {
    if (!success) return
    const id = setTimeout(() => resetKiosk(), 5000)
    return () => clearTimeout(id)
  }, [success])

  function resetKiosk() {
    setPin("")
    setWorker(null)
    setError("")
    setSuccess("")
  }

  function handleKey(key: string) {
    if (key === "DEL") {
      setPin((p) => p.slice(0, -1))
      setError("")
      return
    }
    if (pin.length >= PIN_LENGTH) return
    const newPin = pin + key
    setPin(newPin)
    if (newPin.length === PIN_LENGTH) {
      verifyPin(newPin)
    }
  }

  async function verifyPin(code: string) {
    setLoading(true)
    setError("")
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      if (kioskSecret) headers["x-kiosk-secret"] = kioskSecret

      const res = await fetch("/api/kiosk/verify", {
        method: "POST",
        headers,
        body: JSON.stringify({ employeeCode: code, orgId }),
      })

      if (!res.ok) {
        const err = await res.json()
        setError(err.error ?? "Invalid code")
        setPin("")
        return
      }

      const data = await res.json()
      setWorker(data)
    } catch {
      setError("Connection error. Try again.")
      setPin("")
    } finally {
      setLoading(false)
    }
  }

  async function handleClockIn(projectId: string) {
    if (!worker) return
    setLoading(true)
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      if (kioskSecret) headers["x-kiosk-secret"] = kioskSecret

      const res = await fetch("/api/kiosk/clock", {
        method: "POST",
        headers,
        body: JSON.stringify({ userId: worker.userId, action: "clockIn", projectId }),
      })

      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? "Failed")
        return
      }

      setSuccess(`Clocked in to ${worker.allocations.find((a) => a.projectId === projectId)?.project.name ?? "project"}`)
    } catch {
      toast.error("Connection error")
    } finally {
      setLoading(false)
    }
  }

  async function handleClockOut() {
    if (!worker?.openTimesheet) return
    setLoading(true)
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      if (kioskSecret) headers["x-kiosk-secret"] = kioskSecret

      const res = await fetch("/api/kiosk/clock", {
        method: "POST",
        headers,
        body: JSON.stringify({
          userId: worker.userId,
          action: "clockOut",
          timesheetId: worker.openTimesheet.id,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? "Failed")
        return
      }

      setSuccess("Clocked out successfully")
    } catch {
      toast.error("Connection error")
    } finally {
      setLoading(false)
    }
  }

  const pinDots = Array.from({ length: PIN_LENGTH }, (_, i) => i < pin.length)

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 select-none">
      {/* Header */}
      <div className="mb-8 text-center">
        <p className="text-4xl font-mono font-bold tabular-nums">{format(currentTime, "HH:mm")}</p>
        <p className="text-muted-foreground mt-1">{format(currentTime, "EEEE, MMMM d")}</p>
      </div>

      {success ? (
        <div className="flex flex-col items-center gap-6 text-center">
          <CheckCircle2 className="h-16 w-16 text-green-500" />
          <p className="text-2xl font-semibold">{success}</p>
          <p className="text-muted-foreground">Returning in a moment...</p>
        </div>
      ) : !worker ? (
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Employee Clock</h1>
            <p className="text-muted-foreground mt-1">Enter your employee code</p>
          </div>

          {/* PIN dots */}
          <div className="flex justify-center gap-3">
            {pinDots.map((filled, i) => (
              <div
                key={i}
                className={cn(
                  "h-4 w-4 rounded-full border-2 transition-all",
                  filled
                    ? "bg-primary border-primary scale-110"
                    : "border-muted-foreground/30"
                )}
              />
            ))}
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <XCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-3">
            {["1","2","3","4","5","6","7","8","9","DEL","0","✓"].map((key) => (
              <button
                key={key}
                onClick={() => key !== "✓" ? handleKey(key) : null}
                disabled={loading || (key === "✓" && pin.length !== PIN_LENGTH)}
                className={cn(
                  "h-16 rounded-xl text-xl font-semibold transition-all active:scale-95",
                  "border bg-card hover:bg-muted focus:outline-none",
                  key === "DEL" && "text-muted-foreground text-sm",
                  key === "✓" && "bg-primary text-primary-foreground hover:bg-primary/90 border-primary",
                  (loading) && "opacity-50 cursor-not-allowed"
                )}
              >
                {key === "DEL" ? <Delete className="mx-auto h-5 w-5" /> : key}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="w-full max-w-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Welcome</p>
              <h2 className="text-xl font-bold">{worker.name}</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={resetKiosk} className="gap-1">
              <LogOut className="h-4 w-4" />
              Cancel
            </Button>
          </div>

          {worker.openTimesheet ? (
            <div className="space-y-4">
              <div className="rounded-xl border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{worker.openTimesheet.projectName}</p>
                  <Badge variant="secondary">Clocked In</Badge>
                </div>
                <LiveTimer clockInIso={worker.openTimesheet.clockIn} className="items-start" />
                <p className="text-xs text-muted-foreground">
                  Since {format(new Date(worker.openTimesheet.clockIn), "HH:mm")}
                </p>
              </div>
              <Button
                variant="destructive"
                size="lg"
                className="w-full h-16 text-lg"
                disabled={loading}
                onClick={handleClockOut}
              >
                {loading ? "Processing..." : "Clock Out"}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Select project to clock in:</p>
              {worker.allocations.length === 0 ? (
                <p className="text-sm text-muted-foreground">No project allocations assigned.</p>
              ) : (
                worker.allocations.map((a) => (
                  <Button
                    key={a.id}
                    variant="outline"
                    size="lg"
                    className="w-full h-16 text-base justify-start"
                    disabled={loading}
                    onClick={() => handleClockIn(a.projectId)}
                  >
                    {a.project.name}
                  </Button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
