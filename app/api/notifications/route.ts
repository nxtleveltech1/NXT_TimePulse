import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const { userId } = await auth()
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 100)
  const cursor = searchParams.get("cursor")

  const notifications = await prisma.notification.findMany({
    where: {
      userId,
      dismissed: false,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
  })

  const unreadCount = await prisma.notification.count({
    where: { userId, read: false, dismissed: false },
  })

  return NextResponse.json({
    notifications,
    unreadCount,
    nextCursor:
      notifications.length === limit
        ? notifications[notifications.length - 1].id
        : null,
  })
}

export async function PATCH(req: Request) {
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
  const ids = Array.isArray(b.ids) ? (b.ids as string[]) : []
  const markAllRead = b.markAllRead === true
  const read = typeof b.read === "boolean" ? b.read : undefined
  const dismissed = typeof b.dismissed === "boolean" ? b.dismissed : undefined

  if (markAllRead) {
    await prisma.notification.updateMany({
      where: { userId, read: false, dismissed: false },
      data: { read: true },
    })
    return NextResponse.json({ ok: true })
  }

  if (ids.length === 0) {
    return NextResponse.json(
      { error: "ids[] or markAllRead required" },
      { status: 400 }
    )
  }

  const data: Record<string, unknown> = {}
  if (read !== undefined) data.read = read
  if (dismissed !== undefined) data.dismissed = dismissed

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: "Nothing to update" },
      { status: 400 }
    )
  }

  await prisma.notification.updateMany({
    where: { id: { in: ids }, userId },
    data,
  })

  return NextResponse.json({ ok: true })
}
