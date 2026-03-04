import { verifyWebhook } from "@clerk/nextjs/webhooks"
import type { WebhookEvent } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

const clerkRoleToDbRole: Record<string, string> = {
  "org:admin": "admin",
  "org:manager": "manager",
  "org:member": "worker",
}

function toDbRole(role?: string | null): string {
  if (!role) return "worker"
  return clerkRoleToDbRole[role] ?? "worker"
}

async function markWebhookStatus(id: string, status: string, errorMessage?: string | null) {
  await prisma.webhookEventLog.upsert({
    where: { id },
    create: {
      id,
      eventType: "unknown",
      status,
      processedAt: status === "processed" || status === "failed" ? new Date() : null,
      errorMessage: errorMessage ?? null,
    },
    update: {
      status,
      processedAt: status === "processed" || status === "failed" ? new Date() : null,
      ...(errorMessage !== undefined ? { errorMessage } : {}),
    },
  })
}

export async function POST(req: Request) {
  let evt: WebhookEvent
  try {
    evt = await verifyWebhook(req as never, {
      signingSecret: process.env.CLERK_WEBHOOK_SIGNING_SECRET,
    })
  } catch {
    return Response.json({ error: "Invalid webhook" }, { status: 400 })
  }

  const eventId = (evt as { id?: string }).id ?? (evt.data as { id?: string }).id
  if (!eventId) {
    return Response.json({ error: "Missing event id" }, { status: 400 })
  }

  const existing = await prisma.webhookEventLog.findUnique({
    where: { id: eventId },
    select: { status: true },
  })
  if (existing?.status === "processed") {
    return Response.json({ received: true, duplicate: true })
  }

  await prisma.webhookEventLog.upsert({
    where: { id: eventId },
    create: {
      id: eventId,
      eventType: evt.type,
      status: "processing",
      receivedAt: new Date(),
    },
    update: {
      eventType: evt.type,
      status: "processing",
      errorMessage: null,
    },
  })

  try {
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
            status: "invited",
            lastIdentitySyncAt: new Date(),
            updatedAt: new Date(),
          },
          update: {
            email,
            firstName: first_name ?? undefined,
            lastName: last_name ?? undefined,
            lastIdentitySyncAt: new Date(),
            updatedAt: new Date(),
          },
        })
        break
      }

      case "user.updated": {
        const { id, email_addresses, first_name, last_name, phone_numbers } = evt.data
        const email = email_addresses?.[0]?.email_address ?? null
        const phone = phone_numbers?.[0]?.phone_number ?? null
        await prisma.user.updateMany({
          where: { id },
          data: {
            email,
            firstName: first_name ?? null,
            lastName: last_name ?? null,
            phone,
            lastIdentitySyncAt: new Date(),
            updatedAt: new Date(),
          },
        })
        break
      }

      case "user.deleted": {
        const id = (evt.data as { id?: string }).id
        if (id) {
          await prisma.user.updateMany({
            where: { id },
            data: {
              status: "archived",
              offboardedAt: new Date(),
              lastIdentitySyncAt: new Date(),
              updatedAt: new Date(),
            },
          })
        }
        break
      }

      case "organization.created":
      case "organization.updated": {
        const data = evt.data as { id?: string; name?: string }
        if (data.id) {
          await prisma.organization.upsert({
            where: { id: data.id },
            create: { id: data.id, name: data.name ?? "Organization" },
            update: { name: data.name ?? undefined },
          })
        }
        break
      }

      case "organizationMembership.created":
      case "organizationMembership.updated": {
        const data = evt.data as {
          organization?: { id: string; name?: string }
          public_user_data?: {
            user_id?: string
            identifier?: string
            first_name?: string
            last_name?: string
          }
          role?: string
        }
        const userId = data.public_user_data?.user_id ?? (evt.data as { user_id?: string }).user_id
        if (!userId) break
        const orgId = data.organization?.id ?? "org_default"
        if (data.organization?.id) {
          await prisma.organization.upsert({
            where: { id: data.organization.id },
            create: { id: data.organization.id, name: data.organization.name ?? "Organization" },
            update: {},
          })
        }
        const pub = data.public_user_data
        const existingUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { status: true },
        })
        const isRemoved = existingUser && ["offboarded", "archived"].includes(existingUser.status)
        if (isRemoved) break

        await prisma.user.upsert({
          where: { id: userId },
          create: {
            id: userId,
            email: pub?.identifier ?? null,
            orgId,
            role: toDbRole(data.role),
            firstName: pub?.first_name ?? null,
            lastName: pub?.last_name ?? null,
            status: "active",
            lastIdentitySyncAt: new Date(),
            updatedAt: new Date(),
          },
          update: {
            orgId,
            role: toDbRole(data.role),
            email: pub?.identifier ?? undefined,
            firstName: pub?.first_name ?? undefined,
            lastName: pub?.last_name ?? undefined,
            lastIdentitySyncAt: new Date(),
            updatedAt: new Date(),
          },
        })
        break
      }

      case "organizationMembership.deleted": {
        const data = evt.data as {
          organization?: { id: string }
          public_user_data?: { user_id?: string }
        }
        const userId = data.public_user_data?.user_id ?? (evt.data as { user_id?: string }).user_id
        if (!userId) break
        await prisma.user.updateMany({
          where: { id: userId },
          data: {
            status: "offboarded",
            offboardedAt: new Date(),
            lastIdentitySyncAt: new Date(),
            updatedAt: new Date(),
          },
        })
        break
      }

      default:
        break
    }

    await markWebhookStatus(eventId, "processed", null)
    return Response.json({ received: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook processing failed"
    await markWebhookStatus(eventId, "failed", message)
    return Response.json({ error: message }, { status: 500 })
  }
}
