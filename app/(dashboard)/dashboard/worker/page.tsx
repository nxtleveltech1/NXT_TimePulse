import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { WorkerClock } from "./worker-clock"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { serializeForClient } from "@/lib/serialize"

export default async function WorkerPage() {
  const { userId } = await auth()
  if (!userId) return null

  const [allocations, openTimesheet, recentTimesheets] = await Promise.all([
    prisma.projectAllocation.findMany({
      where: { userId, isActive: true },
      include: { project: { select: { id: true, name: true } } },
    }),
    prisma.timesheet.findFirst({
      where: { userId, clockOut: null },
      include: { project: { select: { name: true } }, geozone: { select: { name: true } } },
    }),
    prisma.timesheet.findMany({
      where: { userId },
      include: { project: { select: { name: true } } },
      orderBy: { date: "desc" },
      take: 10,
    }),
  ])

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Worker</h1>
        <p className="text-muted-foreground">
          Your assigned projects and timesheet
        </p>
      </div>

      <WorkerClock
        openTimesheet={serializeForClient(openTimesheet)}
        allocations={serializeForClient(allocations)}
      />

      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle>Assigned projects</CardTitle>
          <CardDescription>{allocations.length} project(s)</CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0">
          {allocations.length === 0 ? (
            <p className="text-muted-foreground">No project allocations yet.</p>
          ) : (
            <ul className="space-y-2">
              {allocations.map((a) => (
                <li key={a.id} className="flex min-h-[44px] items-center justify-between py-1">
                  <span>{a.project.name}</span>
                  <Badge variant="secondary">{a.roleOnProject}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle>Recent timesheets</CardTitle>
          <CardDescription>Your last 10 entries</CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0">
          {recentTimesheets.length === 0 ? (
            <p className="text-muted-foreground">No timesheets yet.</p>
          ) : (
            <ul className="space-y-2">
              {recentTimesheets.map((t) => (
                <li key={t.id} className="flex min-h-[44px] items-center justify-between py-1 text-sm">
                  <span>{t.date} — {t.project.name}</span>
                  <Badge variant={t.status === "approved" ? "default" : "secondary"}>{t.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Button asChild variant="outline" size="lg" className="min-h-[44px]">
        <Link href="/dashboard/timesheets">View all timesheets</Link>
      </Button>
    </div>
  )
}
