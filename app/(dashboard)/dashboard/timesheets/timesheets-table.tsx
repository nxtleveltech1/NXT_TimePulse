"use client"

import { useState, useMemo } from "react"
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table"
import { ArrowUpDown } from "lucide-react"
import { motion } from "motion/react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { format } from "date-fns"
import { toast } from "sonner"

type TimesheetWithRelations = {
  id: string
  date: string
  clockIn: Date
  clockOut: Date | null
  durationMinutes: number
  source: string
  status: string
  isBillable?: boolean
  user: { firstName: string | null; lastName: string | null }
  project: { name: string }
  geozone: { name: string } | null
}

export function TimesheetsTable({
  timesheets,
  isAdmin,
}: {
  timesheets: TimesheetWithRelations[]
  isAdmin: boolean
}) {
  const [dialog, setDialog] = useState<{ id: string; action: "approve" | "reject" } | null>(null)
  const [reason, setReason] = useState("")
  const [sorting, setSorting] = useState<SortingState>([{ id: "date", desc: true }])

  const columns = useMemo<ColumnDef<TimesheetWithRelations>[]>(() => {
    const base: ColumnDef<TimesheetWithRelations>[] = [
      { id: "date", accessorKey: "date", header: "Date" },
      {
        id: "worker",
        accessorFn: (r) => [r.user.firstName, r.user.lastName].filter(Boolean).join(" ") || "—",
        header: "Worker",
      },
      { id: "project", accessorFn: (r) => r.project.name, header: "Project" },
      {
        id: "clockIn",
        accessorFn: (r) => new Date(r.clockIn).getTime(),
        header: "Clock in",
        cell: ({ row }) => format(new Date(row.original.clockIn), "HH:mm"),
      },
      {
        id: "clockOut",
        accessorFn: (r) => (r.clockOut ? new Date(r.clockOut).getTime() : 0),
        header: "Clock out",
        cell: ({ row }) => (row.original.clockOut ? format(new Date(row.original.clockOut), "HH:mm") : "—"),
      },
      {
        id: "duration",
        accessorFn: (r) => r.durationMinutes,
        header: "Duration",
        cell: ({ row }) => `${Math.floor(row.original.durationMinutes / 60)}h ${row.original.durationMinutes % 60}m`,
      },
      {
        id: "billable",
        accessorFn: (r) => r.isBillable !== false,
        header: "Billable",
        cell: ({ row }) => (
          <Badge variant={row.original.isBillable !== false ? "outline" : "secondary"}>
            {row.original.isBillable !== false ? "Yes" : "No"}
          </Badge>
        ),
      },
      { id: "source", accessorKey: "source", header: "Source" },
      {
        id: "status",
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge
            variant={
              row.original.status === "approved"
                ? "default"
                : row.original.status === "rejected"
                  ? "destructive"
                  : "secondary"
            }
          >
            {row.original.status}
          </Badge>
        ),
      },
    ]
    if (isAdmin) {
      base.push({
        id: "actions",
        enableSorting: false,
        header: () => <span className="text-right">Actions</span>,
        cell: ({ row }) =>
          row.original.status === "pending" ? (
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setDialog({ id: row.original.id, action: "approve" })}>
                Approve
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setDialog({ id: row.original.id, action: "reject" })}>
                Reject
              </Button>
            </div>
          ) : null,
      })
    }
    return base
  }, [isAdmin])

  const table = useReactTable({
    data: timesheets,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  async function submitStatus(id: string, status: string) {
    const adjustmentReason = reason.trim() || "No reason provided"
    try {
      const res = await fetch(`/api/timesheets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, adjustmentReason }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? "Failed")
      }
      toast.success(status === "approved" ? "Timesheet approved" : "Timesheet rejected")
      setDialog(null)
      setReason("")
      window.location.reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed")
    }
  }

  const isMobile = useIsMobile()

  if (timesheets.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        No timesheets yet.
      </div>
    )
  }

  if (isMobile) {
    return (
      <>
        <div className="space-y-3">
          {table.getRowModel().rows.map((row) => {
            const r = row.original
            return (
              <Card key={row.id}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{r.project.name}</p>
                      <p className="text-sm text-muted-foreground">{r.date}</p>
                    </div>
                    <Badge
                      variant={
                        r.status === "approved"
                          ? "default"
                          : r.status === "rejected"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {r.status}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span>{format(new Date(r.clockIn), "HH:mm")} – {r.clockOut ? format(new Date(r.clockOut), "HH:mm") : "—"}</span>
                    <span>{Math.floor(r.durationMinutes / 60)}h {r.durationMinutes % 60}m</span>
                  </div>
                  {isAdmin && r.status === "pending" && (
                    <div className="flex gap-2 pt-2">
                      <Button size="touch" variant="outline" className="flex-1" onClick={() => setDialog({ id: r.id, action: "approve" })}>
                        Approve
                      </Button>
                      <Button size="touch" variant="destructive" className="flex-1" onClick={() => setDialog({ id: r.id, action: "reject" })}>
                        Reject
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
        <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
          <DialogContent>
        <DialogHeader>
          <DialogTitle>{dialog?.action === "approve" ? "Approve" : "Reject"} timesheet</DialogTitle>
          <DialogDescription>
            Provide a reason for this {dialog?.action}. This will be recorded in the audit log.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-4">
          <Label htmlFor="reason">Reason</Label>
          <Textarea
            id="reason"
            placeholder="e.g. Verified against site records"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
          <Button
            onClick={() => dialog && submitStatus(dialog.id, dialog.action === "approve" ? "approved" : "rejected")}
          >
            {dialog?.action === "approve" ? "Approve" : "Reject"}
          </Button>
        </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  return (
    <>
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((hg) => (
          <TableRow key={hg.id}>
            {hg.headers.map((h) => (
              <TableHead key={h.id} className={h.id === "actions" ? "text-right" : ""}>
                {h.column.getCanSort() ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-3 h-8"
                    onClick={() => h.column.toggleSorting(h.column.getIsSorted() === "asc")}
                  >
                    {flexRender(h.column.columnDef.header, h.getContext())}
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  flexRender(h.column.columnDef.header, h.getContext())
                )}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row, i) => (
          <motion.tr
            key={row.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.02 }}
            className="border-b transition-colors hover:bg-muted/50"
          >
            {row.getVisibleCells().map((cell) => (
              <TableCell key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </motion.tr>
        ))}
      </TableBody>
    </Table>

    <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{dialog?.action === "approve" ? "Approve" : "Reject"} timesheet</DialogTitle>
          <DialogDescription>
            Provide a reason for this {dialog?.action}. This will be recorded in the audit log.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-4">
          <Label htmlFor="reason">Reason</Label>
          <Textarea
            id="reason"
            placeholder="e.g. Verified against site records"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
          <Button
            onClick={() => dialog && submitStatus(dialog.id, dialog.action === "approve" ? "approved" : "rejected")}
          >
            {dialog?.action === "approve" ? "Approve" : "Reject"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
