import { Prisma } from "@/generated/prisma"
import { prisma } from "@/lib/prisma"

type LifecycleEventInput = {
  orgId: string
  userId: string
  actorUserId: string
  eventType: string
  metadata?: Record<string, unknown> | null
}

export async function logLifecycleEvent(input: LifecycleEventInput) {
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
