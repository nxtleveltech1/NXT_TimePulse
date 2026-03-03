"use client"

import { useState, useEffect, useRef } from "react"
import { Coffee, Play } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface BreakControlsProps {
  timesheetId: string
  initialBreakMinutes?: number
}

function pad(n: number) {
  return n.toString().padStart(2, "0")
}

export function BreakControls({ timesheetId, initialBreakMinutes = 0 }: BreakControlsProps) {
  const [onBreak, setOnBreak] = useState(false)
  const [breakStart, setBreakStart] = useState<Date | null>(null)
  const [totalBreakMs, setTotalBreakMs] = useState(initialBreakMinutes * 60000)
  const [currentBreakMs, setCurrentBreakMs] = useState(0)
  const [loading, setLoading] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (onBreak && breakStart) {
      intervalRef.current = setInterval(() => {
        setCurrentBreakMs(Date.now() - breakStart.getTime())
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
      setCurrentBreakMs(0)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [onBreak, breakStart])

  async function startBreak() {
    setLoading(true)
    try {
      const now = new Date()
      setBreakStart(now)
      setOnBreak(true)
      toast.info("Break started")
    } catch {
      toast.error("Failed to start break")
    } finally {
      setLoading(false)
    }
  }

  async function endBreak() {
    if (!breakStart) return
    setLoading(true)
    try {
      const breakDurationMin = Math.floor((Date.now() - breakStart.getTime()) / 60000)
      const newTotalMin = Math.floor(totalBreakMs / 60000) + breakDurationMin

      const res = await fetch(`/api/timesheets/${timesheetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ breakMinutes: newTotalMin }),
      })

      if (!res.ok) throw new Error("Failed")

      setTotalBreakMs(newTotalMin * 60000)
      setOnBreak(false)
      setBreakStart(null)
      toast.success(`Break ended — ${breakDurationMin}m recorded`)
    } catch {
      toast.error("Failed to end break")
    } finally {
      setLoading(false)
    }
  }

  const totalDisplayMin = Math.floor((totalBreakMs + currentBreakMs) / 60000)
  const currentSec = Math.floor((currentBreakMs % 60000) / 1000)

  return (
    <div className="flex items-center gap-3">
      {onBreak ? (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm text-amber-500 font-mono tabular-nums">
            <Coffee className="h-4 w-4 animate-pulse" />
            <span>
              {pad(Math.floor(currentBreakMs / 60000))}:{pad(currentSec)}
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={endBreak}
            disabled={loading}
            className="gap-1.5 border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
          >
            <Play className="h-3.5 w-3.5" />
            End Break
          </Button>
        </div>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={startBreak}
          disabled={loading}
          className={cn(
            "gap-1.5",
            totalDisplayMin > 0 && "text-muted-foreground"
          )}
        >
          <Coffee className="h-3.5 w-3.5" />
          {totalDisplayMin > 0 ? `Break (${totalDisplayMin}m)` : "Start Break"}
        </Button>
      )}
    </div>
  )
}
