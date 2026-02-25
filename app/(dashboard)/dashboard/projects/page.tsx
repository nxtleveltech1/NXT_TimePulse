import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Plus } from "lucide-react"
import { ProjectsTable } from "./projects-table"
import { isAdminOrManager } from "@/lib/auth"

export default async function ProjectsPage() {
  const { orgId, orgRole } = await auth()
  const isAdmin = isAdminOrManager(orgRole as string)
  const org = orgId ?? "org_default"

  const projects = await prisma.project.findMany({
    where: { orgId: org },
    include: { _count: { select: { geozones: true } } },
    orderBy: { createdAt: "desc" },
  })

  const serialized = projects.map((p) => ({
    ...p,
    defaultRate: Number(p.defaultRate),
    startDate: p.startDate?.toISOString() ?? null,
    endDate: p.endDate?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">Projects</h1>
            {isAdmin && (
              <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                Admin: Create
              </span>
            )}
          </div>
          <p className="text-muted-foreground">
            Manage projects and their geozones
          </p>
        </div>
        {isAdmin && (
          <Button asChild size="lg">
            <Link href="/dashboard/projects/new">
              <Plus className="mr-2 h-4 w-4" />
              New project
            </Link>
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All projects</CardTitle>
          <CardDescription>{projects.length} project(s)</CardDescription>
        </CardHeader>
        <CardContent>
          <ProjectsTable projects={serialized} />
        </CardContent>
      </Card>
    </div>
  )
}
