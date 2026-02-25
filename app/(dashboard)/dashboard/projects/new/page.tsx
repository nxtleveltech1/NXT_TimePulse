import { auth } from "@clerk/nextjs/server"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { ProjectForm } from "./project-form"

export default async function NewProjectPage() {
  const { orgId } = await auth()
  const orgIdVal = orgId ?? "org_default"

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/projects">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">New project</h1>
          <p className="text-muted-foreground">Create a new project</p>
        </div>
      </div>

      <ProjectForm orgId={orgIdVal} />
    </div>
  )
}
