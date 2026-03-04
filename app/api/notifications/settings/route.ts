import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { isAdminOrManager } from "@/lib/auth"
import { getNotificationSettings } from "@/lib/notification-settings"
import { updateNotificationSettingsSchema } from "@/lib/schemas/notification-settings"

export async function GET() {
  const { orgId, orgRole } = await auth()
  if (!orgId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!isAdminOrManager(orgRole as string))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const settings = await getNotificationSettings(orgId)
  return NextResponse.json(settings)
}

export async function PATCH(req: Request) {
  const { userId, orgId, orgRole } = await auth()
  if (!userId || !orgId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!isAdminOrManager(orgRole as string))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = updateNotificationSettingsSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const current = await getNotificationSettings(orgId)
  const updated = { ...current, ...parsed.data }

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { settings: true },
  })

  const settings = (org?.settings as Record<string, unknown>) ?? {}
  const merged = { ...settings, notificationSettings: updated }

  await prisma.organization.upsert({
    where: { id: orgId },
    create: { id: orgId, name: "Organization", settings: merged },
    update: { settings: merged },
  })

  await prisma.auditLog.create({
    data: {
      userId,
      action: "notification_settings.updated",
      entityType: "organization",
      entityId: orgId,
      details: "Notification settings updated",
      newValue: JSON.stringify(updated),
    },
  })

  return NextResponse.json(updated)
}
