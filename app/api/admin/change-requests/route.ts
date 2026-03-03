import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireCapability } from "@/lib/auth"
import { serializeForClient } from "@/lib/serialize"

export async function GET(req: Request) {
  const auth = await requireCapability("approvals.review")
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")
  const changeType = searchParams.get("changeType")
  const requestedBy = searchParams.get("requestedBy")

  const where: Record<string, unknown> = { orgId: auth.orgId }
  if (status) where.status = status
  if (changeType) where.changeType = changeType
  if (requestedBy) where.requestedById = requestedBy

  const requests = await prisma.adminChangeRequest.findMany({
    where,
    include: {
      requestedBy: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      reviewedBy: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 500,
  })

  return NextResponse.json(serializeForClient(requests))
}
