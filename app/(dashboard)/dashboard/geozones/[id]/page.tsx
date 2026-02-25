import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { GeozoneEditForm } from "./geozone-edit-form"

export default async function GeozoneEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { orgId } = await auth()
  const org = orgId ?? "org_default"

  const geozone = await prisma.geozone.findFirst({
    where: { id, project: { orgId: org } },
    include: { project: true },
  })

  if (!geozone) notFound()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/projects/${geozone.projectId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Edit geozone</h1>
          <p className="text-muted-foreground">{geozone.name}</p>
        </div>
      </div>

      <GeozoneEditForm geozone={geozone} />
    </div>
  )
}
