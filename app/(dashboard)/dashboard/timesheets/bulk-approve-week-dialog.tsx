"use client"

import { useState, useEffect, useTransition, useCallback } from "react"
import { useRouter } from "next/navigation"
import { startOfWeek, addWeeks, format, addDays } from "date-fns"
import { CheckCheck, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { bulkApproveWeek, getPendingTimesheetCount } from "@/lib/actions/bulk"

type Worker = { id: string; name: string }

export function BulkApproveWeekDialog({ workers }: { workers: Worker[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [workerId, setWorkerId] = useState("")
  const [weekOffset, setWeekOffset] = useState(0)
  const [pendingCount, setPendingCount] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isLoadingCount, setIsLoadingCount] = useState(false)

  const weekStart = startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 })
  const weekEnd = addDays(weekStart, 6)
  const weekStartStr = format(weekStart, "yyyy-MM-dd")
  const weekEndStr = format(weekEnd, "yyyy-MM-dd")
  const weekLabel = `${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d, yyyy")}`

  const fetchCount = useCallback(async () => {
    if (!workerId) {
      setPendingCount(null)
      return
    }
    setIsLoadingCount(true)
    try {
      const count = await getPendingTimesheetCount(workerId, weekStartStr, weekEndStr)
      setPendingCount(count)
    } catch {
      setPendingCount(null)
    } finally {
      setIsLoadingCount(false)
    }
  }, [workerId, weekStartStr, weekEndStr])

  useEffect(() => {
    if (open) fetchCount()
  }, [open, fetchCount])

  function handleSubmit() {
    if (!workerId) return
    startTransition(async () => {
      try {
        const result = await bulkApproveWeek(workerId, weekStartStr)
        toast.success(`Approved ${result.count} timesheet${result.count !== 1 ? "s" : ""}`)
        setOpen(false)
        resetState()
        router.refresh()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to approve")
      }
    })
  }

  function resetState() {
    setWorkerId("")
    setWeekOffset(0)
    setPendingCount(null)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetState() }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
          <CheckCheck className="h-3.5 w-3.5" />
          Approve Week
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Approve Week</DialogTitle>
          <DialogDescription>
            Approve all pending timesheets for a worker for the selected week.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Worker</label>
            <Select value={workerId} onValueChange={setWorkerId}>
              <SelectTrigger>
                <SelectValue placeholder="Select worker" />
              </SelectTrigger>
              <SelectContent>
                {workers.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Week</label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => setWeekOffset((o) => o - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1 rounded-md border px-3 py-2 text-center text-sm">
                {weekLabel}
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => setWeekOffset((o) => o + 1)}
                disabled={weekOffset >= 0}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {workerId && (
            <div className="rounded-md bg-muted px-3 py-2 text-sm">
              {isLoadingCount ? (
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Checking entries...
                </span>
              ) : pendingCount === 0 ? (
                <span className="text-muted-foreground">No pending timesheets for this week.</span>
              ) : (
                <span>
                  <strong>{pendingCount}</strong> pending timesheet{pendingCount !== 1 ? "s" : ""} will be approved.
                </span>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!workerId || isPending || pendingCount === 0}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Approve {pendingCount ? `(${pendingCount})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
