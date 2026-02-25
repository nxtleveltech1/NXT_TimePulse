"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "sonner"

type Request = {
  id: string
  userId: string
  startDate: string
  endDate: string
  type: string
  reason: string | null
  status: string
  approvedAt: string | null
  createdAt: string
  user: { id: string; firstName: string | null; lastName: string | null; email: string | null }
}

export function LeaveRequestList({
  requests,
  isAdmin,
  currentUserId,
}: {
  requests: Request[]
  isAdmin: boolean
  currentUserId: string
}) {
  const router = useRouter()

  async function updateStatus(id: string, status: string) {
    try {
      const res = await fetch(`/api/leave/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? "Failed")
      }
      toast.success(status === "approved" ? "Approved" : status === "rejected" ? "Rejected" : "Cancelled")
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed")
    }
  }

  function userName(u: Request["user"]) {
    return [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email || u.id
  }

  if (requests.length === 0) {
    return <p className="text-muted-foreground text-sm">No leave requests yet.</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {isAdmin && <TableHead>Worker</TableHead>}
          <TableHead>Start</TableHead>
          <TableHead>End</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests.map((r) => (
          <TableRow key={r.id}>
            {isAdmin && <TableCell>{userName(r.user)}</TableCell>}
            <TableCell>{r.startDate}</TableCell>
            <TableCell>{r.endDate}</TableCell>
            <TableCell className="capitalize">{r.type}</TableCell>
            <TableCell>
              <Badge
                variant={
                  r.status === "approved"
                    ? "default"
                    : r.status === "rejected" || r.status === "cancelled"
                      ? "destructive"
                      : "secondary"
                }
              >
                {r.status}
              </Badge>
            </TableCell>
            <TableCell>
              {r.status === "pending" && isAdmin && (
                <div className="flex gap-2">
                  <Button size="sm" variant="default" onClick={() => updateStatus(r.id, "approved")}>
                    Approve
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => updateStatus(r.id, "rejected")}>
                    Reject
                  </Button>
                </div>
              )}
              {r.status === "pending" && !isAdmin && r.userId === currentUserId && (
                <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, "cancelled")}>
                  Cancel
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
