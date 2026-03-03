import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UsersTable } from "./users-table"
import { UserInviteButton } from "./user-invite-button"
import { isAdmin, isAdminOrManager } from "@/lib/auth"

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

  const [users, assignments, lifecycleEvents, pendingRequests, rateCount] = await Promise.all([
    prisma.user.findMany({
      where: { orgId: org },
      include: { _count: { select: { timesheets: true, allocations: true } } },
      orderBy: { createdAt: "desc" },
    }),
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
    canReadComp ? prisma.rateCard.count({ where: { orgId: org } }) : Promise.resolve(0),
  ])

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
        <TabsList>
          <TabsTrigger value="directory">Directory</TabsTrigger>
          <TabsTrigger value="access">Access</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="compensation" disabled={!canReadComp}>Compensation</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="directory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All users</CardTitle>
              <CardDescription>
                {users.length} user(s) · Edit role/status or request offboarding from row actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UsersTable users={users} currentUserId={userId ?? ""} canManageComp={canReadComp} />
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
              <CardDescription>Rate cards and approval-gated compensation changes</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
              {!canReadComp ? (
                <p className="text-muted-foreground">Only admins can view compensation details.</p>
              ) : (
                <>
                  <p><span className="font-medium">Rate card records:</span> {rateCount}</p>
                  <p className="text-muted-foreground">
                    Open Approvals to review pending rate changes before they become active.
                  </p>
                </>
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
                    <p className="font-medium">{e.eventType} · {userName}</p>
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

