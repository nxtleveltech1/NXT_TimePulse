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

type GeozoneWithProject = {
  id: string
  name: string
  description: string | null
  isActive: boolean
  project: { id: string; name: string }
}

export function GeozonesList({ geozones }: { geozones: GeozoneWithProject[] }) {
  if (geozones.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        No geozones yet. Create a project and add geozones to enable geofence tracking.
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Project</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {geozones.map((g) => (
          <TableRow key={g.id}>
            <TableCell className="font-medium">{g.name}</TableCell>
            <TableCell>
              <Link href={`/dashboard/projects/${g.project.id}`} className="text-primary hover:underline">
                {g.project.name}
              </Link>
            </TableCell>
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
