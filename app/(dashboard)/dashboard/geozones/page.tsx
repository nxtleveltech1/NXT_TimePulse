import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { GeozonesList } from "./geozones-list"
import { GeozonesMap } from "@/components/map/geozones-map"
import { isAdminOrManager } from "@/lib/auth"

export default async function GeozonesPage() {
  const { orgId, orgRole } = await auth()
  const isAdmin = isAdminOrManager(orgRole as string)
  const org = orgId ?? "org_default"

  const geozones = await prisma.geozone.findMany({
    where: { project: { orgId: org } },
    include: { project: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold">Geozones</h1>
          {isAdmin && (
            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              Admin: Edit
            </span>
          )}
        </div>
        <p className="text-muted-foreground">
          Geofence areas for automatic clock-in/out
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Map</CardTitle>
          <CardDescription>All geozones across projects</CardDescription>
        </CardHeader>
        <CardContent>
          <GeozonesMap height={320} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All geozones</CardTitle>
          <CardDescription>{geozones.length} geozone(s) across projects</CardDescription>
        </CardHeader>
        <CardContent>
          <GeozonesList geozones={geozones} />
        </CardContent>
      </Card>
    </div>
  )
}
