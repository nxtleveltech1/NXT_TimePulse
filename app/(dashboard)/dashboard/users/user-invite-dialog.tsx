"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"

type UserInviteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UserInviteDialog({ open, onOpenChange }: UserInviteDialogProps) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<"admin" | "manager" | "worker">("worker")
  const [sending, setSending] = useState(false)

  async function handleInvite() {
    const trimmed = email.trim()
    if (!trimmed) {
      toast.error("Enter an email address")
      return
    }
    setSending(true)
    try {
      const res = await fetch("/api/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, role }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? "Failed to invite")
      toast.success(`Invitation sent to ${trimmed}`)
      setEmail("")
      setRole("worker")
      onOpenChange(false)
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to invite")
    } finally {
      setSending(false)
    }
  }

  async function handleAddExisting() {
    const trimmed = email.trim()
    if (!trimmed) {
      toast.error("Enter an email address")
      return
    }
    setSending(true)
    try {
      const res = await fetch("/api/users/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, role }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? "Failed to add")
      toast.success(`Added ${trimmed} to organization`)
      setEmail("")
      setRole("worker")
      onOpenChange(false)
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add")
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add user</DialogTitle>
          <DialogDescription>
            Invite a new user or add an existing Clerk user to the organization.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="colleague@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as "admin" | "manager" | "worker")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="worker">Worker</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-sm text-muted-foreground">
            <strong>Invite</strong> sends an email link. <strong>Add existing</strong> adds immediately if they have an account.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancel
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleAddExisting}
              disabled={sending || !email.trim()}
            >
              {sending ? "Adding…" : "Add existing"}
            </Button>
            <Button onClick={handleInvite} disabled={sending || !email.trim()}>
              {sending ? "Sending…" : "Invite"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
