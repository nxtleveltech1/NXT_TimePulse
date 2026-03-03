import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { serializeForClient } from "@/lib/serialize"
import { ApprovalsContent, type ChangeRequestRow } from "./approvals-content"

export default async function ApprovalsPage() {
  const { orgId, orgRole } = await auth()
  if (orgRole !== "org:admin") {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Approvals</h1>
        <p className="text-muted-foreground">Only admins can review change requests.</p>
      </div>
    )
  }
  if (!orgId) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Approvals</h1>
        <p className="text-muted-foreground">No organization context found.</p>
      </div>
    )
  }

  const requests = await prisma.adminChangeRequest.findMany({
    where: { orgId, status: "pending" },
    include: {
      requestedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Approvals</h1>
        <p className="text-muted-foreground">Maker-checker queue for critical changes</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Pending Requests</CardTitle>
          <CardDescription>{requests.length} request(s) awaiting review</CardDescription>
        </CardHeader>
        <CardContent>
          <ApprovalsContent initialRequests={serializeForClient(requests) as unknown as ChangeRequestRow[]} />
        </CardContent>
      </Card>
    </div>
  )
}
