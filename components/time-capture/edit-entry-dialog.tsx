"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { format } from "date-fns"
import { Pencil } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { editEntrySchema, type EditEntryValues } from "@/lib/validations/timesheet"

type EditableTimesheet = {
  id: string
  date: string
  clockIn: Date | string
  clockOut: Date | string | null
  notes: string | null
  breakMinutes: number
  isBillable?: boolean
  status: string
}

interface EditEntryDialogProps {
  timesheet: EditableTimesheet
  isAdmin: boolean
  open: boolean
  onOpenChange: (o: boolean) => void
  onSuccess?: () => void
}

export function EditEntryDialog({
  timesheet,
  isAdmin,
  open,
  onOpenChange,
  onSuccess,
}: EditEntryDialogProps) {
  const [loading, setLoading] = useState(false)

  const clockInDate = new Date(timesheet.clockIn)
  const clockOutDate = timesheet.clockOut ? new Date(timesheet.clockOut) : null

  const form = useForm<EditEntryValues>({
    resolver: zodResolver(editEntrySchema),
    defaultValues: {
      clockIn: `${timesheet.date}T${format(clockInDate, "HH:mm")}`,
      clockOut: clockOutDate ? `${timesheet.date}T${format(clockOutDate, "HH:mm")}` : "",
      notes: timesheet.notes ?? "",
      breakMinutes: timesheet.breakMinutes ?? 0,
      isBillable: timesheet.isBillable !== false,
      adjustmentReason: "",
    },
  })

  async function onSubmit(values: EditEntryValues) {
    setLoading(true)
    try {
      const body: Record<string, unknown> = {
        clockIn: new Date(values.clockIn).toISOString(),
        notes: values.notes ?? "",
        breakMinutes: values.breakMinutes,
        isBillable: values.isBillable,
      }
      if (values.clockOut) {
        body.clockOut = new Date(values.clockOut).toISOString()
      }
      if (isAdmin && values.adjustmentReason) {
        body.adjustmentReason = values.adjustmentReason
      }

      const res = await fetch(`/api/timesheets/${timesheet.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? "Failed to update entry")
      }

      toast.success("Time entry updated")
      onOpenChange(false)
      onSuccess?.()
      window.location.reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update entry")
    } finally {
      setLoading(false)
    }
  }

  const canEdit = isAdmin || timesheet.status === "pending"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4" />
            Edit Time Entry
          </DialogTitle>
          <DialogDescription>
            {timesheet.date} — {canEdit ? "Update clock times and details." : "Only pending entries can be edited."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="clockIn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Clock In</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" disabled={!canEdit} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="clockOut"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Clock Out</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" disabled={!canEdit} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="breakMinutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Break (minutes)</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} max={480} disabled={!canEdit} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Optional notes..." rows={2} disabled={!canEdit} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isBillable"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <FormLabel className="cursor-pointer">Billable</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} disabled={!canEdit} />
                  </FormControl>
                </FormItem>
              )}
            />

            {isAdmin && (
              <FormField
                control={form.control}
                name="adjustmentReason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason for adjustment</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Corrected clock-out time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !canEdit}>
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
