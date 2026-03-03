import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { isAdminOrManager } from "@/lib/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TimesheetsTable } from "./timesheets-table"
import { TimesheetsViewToggle } from "./timesheets-view-toggle"
import { ManualEntryDialog } from "@/components/time-capture/manual-entry-dialog"
import { serializeForClient } from "@/lib/serialize"
import Link from "next/link"
import { LayoutGrid } from "lucide-react"

export default async function TimesheetsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { userId, orgId, orgRole } = await auth()
  const { status } = await searchParams
  const isAdmin = isAdminOrManager(orgRole as string)
  const org = orgId ?? "org_default"

  const where: { userId?: string; status?: string; project?: { orgId: string } } = {
    project: { orgId: org },
  }
  if (!isAdmin && userId) where.userId = userId
  if (status) where.status = status

  const [timesheets, allocations, orgProjects] = await Promise.all([
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
          include: { project: { select: { id: true, name: true } } },
        })
      : Promise.resolve([]),
    isAdmin
      ? prisma.project.findMany({
          where: { orgId: org, status: "active" },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
  ])

  // Admins see all org projects; workers see their allocations
  const projectsForDialog = isAdmin && orgProjects.length > 0
    ? orgProjects.map((p) => ({ id: p.id, projectId: p.id, project: p }))
    : allocations

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
            {isAdmin ? "View and approve timesheet entries" : "View your timesheets"}
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

      <Card>
        <CardHeader>
          <CardTitle>Recent timesheets</CardTitle>
          <CardDescription>{timesheets.length} entries</CardDescription>
        </CardHeader>
        <CardContent>
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
