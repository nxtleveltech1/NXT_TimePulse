"use client"

import { useState } from "react"
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
import type { AllocationRow } from "./allocations-table"

type AllocationDeleteDialogProps = {
  allocation: AllocationRow
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function AllocationDeleteDialog({
  allocation,
  open,
  onOpenChange,
  onSuccess,
}: AllocationDeleteDialogProps) {
  const [deleting, setDeleting] = useState(false)

  const userLabel = allocation.user
    ? [allocation.user.firstName, allocation.user.lastName].filter(Boolean).join(" ") ||
      allocation.user.email ||
      allocation.userId
    : allocation.userId
  const projectLabel = allocation.project?.name ?? allocation.projectId

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/allocations/${allocation.id}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? "Failed to remove")
      }
      toast.success("Allocation removed")
      onOpenChange(false)
      onSuccess?.()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to remove")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove allocation</AlertDialogTitle>
          <AlertDialogDescription>
            Remove {userLabel} from {projectLabel}? This will stop using their allocation rate for future calculations.
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
            {deleting ? "Removing…" : "Remove"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
