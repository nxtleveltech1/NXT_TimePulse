import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { isAdminOrManager } from "@/lib/auth"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, orgId, orgRole } = await auth()
  if (!userId || !orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!isAdminOrManager(orgRole as string)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const allocation = await prisma.projectAllocation.findFirst({
    where: { id, project: { orgId } },
    include: { user: true, project: true },
  })
  if (!allocation) return NextResponse.json({ error: "Not found" }, { status: 404 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const b = body as Record<string, unknown>
  const hourlyRate = typeof b.hourlyRate === "number" ? b.hourlyRate : undefined
  const roleOnProject = typeof b.roleOnProject === "string" ? b.roleOnProject : undefined
  const startDate = b.startDate ? new Date(b.startDate as string) : undefined
  const endDate = b.endDate === null ? null : b.endDate ? new Date(b.endDate as string) : undefined
  const isActive = typeof b.isActive === "boolean" ? b.isActive : undefined

  const data: Record<string, unknown> = {}
  if (hourlyRate !== undefined) data.hourlyRate = hourlyRate
  if (roleOnProject !== undefined) data.roleOnProject = roleOnProject
  if (startDate !== undefined) data.startDate = startDate
  if (endDate !== undefined) data.endDate = endDate
  if (isActive !== undefined) data.isActive = isActive

  if (Object.keys(data).length === 0) {
    return NextResponse.json(allocation)
  }

  const updated = await prisma.projectAllocation.update({
    where: { id },
    data,
  })
  await prisma.auditLog.create({
    data: {
      userId,
      action: "allocation.updated",
      entityType: "project_allocation",
      entityId: id,
      details: `Allocation updated: ${Object.keys(data).join(", ")}`,
      newValue: JSON.stringify(data),
    },
  })
  return NextResponse.json(updated)
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, orgId, orgRole } = await auth()
  if (!userId || !orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!isAdminOrManager(orgRole as string)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const allocation = await prisma.projectAllocation.findFirst({
    where: { id, project: { orgId } },
  })
  if (!allocation) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.projectAllocation.delete({ where: { id } })
  await prisma.auditLog.create({
    data: {
      userId,
      action: "allocation.deleted",
      entityType: "project_allocation",
      entityId: id,
      details: `Allocation deleted: user ${allocation.userId} → project ${allocation.projectId}`,
    },
  })
  return NextResponse.json({ success: true })
}
