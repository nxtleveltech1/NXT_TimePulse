"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { AllocationsTable } from "../../allocations-table"
import { AllocationCreateDialog } from "../../allocation-create-dialog"
import type { AllocationRow } from "../../allocations-table"

type UserRatesContentProps = {
  allocations: AllocationRow[]
  projects: { id: string; name: string }[]
  users: { id: string; firstName: string | null; lastName: string | null }[]
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
      .then((data) =>
        setList(
          data.map((a: AllocationRow) => ({
            ...a,
            hourlyRate: Number(a.hourlyRate),
            startDate: typeof a.startDate === "string" ? a.startDate : (a.startDate as Date).toISOString().slice(0, 10),
            endDate: a.endDate
              ? typeof a.endDate === "string"
                ? a.endDate
                : (a.endDate as Date).toISOString().slice(0, 10)
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
