import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { isAdminOrManager } from "@/lib/auth"

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, orgId, orgRole } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!isAdminOrManager(orgRole as string)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const org = orgId ?? "org_default"
  const project = await prisma.project.findFirst({
    where: { id, orgId: org },
  })
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.project.delete({ where: { id } })
  await prisma.auditLog.create({
    data: {
      userId,
      action: "project.deleted",
      entityType: "project",
      entityId: id,
      details: `Project deleted: ${project.name}`,
    },
  })
  return NextResponse.json({ success: true })
}
