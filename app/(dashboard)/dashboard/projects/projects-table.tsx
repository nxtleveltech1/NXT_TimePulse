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
type ProjectWithCount = {
  id: string
  name: string
  client: string | null
  status: string
  _count: { geozones: number }
}

export function ProjectsTable({ projects }: { projects: ProjectWithCount[] }) {
  if (projects.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        No projects yet. Create one to get started.
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Client</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Geozones</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {projects.map((p) => (
          <TableRow key={p.id}>
            <TableCell className="font-medium">{p.name}</TableCell>
            <TableCell>{p.client ?? "—"}</TableCell>
            <TableCell>
              <Badge variant={p.status === "active" ? "default" : "secondary"}>
                {p.status}
              </Badge>
            </TableCell>
            <TableCell>{p._count.geozones}</TableCell>
            <TableCell className="text-right">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/dashboard/projects/${p.id}`}>View</Link>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
