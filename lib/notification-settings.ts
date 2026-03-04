import { prisma } from "@/lib/prisma"
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  type NotificationSettings,
} from "@/lib/schemas/notification-settings"

export async function getNotificationSettings(
  orgId: string
): Promise<NotificationSettings> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { settings: true },
  })
  const settings = (org?.settings as Record<string, unknown> | null) ?? {}
  const ns = settings.notificationSettings as
    | Partial<NotificationSettings>
    | undefined
  if (!ns) return DEFAULT_NOTIFICATION_SETTINGS
  return {
    enabled:
      typeof ns.enabled === "boolean"
        ? ns.enabled
        : DEFAULT_NOTIFICATION_SETTINGS.enabled,
    clockInTime:
      typeof ns.clockInTime === "string"
        ? ns.clockInTime
        : DEFAULT_NOTIFICATION_SETTINGS.clockInTime,
    clockOutTime:
      typeof ns.clockOutTime === "string"
        ? ns.clockOutTime
        : DEFAULT_NOTIFICATION_SETTINGS.clockOutTime,
    timesheetSubmitDay:
      typeof ns.timesheetSubmitDay === "number"
        ? ns.timesheetSubmitDay
        : DEFAULT_NOTIFICATION_SETTINGS.timesheetSubmitDay,
    timesheetSubmitTime:
      typeof ns.timesheetSubmitTime === "string"
        ? ns.timesheetSubmitTime
        : DEFAULT_NOTIFICATION_SETTINGS.timesheetSubmitTime,
    reminderEnabled:
      typeof ns.reminderEnabled === "boolean"
        ? ns.reminderEnabled
        : DEFAULT_NOTIFICATION_SETTINGS.reminderEnabled,
    reminderIntervalHours:
      typeof ns.reminderIntervalHours === "number"
        ? ns.reminderIntervalHours
        : DEFAULT_NOTIFICATION_SETTINGS.reminderIntervalHours,
    timezone:
      typeof ns.timezone === "string"
        ? ns.timezone
        : DEFAULT_NOTIFICATION_SETTINGS.timezone,
  }
}
