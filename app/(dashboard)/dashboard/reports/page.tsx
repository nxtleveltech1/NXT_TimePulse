import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ReportsContent } from "./reports-content"
import { isAdminOrManager } from "@/lib/auth"

export default async function ReportsPage() {
  const { orgId, orgRole } = await auth()
  if (!isAdminOrManager(orgRole as string)) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Reports</h1>
        <p className="text-muted-foreground">Access restricted to admins and managers.</p>
      </div>
    )
  }

  const org = orgId ?? "org_default"
  const [byProject, byUser, billableAgg, nonBillableAgg] = await Promise.all([
    prisma.timesheet.groupBy({
      by: ["projectId"],
      _sum: { durationMinutes: true },
      where: { project: { orgId: org } },
    }),
    prisma.timesheet.groupBy({
      by: ["userId"],
      _sum: { durationMinutes: true },
      where: { project: { orgId: org } },
    }),
    prisma.timesheet.aggregate({
      _sum: { durationMinutes: true },
      where: { project: { orgId: org }, isBillable: true },
    }),
    prisma.timesheet.aggregate({
      _sum: { durationMinutes: true },
      where: { project: { orgId: org }, isBillable: false },
    }),
  ])

  const projectIds = [...new Set(byProject.map((p) => p.projectId))]
  const userIds = [...new Set(byUser.map((u) => u.userId))]

  const [projects, users] = await Promise.all([
    prisma.project.findMany({ where: { id: { in: projectIds } }, select: { id: true, name: true } }),
    prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, firstName: true, lastName: true } }),
  ])

  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p.name]))
  const userMap = Object.fromEntries(
    users.map((u) => [u.id, [u.firstName, u.lastName].filter(Boolean).join(" ") || u.id])
  )

  const hoursByProject = byProject.map((p) => ({
    project: projectMap[p.projectId] ?? p.projectId,
    hours: ((p._sum.durationMinutes ?? 0) / 60).toFixed(1),
  }))

  const hoursByUser = byUser.map((u) => ({
    user: userMap[u.userId] ?? u.userId,
    hours: ((u._sum.durationMinutes ?? 0) / 60).toFixed(1),
  }))

  const billableHours = ((billableAgg._sum.durationMinutes ?? 0) / 60).toFixed(1)
  const nonBillableHours = ((nonBillableAgg._sum.durationMinutes ?? 0) / 60).toFixed(1)

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold">Reports</h1>
          <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            Admin
          </span>
        </div>
        <p className="text-muted-foreground">
          Hours by project and worker, CSV and payroll export
        </p>
      </div>

      <ReportsContent
        hoursByProject={hoursByProject}
        hoursByUser={hoursByUser}
        billableHours={billableHours}
        nonBillableHours={nonBillableHours}
      />
    </div>
  )
}
