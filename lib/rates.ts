import { decimalToNumber } from "@/lib/serialize"

export type ResolvedRate = {
  payRate: number
  billRate: number
  currency: string
}

/**
 * Resolve the effective pay and bill rates for a timesheet entry.
 *
 * payRate  priority: rateCard.payRate > user.baseRate > allocation.billRate
 * billRate priority: allocation.billRate > rateCard.billRate > user.baseRate
 */
export function resolveRate(input: {
  userBaseRate: unknown
  userCurrency: string
  allocationBillRate?: unknown | null
  rateCardPayRate?: unknown | null
  rateCardBillRate?: unknown | null
}): ResolvedRate {
  const base = decimalToNumber(input.userBaseRate)
  const allocBill = decimalToNumber(input.allocationBillRate)
  const rcPay = decimalToNumber(input.rateCardPayRate)
  const rcBill = decimalToNumber(input.rateCardBillRate)

  const pay = rcPay || base || allocBill
  const bill = allocBill || rcBill || base

  return {
    payRate: pay,
    billRate: bill,
    currency: (input.userCurrency ?? "ZAR").trim().toUpperCase(),
  }
}
