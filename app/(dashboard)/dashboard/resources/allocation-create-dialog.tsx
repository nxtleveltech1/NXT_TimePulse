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
  users: { id: string; firstName: string | null; lastName: string | null }[]
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
  const [hourlyRate, setHourlyRate] = useState("0")
  const [saving, setSaving] = useState(false)

  const canSubmit = userId && projectId && roleOnProject

  async function handleCreate() {
    if (!canSubmit) return
    setSaving(true)
    try {
      const res = await fetch("/api/allocations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          projectId,
          roleOnProject,
          hourlyRate: parseFloat(hourlyRate) || 0,
          startDate: new Date().toISOString().slice(0, 10),
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? "Failed to create")
      }
      toast.success("Allocation created")
      onOpenChange(false)
      setUserId(initialUserId ?? "")
      setProjectId(initialProjectId ?? "")
      setRoleOnProject("")
      setHourlyRate("0")
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
            Assign a user to a project with a role and hourly rate
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>User</Label>
            <Select
              value={userId}
              onValueChange={setUserId}
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
            <Label>Hourly rate</Label>
            <Input
              type="number"
              step="0.01"
              min={0}
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
            />
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
