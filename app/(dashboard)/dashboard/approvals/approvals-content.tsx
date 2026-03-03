"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

export type ChangeRequestRow = {
  id: string
  changeType: string
  targetType: string
  status: string
  createdAt: string
  criticalReason: string | null
  requestedBy: {
    id: string
    firstName: string | null
    lastName: string | null
    email: string | null
  }
}

export function ApprovalsContent({
  initialRequests,
}: {
  initialRequests: ChangeRequestRow[]
}) {
  const [requests, setRequests] = useState(initialRequests)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function approve(id: string) {
    setBusyId(id)
    try {
      const res = await fetch(`/api/admin/change-requests/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? "Failed to approve")
      setRequests((prev) => prev.filter((r) => r.id !== id))
      toast.success("Change request approved")
      if (data.warning) toast.warning(data.warning)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to approve")
    } finally {
      setBusyId(null)
    }
  }

  async function reject(id: string) {
    const reason = window.prompt("Reason for rejection")
    if (!reason || !reason.trim()) return
    setBusyId(id)
    try {
      const res = await fetch(`/api/admin/change-requests/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? "Failed to reject")
      setRequests((prev) => prev.filter((r) => r.id !== id))
      toast.success("Change request rejected")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to reject")
    } finally {
      setBusyId(null)
    }
  }

  if (!requests.length) {
    return <p className="text-sm text-muted-foreground">No pending requests.</p>
  }

  return (
    <div className="space-y-3">
      {requests.map((r) => (
        <div key={r.id} className="rounded-lg border p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{r.changeType}</Badge>
                <span className="text-sm font-medium">{r.targetType}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Requested by {[r.requestedBy.firstName, r.requestedBy.lastName].filter(Boolean).join(" ") || r.requestedBy.email || r.requestedBy.id}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(r.createdAt).toISOString().slice(0, 19).replace("T", " ")}
              </p>
              {r.criticalReason && (
                <p className="text-xs text-amber-700 dark:text-amber-400">{r.criticalReason}</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={busyId === r.id}
                onClick={() => reject(r.id)}
              >
                Reject
              </Button>
              <Button
                size="sm"
                disabled={busyId === r.id}
                onClick={() => approve(r.id)}
              >
                Approve
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
