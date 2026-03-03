import { prisma } from "@/lib/prisma"

export async function getRateCardsByUser(
  orgId: string,
  userIds: string[],
  projectIds: string[]
) {
  if (!userIds.length) return new Map<string, Array<{
    id: string
    userId: string
    projectId: string | null
    payRate: unknown
    billRate: unknown
    currency: string
    effectiveFrom: Date
    effectiveTo: Date | null
    status: string
  }>>()

  const cards = await prisma.rateCard.findMany({
    where: {
      orgId,
      userId: { in: userIds },
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

  const byUser = new Map<string, typeof cards>()
  for (const c of cards) {
    if (!byUser.has(c.userId)) byUser.set(c.userId, [])
    byUser.get(c.userId)?.push(c)
  }
  return byUser
}
