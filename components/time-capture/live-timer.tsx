"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface LiveTimerProps {
  clockInIso: string
  className?: string
}

function pad(n: number) {
  return n.toString().padStart(2, "0")
}

function formatElapsed(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return { h, m, s, formatted: `${pad(h)}:${pad(m)}:${pad(s)}` }
}

export function LiveTimer({ clockInIso, className }: LiveTimerProps) {
  const [elapsed, setElapsed] = useState(() =>
    formatElapsed(Date.now() - new Date(clockInIso).getTime())
  )
  const [tick, setTick] = useState(false)

  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(formatElapsed(Date.now() - new Date(clockInIso).getTime()))
      setTick((t) => !t)
    }, 1000)
    return () => clearInterval(id)
  }, [clockInIso])

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <div className="flex items-baseline gap-0.5 tabular-nums font-mono text-4xl font-bold tracking-tight">
        <span>{pad(elapsed.h)}</span>
        <span className={cn("transition-opacity duration-100", tick ? "opacity-100" : "opacity-30")}>:</span>
        <span>{pad(elapsed.m)}</span>
        <span className={cn("transition-opacity duration-100", tick ? "opacity-100" : "opacity-30")}>:</span>
        <span>{pad(elapsed.s)}</span>
      </div>
      <p className="text-xs text-muted-foreground">elapsed</p>
    </div>
  )
}
