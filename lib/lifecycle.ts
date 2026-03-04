import { Prisma } from "@/generated/prisma"
import { prisma } from "@/lib/prisma"
import { ensureOrganization } from "@/lib/change-requests"

type LifecycleEventInput = {
  orgId: string
  userId: string
  actorUserId: string
  eventType: string
  metadata?: Record<string, unknown> | null
}

export async function logLifecycleEvent(input: LifecycleEventInput) {
  await ensureOrganization(input.orgId)

  await prisma.userLifecycleEvent.create({
    data: {
      orgId: input.orgId,
      userId: input.userId,
      actorUserId: input.actorUserId,
      eventType: input.eventType,
      metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  })
}
