"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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

type UserWithCount = {
  id: string
  email: string | null
  firstName: string | null
  lastName: string | null
  role: string
  status: string
  _count: { timesheets: number; allocations: number }
}

type UserRemoveDialogProps = {
  user: UserWithCount
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UserRemoveDialog({ user, open, onOpenChange }: UserRemoveDialogProps) {
  const router = useRouter()
  const [removing, setRemoving] = useState(false)

  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || user.id

  async function handleRemove() {
    setRemoving(true)
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? "Failed to remove user")
      }
      toast.success(`${displayName} removed from organization`)
      onOpenChange(false)
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to remove user")
    } finally {
      setRemoving(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove user</AlertDialogTitle>
          <AlertDialogDescription>
            Remove {displayName} from the organization? They will lose access immediately. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={removing}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleRemove()
            }}
            disabled={removing}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {removing ? "Removing…" : "Remove"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
