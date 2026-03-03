import { NextResponse } from "next/server"
import { clerkClient } from "@clerk/nextjs/server"
import { requireCapability } from "@/lib/auth"
import { approveChangeRequest } from "@/lib/change-requests"
import { reviewChangeRequestSchema } from "@/lib/schemas/change-request"
import { serializeForClient } from "@/lib/serialize"
import { checkDistributedRateLimit } from "@/lib/distributed-rate-limit"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireCapability("approvals.review")
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const rateLimit = await checkDistributedRateLimit(`${auth.orgId}:approvals:${auth.userId}`, 60, 60_000)
  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "Rate limit exceeded", resetAt: rateLimit.resetAt },
      { status: 429 }
    )
  }

  const { id } = await params

  let body: unknown = {}
  try {
    body = await req.json()
  } catch {
    // optional request body
  }
  const parsed = reviewChangeRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  try {
    const approved = await approveChangeRequest(id, auth.userId, auth.orgId)
    const payload = approved.payload as {
      operation?: string
      userId?: string
    }

    let warning: string | null = null
    if (approved.changeType === "user_access_change" && payload.operation === "offboard" && payload.userId) {
      try {
        const clerk = await clerkClient()
        await clerk.organizations.deleteOrganizationMembership({
          organizationId: auth.orgId,
          userId: payload.userId,
        })
      } catch (err) {
        warning = err instanceof Error ? err.message : "Failed to remove Clerk membership"
      }
    }

    return NextResponse.json({
      ...serializeForClient(approved),
      ...(warning ? { warning } : {}),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to approve change request"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
