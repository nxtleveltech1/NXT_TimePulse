import { prisma } from "@/lib/prisma"

type DistributedRateLimitResult = {
  ok: boolean
  remaining: number
  resetAt: string
}

export async function checkDistributedRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<DistributedRateLimitResult> {
  const now = Date.now()
  const windowStartMs = Math.floor(now / windowMs) * windowMs
  const bucketKey = `${key}:${windowStartMs}`
  const windowStart = new Date(windowStartMs)
  const resetAt = new Date(windowStartMs + windowMs).toISOString()

  const row = await prisma.apiRateLimitCounter.upsert({
    where: { key: bucketKey },
    create: {
      key: bucketKey,
      windowStart,
      count: 1,
    },
    update: {
      count: { increment: 1 },
    },
    select: { count: true },
  })

  const ok = row.count <= limit
  return {
    ok,
    remaining: Math.max(0, limit - row.count),
    resetAt,
  }
}
