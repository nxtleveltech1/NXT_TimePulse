"use client"

import { useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Pencil, MoreHorizontal, Trash2 } from "lucide-react"
import { AllocationEditDialog } from "./allocation-edit-dialog"
import { AllocationDeleteDialog } from "./allocation-delete-dialog"

export type AllocationRow = {
  id: string
  userId: string
  projectId: string
  roleOnProject: string
  /** Client bill rate override. null = use user's base rate */
  billRate: number | { toString: () => string } | null
  /** @deprecated use billRate */
  hourlyRate?: number | { toString: () => string }
  /** User's base rate — used to show fallback context */
  userBaseRate?: number | null
  userCurrency?: string
  startDate: string
  endDate: string | null
  isActive: boolean
  user?: { id: string; firstName: string | null; lastName: string | null; email: string | null }
  project?: { id: string; name: string }
}

function formatRate(
  billRate: AllocationRow["billRate"],
  userBaseRate: number | null | undefined,
  currency: string | undefined
): { label: string; isOverride: boolean } {
  const cur = currency?.trim() ?? ""
  if (billRate != null) {
    const n = typeof billRate === "number" ? billRate : Number(billRate)
    if (n > 0) {
      return { label: `${cur} ${n.toFixed(2)}/hr`, isOverride: true }
    }
  }
  if (userBaseRate != null && userBaseRate > 0) {
    return { label: `${cur} ${Number(userBaseRate).toFixed(2)}/hr`, isOverride: false }
  }
  return { label: "—", isOverride: false }
}

export function AllocationsTable({
  allocations,
  projects,
  users,
  onUpdate,
}: {
  allocations: AllocationRow[]
  projects: { id: string; name: string }[]
  users: { id: string; firstName: string | null; lastName: string | null; baseRate?: number; currency?: string }[]
  onUpdate?: () => void
}) {
  const [editing, setEditing] = useState<AllocationRow | null>(null)
  const [deleting, setDeleting] = useState<AllocationRow | null>(null)

  const handleUpdated = () => {
    setEditing(null)
    onUpdate?.()
  }
  const handleDeleted = () => {
    setDeleting(null)
    onUpdate?.()
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 z-10 bg-background">User</TableHead>
            <TableHead>Project</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Bill Rate</TableHead>
            <TableHead>Start</TableHead>
            <TableHead>End</TableHead>
            <TableHead className="w-[80px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {allocations.map((a) => {
            const userRecord = a.user ?? users.find((u) => u.id === a.userId)
            const userName = userRecord
              ? [userRecord.firstName, (userRecord as { lastName?: string | null }).lastName].filter(Boolean).join(" ") ||
                (userRecord as { email?: string | null }).email || a.userId
              : a.userId
            const userBaseRate = a.userBaseRate ?? (users.find((u) => u.id === a.userId)?.baseRate ?? null)
            const userCurrency = a.userCurrency ?? users.find((u) => u.id === a.userId)?.currency
            const { label, isOverride } = formatRate(a.billRate, userBaseRate, userCurrency)

            return (
              <TableRow key={a.id}>
                <TableCell className="sticky left-0 z-10 bg-background font-medium">
                  {userName}
                </TableCell>
                <TableCell>
                  {a.project?.name ?? projects.find((p) => p.id === a.projectId)?.name ?? a.projectId}
                </TableCell>
                <TableCell>{a.roleOnProject}</TableCell>
                <TableCell>
                  <span className={isOverride ? "font-medium" : "text-muted-foreground"}>
                    {label}
                  </span>
                  {!isOverride && userBaseRate != null && userBaseRate > 0 && (
                    <span className="ml-1 text-xs text-muted-foreground">(base)</span>
                  )}
                </TableCell>
                <TableCell>{a.startDate.slice(0, 10)}</TableCell>
                <TableCell>{a.endDate ? a.endDate.slice(0, 10) : "—"}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditing(a)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setDeleting(a)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      {editing && (
        <AllocationEditDialog
          allocation={editing}
          open={!!editing}
          onOpenChange={(open) => !open && setEditing(null)}
          onSuccess={handleUpdated}
        />
      )}
      {deleting && (
        <AllocationDeleteDialog
          allocation={deleting}
          open={!!deleting}
          onOpenChange={(open) => !open && setDeleting(null)}
          onSuccess={handleDeleted}
        />
      )}
    </>
  )
}
