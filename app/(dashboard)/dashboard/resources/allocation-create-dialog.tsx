"use client"

import { useState } from "react"
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

type AllocationCreateDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  userId?: string
  projectId?: string
  users: { id: string; firstName: string | null; lastName: string | null; baseRate?: number; currency?: string }[]
  projects: { id: string; name: string }[]
}

export function AllocationCreateDialog({
  open,
  onOpenChange,
  onSuccess,
  userId: initialUserId,
  projectId: initialProjectId,
  users,
  projects,
}: AllocationCreateDialogProps) {
  const [userId, setUserId] = useState(initialUserId ?? "")
  const [projectId, setProjectId] = useState(initialProjectId ?? "")
  const [roleOnProject, setRoleOnProject] = useState("")
  const [billRate, setBillRate] = useState("")
  const [saving, setSaving] = useState(false)

  const selectedUser = users.find((u) => u.id === userId)
  const userBaseRate = selectedUser?.baseRate
  const userCurrency = selectedUser?.currency?.trim() ?? "ZAR"

  const canSubmit = userId && projectId && roleOnProject

  function handleUserChange(uid: string) {
    setUserId(uid)
    setBillRate("")
  }

  async function handleCreate() {
    if (!canSubmit) return
    setSaving(true)
    try {
      const parsedBillRate = billRate !== "" ? parseFloat(billRate) : null
      const res = await fetch("/api/allocations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          projectId,
          roleOnProject,
          billRate: parsedBillRate,
          startDate: new Date().toISOString().slice(0, 10),
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(err?.error ?? "Failed to create")
      }
      toast.success("Allocation created")
      onOpenChange(false)
      setUserId(initialUserId ?? "")
      setProjectId(initialProjectId ?? "")
      setRoleOnProject("")
      setBillRate("")
      onSuccess?.()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add allocation</DialogTitle>
          <DialogDescription>
            Assign a user to a project with a role and optional bill rate override
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>User</Label>
            <Select
              value={userId}
              onValueChange={handleUserChange}
              disabled={!!initialUserId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {[u.firstName, u.lastName].filter(Boolean).join(" ") || u.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Project</Label>
            <Select
              value={projectId}
              onValueChange={setProjectId}
              disabled={!!initialProjectId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Role on project</Label>
            <Input
              value={roleOnProject}
              onChange={(e) => setRoleOnProject(e.target.value)}
              placeholder="e.g. Site Manager"
            />
          </div>
          <div className="grid gap-2">
            <Label>
              Client bill rate{" "}
              <span className="text-muted-foreground font-normal">(optional override)</span>
            </Label>
            <Input
              type="number"
              step="0.01"
              min={0}
              value={billRate}
              onChange={(e) => setBillRate(e.target.value)}
              placeholder={
                userBaseRate != null
                  ? `${userCurrency} ${userBaseRate.toFixed(2)}/hr (user base rate)`
                  : "Leave blank to use user's base rate"
              }
            />
            {userBaseRate != null && (
              <p className="text-xs text-muted-foreground">
                {billRate === ""
                  ? `Will use ${selectedUser?.firstName ?? "user"}&apos;s base rate: ${userCurrency} ${userBaseRate.toFixed(2)}/hr`
                  : `Base rate: ${userCurrency} ${userBaseRate.toFixed(2)}/hr`}
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={saving || !canSubmit}>
            {saving ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
