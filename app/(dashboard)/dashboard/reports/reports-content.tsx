"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Download } from "lucide-react"

type ReportRow = { project?: string; user?: string; hours: string }

export function ReportsContent({
  hoursByProject,
  hoursByUser,
  billableHours,
  nonBillableHours,
}: {
  hoursByProject: ReportRow[]
  hoursByUser: ReportRow[]
  billableHours: string
  nonBillableHours: string
}) {
  const [from, setFrom] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d.toISOString().split("T")[0]
  })
  const [to, setTo] = useState(() => new Date().toISOString().split("T")[0])

  function exportCsv() {
    const rows = [
      ["Report", "Hours"],
      ["Billable", billableHours],
      ["Non-billable", nonBillableHours],
      ...hoursByProject.map((r) => ["Project: " + r.project, r.hours]),
      ...hoursByUser.map((r) => ["User: " + r.user, r.hours]),
    ]
    const csv = rows.map((r) => r.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `timesheet-report-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function exportPayroll() {
    const url = `/api/reports/payroll?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
    window.open(url, "_blank")
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
        <p className="mb-3 text-sm font-medium text-primary">Admin exports</p>
        <div className="flex flex-wrap gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Billable hours</p>
          <p className="text-xl font-semibold">{billableHours}h</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Non-billable hours</p>
          <p className="text-xl font-semibold">{nonBillableHours}h</p>
        </div>
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-2">
          <Label>From</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>To</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <Button onClick={exportPayroll}>
          <Download className="mr-2 h-4 w-4" />
          Export Payroll
        </Button>
        <Button onClick={exportCsv} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Hours by project</CardTitle>
            <CardDescription>Total hours logged per project</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hoursByProject.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground">
                      No data
                    </TableCell>
                  </TableRow>
                ) : (
                  hoursByProject.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell>{r.project}</TableCell>
                      <TableCell className="text-right">{r.hours}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hours by worker</CardTitle>
            <CardDescription>Total hours logged per user</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Worker</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hoursByUser.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground">
                      No data
                    </TableCell>
                  </TableRow>
                ) : (
                  hoursByUser.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell>{r.user}</TableCell>
                      <TableCell className="text-right">{r.hours}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
