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
  const isImmediate = user.status === "invited" || user.status === "suspended"
  const hasData = user._count.timesheets > 0 || user._count.allocations > 0
  const willBeImmediate = isImmediate && !hasData

  async function handleRemove() {
    setRemoving(true)
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to remove user")
      }
      if (data?.status === "removed") {
        toast.success(`${displayName} removed from organization`)
      } else if (data?.status === "pending_approval") {
        toast.success(`${displayName} offboarding submitted for approval`)
      } else {
        toast.success(`${displayName} removed`)
      }
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
          <AlertDialogTitle>
            {willBeImmediate ? "Remove user" : "Request offboarding"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {willBeImmediate
              ? `Remove ${displayName} from the organization? This will delete their account immediately.`
              : `Submit offboarding for ${displayName}? A second admin must approve before access is revoked.`}
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
            {removing ? "Removing…" : willBeImmediate ? "Remove now" : "Request offboard"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
