import { prisma } from "@/lib/prisma"

export type OvertimePolicy = {
  saturdayMultiplier: number
  sundayMultiplier: number
  weekdayMultiplier: number
}

const DEFAULT_POLICY: OvertimePolicy = {
  saturdayMultiplier: 1.5,
  sundayMultiplier: 2,
  weekdayMultiplier: 1,
}

/** Fetch org overtime policy from Organization.settings. Falls back to defaults if not set. */
export async function getOvertimePolicy(orgId: string): Promise<OvertimePolicy> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { settings: true },
  })
  const settings = (org?.settings as Record<string, unknown> | null) ?? {}
  const ot = settings.overtimePolicy as Partial<OvertimePolicy> | undefined
  if (!ot) return DEFAULT_POLICY
  return {
    saturdayMultiplier: typeof ot.saturdayMultiplier === "number" ? ot.saturdayMultiplier : DEFAULT_POLICY.saturdayMultiplier,
    sundayMultiplier: typeof ot.sundayMultiplier === "number" ? ot.sundayMultiplier : DEFAULT_POLICY.sundayMultiplier,
    weekdayMultiplier: typeof ot.weekdayMultiplier === "number" ? ot.weekdayMultiplier : DEFAULT_POLICY.weekdayMultiplier,
  }
}

/** Overtime multiplier by day of week. Uses policy or defaults (Sat 1.5x, Sun 2x, Mon–Fri 1x). */
export function getOvertimeMultiplier(date: string, policy?: OvertimePolicy | null): number {
  const p = policy ?? DEFAULT_POLICY
  const d = new Date(date + "T12:00:00Z")
  const day = d.getUTCDay()
  if (day === 0) return p.sundayMultiplier
  if (day === 6) return p.saturdayMultiplier
  return p.weekdayMultiplier
}
