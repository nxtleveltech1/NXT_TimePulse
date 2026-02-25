"use client"

import { useState, useEffect } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

type Log = {
  id: string
  action: string
  entityType: string
  entityId: string
  details: string | null
  previousValue: string | null
  newValue: string | null
  timestamp: string
  user: { firstName: string | null; lastName: string | null; email: string | null }
}

export function AuditContent({ logs: initialLogs }: { logs: Log[] }) {
  const [entityType, setEntityType] = useState("")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [logs, setLogs] = useState(initialLogs)

  useEffect(() => {
    const params = new URLSearchParams()
    if (entityType) params.set("entityType", entityType)
    if (from) params.set("from", from)
    if (to) params.set("to", to)
    if (params.toString()) {
      fetch(`/api/audit?${params}`)
        .then((r) => r.json())
        .then(setLogs)
        .catch(() => setLogs([]))
    } else {
      setLogs(initialLogs)
    }
  }, [entityType, from, to, initialLogs])

  function userName(u: Log["user"]) {
    return [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email || "—"
  }

  if (logs.length === 0) {
    return <p className="text-muted-foreground text-sm">No audit entries.</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        <div className="space-y-2">
          <Label>Entity type</Label>
          <Input
            placeholder="timesheet, project, geozone..."
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>From</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>To</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Timestamp</TableHead>
            <TableHead>User</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Entity</TableHead>
            <TableHead>Details</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((l) => (
            <TableRow key={l.id}>
              <TableCell className="text-muted-foreground text-sm">
                {new Date(l.timestamp).toLocaleString()}
              </TableCell>
              <TableCell>{userName(l.user)}</TableCell>
              <TableCell><Badge variant="outline">{l.action}</Badge></TableCell>
              <TableCell>{l.entityType} ({l.entityId.slice(0, 8)}…)</TableCell>
              <TableCell className="max-w-xs truncate">{l.details ?? "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
