import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { isAdminOrManager } from "@/lib/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TimesheetsTable } from "./timesheets-table"

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
  if (!isAdmin) where.userId = userId
  if (status) where.status = status

  const timesheets = await prisma.timesheet.findMany({
    where,
    include: {
      user: { select: { id: true, firstName: true, lastName: true } },
      project: { select: { id: true, name: true } },
      geozone: { select: { id: true, name: true } },
    },
    orderBy: [{ date: "desc" }, { clockIn: "desc" }],
    take: 100,
  })

  return (
    <div className="space-y-6">
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

      <Card>
        <CardHeader>
          <CardTitle>Recent timesheets</CardTitle>
          <CardDescription>{timesheets.length} entries</CardDescription>
        </CardHeader>
        <CardContent>
          <TimesheetsTable timesheets={timesheets} isAdmin={isAdmin} />
        </CardContent>
      </Card>
    </div>
  )
}
