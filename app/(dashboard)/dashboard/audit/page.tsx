import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { AuditContent } from "./audit-content"
import { isAdminOrManager } from "@/lib/auth"

export default async function AuditPage() {
  const { orgRole } = await auth()
  if (!isAdminOrManager(orgRole as string)) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Audit log</h1>
        <p className="text-muted-foreground">Access restricted to admins and managers.</p>
      </div>
    )
  }

  const org = (await auth()).orgId ?? "org_default"
  const logs = await prisma.auditLog.findMany({
    where: { user: { orgId: org } },
    include: { user: { select: { firstName: true, lastName: true, email: true } } },
    orderBy: { timestamp: "desc" },
    take: 100,
  })

  const serialized = logs.map((l) => ({
    id: l.id,
    action: l.action,
    entityType: l.entityType,
    entityId: l.entityId,
    details: l.details,
    previousValue: l.previousValue,
    newValue: l.newValue,
    timestamp: l.timestamp.toISOString(),
    user: l.user,
  }))

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold">Audit log</h1>
          <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            Admin
          </span>
        </div>
        <p className="text-muted-foreground">
          Recent actions across the organization
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
          <CardDescription>Last 100 entries</CardDescription>
        </CardHeader>
        <CardContent>
          <AuditContent logs={serialized} />
        </CardContent>
      </Card>
    </div>
  )
}
