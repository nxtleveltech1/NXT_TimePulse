"use client"

import Link from "next/link"
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
import type { Geozone } from "@/generated/prisma"

export function GeozonesTable({
  geozones,
  projectId,
}: {
  geozones: Geozone[]
  projectId: string
}) {
  if (geozones.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        No geozones yet. Add one to enable geofence clock-in for this project.
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {geozones.map((g) => (
          <TableRow key={g.id}>
            <TableCell className="font-medium">{g.name}</TableCell>
            <TableCell>{g.description ?? "—"}</TableCell>
            <TableCell>
              <Badge variant={g.isActive ? "default" : "secondary"}>
                {g.isActive ? "Active" : "Inactive"}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/dashboard/geozones/${g.id}`}>Edit</Link>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
