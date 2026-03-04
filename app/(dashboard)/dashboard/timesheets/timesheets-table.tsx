"use client"

import { useState, useMemo, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type RowSelectionState,
  type SortingState,
} from "@tanstack/react-table"
import { ArrowUpDown, Pencil, Copy, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, CheckCheck, XCircle, X, Loader2 } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
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
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import { format } from "date-fns"
import { toast } from "sonner"
import { SourceBadge } from "@/components/time-capture/source-badge"
import { EditEntryDialog } from "@/components/time-capture/edit-entry-dialog"
import { bulkApproveTimesheets, bulkRejectTimesheets } from "@/lib/actions/bulk"

type TimesheetWithRelations = {
  id: string
  date: string
  clockIn: Date
  clockOut: Date | null
  durationMinutes: number
  breakMinutes: number
  source: string
  status: string
  notes: string | null
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
  const router = useRouter()
  const [dialog, setDialog] = useState<{ id: string; action: "approve" | "reject" } | null>(null)
  const [editTarget, setEditTarget] = useState<TimesheetWithRelations | null>(null)
  const [reason, setReason] = useState("")
  const [sorting, setSorting] = useState<SortingState>([{ id: "date", desc: true }])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState("")
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false)
  const [bulkReason, setBulkReason] = useState("")
  const [isBulkPending, startBulkTransition] = useTransition()

  const columns = useMemo<ColumnDef<TimesheetWithRelations>[]>(() => {
    const base: ColumnDef<TimesheetWithRelations>[] = [
      ...(isAdmin
        ? [
            {
              id: "select",
              header: ({ table: t }: { table: ReturnType<typeof useReactTable<TimesheetWithRelations>> }) => (
                <Checkbox
                  checked={
                    t.getIsAllPageRowsSelected() ||
                    (t.getIsSomePageRowsSelected() && "indeterminate")
                  }
                  onCheckedChange={(v) => t.toggleAllPageRowsSelected(!!v)}
                  aria-label="Select all"
                />
              ),
              cell: ({ row }: { row: { getCanSelect: () => boolean; getIsSelected: () => boolean; toggleSelected: (v: boolean) => void } }) => {
                if (!row.getCanSelect()) return null
                return (
                  <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(v) => row.toggleSelected(!!v)}
                    aria-label="Select row"
                  />
                )
              },
              enableSorting: false,
              enableHiding: false,
            } satisfies ColumnDef<TimesheetWithRelations>,
          ]
        : []),
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
        id: "break",
        accessorFn: (r) => r.breakMinutes ?? 0,
        header: "Break",
        cell: ({ row }) => {
          const bm = row.original.breakMinutes ?? 0
          return bm > 0 ? <span className="text-muted-foreground">{bm}m</span> : <span className="text-muted-foreground/50">—</span>
        },
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
      {
        id: "source",
        accessorKey: "source",
        header: "Source",
        cell: ({ row }) => <SourceBadge source={row.original.source} />,
      },
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
    base.push({
      id: "actions",
      enableSorting: false,
      header: () => <span className="text-right">Actions</span>,
      cell: ({ row }) => {
        const r = row.original
        const canEdit = isAdmin || r.status === "pending"
        return (
          <div className="flex justify-end gap-1">
            {canEdit && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => setEditTarget(r)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
            {isAdmin && r.status === "pending" && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" className="h-8">
                    Review
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setDialog({ id: r.id, action: "approve" })}>
                    Approve
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => setDialog({ id: r.id, action: "reject" })}
                  >
                    Reject
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              title="Duplicate entry"
              onClick={() => duplicateEntry(r)}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
        )
      },
    })
    return base
  }, [isAdmin])

  const table = useReactTable({
    data: timesheets,
    columns,
    state: { sorting, columnFilters, globalFilter, rowSelection },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: (row) => row.original.status === "pending",
    getRowId: (row) => row.id,
    globalFilterFn: (row, _columnId, filterValue: string) => {
      const search = filterValue.toLowerCase()
      const worker = [row.original.user.firstName, row.original.user.lastName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      const project = row.original.project.name.toLowerCase()
      return worker.includes(search) || project.includes(search)
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      pagination: { pageSize: 20 },
    },
  })

  const selectedIds = Object.keys(rowSelection)
  const selectedCount = selectedIds.length

  async function handleBulkApprove() {
    if (!selectedCount) return
    startBulkTransition(async () => {
      try {
        const result = await bulkApproveTimesheets(selectedIds)
        toast.success(`Approved ${result.count} timesheet${result.count !== 1 ? "s" : ""}`)
        setRowSelection({})
        router.refresh()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to approve")
      }
    })
  }

  async function handleBulkReject() {
    if (!selectedCount || !bulkReason.trim()) return
    startBulkTransition(async () => {
      try {
        const result = await bulkRejectTimesheets(selectedIds, bulkReason.trim())
        toast.success(`Rejected ${result.count} timesheet${result.count !== 1 ? "s" : ""}`)
        setRowSelection({})
        setBulkRejectOpen(false)
        setBulkReason("")
        router.refresh()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to reject")
      }
    })
  }

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

  async function duplicateEntry(r: TimesheetWithRelations) {
    try {
      const today = new Date().toISOString().split("T")[0]
      const ci = new Date(r.clockIn)
      const co = r.clockOut ? new Date(r.clockOut) : null
      const newClockIn = new Date(`${today}T${format(ci, "HH:mm")}`)
      const newClockOut = co ? new Date(`${today}T${format(co, "HH:mm")}`) : null

      const res = await fetch("/api/timesheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: r.project.name,
          clockIn: newClockIn.toISOString(),
          clockOut: newClockOut?.toISOString() ?? null,
          notes: r.notes ?? "",
          breakMinutes: r.breakMinutes ?? 0,
          isBillable: r.isBillable,
          source: "manual",
        }),
      })
      if (!res.ok) throw new Error("Failed")
      toast.success("Entry duplicated to today")
      window.location.reload()
    } catch {
      toast.error("Failed to duplicate entry")
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

  const reviewDialog = (
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
  )

  if (isMobile) {
    return (
      <>
        <div className="relative pb-3">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search worker or project…"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
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
                    <div className="flex flex-col items-end gap-1">
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
                      <SourceBadge source={r.source} />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span>{format(new Date(r.clockIn), "HH:mm")} – {r.clockOut ? format(new Date(r.clockOut), "HH:mm") : "—"}</span>
                    <span>{Math.floor(r.durationMinutes / 60)}h {r.durationMinutes % 60}m</span>
                    {(r.breakMinutes ?? 0) > 0 && <span>Break: {r.breakMinutes}m</span>}
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
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="ghost" className="gap-1 text-xs" onClick={() => setEditTarget(r)}>
                      <Pencil className="h-3 w-3" /> Edit
                    </Button>
                    <Button size="sm" variant="ghost" className="gap-1 text-xs" onClick={() => duplicateEntry(r)}>
                      <Copy className="h-3 w-3" /> Duplicate
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
        {reviewDialog}
        {editTarget && (
          <EditEntryDialog
            timesheet={editTarget}
            isAdmin={isAdmin}
            open={!!editTarget}
            onOpenChange={(o) => !o && setEditTarget(null)}
          />
        )}
      </>
    )
  }

  return (
    <>
      <div className="flex items-center gap-2 pb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search worker or project…"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <p className="ml-auto text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} row(s)
        </p>
      </div>

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

      {table.getPageCount() > 1 && (
        <div className="flex flex-col gap-2 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </p>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted-foreground">Rows</span>
              <Select
                value={String(table.getState().pagination.pageSize)}
                onValueChange={(v) => table.setPageSize(Number(v))}
              >
                <SelectTrigger className="h-8 w-16">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 20, 50, 100].map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Floating bulk action bar */}
      <AnimatePresence>
        {isAdmin && selectedCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="sticky bottom-4 z-10 mx-auto mt-4 flex w-fit items-center gap-3 rounded-lg border bg-background px-4 py-2.5 shadow-lg"
          >
            <span className="text-sm font-medium">
              {selectedCount} selected
            </span>
            <div className="h-4 w-px bg-border" />
            <Button
              size="sm"
              className="h-8 gap-1.5"
              disabled={isBulkPending}
              onClick={handleBulkApprove}
            >
              {isBulkPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
              Approve All
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="h-8 gap-1.5"
              disabled={isBulkPending}
              onClick={() => setBulkRejectOpen(true)}
            >
              <XCircle className="h-3.5 w-3.5" />
              Reject All
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 gap-1"
              onClick={() => setRowSelection({})}
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk reject reason dialog */}
      <Dialog open={bulkRejectOpen} onOpenChange={(o) => { setBulkRejectOpen(o); if (!o) setBulkReason("") }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject {selectedCount} timesheet{selectedCount !== 1 ? "s" : ""}</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting the selected entries.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="bulk-reason">Reason</Label>
            <Textarea
              id="bulk-reason"
              placeholder="e.g. Hours not verified against site records"
              value={bulkReason}
              onChange={(e) => setBulkReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkRejectOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={!bulkReason.trim() || isBulkPending}
              onClick={handleBulkReject}
            >
              {isBulkPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reject ({selectedCount})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {reviewDialog}
      {editTarget && (
        <EditEntryDialog
          timesheet={editTarget}
          isAdmin={isAdmin}
          open={!!editTarget}
          onOpenChange={(o) => !o && setEditTarget(null)}
        />
      )}
    </>
  )
}
