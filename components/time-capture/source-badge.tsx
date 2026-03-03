import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type TimesheetSource = "geofence" | "manual" | "kiosk" | "timer"

const config: Record<TimesheetSource, { label: string; className: string }> = {
  geofence: {
    label: "Geofence",
    className: "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400",
  },
  manual: {
    label: "Manual",
    className: "bg-zinc-500/10 text-zinc-600 border-zinc-500/20 dark:text-zinc-400",
  },
  kiosk: {
    label: "Kiosk",
    className: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
  },
  timer: {
    label: "Timer",
    className: "bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400",
  },
}

interface SourceBadgeProps {
  source: string
}

export function SourceBadge({ source }: SourceBadgeProps) {
  const cfg = config[source as TimesheetSource] ?? {
    label: source,
    className: "bg-zinc-500/10 text-zinc-600 border-zinc-500/20",
  }
  return (
    <Badge variant="outline" className={cn("text-xs font-medium", cfg.className)}>
      {cfg.label}
    </Badge>
  )
}
