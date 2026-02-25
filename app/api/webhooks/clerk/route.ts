import { verifyWebhook } from "@clerk/nextjs/webhooks"
import type { WebhookEvent } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  let evt: WebhookEvent
  try {
    evt = await verifyWebhook(req, {
      signingSecret: process.env.CLERK_WEBHOOK_SIGNING_SECRET,
    })
  } catch {
    return Response.json({ error: "Invalid webhook" }, { status: 400 })
  }

  switch (evt.type) {
    case "user.created": {
      const { id, email_addresses, first_name, last_name } = evt.data
      const email = email_addresses?.[0]?.email_address ?? null
      await prisma.user.upsert({
        where: { id },
        create: {
          id,
          email,
          orgId: "org_default",
          role: "worker",
          firstName: first_name ?? null,
          lastName: last_name ?? null,
          status: "active",
          updatedAt: new Date(),
        },
        update: {
          email,
          firstName: first_name ?? undefined,
          lastName: last_name ?? undefined,
          updatedAt: new Date(),
        },
      })
      break
    }

    case "organizationMembership.created": {
      const data = evt.data as {
        organization?: { id: string }
        public_user_data?: { user_id?: string; identifier?: string; first_name?: string; last_name?: string }
      }
      const userId = data.public_user_data?.user_id ?? (evt.data as { user_id?: string }).user_id
      if (!userId) break
      const orgId = data.organization?.id ?? "org_default"
      const pub = data.public_user_data
      await prisma.user.upsert({
        where: { id: userId },
        create: {
          id: userId,
          email: pub?.identifier ?? null,
          orgId,
          role: "worker",
          firstName: pub?.first_name ?? null,
          lastName: pub?.last_name ?? null,
          status: "active",
          updatedAt: new Date(),
        },
        update: {
          orgId,
          email: pub?.identifier ?? undefined,
          firstName: pub?.first_name ?? undefined,
          lastName: pub?.last_name ?? undefined,
          updatedAt: new Date(),
        },
      })
      break
    }

    default:
      break
  }

  return Response.json({ received: true })
}
