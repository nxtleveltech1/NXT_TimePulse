import { Resend } from "resend"

const TAG = "[email]"

const EMAIL_FROM =
  process.env.EMAIL_FROM ?? "TimePulse <notifications@timepulse.nxtdotx.online>"

let resend: Resend | null = null
function getClient(): Resend | null {
  if (resend) return resend
  const key = process.env.RESEND_API_KEY
  if (!key) {
    console.warn(
      `${TAG} RESEND_API_KEY not configured — email notifications will not be sent.`
    )
    return null
  }
  resend = new Resend(key)
  return resend
}

interface SendEmailParams {
  to: string
  subject: string
  html: string
}

export async function sendEmail(
  params: SendEmailParams
): Promise<{ sent: boolean }> {
  const client = getClient()
  if (!client) return { sent: false }

  try {
    const { error } = await client.emails.send({
      from: EMAIL_FROM,
      to: params.to,
      subject: params.subject,
      html: params.html,
    })

    if (error) {
      console.error(`${TAG} Resend API error for ${params.to}:`, error)
      return { sent: false }
    }

    console.log(`${TAG} Sent to ${params.to} — "${params.subject}"`)
    return { sent: true }
  } catch (err) {
    console.error(`${TAG} Failed to send to ${params.to}:`, err)
    return { sent: false }
  }
}

// ── Email templates ──

function layout(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
        <tr><td style="background:#18181b;padding:20px 24px">
          <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.025em">TimePulse</span>
        </td></tr>
        <tr><td style="padding:28px 24px">${content}</td></tr>
        <tr><td style="padding:16px 24px;border-top:1px solid #e4e4e7">
          <p style="margin:0;font-size:12px;color:#a1a1aa;text-align:center">
            This is an automated notification from TimePulse. Do not reply to this email.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function actionButton(label: string, url: string): string {
  return `<table cellpadding="0" cellspacing="0" style="margin:24px 0 8px">
    <tr><td style="background:#18181b;border-radius:8px;padding:12px 24px">
      <a href="${url}" style="color:#ffffff;text-decoration:none;font-size:14px;font-weight:600">${label}</a>
    </td></tr>
  </table>`
}

export function clockInEmail(firstName: string, baseUrl: string): SendEmailParams {
  const url = `${baseUrl}/dashboard/timesheets`
  return {
    to: "",
    subject: "Reminder: Clock in today",
    html: layout(`
      <h2 style="margin:0 0 12px;font-size:20px;color:#18181b">Clock In Reminder</h2>
      <p style="margin:0 0 4px;font-size:15px;color:#3f3f46">Hi ${firstName || "there"},</p>
      <p style="margin:0;font-size:15px;color:#52525b;line-height:1.6">
        You haven't clocked in yet today. Please clock in as soon as possible to keep your timesheet accurate.
      </p>
      ${actionButton("Clock In Now", url)}
    `),
  }
}

export function clockOutEmail(firstName: string, baseUrl: string): SendEmailParams {
  const url = `${baseUrl}/dashboard/timesheets`
  return {
    to: "",
    subject: "Reminder: Clock out for today",
    html: layout(`
      <h2 style="margin:0 0 12px;font-size:20px;color:#18181b">Clock Out Reminder</h2>
      <p style="margin:0 0 4px;font-size:15px;color:#3f3f46">Hi ${firstName || "there"},</p>
      <p style="margin:0;font-size:15px;color:#52525b;line-height:1.6">
        You're still clocked in. Don't forget to clock out before you finish for the day.
      </p>
      ${actionButton("Clock Out Now", url)}
    `),
  }
}

export function timesheetSubmitEmail(firstName: string, baseUrl: string): SendEmailParams {
  const url = `${baseUrl}/dashboard/timesheets`
  return {
    to: "",
    subject: "Reminder: Submit your timesheets",
    html: layout(`
      <h2 style="margin:0 0 12px;font-size:20px;color:#18181b">Timesheet Submission</h2>
      <p style="margin:0 0 4px;font-size:15px;color:#3f3f46">Hi ${firstName || "there"},</p>
      <p style="margin:0;font-size:15px;color:#52525b;line-height:1.6">
        You have pending timesheets for this week. Please review and submit them for approval.
      </p>
      ${actionButton("Review Timesheets", url)}
    `),
  }
}
