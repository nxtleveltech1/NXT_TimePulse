"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Pencil, Check, X } from "lucide-react"
import { toast } from "sonner"

const CURRENCIES = ["ZAR", "USD", "EUR", "GBP", "AUD", "CAD"] as const

type UserRateCardProps = {
  userId: string
  initialBaseRate: number
  initialCurrency: string
}

export function UserRateCard({ userId, initialBaseRate, initialCurrency }: UserRateCardProps) {
  const [baseRate, setBaseRate] = useState(initialBaseRate)
  const [currency, setCurrency] = useState(initialCurrency.trim() || "ZAR")
  const [editing, setEditing] = useState(false)
  const [draftRate, setDraftRate] = useState(String(initialBaseRate))
  const [draftCurrency, setDraftCurrency] = useState(initialCurrency.trim() || "ZAR")
  const [saving, setSaving] = useState(false)

  function startEdit() {
    setDraftRate(String(baseRate))
    setDraftCurrency(currency)
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
  }

  async function save() {
    const parsed = parseFloat(draftRate)
    if (isNaN(parsed) || parsed < 0) {
      toast.error("Enter a valid rate")
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/users/${userId}/rates`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseRate: parsed, currency: draftCurrency }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(err.error ?? "Failed to update")
      }
      const data = await res.json() as { baseRate: number; currency: string }
      setBaseRate(data.baseRate)
      setCurrency(data.currency)
      setEditing(false)
      toast.success("Base rate updated")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update")
    } finally {
      setSaving(false)
    }
  }

  const formatted = new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
  }).format(baseRate)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div>
          <CardTitle className="text-base">Rates</CardTitle>
          <CardDescription>Base cost rate and currency for this user</CardDescription>
        </div>
        {!editing && (
          <Button variant="ghost" size="icon" onClick={startEdit} className="h-8 w-8">
            <Pencil className="h-4 w-4" />
            <span className="sr-only">Edit rates</span>
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="baseRate">Base rate (per hour)</Label>
                <Input
                  id="baseRate"
                  type="number"
                  step="0.01"
                  min={0}
                  value={draftRate}
                  onChange={(e) => setDraftRate(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="currency">Currency</Label>
                <Select value={draftCurrency} onValueChange={setDraftCurrency}>
                  <SelectTrigger id="currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={save} disabled={saving}>
                <Check className="mr-1.5 h-3.5 w-3.5" />
                {saving ? "Saving…" : "Save"}
              </Button>
              <Button size="sm" variant="outline" onClick={cancelEdit} disabled={saving}>
                <X className="mr-1.5 h-3.5 w-3.5" />
                Cancel
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              This is what the company pays this user per hour. It is also the default billing rate
              for projects where no specific bill rate has been set.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Base rate</p>
              <p className="text-2xl font-semibold tabular-nums">{formatted}<span className="ml-1 text-sm font-normal text-muted-foreground">/hr</span></p>
            </div>
            <p className="text-xs text-muted-foreground">
              Cost to company per hour · default billing rate for projects without a specific bill rate
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
