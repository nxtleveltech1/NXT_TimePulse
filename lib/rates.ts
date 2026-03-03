import { decimalToNumber } from "@/lib/serialize"

export type ResolvedRate = {
  payRate: number
  billRate: number
  currency: string
  source: "project_rate_card" | "global_rate_card" | "project_defaults"
  rateCardId?: string
}

type ResolveInput = {
  date: string
  projectId: string
  projectDefaultRate: unknown
  projectClientRate: unknown
  rateCards: Array<{
    id: string
    projectId: string | null
    payRate: unknown
    billRate: unknown
    currency: string
    effectiveFrom: Date
    effectiveTo: Date | null
    status: string
  }>
}

function asDateOnly(value: string | Date): string {
  if (typeof value === "string") return value.slice(0, 10)
  return value.toISOString().slice(0, 10)
}

function isInRange(date: string, from: string, to: string | null): boolean {
  if (date < from) return false
  if (to && date > to) return false
  return true
}

function pickLatestEffective(cards: ResolveInput["rateCards"], date: string, projectId?: string | null) {
  const filtered = cards
    .filter((c) => c.status !== "pending" && c.status !== "cancelled")
    .filter((c) => (projectId === undefined ? c.projectId === null : c.projectId === projectId))
    .filter((c) => isInRange(date, asDateOnly(c.effectiveFrom), c.effectiveTo ? asDateOnly(c.effectiveTo) : null))
    .sort((a, b) => {
      const aFrom = asDateOnly(a.effectiveFrom)
      const bFrom = asDateOnly(b.effectiveFrom)
      if (aFrom === bFrom) return b.id.localeCompare(a.id)
      return bFrom.localeCompare(aFrom)
    })
  return filtered[0]
}

export function resolveRateFromCards(input: ResolveInput): ResolvedRate {
  const date = input.date.slice(0, 10)
  const projectCard = pickLatestEffective(input.rateCards, date, input.projectId)
  if (projectCard) {
    return {
      payRate: decimalToNumber(projectCard.payRate),
      billRate: decimalToNumber(projectCard.billRate) || decimalToNumber(projectCard.payRate),
      currency: projectCard.currency.trim().toUpperCase(),
      source: "project_rate_card",
      rateCardId: projectCard.id,
    }
  }

  const globalCard = pickLatestEffective(input.rateCards, date, null)
  if (globalCard) {
    return {
      payRate: decimalToNumber(globalCard.payRate),
      billRate: decimalToNumber(globalCard.billRate) || decimalToNumber(globalCard.payRate),
      currency: globalCard.currency.trim().toUpperCase(),
      source: "global_rate_card",
      rateCardId: globalCard.id,
    }
  }

  const defaultPay = decimalToNumber(input.projectDefaultRate)
  const defaultBill = decimalToNumber(input.projectClientRate) || defaultPay
  return {
    payRate: defaultPay,
    billRate: defaultBill,
    currency: "USD",
    source: "project_defaults",
  }
}
