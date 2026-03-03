"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { format } from "date-fns"
import { Plus } from "lucide-react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { manualEntrySchema, type ManualEntryValues } from "@/lib/validations/timesheet"

type Allocation = {
  id: string
  projectId: string
  project: { id: string; name: string }
}

interface ManualEntryDialogProps {
  allocations: Allocation[]
  onSuccess?: () => void
}

export function ManualEntryDialog({ allocations, onSuccess }: ManualEntryDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const form = useForm<ManualEntryValues>({
    resolver: zodResolver(manualEntrySchema),
    defaultValues: {
      projectId: "",
      date: format(new Date(), "yyyy-MM-dd"),
      clockIn: "09:00",
      clockOut: "17:00",
      notes: "",
      breakMinutes: 0,
      isBillable: true,
    },
  })

  async function onSubmit(values: ManualEntryValues) {
    setLoading(true)
    try {
      const clockInDt = new Date(`${values.date}T${values.clockIn}`)
      const clockOutDt = values.clockOut ? new Date(`${values.date}T${values.clockOut}`) : null

      const res = await fetch("/api/timesheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: values.projectId,
          clockIn: clockInDt.toISOString(),
          clockOut: clockOutDt?.toISOString() ?? null,
          notes: values.notes ?? "",
          breakMinutes: values.breakMinutes,
          isBillable: values.isBillable,
          source: "manual",
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? "Failed to create entry")
      }

      toast.success("Time entry created")
      setOpen(false)
      form.reset()
      onSuccess?.()
      window.location.reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create entry")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Entry
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Time Entry</DialogTitle>
          <DialogDescription>
            Manually record a past or current time entry.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="projectId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select project" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {allocations.map((a) => (
                        <SelectItem key={a.id} value={a.projectId}>
                          {a.project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} max={format(new Date(), "yyyy-MM-dd")} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="clockIn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Clock In</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
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
                      <Input type="time" {...field} />
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
                    <Input type="number" min={0} max={480} placeholder="0" {...field} />
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
                    <Textarea placeholder="Optional notes..." rows={2} {...field} />
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
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save Entry"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
