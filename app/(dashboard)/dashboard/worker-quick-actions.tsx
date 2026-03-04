"use client"

import Link from "next/link"
import { useState } from "react"
import { Plus, LayoutGrid, Calendar, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ManualEntryDialog } from "@/components/time-capture/manual-entry-dialog"

type Allocation = {
  id: string
  projectId: string
  project: { id: string; name: string }
}

interface WorkerQuickActionsProps {
  allocations: Allocation[]
}

export function WorkerQuickActions({ allocations }: WorkerQuickActionsProps) {
  const [entryOpen, setEntryOpen] = useState(false)

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Button
        variant="outline"
        className="flex h-auto min-h-[64px] flex-col gap-1.5 py-3"
        onClick={() => setEntryOpen(true)}
      >
        <Plus className="h-5 w-5 text-primary" />
        <span className="text-xs font-medium">Add Entry</span>
      </Button>

      <Button asChild variant="outline" className="flex h-auto min-h-[64px] flex-col gap-1.5 py-3">
        <Link href="/dashboard/timesheets/weekly">
          <LayoutGrid className="h-5 w-5 text-primary" />
          <span className="text-xs font-medium">Weekly View</span>
        </Link>
      </Button>

      <Button asChild variant="outline" className="flex h-auto min-h-[64px] flex-col gap-1.5 py-3">
        <Link href="/dashboard/leave">
          <Calendar className="h-5 w-5 text-primary" />
          <span className="text-xs font-medium">Request Leave</span>
        </Link>
      </Button>

      <Button asChild variant="outline" className="flex h-auto min-h-[64px] flex-col gap-1.5 py-3">
        <Link href="/dashboard/timesheets">
          <Clock className="h-5 w-5 text-primary" />
          <span className="text-xs font-medium">My Timesheets</span>
        </Link>
      </Button>

      <ManualEntryDialog
        allocations={allocations}
        open={entryOpen}
        onOpenChange={setEntryOpen}
      />
    </div>
  )
}
