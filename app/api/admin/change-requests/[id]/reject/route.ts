import { NextResponse } from "next/server"
import { requireCapability } from "@/lib/auth"
import { rejectChangeRequest } from "@/lib/change-requests"
import { rejectChangeRequestSchema } from "@/lib/schemas/change-request"
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
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const parsed = rejectChangeRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  try {
    const rejected = await rejectChangeRequest(id, auth.userId, auth.orgId, parsed.data.reason)
    return NextResponse.json(serializeForClient(rejected))
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to reject change request"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
