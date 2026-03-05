import webpush from "web-push"
import { prisma } from "@/lib/prisma"

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:notifications@timepulse.app"

const TAG = "[web-push]"

let configured = false
function ensureConfigured() {
  if (configured) return true
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn(
      `${TAG} VAPID keys not configured — push notifications will not be sent. ` +
        "Set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY env vars."
    )
    return false
  }
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
  configured = true
  return true
}

interface PushPayload {
  title: string
  body: string
  url?: string
  icon?: string
}

export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<{ sent: number; failed: number; stale: number }> {
  if (!ensureConfigured()) return { sent: 0, failed: 0, stale: 0 }

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  })

  if (subscriptions.length === 0) {
    console.log(`${TAG} userId=${userId} — no push subscriptions registered`)
    return { sent: 0, failed: 0, stale: 0 }
  }

  const pushPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? "/dashboard/timesheets",
    icon: "/icons/icon-192.png",
  })

  const stale: string[] = []
  let sent = 0
  let failed = 0

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          pushPayload
        )
        sent++
      } catch (err) {
        const statusCode = (err as { statusCode?: number })?.statusCode
        if (statusCode === 404 || statusCode === 410) {
          stale.push(sub.id)
        } else {
          failed++
          console.error(`${TAG} Failed to send to ${sub.endpoint}:`, err)
        }
      }
    })
  )

  if (stale.length > 0) {
    await prisma.pushSubscription.deleteMany({
      where: { id: { in: stale } },
    })
    console.log(`${TAG} userId=${userId} — cleaned ${stale.length} stale subscription(s)`)
  }

  console.log(
    `${TAG} userId=${userId} — ${sent} sent, ${failed} failed, ${stale.length} stale (of ${subscriptions.length} sub(s))`
  )

  return { sent, failed, stale: stale.length }
}
