const limit = 60
const windowMs = 60_000
const store = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(key: string): { ok: boolean; remaining: number } {
  const now = Date.now()
  const entry = store.get(key)
  if (!entry) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, remaining: limit - 1 }
  }
  if (now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, remaining: limit - 1 }
  }
  entry.count++
  const ok = entry.count <= limit
  return { ok, remaining: Math.max(0, limit - entry.count) }
}
