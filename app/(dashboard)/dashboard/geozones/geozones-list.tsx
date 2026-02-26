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

type GeozoneWithProject = {
  id: string
  name: string
  description: string | null
  isActive: boolean
  project: { id: string; name: string }
}

export function GeozonesList({ geozones }: { geozones: GeozoneWithProject[] }) {
  const router = useRouter()
  const [deleteTarget, setDeleteTarget] = useState<GeozoneWithProject | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/geozones/${deleteTarget.id}`, { method: "DELETE" })
      if (!res.ok) {
        const text = await res.text()
        let errMsg = "Failed to delete geozone"
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
      toast.error(e instanceof Error ? e.message : "Failed to delete geozone")
    } finally {
      setDeleting(false)
    }
  }

  if (geozones.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        No geozones yet. Create a project and add geozones to enable geofence tracking.
      </div>
    )
  }

  return (
    <>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="sticky left-0 z-10 bg-background">Name</TableHead>
          <TableHead>Project</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {geozones.map((g) => (
          <TableRow key={g.id}>
            <TableCell className="sticky left-0 z-10 bg-background font-medium">{g.name}</TableCell>
            <TableCell>
              <Link href={`/dashboard/projects/${g.project.id}`} className="text-primary hover:underline">
                {g.project.name}
              </Link>
            </TableCell>
            <TableCell>
              <Badge variant={g.isActive ? "default" : "secondary"}>
                {g.isActive ? "Active" : "Inactive"}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/dashboard/geozones/${g.id}`}>Edit</Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setDeleteTarget(g)}
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
          <AlertDialogTitle>Delete geozone</AlertDialogTitle>
          <AlertDialogDescription>
            Delete &quot;{deleteTarget?.name}&quot;? This cannot be undone. Timesheets linked to this geozone will have their geozone cleared.
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
