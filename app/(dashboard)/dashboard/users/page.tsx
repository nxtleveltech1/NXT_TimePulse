import { auth } from "@clerk/nextjs/server"
import { Prisma } from "@/generated/prisma"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { UsersTable } from "./users-table"
import { UserInviteButton } from "./user-invite-button"
import { isAdmin, isAdminOrManager } from "@/lib/auth"
import { decimalToNumber } from "@/lib/serialize"
import Link from "next/link"

type UserRow = {
  id: string
  email: string | null
  firstName: string | null
  lastName: string | null
  role: string
  status: string
  _count: { timesheets: number; allocations: number }
}

type UserRateRow = {
  id: string
  firstName: string | null
  lastName: string | null
  email: string | null
  role: string
  status: string
  baseRate: unknown
  currency: string
}

type AssignmentRow = {
  id: string
  status: string
  userId: string
  projectId: string
}

type LifecycleRow = {
  id: string
  eventType: string
  createdAt: Date
  user: { id: string; firstName: string | null; lastName: string | null; email: string | null }
  actorUser: { id: string; firstName: string | null; lastName: string | null; email: string | null }
}

export default async function UsersPage() {
  const { userId, orgId, orgRole } = await auth()
  if (!isAdminOrManager(orgRole as string)) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Users</h1>
        <p className="text-muted-foreground">Access restricted to admins and managers.</p>
      </div>
    )
  }

  const org = orgId ?? "org_default"
  const canReadComp = isAdmin(orgRole as string)

  let degradedMode = false
  let users: UserRow[] = []
  let userRates: UserRateRow[] = []
  let assignments: AssignmentRow[] = []
  let lifecycleEvents: LifecycleRow[] = []
  let pendingRequests: Array<{ id: string }> = []

  try {
    ;[users, userRates, assignments, lifecycleEvents, pendingRequests] = await Promise.all([
      prisma.user.findMany({
        where: { orgId: org, status: { notIn: ["offboarded", "archived"] } },
        include: { _count: { select: { timesheets: true, allocations: true } } },
        orderBy: { createdAt: "desc" },
      }),
      canReadComp
        ? prisma.user.findMany({
            where: { orgId: org },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
              status: true,
              baseRate: true,
              currency: true,
            },
            orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
          })
        : Promise.resolve([]),
      prisma.projectAssignment.findMany({
        where: { orgId: org },
        select: { id: true, status: true, userId: true, projectId: true },
      }),
      prisma.userLifecycleEvent.findMany({
        where: { orgId: org },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          actorUser: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.adminChangeRequest.findMany({
        where: { orgId: org, status: "pending" },
        select: { id: true },
      }),
    ])
  } catch {
    degradedMode = true
    const fallbackUsers = await prisma.$queryRaw<
      Array<{
        id: string
        email: string | null
        first_name: string | null
        last_name: string | null
        role: string
        status: string
        timesheets_count: bigint
        allocations_count: bigint
      }>
    >(Prisma.sql`
      SELECT
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.role,
        u.status::text AS status,
        (
          SELECT COUNT(*)
          FROM timesheets t
          WHERE t.user_id = u.id
        ) AS timesheets_count,
        (
          SELECT COUNT(*)
          FROM project_allocations pa
          WHERE pa.user_id = u.id
        ) AS allocations_count
      FROM users u
      WHERE u.org_id = ${org}
        AND u.status NOT IN ('offboarded', 'archived')
      ORDER BY u.created_at DESC
    `)

    users = fallbackUsers.map((u) => ({
      id: u.id,
      email: u.email,
      firstName: u.first_name,
      lastName: u.last_name,
      role: u.role,
      status: u.status,
      _count: {
        timesheets: Number(u.timesheets_count),
        allocations: Number(u.allocations_count),
      },
    }))
  }

  const activeUsers = users.filter((u) => u.status === "active").length
  const suspendedUsers = users.filter((u) => u.status === "suspended").length
  const offboardedUsers = users.filter((u) => u.status === "offboarded" || u.status === "archived").length
  const activeAssignments = assignments.filter((a) => a.status === "active" || a.status === "paused").length

  return (
    <div className="space-y-6">
      <div className="flex flex-col flex-wrap gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">Users</h1>
            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              Admin
            </span>
          </div>
          <p className="text-muted-foreground">
            Directory, access governance, assignments, compensation, and lifecycle history
          </p>
        </div>
        <UserInviteButton />
      </div>

      <Tabs defaultValue="directory" className="space-y-4">
        {degradedMode && (
          <p className="rounded-md border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
            Running in compatibility mode due to partial schema mismatch. Core directory is available while advanced admin modules are temporarily unavailable.
          </p>
        )}
        <TabsList>
          <TabsTrigger value="directory">Directory</TabsTrigger>
          <TabsTrigger value="access">Access</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="compensation" disabled={!canReadComp || degradedMode}>Compensation</TabsTrigger>
          <TabsTrigger value="timeline" disabled={degradedMode}>Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="directory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All users</CardTitle>
              <CardDescription>
                {users.length} user(s) - Edit role/status or request offboarding from row actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UsersTable users={users} currentUserId={userId ?? ""} canManageComp={canReadComp && !degradedMode} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="access" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Access Overview</CardTitle>
              <CardDescription>Status and approval queue snapshot</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
              <p><span className="font-medium">Active:</span> {activeUsers}</p>
              <p><span className="font-medium">Suspended:</span> {suspendedUsers}</p>
              <p><span className="font-medium">Offboarded/Archived:</span> {offboardedUsers}</p>
              <p><span className="font-medium">Pending change requests:</span> {pendingRequests.length}</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Assignment Overview</CardTitle>
              <CardDescription>Current staffing and project assignment records</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
              <p><span className="font-medium">Active assignments:</span> {activeAssignments}</p>
              <p><span className="font-medium">Total assignment records:</span> {assignments.length}</p>
              <p className="text-muted-foreground">
                Use Users {" > "} specific user profile or Projects {" > "} Team to manage assignment details.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compensation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Compensation</CardTitle>
              <CardDescription>
                Base hourly rates — click a user name to edit their rate
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!canReadComp || degradedMode ? (
                <p className="text-muted-foreground text-sm">Compensation details are unavailable in compatibility mode.</p>
              ) : userRates.length === 0 ? (
                <p className="text-muted-foreground text-sm">No users found.</p>
              ) : (
                <div className="divide-y text-sm">
                  <div className="grid grid-cols-4 pb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    <span className="col-span-2">User</span>
                    <span>Base Rate</span>
                    <span>Currency</span>
                  </div>
                  {userRates.map((u) => {
                    const name = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email || u.id
                    const rate = decimalToNumber(u.baseRate)
                    return (
                      <div key={u.id} className="grid grid-cols-4 items-center py-2.5">
                        <div className="col-span-2">
                          <Link
                            href={`/dashboard/users/${u.id}`}
                            className="font-medium hover:underline"
                          >
                            {name}
                          </Link>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Badge variant="secondary" className="text-xs py-0">{u.role}</Badge>
                            {u.status !== "active" && (
                              <Badge variant="outline" className="text-xs py-0">{u.status}</Badge>
                            )}
                          </div>
                        </div>
                        <span className="tabular-nums font-medium">
                          {rate > 0 ? rate.toFixed(2) : <span className="text-muted-foreground">—</span>}
                        </span>
                        <span className="text-muted-foreground">{u.currency.trim()}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Lifecycle Timeline</CardTitle>
              <CardDescription>Recent user lifecycle events across the organization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {lifecycleEvents.length === 0 && <p className="text-muted-foreground">No lifecycle events yet.</p>}
              {lifecycleEvents.map((e) => {
                const userName = [e.user.firstName, e.user.lastName].filter(Boolean).join(" ") || e.user.email || e.user.id
                const actorName = [e.actorUser.firstName, e.actorUser.lastName].filter(Boolean).join(" ") || e.actorUser.email || e.actorUser.id
                return (
                  <div key={e.id} className="rounded border p-2">
                    <p className="font-medium">{e.eventType} - {userName}</p>
                    <p className="text-muted-foreground">
                      {e.createdAt.toISOString().slice(0, 19).replace("T", " ")} by {actorName}
                    </p>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
