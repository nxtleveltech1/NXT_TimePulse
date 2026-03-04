import { prisma } from "@/lib/prisma"

export type RateCardRow = {
  id: string
  userId: string
  projectId: string | null
  payRate: unknown
  billRate: unknown
  currency: string
  effectiveFrom: Date
  effectiveTo: Date | null
  status: string
}

export async function getRateCardsByUser(
  orgId: string,
  userIds: string[],
  projectIds: string[]
): Promise<Map<string, RateCardRow[]>> {
  if (!userIds.length) return new Map<string, RateCardRow[]>()

  const cards = await prisma.rateCard.findMany({
    where: {
      orgId,
      userId: { in: userIds },
      status: "active",
      OR: [
        { projectId: { in: projectIds.length ? projectIds : ["__none__"] } },
        { projectId: null },
      ],
    },
    select: {
      id: true,
      userId: true,
      projectId: true,
      payRate: true,
      billRate: true,
      currency: true,
      effectiveFrom: true,
      effectiveTo: true,
      status: true,
    },
  })

  const byUser = new Map<string, RateCardRow[]>()
  for (const c of cards) {
    if (!byUser.has(c.userId)) byUser.set(c.userId, [])
    byUser.get(c.userId)!.push(c)
  }
  return byUser
}

/**
 * Find the best active rate card for a user+project+date.
 * Priority: project-specific card > generic (no-project) card.
 * Within each tier, picks the card whose effectiveFrom is latest but <= date.
 */
export function getEffectiveRateCard(
  cards: RateCardRow[] | undefined,
  projectId: string,
  date: string
): RateCardRow | null {
  if (!cards?.length) return null

  const d = new Date(date + "T12:00:00Z")

  const eligible = cards.filter((c) => {
    if (c.effectiveFrom > d) return false
    if (c.effectiveTo && c.effectiveTo < d) return false
    return true
  })

  const projectSpecific = eligible
    .filter((c) => c.projectId === projectId)
    .sort((a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime())

  if (projectSpecific.length) return projectSpecific[0]

  const generic = eligible
    .filter((c) => c.projectId == null)
    .sort((a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime())

  return generic[0] ?? null
}
