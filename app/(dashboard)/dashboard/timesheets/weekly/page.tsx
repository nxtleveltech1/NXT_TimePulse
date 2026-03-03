import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { serializeForClient } from "@/lib/serialize"
import { WeeklyGrid } from "@/components/time-capture/weekly-grid"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { startOfWeek, subWeeks, format, endOfWeek } from "date-fns"

export default async function WeeklyTimesheetPage() {
  const { userId } = await auth()
  if (!userId) return null

  const now = new Date()
  const weeksBack = 4
  const rangeStart = format(subWeeks(startOfWeek(now, { weekStartsOn: 1 }), weeksBack), "yyyy-MM-dd")
  const rangeEnd = format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd")

  const [allocations, existingEntries] = await Promise.all([
    prisma.projectAllocation.findMany({
      where: { userId, isActive: true },
      include: { project: { select: { id: true, name: true } } },
    }),
    prisma.timesheet.findMany({
      where: {
        userId,
        date: { gte: rangeStart, lte: rangeEnd },
      },
      select: {
        date: true,
        projectId: true,
        durationMinutes: true,
        status: true,
      },
    }),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm" className="gap-2 -ml-2">
          <Link href="/dashboard/timesheets">
            <ArrowLeft className="h-4 w-4" />
            Back to Timesheets
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-semibold">Weekly Timesheet</h1>
        <p className="text-muted-foreground">
          Enter hours by project for each day. Submitted entries require approval.
        </p>
      </div>

      <WeeklyGrid
        allocations={serializeForClient(allocations)}
        existingEntries={serializeForClient(existingEntries)}
      />
    </div>
  )
}
