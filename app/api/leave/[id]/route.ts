import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { isAdminOrManager } from "@/lib/auth"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, orgRole } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const leave = await prisma.leaveRequest.findUnique({
    where: { id },
    include: { user: true },
  })
  if (!leave) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const isAdmin = isAdminOrManager(orgRole as string)

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const b = body as Record<string, unknown>
  const status = typeof b.status === "string" ? b.status : ""

  if (status === "cancelled") {
    if (leave.userId !== userId) {
      return NextResponse.json({ error: "Only owner can cancel" }, { status: 403 })
    }
    if (leave.status !== "pending") {
      return NextResponse.json({ error: "Can only cancel pending requests" }, { status: 400 })
    }
    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: { status: "cancelled" },
    })
    return NextResponse.json(updated)
  }

  if (["approved", "rejected"].includes(status)) {
    if (!isAdmin) {
      return NextResponse.json({ error: "Only admin/manager can approve or reject" }, { status: 403 })
    }
    if (leave.status !== "pending") {
      return NextResponse.json({ error: "Request already processed" }, { status: 400 })
    }
    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status,
        approvedById: status === "approved" ? userId : null,
        approvedAt: new Date(),
      },
    })
    return NextResponse.json(updated)
  }

  return NextResponse.json({ error: "Invalid status" }, { status: 400 })
}
