"use client"

import { useState, useEffect, useTransition, useCallback } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { XCircle, Loader2, CalendarIcon } from "lucide-react"
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { bulkRejectDay, getPendingTimesheetCount } from "@/lib/actions/bulk"

type Worker = { id: string; name: string }

export function BulkRejectDayDialog({ workers }: { workers: Worker[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [workerId, setWorkerId] = useState("")
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [reason, setReason] = useState("")
  const [pendingCount, setPendingCount] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isLoadingCount, setIsLoadingCount] = useState(false)

  const dateStr = date ? format(date, "yyyy-MM-dd") : ""

  const fetchCount = useCallback(async () => {
    if (!workerId || !dateStr) {
      setPendingCount(null)
      return
    }
    setIsLoadingCount(true)
    try {
      const count = await getPendingTimesheetCount(workerId, dateStr, dateStr)
      setPendingCount(count)
    } catch {
      setPendingCount(null)
    } finally {
      setIsLoadingCount(false)
    }
  }, [workerId, dateStr])

  useEffect(() => {
    if (open) fetchCount()
  }, [open, fetchCount])

  function handleSubmit() {
    if (!workerId || !dateStr || !reason.trim()) return
    startTransition(async () => {
      try {
        const result = await bulkRejectDay(workerId, dateStr, reason)
        toast.success(`Rejected ${result.count} timesheet${result.count !== 1 ? "s" : ""}`)
        setOpen(false)
        resetState()
        router.refresh()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to reject")
      }
    })
  }

  function resetState() {
    setWorkerId("")
    setDate(undefined)
    setReason("")
    setPendingCount(null)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetState() }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
          <XCircle className="h-3.5 w-3.5" />
          Reject Day
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reject Day</DialogTitle>
          <DialogDescription>
            Reject all pending timesheets for a worker on a specific date.
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
            <label className="text-sm font-medium">Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "EEEE, MMM d, yyyy") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(d) => d > new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Reason <span className="text-destructive">*</span>
            </label>
            <Textarea
              placeholder="e.g. Hours not verified against site records"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          {workerId && dateStr && (
            <div className="rounded-md bg-muted px-3 py-2 text-sm">
              {isLoadingCount ? (
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Checking entries...
                </span>
              ) : pendingCount === 0 ? (
                <span className="text-muted-foreground">No pending timesheets for this date.</span>
              ) : (
                <span>
                  <strong>{pendingCount}</strong> pending timesheet{pendingCount !== 1 ? "s" : ""} will be rejected.
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
            variant="destructive"
            onClick={handleSubmit}
            disabled={!workerId || !dateStr || !reason.trim() || isPending || pendingCount === 0}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Reject {pendingCount ? `(${pendingCount})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
