import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Plus, MapPin } from "lucide-react"
import { GeozonesTable } from "./geozones-table"
import { GeozonesMap } from "@/components/map/geozones-map"
import { ProjectFinancials } from "./project-financials"
import { ProjectTeam } from "./project-team"

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { orgId } = await auth()
  const org = orgId ?? "org_default"

  const [project, allocations, projects, users] = await Promise.all([
    prisma.project.findFirst({
      where: { id, orgId: org },
      include: { geozones: true },
    }),
    prisma.projectAllocation.findMany({
      where: { projectId: id, project: { orgId: org } },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: { startDate: "desc" },
    }),
    prisma.project.findMany({
      where: { orgId: org },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { orgId: org },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" },
    }),
  ])

  if (!project) notFound()

  const serializedAllocations = allocations.map((a) => ({
    ...a,
    hourlyRate: Number(a.hourlyRate),
    startDate: a.startDate.toISOString().slice(0, 10),
    endDate: a.endDate ? a.endDate.toISOString().slice(0, 10) : null,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/projects">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">{project.name}</h1>
          <p className="text-muted-foreground">{project.client ?? "No client"}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
          <CardDescription>Project information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <p><span className="font-medium">Status:</span> <Badge>{project.status}</Badge></p>
          {project.address && <p><span className="font-medium">Address:</span> {project.address}</p>}
          {project.description && <p><span className="font-medium">Description:</span> {project.description}</p>}
        </CardContent>
      </Card>

      <ProjectFinancials projectId={id} />

      <ProjectTeam
        projectId={id}
        initialAllocations={serializedAllocations}
        projects={projects}
        users={users}
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Geozones</CardTitle>
            <CardDescription>{project.geozones.length} geozone(s) for this project</CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={`/dashboard/projects/${id}/geozones/new`}>
              <Plus className="mr-2 h-4 w-4" />
              Add geozone
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <GeozonesMap projectId={id} height={280} />
          <GeozonesTable geozones={project.geozones} projectId={id} />
        </CardContent>
      </Card>
    </div>
  )
}
