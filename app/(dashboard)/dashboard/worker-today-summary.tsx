import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock, Coffee, FileCheck2 } from "lucide-react"

type TodayTimesheet = {
  durationMinutes: number
  breakMinutes: number
  clockOut: string | null
}

interface WorkerTodaySummaryProps {
  timesheets: TodayTimesheet[]
}

export function WorkerTodaySummary({ timesheets }: WorkerTodaySummaryProps) {
  const completedEntries = timesheets.filter((t) => t.clockOut !== null)
  const totalMinutes = completedEntries.reduce((s, t) => s + t.durationMinutes, 0)
  const totalBreak = completedEntries.reduce((s, t) => s + t.breakMinutes, 0)

  const hours = Math.floor(totalMinutes / 60)
  const mins = totalMinutes % 60
  const hoursDisplay = totalMinutes === 0 ? "0h" : mins === 0 ? `${hours}h` : `${hours}h ${mins}m`

  const stats = [
    {
      label: "Hours today",
      value: hoursDisplay,
      icon: Clock,
    },
    {
      label: "Entries",
      value: completedEntries.length,
      icon: FileCheck2,
    },
    {
      label: "Break",
      value: totalBreak > 0 ? `${totalBreak}m` : "—",
      icon: Coffee,
    },
  ]

  return (
    <Card>
      <CardHeader className="p-4 pb-2 md:p-6 md:pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">Today</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
        <div className="grid grid-cols-3 gap-4">
          {stats.map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Icon className="h-3.5 w-3.5" />
                {label}
              </div>
              <p className="text-2xl font-bold tabular-nums">{value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
