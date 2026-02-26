"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AllocationsTable } from "@/app/(dashboard)/dashboard/resources/allocations-table"
import { AllocationCreateDialog } from "@/app/(dashboard)/dashboard/resources/allocation-create-dialog"
import type { AllocationRow } from "@/app/(dashboard)/dashboard/resources/allocations-table"

export function ProjectTeam({
  projectId,
  initialAllocations,
  projects,
  users,
}: {
  projectId: string
  initialAllocations: AllocationRow[]
  projects: { id: string; name: string }[]
  users: { id: string; firstName: string | null; lastName: string | null }[]
}) {
  const [createOpen, setCreateOpen] = useState(false)
  const [list, setList] = useState(initialAllocations)

  const handleUpdate = () => {
    fetch(`/api/allocations?projectId=${projectId}`)
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Team</CardTitle>
          <CardDescription>
            {list.length} allocation(s) — User rates and roles on this project
          </CardDescription>
        </div>
        <Button onClick={() => setCreateOpen(true)} size="sm">
          Add allocation
        </Button>
      </CardHeader>
      <CardContent>
        <AllocationsTable
          allocations={list}
          projects={projects}
          users={users}
          onUpdate={handleUpdate}
        />
      </CardContent>
      <AllocationCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={handleUpdate}
        projectId={projectId}
        users={users}
        projects={projects}
      />
    </Card>
  )
}
