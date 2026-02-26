"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { Trash2 } from "lucide-react"

type ProjectWithCount = {
  id: string
  name: string
  client: string | null
  status: string
  _count: { geozones: number; timesheets?: number }
}

export function ProjectsTable({ projects }: { projects: ProjectWithCount[] }) {
  const router = useRouter()
  const [deleteTarget, setDeleteTarget] = useState<ProjectWithCount | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/projects/${deleteTarget.id}`, { method: "DELETE" })
      if (!res.ok) {
        const text = await res.text()
        let errMsg = "Failed to delete project"
        if (text) {
          try {
            const err = JSON.parse(text) as { error?: string }
            errMsg = err.error ?? errMsg
          } catch {
            errMsg = text
          }
        }
        throw new Error(errMsg)
      }
      toast.success(`"${deleteTarget.name}" deleted`)
      setDeleteTarget(null)
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete project")
    } finally {
      setDeleting(false)
    }
  }

  if (projects.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        No projects yet. Create one to get started.
      </div>
    )
  }

  return (
    <>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="sticky left-0 z-10 bg-background">Name</TableHead>
          <TableHead>Client</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Geozones</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {projects.map((p) => (
          <TableRow key={p.id}>
            <TableCell className="sticky left-0 z-10 bg-background font-medium">{p.name}</TableCell>
            <TableCell>{p.client ?? "—"}</TableCell>
            <TableCell>
              <Badge variant={p.status === "active" ? "default" : "secondary"}>
                {p.status}
              </Badge>
            </TableCell>
            <TableCell>{p._count.geozones}</TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/dashboard/projects/${p.id}`}>View</Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setDeleteTarget(p)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
    <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete project</AlertDialogTitle>
          <AlertDialogDescription>
            Delete &quot;{deleteTarget?.name}&quot;? This will permanently remove the project, all its geozones, timesheets, and allocations. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleDelete()
            }}
            disabled={deleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleting ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
  )
}
