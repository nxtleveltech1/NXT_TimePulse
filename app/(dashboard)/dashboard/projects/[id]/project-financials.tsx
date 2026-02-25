"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"

type ProjectFinancials = {
  project: { id: string; name: string }
  from: string
  to: string
  revenue: number
  labourCost: number
  margin: number
  marginPct: number
  budget: number | null
  budgetVsActual: number | null
}

export function ProjectFinancials({ projectId }: { projectId: string }) {
  const [data, setData] = useState<ProjectFinancials | null>(null)

  useEffect(() => {
    const from = new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0]
    const to = new Date().toISOString().split("T")[0]
    fetch(`/api/financials/project/${projectId}?from=${from}&to=${to}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null))
  }, [projectId])

  if (!data) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Financial summary</CardTitle>
        <CardDescription>{data.from} to {data.to}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <p><span className="font-medium">Revenue:</span> {formatCurrency(data.revenue)}</p>
        <p><span className="font-medium">Labour cost:</span> {formatCurrency(data.labourCost)}</p>
        <p><span className="font-medium">Margin:</span> {formatCurrency(data.margin)} ({data.marginPct}%)</p>
        {data.budget != null && (
          <p><span className="font-medium">Budget vs actual:</span> {data.budgetVsActual}%</p>
        )}
      </CardContent>
    </Card>
  )
}
