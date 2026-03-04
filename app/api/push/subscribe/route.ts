import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const b = body as Record<string, unknown>
  const endpoint = typeof b.endpoint === "string" ? b.endpoint : ""
  const keys = b.keys as Record<string, string> | undefined
  const p256dh = keys?.p256dh ?? ""
  const authKey = keys?.auth ?? ""

  if (!endpoint || !p256dh || !authKey) {
    return NextResponse.json(
      { error: "endpoint, keys.p256dh, and keys.auth are required" },
      { status: 400 }
    )
  }

  await prisma.pushSubscription.upsert({
    where: {
      userId_endpoint: { userId, endpoint },
    },
    create: { userId, endpoint, p256dh, auth: authKey },
    update: { p256dh, auth: authKey },
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const { userId } = await auth()
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const b = body as Record<string, unknown>
  const endpoint = typeof b.endpoint === "string" ? b.endpoint : ""

  if (!endpoint) {
    return NextResponse.json(
      { error: "endpoint is required" },
      { status: 400 }
    )
  }

  await prisma.pushSubscription.deleteMany({
    where: { userId, endpoint },
  })

  return NextResponse.json({ ok: true })
}
