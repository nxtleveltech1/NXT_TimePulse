import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { isAdminOrManager } from "@/lib/auth"

export async function GET() {
  const { userId, orgId, orgRole } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const org = orgId ?? "org_default"
  const isAdmin = isAdminOrManager(orgRole as string)

  const requests = await prisma.leaveRequest.findMany({
    where: isAdmin ? { user: { orgId: org } } : { userId },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(requests)
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const b = body as Record<string, unknown>
  const startDate = b.startDate ? new Date(b.startDate as string) : null
  const endDate = b.endDate ? new Date(b.endDate as string) : null
  const type = typeof b.type === "string" ? b.type : "annual"
  const reason = typeof b.reason === "string" ? b.reason : null

  if (!startDate || !endDate || endDate < startDate) {
    return NextResponse.json({ error: "Valid startDate and endDate required" }, { status: 400 })
  }

  const leave = await prisma.leaveRequest.create({
    data: {
      userId,
      startDate,
      endDate,
      type: ["annual", "sick", "unpaid", "other"].includes(type) ? type : "annual",
      reason,
    },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  })
  return NextResponse.json(leave)
}
