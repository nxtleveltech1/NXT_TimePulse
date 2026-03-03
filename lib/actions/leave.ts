"use server"

import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireCapability } from "@/lib/auth"

const createLeaveSchema = z.object({
  type: z.string().min(1),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().optional(),
})

export async function createLeaveRequest(input: z.infer<typeof createLeaveSchema>) {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  const parsed = createLeaveSchema.safeParse(input)
  if (!parsed.success) throw new Error("Invalid input")

  const leaveRequest = await prisma.leaveRequest.create({
    data: {
      userId,
      type: parsed.data.type,
      startDate: new Date(parsed.data.startDate),
      endDate: new Date(parsed.data.endDate),
      reason: parsed.data.reason ?? null,
      status: "pending",
      updatedAt: new Date(),
    },
  })

  revalidatePath("/dashboard/leave")
  return leaveRequest
}

export async function approveLeaveRequest(leaveId: string) {
  const access = await requireCapability("users.write")
  if (!access) throw new Error("Forbidden")

  const updated = await prisma.leaveRequest.update({
    where: { id: leaveId },
    data: {
      status: "approved",
      approvedById: access.userId,
      approvedAt: new Date(),
      updatedAt: new Date(),
    },
  })

  await prisma.auditLog.create({
    data: {
      userId: access.userId,
      action: "leave.approved",
      entityType: "leave_request",
      entityId: leaveId,
      details: "Leave request approved",
    },
  })

  revalidatePath("/dashboard/leave")
  return updated
}

export async function rejectLeaveRequest(leaveId: string, _reason?: string) {
  const access = await requireCapability("users.write")
  if (!access) throw new Error("Forbidden")

  const updated = await prisma.leaveRequest.update({
    where: { id: leaveId },
    data: {
      status: "rejected",
      updatedAt: new Date(),
    },
  })

  revalidatePath("/dashboard/leave")
  return updated
}

export async function cancelLeaveRequest(leaveId: string) {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  const leave = await prisma.leaveRequest.findFirst({
    where: { id: leaveId, userId, status: "pending" },
  })
  if (!leave) throw new Error("Leave request not found or cannot be cancelled")

  const updated = await prisma.leaveRequest.update({
    where: { id: leaveId },
    data: { status: "cancelled", updatedAt: new Date() },
  })

  revalidatePath("/dashboard/leave")
  return updated
}
