import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { isAdminOrManager } from "@/lib/auth"
import { DashboardCards } from "./dashboard-cards"

export default async function DashboardPage() {
  const { userId, orgId, orgRole } = await auth()
  if (!userId) return null

  const org = orgId ?? "org_default"
  const isAdmin = isAdminOrManager(orgRole as string)

  const [projectCount, geozoneCount, timesheetCount, userCount, pendingTimesheets] =
    await Promise.all([
      prisma.project.count({ where: { orgId: org } }),
      prisma.geozone.count({ where: { project: { orgId: org } } }),
      prisma.timesheet.count({ where: { project: { orgId: org } } }),
      prisma.user.count({ where: { orgId: org } }),
      prisma.timesheet.count({
        where: { status: "pending", project: { orgId: org } },
      }),
    ])

  const stats: { label: string; value: number | string; icon: string; href: string }[] = [
    { label: "Projects", value: projectCount, icon: "folder-kanban", href: "/dashboard/projects" },
    { label: "Geozones", value: geozoneCount, icon: "map-pin", href: "/dashboard/geozones" },
    { label: "Timesheets", value: timesheetCount, icon: "clock", href: "/dashboard/timesheets" },
    { label: "Users", value: userCount, icon: "users", href: "/dashboard/users" },
  ]

  const adminStats: { label: string; value: number | string; icon: string; href: string }[] = isAdmin
    ? [
        { label: "Manage Users", value: userCount, icon: "users", href: "/dashboard/users" },
        { label: "Reports", value: "→", icon: "bar-chart-3", href: "/dashboard/reports" },
        { label: "Financials", value: "→", icon: "file-text", href: "/dashboard/financials" },
        { label: "Audit Log", value: "→", icon: "scroll-text", href: "/dashboard/audit" },
      ]
    : []

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your workforce timesheet and geozone management
        </p>
      </div>

      {pendingTimesheets > 0 && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardHeader>
            <CardTitle>Pending approvals</CardTitle>
            <CardDescription>
              {pendingTimesheets} timesheet{pendingTimesheets !== 1 ? "s" : ""} awaiting approval
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/dashboard/timesheets?status=pending">Review timesheets</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <DashboardCards stats={stats} />

      {isAdmin && adminStats.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Admin Tools</h2>
            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              Admin only
            </span>
          </div>
          <DashboardCards stats={adminStats} />
        </div>
      )}
    </div>
  )
}
