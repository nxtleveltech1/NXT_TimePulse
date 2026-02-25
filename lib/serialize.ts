/** Convert Prisma Decimal to number for JSON serialization. */
export function decimalToNumber(d: { toNumber?: () => number } | null | undefined): number {
  if (d == null) return 0
  return typeof (d as { toNumber?: () => number }).toNumber === "function"
    ? (d as { toNumber: () => number }).toNumber()
    : Number(d)
}

/** Serialize for RSC→client: Decimal→number, Date→ISO string. */
export function serializeForClient<T>(value: T): T {
  if (value == null) return value
  const v = value as Record<string, unknown>
  if (typeof v?.toNumber === "function") return (v.toNumber() as unknown) as T
  if (value instanceof Date) return value.toISOString() as T
  if (Array.isArray(value)) return value.map(serializeForClient) as T
  if (typeof value === "object") {
    const out: Record<string, unknown> = {}
    for (const [k, val] of Object.entries(value)) {
      out[k] = serializeForClient(val)
    }
    return out as T
  }
  return value
}
