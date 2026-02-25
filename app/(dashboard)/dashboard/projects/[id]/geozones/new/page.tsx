import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { GeozoneForm } from "./geozone-form"

export default async function NewGeozonePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { orgId } = await auth()
  const org = orgId ?? "org_default"

  const project = await prisma.project.findFirst({
    where: { id, orgId: org },
  })

  if (!project) notFound()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/projects/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Add geozone</h1>
          <p className="text-muted-foreground">
            Create a geofence for {project.name}
          </p>
        </div>
      </div>

      <GeozoneForm projectId={id} />
    </div>
  )
}
