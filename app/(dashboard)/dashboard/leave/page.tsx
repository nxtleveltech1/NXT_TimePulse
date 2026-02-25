import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LeaveRequestForm } from "./leave-request-form"
import { LeaveRequestList } from "./leave-request-list"
import { isAdminOrManager } from "@/lib/auth"

export default async function LeavePage() {
  const { userId, orgId, orgRole } = await auth()
  if (!userId) return null

  const org = orgId ?? "org_default"
  const isAdmin = isAdminOrManager(orgRole as string)

  const requests = await prisma.leaveRequest.findMany({
    where: isAdmin ? { user: { orgId: org } } : { userId },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  const serialized = requests.map((r) => ({
    id: r.id,
    userId: r.userId,
    startDate: r.startDate.toISOString().split("T")[0],
    endDate: r.endDate.toISOString().split("T")[0],
    type: r.type,
    reason: r.reason,
    status: r.status,
    approvedAt: r.approvedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    user: r.user,
  }))

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold">Leave</h1>
          {isAdmin && (
            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              Admin: Approve/Reject
            </span>
          )}
        </div>
        <p className="text-muted-foreground">
          {isAdmin ? "Request leave or manage all org requests" : "Request leave or view your requests"}
        </p>
      </div>

      <LeaveRequestForm />

      <Card>
        <CardHeader>
          <CardTitle>Leave requests</CardTitle>
          <CardDescription>
            {isAdmin ? "All org requests" : "Your requests"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LeaveRequestList
            requests={serialized}
            isAdmin={isAdmin}
            currentUserId={userId}
          />
        </CardContent>
      </Card>
    </div>
  )
}
