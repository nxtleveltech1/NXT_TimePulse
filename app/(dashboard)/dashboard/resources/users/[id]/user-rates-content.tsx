"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { AllocationsTable } from "../../allocations-table"
import { AllocationCreateDialog } from "../../allocation-create-dialog"
import type { AllocationRow } from "../../allocations-table"

type UserRatesContentProps = {
  allocations: AllocationRow[]
  projects: { id: string; name: string }[]
  users: { id: string; firstName: string | null; lastName: string | null; baseRate?: number; currency?: string }[]
  userId: string
}

export function UserRatesContent({
  allocations,
  projects,
  users,
  userId,
}: UserRatesContentProps) {
  const [createOpen, setCreateOpen] = useState(false)
  const [list, setList] = useState(allocations)

  const handleUpdate = () => {
    fetch(`/api/allocations?userId=${userId}`)
      .then((r) => r.json())
      .then((data: AllocationRow[]) =>
        setList(
          data.map((a) => ({
            ...a,
            billRate: a.billRate != null ? Number(a.billRate) : (a.hourlyRate != null ? Number(a.hourlyRate) : null),
            startDate: typeof a.startDate === "string" ? a.startDate : (a.startDate as unknown as Date).toISOString().slice(0, 10),
            endDate: a.endDate
              ? typeof a.endDate === "string"
                ? a.endDate
                : (a.endDate as unknown as Date).toISOString().slice(0, 10)
              : null,
          }))
        )
      )
      .catch(() => {})
  }

  return (
    <>
      <div className="mb-4">
        <Button onClick={() => setCreateOpen(true)} size="sm">
          Add allocation
        </Button>
      </div>
      <AllocationsTable
        allocations={list}
        projects={projects}
        users={users}
        onUpdate={handleUpdate}
      />
      <AllocationCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={handleUpdate}
        userId={userId}
        users={users}
        projects={projects}
      />
    </>
  )
}
