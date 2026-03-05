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
  isAdmin: boolean
}

export function UserRemoveDialog({ user, open, onOpenChange, isAdmin }: UserRemoveDialogProps) {
  const router = useRouter()
  const [removing, setRemoving] = useState(false)

  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || user.id
  const hasTimesheets = user._count.timesheets > 0
  const hasAllocations = user._count.allocations > 0
  const hasData = hasTimesheets || hasAllocations

  async function handleRemove() {
    setRemoving(true)
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to remove user")
      }
      if (data?.status === "pending_approval") {
        toast.success(`${displayName} removal submitted for approval`)
      } else {
        toast.success(`${displayName} removed from organization`)
      }
      onOpenChange(false)
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to remove user")
    } finally {
      setRemoving(false)
    }
  }

  const title = isAdmin ? "Remove user" : hasData ? "Request user removal" : "Remove user"

  let description: string
  if (isAdmin) {
    const parts: string[] = []
    if (hasTimesheets) parts.push(`${user._count.timesheets} timesheet${user._count.timesheets !== 1 ? "s" : ""}`)
    if (hasAllocations) parts.push(`${user._count.allocations} allocation${user._count.allocations !== 1 ? "s" : ""}`)
    description = hasData
      ? `This will immediately remove ${displayName} from the organization. They have ${parts.join(" and ")} — all active assignments will be ended and access revoked.`
      : `This will immediately remove ${displayName} from the organization and revoke all access.`
  } else {
    description = hasData
      ? `Submit a removal request for ${displayName}. An admin must approve before access is revoked.`
      : `Remove ${displayName} from the organization? This will delete their account immediately.`
  }

  const buttonLabel = isAdmin
    ? removing ? "Removing…" : "Remove user"
    : removing ? "Submitting…" : hasData ? "Submit request" : "Remove now"

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
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
            {buttonLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
