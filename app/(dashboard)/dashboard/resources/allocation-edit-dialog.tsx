"use client"

import { useState, useEffect } from "react"
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
import { toast } from "sonner"
import type { AllocationRow } from "./allocations-table"

type AllocationEditDialogProps = {
  allocation: AllocationRow
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function AllocationEditDialog({
  allocation,
  open,
  onOpenChange,
  onSuccess,
}: AllocationEditDialogProps) {
  const [roleOnProject, setRoleOnProject] = useState(allocation.roleOnProject)
  const [billRate, setBillRate] = useState(
    allocation.billRate != null
      ? String(typeof allocation.billRate === "number" ? allocation.billRate : Number(allocation.billRate))
      : ""
  )
  const [startDate, setStartDate] = useState(allocation.startDate.slice(0, 10))
  const [endDate, setEndDate] = useState(allocation.endDate ? allocation.endDate.slice(0, 10) : "")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setRoleOnProject(allocation.roleOnProject)
      setBillRate(
        allocation.billRate != null
          ? String(typeof allocation.billRate === "number" ? allocation.billRate : Number(allocation.billRate))
          : ""
      )
      setStartDate(allocation.startDate.slice(0, 10))
      setEndDate(allocation.endDate ? allocation.endDate.slice(0, 10) : "")
    }
  }, [open, allocation])

  async function handleSave() {
    setSaving(true)
    try {
      const parsedBillRate = billRate !== "" ? parseFloat(billRate) : null
      const res = await fetch(`/api/allocations/${allocation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleOnProject,
          billRate: parsedBillRate,
          startDate,
          endDate: endDate || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? "Failed to update")
      }
      toast.success("Allocation updated")
      onOpenChange(false)
      onSuccess?.()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update")
    } finally {
      setSaving(false)
    }
  }

  const userBaseRate = allocation.userBaseRate
  const userCurrency = allocation.userCurrency ?? "ZAR"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit allocation</DialogTitle>
          <DialogDescription>
            Update role and client bill rate for this project allocation
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
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
                  ? `${userCurrency} ${Number(userBaseRate).toFixed(2)}/hr (user base rate)`
                  : "Leave blank to use user's base rate"
              }
            />
            {userBaseRate != null && (
              <p className="text-xs text-muted-foreground">
                {billRate === ""
                  ? `Uses base rate: ${userCurrency} ${Number(userBaseRate).toFixed(2)}/hr`
                  : `Base rate: ${userCurrency} ${Number(userBaseRate).toFixed(2)}/hr`}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Start date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>End date (optional)</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
