import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UsersTable } from "./users-table"
import { UserInviteButton } from "./user-invite-button"
import { isAdminOrManager } from "@/lib/auth"

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
  const users = await prisma.user.findMany({
    where: { orgId: org },
    include: { _count: { select: { timesheets: true, allocations: true } } },
    orderBy: { createdAt: "desc" },
  })

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
            Invite, edit, and remove organization members
          </p>
        </div>
        <UserInviteButton />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All users</CardTitle>
          <CardDescription>
            {users.length} user(s) — Edit role/status or remove via row actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UsersTable users={users} currentUserId={userId ?? ""} />
        </CardContent>
      </Card>
    </div>
  )
}
