import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { isAdminOrManager } from "@/lib/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TimesheetsTable } from "./timesheets-table"
import { TimesheetsToolbar } from "./timesheets-toolbar"
import { TimesheetsViewToggle } from "./timesheets-view-toggle"
import { ManualEntryDialog } from "@/components/time-capture/manual-entry-dialog"
import { WorkerClock } from "@/app/(dashboard)/dashboard/worker/worker-clock"
import { serializeForClient } from "@/lib/serialize"
import Link from "next/link"
import { LayoutGrid } from "lucide-react"

export default async function TimesheetsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string
    from?: string
    to?: string
    project?: string
    worker?: string
    source?: string
    billable?: string
  }>
}) {
  const { userId, orgId, orgRole } = await auth()
  if (!userId) return null
  const { status, from, to, project, worker, source, billable } = await searchParams
  const isAdmin = isAdminOrManager(orgRole as string)
  const org = orgId ?? "org_default"

  const where: Record<string, unknown> = {
    project: { orgId: org },
  }
  if (!isAdmin && userId) where.userId = userId
  if (isAdmin && worker) where.userId = worker
  if (status) where.status = status
  if (project) where.projectId = project
  if (source) where.source = source
  if (billable === "yes") where.isBillable = true
  if (billable === "no") where.isBillable = false
  if (from || to) {
    where.date = {} as Record<string, string>
    if (from) (where.date as Record<string, string>).gte = from
    if (to) (where.date as Record<string, string>).lte = to
  }

  const [timesheets, allocations, orgProjects, openTimesheet, recentTimesheets, orgWorkers] = await Promise.all([
    prisma.timesheet.findMany({
      where,
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        project: { select: { id: true, name: true } },
        geozone: { select: { id: true, name: true } },
      },
      orderBy: [{ date: "desc" }, { clockIn: "desc" }],
      take: 100,
    }),
    userId
      ? prisma.projectAllocation.findMany({
          where: { userId, isActive: true },
          include: { project: { select: { id: true, name: true, isBillable: true, isDefault: true } } },
        })
      : Promise.resolve([]),
    isAdmin
      ? prisma.project.findMany({
          where: { orgId: org, status: "active" },
          select: { id: true, name: true, isBillable: true, isDefault: true },
        })
      : Promise.resolve([]),
    prisma.timesheet.findFirst({
      where: { userId, clockOut: null },
      include: { project: { select: { name: true } }, geozone: { select: { name: true } } },
      orderBy: { clockIn: "desc" },
    }),
    prisma.timesheet.findMany({
      where: { userId },
      include: { project: { select: { id: true, name: true } } },
      orderBy: { date: "desc" },
      take: 5,
    }),
    isAdmin
      ? prisma.user.findMany({
          where: { orgId: org },
          select: { id: true, firstName: true, lastName: true },
          orderBy: { firstName: "asc" },
        })
      : Promise.resolve([]),
  ])

  const projectsForDialog = isAdmin && orgProjects.length > 0
    ? orgProjects.map((p) => ({ id: p.id, projectId: p.id, project: p }))
    : allocations

  const lastCompletedTimesheet = recentTimesheets.find(
    (t) => t.clockOut !== null && t.id !== openTimesheet?.id
  ) ?? null

  const toolbarProjects = (isAdmin ? orgProjects : allocations.map((a) => a.project)).map(
    (p) => ({ id: p.id, name: p.name })
  )
  const toolbarWorkers = orgWorkers.map((w) => ({
    id: w.id,
    name: [w.firstName, w.lastName].filter(Boolean).join(" ") || w.id,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">Timesheets</h1>
            {isAdmin && (
              <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                Admin: Approve/Reject
              </span>
            )}
          </div>
          <p className="text-muted-foreground">
            {isAdmin ? "Clock in, manage entries and approve timesheets" : "Clock in and manage your time entries"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link href="/dashboard/timesheets/weekly">
              <LayoutGrid className="h-4 w-4" />
              Weekly
            </Link>
          </Button>
          <ManualEntryDialog allocations={serializeForClient(projectsForDialog)} />
        </div>
      </div>

      <WorkerClock
        openTimesheet={serializeForClient(openTimesheet)}
        allocations={serializeForClient(projectsForDialog)}
        lastTimesheet={
          lastCompletedTimesheet
            ? serializeForClient({
                projectId: lastCompletedTimesheet.projectId,
                project: lastCompletedTimesheet.project,
              })
            : undefined
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Time entries</CardTitle>
          <CardDescription>{timesheets.length} entries</CardDescription>
        </CardHeader>
        <CardContent>
          <TimesheetsToolbar
            projects={toolbarProjects}
            workers={toolbarWorkers}
            isAdmin={isAdmin}
          />
          <TimesheetsViewToggle
            tableView={<TimesheetsTable timesheets={serializeForClient(timesheets)} isAdmin={isAdmin} />}
            entries={timesheets.map((t) => ({
              id: t.id,
              date: t.date,
              label: t.project.name,
              status: t.status,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  )
}
