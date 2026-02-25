"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Area, AreaChart, Bar, BarChart, XAxis, YAxis } from "recharts"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"

type Summary = {
  from: string
  to: string
  billableRevenue: number
  labourCost: number
  grossMargin: number
  marginPct: number
  topProjectsByRevenue: { project: string; revenue: number }[]
  topProjectsByCost: { project: string; cost: number }[]
  labourByUser: { user: string; cost: number }[]
}

type Trend = { period: string; revenue: number; cost: number; billableHours: number; nonBillableHours: number }

export function FinancialsContent() {
  const [from, setFrom] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d.toISOString().split("T")[0]
  })
  const [to, setTo] = useState(() => new Date().toISOString().split("T")[0])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [trend, setTrend] = useState<Trend[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch(`/api/financials/summary?from=${from}&to=${to}`).then((r) => r.json()),
      fetch(`/api/financials/revenue-trend?from=${from}&to=${to}&groupBy=month`).then((r) => r.json()),
    ])
      .then(([s, t]) => {
        setSummary(s)
        setTrend(t.trend ?? [])
      })
      .catch(() => setSummary(null))
      .finally(() => setLoading(false))
  }, [from, to])

  function exportPnl() {
    const rows = summary
      ? [
          ["Profit & Loss", from, "to", to],
          [],
          ["Billable Revenue", summary.billableRevenue],
          ["Labour Cost", -summary.labourCost],
          ["Gross Margin", summary.grossMargin],
          ["Margin %", `${summary.marginPct}%`],
        ]
      : []
    const csv = rows.map((r) => r.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `pnl-${from}-${to}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading && !summary) {
    return <p className="text-muted-foreground">Loading...</p>
  }

  const chartConfig = {
    revenue: { color: "hsl(var(--chart-1))", label: "Revenue" },
    cost: { color: "hsl(var(--chart-2))", label: "Cost" },
    billableHours: { color: "hsl(var(--chart-3))", label: "Billable hrs" },
    nonBillableHours: { color: "hsl(var(--chart-4))", label: "Non-billable hrs" },
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-2">
          <Label>From</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>To</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <Button onClick={exportPnl} variant="outline" disabled={!summary}>
          <Download className="mr-2 h-4 w-4" />
          Export P&L
        </Button>
      </div>

      {summary && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Billable revenue</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(summary.billableRevenue)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Labour cost</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(summary.labourCost)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Gross margin</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(summary.grossMargin)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Margin %</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{summary.marginPct}%</p>
              </CardContent>
            </Card>
          </div>

          {trend.length > 0 && (
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue vs cost</CardTitle>
                  <CardDescription>By period</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[300px]">
                    <AreaChart data={trend}>
                      <XAxis dataKey="period" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent formatter={(v) => formatCurrency(Number(v))} />} />
                      <Area type="monotone" dataKey="revenue" stroke={chartConfig.revenue.color} fill={chartConfig.revenue.color} fillOpacity={0.3} name="Revenue" />
                      <Area type="monotone" dataKey="cost" stroke={chartConfig.cost.color} fill={chartConfig.cost.color} fillOpacity={0.3} name="Cost" />
                    </AreaChart>
                  </ChartContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Billable vs non-billable hours</CardTitle>
                  <CardDescription>By period</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[300px]">
                    <BarChart data={trend} stackOffset="sign">
                      <XAxis dataKey="period" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="billableHours" stackId="a" fill={chartConfig.billableHours.color} name="Billable hrs" />
                      <Bar dataKey="nonBillableHours" stackId="a" fill={chartConfig.nonBillableHours.color} name="Non-billable hrs" />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Top projects by revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.topProjectsByRevenue.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-muted-foreground">No data</TableCell>
                      </TableRow>
                    ) : (
                      summary.topProjectsByRevenue.map((r, i) => (
                        <TableRow key={i}>
                          <TableCell>{r.project}</TableCell>
                          <TableCell className="text-right">{formatCurrency(r.revenue)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Top projects by cost</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.topProjectsByCost.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-muted-foreground">No data</TableCell>
                      </TableRow>
                    ) : (
                      summary.topProjectsByCost.map((r, i) => (
                        <TableRow key={i}>
                          <TableCell>{r.project}</TableCell>
                          <TableCell className="text-right">{formatCurrency(r.cost)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Labour cost by worker</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Worker</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.labourByUser.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-muted-foreground">No data</TableCell>
                      </TableRow>
                    ) : (
                      summary.labourByUser.map((r, i) => (
                        <TableRow key={i}>
                          <TableCell>{r.user}</TableCell>
                          <TableCell className="text-right">{formatCurrency(r.cost)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
