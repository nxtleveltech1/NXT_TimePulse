/** Overtime multiplier by day of week: Sat 1.5x, Sun 2x, Mon–Fri 1x. */
export function getOvertimeMultiplier(date: string): number {
  const d = new Date(date + "T12:00:00Z")
  const day = d.getUTCDay()
  if (day === 0) return 2
  if (day === 6) return 1.5
  return 1
}
