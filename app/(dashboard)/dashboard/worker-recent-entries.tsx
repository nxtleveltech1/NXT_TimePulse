import Link from "next/link"
import { format, parseISO } from "date-fns"
import { ArrowRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SourceBadge } from "@/components/time-capture/source-badge"

type RecentEntry = {
  id: string
  date: string
  clockIn: string
  clockOut: string | null
  durationMinutes: number
  source: string
  status: string
  project: { name: string }
}

interface WorkerRecentEntriesProps {
  entries: RecentEntry[]
}

const statusConfig: Record<string, { label: string; className: string }> = {
  approved: { label: "Approved", className: "bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400" },
  pending: { label: "Pending", className: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400" },
  rejected: { label: "Rejected", className: "bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400" },
  flagged: { label: "Flagged", className: "bg-orange-500/10 text-orange-600 border-orange-500/20 dark:text-orange-400" },
}

function formatDuration(minutes: number): string {
  if (minutes === 0) return "—"
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

export function WorkerRecentEntries({ entries }: WorkerRecentEntriesProps) {
  return (
    <Card>
      <CardHeader className="p-4 pb-2 md:p-6 md:pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Recent entries</CardTitle>
            <CardDescription>Your last {entries.length} time entries</CardDescription>
          </div>
          <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
            <Link href="/dashboard/timesheets">
              View all
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {entries.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground md:px-6">
            No time entries yet. Clock in to get started.
          </div>
        ) : (
          <ul className="divide-y">
            {entries.map((entry) => {
              const status = statusConfig[entry.status] ?? { label: entry.status, className: "" }
              const isOpen = entry.clockOut === null
              return (
                <li
                  key={entry.id}
                  className="flex items-center justify-between gap-3 px-4 py-3 md:px-6"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{entry.project.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(parseISO(entry.date), "EEE, MMM d")}
                      {" · "}
                      {format(parseISO(entry.clockIn), "HH:mm")}
                      {entry.clockOut ? ` – ${format(parseISO(entry.clockOut), "HH:mm")}` : " · active"}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="tabular-nums text-sm font-semibold">
                      {isOpen ? (
                        <span className="text-xs text-primary animate-pulse font-medium">● Live</span>
                      ) : (
                        formatDuration(entry.durationMinutes)
                      )}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <SourceBadge source={entry.source} />
                      <Badge variant="outline" className={`text-xs font-medium ${status.className}`}>
                        {status.label}
                      </Badge>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
