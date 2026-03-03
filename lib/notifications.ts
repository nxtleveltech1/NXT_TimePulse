/**
 * Notification dispatcher — sends events to n8n for routing to email/WhatsApp/SMS.
 * n8n webhook URL must be set in N8N_WEBHOOK_URL env var.
 */

export type NotificationEvent =
  | "timesheet.pending_approval"
  | "timesheet.approved"
  | "timesheet.rejected"
  | "leave.pending_approval"
  | "leave.approved"
  | "leave.rejected"
  | "user.offboard_requested"
  | "user.offboard_approved"
  | "change_request.pending"
  | "change_request.approved"
  | "change_request.rejected"

export interface NotificationPayload {
  event: NotificationEvent
  orgId: string
  actorId?: string
  targetUserId: string
  targetUserEmail?: string | null
  targetUserPhone?: string | null
  data?: Record<string, unknown>
  timestamp: string
}

export async function dispatchNotification(payload: NotificationPayload): Promise<void> {
  const webhookUrl = process.env.N8N_WEBHOOK_URL
  if (!webhookUrl) {
    if (process.env.NODE_ENV === "development") {
      console.log("[notifications] N8N_WEBHOOK_URL not set, skipping:", payload.event)
    }
    return
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.N8N_WEBHOOK_SECRET
          ? { "X-Webhook-Secret": process.env.N8N_WEBHOOK_SECRET }
          : {}),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) {
      console.error(`[notifications] n8n webhook failed: ${response.status} ${response.statusText}`)
    }
  } catch (err) {
    // Non-blocking — notification failure must never break the primary operation
    console.error("[notifications] Failed to dispatch notification:", err)
  }
}

export async function notifyTimesheetPendingApproval(params: {
  orgId: string
  timesheetId: string
  userId: string
  userEmail?: string | null
  projectName: string
  date: string
  managerId?: string
}) {
  await dispatchNotification({
    event: "timesheet.pending_approval",
    orgId: params.orgId,
    actorId: params.userId,
    targetUserId: params.managerId ?? params.userId,
    targetUserEmail: params.userEmail,
    data: {
      timesheetId: params.timesheetId,
      projectName: params.projectName,
      date: params.date,
    },
    timestamp: new Date().toISOString(),
  })
}

export async function notifyLeaveApprovalRequired(params: {
  orgId: string
  leaveId: string
  userId: string
  userEmail?: string | null
  type: string
  startDate: string
  endDate: string
  managerId?: string
}) {
  await dispatchNotification({
    event: "leave.pending_approval",
    orgId: params.orgId,
    actorId: params.userId,
    targetUserId: params.managerId ?? params.userId,
    targetUserEmail: params.userEmail,
    data: {
      leaveId: params.leaveId,
      leaveType: params.type,
      startDate: params.startDate,
      endDate: params.endDate,
    },
    timestamp: new Date().toISOString(),
  })
}

export async function notifyOffboardRequest(params: {
  orgId: string
  targetUserId: string
  targetUserEmail?: string | null
  requestedById: string
  reason?: string
}) {
  await dispatchNotification({
    event: "user.offboard_requested",
    orgId: params.orgId,
    actorId: params.requestedById,
    targetUserId: params.targetUserId,
    targetUserEmail: params.targetUserEmail,
    data: { reason: params.reason },
    timestamp: new Date().toISOString(),
  })
}
