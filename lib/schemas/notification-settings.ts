import { z } from "zod"

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/

export const notificationSettingsSchema = z.object({
  enabled: z.boolean(),
  clockInTime: z.string().regex(timeRegex, "Must be HH:mm format"),
  clockOutTime: z.string().regex(timeRegex, "Must be HH:mm format"),
  timesheetSubmitDay: z.number().int().min(0).max(6),
  timesheetSubmitTime: z.string().regex(timeRegex, "Must be HH:mm format"),
  reminderEnabled: z.boolean(),
  reminderIntervalHours: z.number().int().min(1).max(12),
  timezone: z.string().min(1),
})

export type NotificationSettings = z.infer<typeof notificationSettingsSchema>

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: true,
  clockInTime: "08:00",
  clockOutTime: "17:00",
  timesheetSubmitDay: 6,
  timesheetSubmitTime: "13:00",
  reminderEnabled: true,
  reminderIntervalHours: 2,
  timezone: "Africa/Johannesburg",
}

export const updateNotificationSettingsSchema = notificationSettingsSchema.partial()
