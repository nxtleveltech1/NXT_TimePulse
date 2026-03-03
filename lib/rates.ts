import { decimalToNumber } from "@/lib/serialize"

export type ResolvedRate = {
  payRate: number
  billRate: number
  currency: string
}

/**
 * Resolve the effective pay and bill rates for a timesheet entry.
 *
 * payRate  = user.baseRate                          (what the company pays the user)
 * billRate = allocation.billRate ?? user.baseRate   (what the client is charged)
 */
export function resolveRate(input: {
  userBaseRate: unknown
  userCurrency: string
  allocationBillRate?: unknown | null
}): ResolvedRate {
  const pay = decimalToNumber(input.userBaseRate)
  const bill = input.allocationBillRate != null
    ? (decimalToNumber(input.allocationBillRate) || pay)
    : pay
  return {
    payRate: pay,
    billRate: bill,
    currency: (input.userCurrency ?? "ZAR").trim().toUpperCase(),
  }
}
