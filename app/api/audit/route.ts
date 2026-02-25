import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { isAdminOrManager } from "@/lib/auth"

export async function GET(req: Request) {
  const { orgId, orgRole } = await auth()
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!isAdminOrManager(orgRole as string)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const org = orgId ?? "org_default"
  const { searchParams } = new URL(req.url)
  const entityType = searchParams.get("entityType")
  const from = searchParams.get("from")
  const to = searchParams.get("to")

  const where: { user: { orgId: string }; entityType?: string; timestamp?: { gte?: Date; lte?: Date } } = {
    user: { orgId: org },
  }
  if (entityType) where.entityType = entityType
  if (from || to) {
    where.timestamp = {}
    if (from) where.timestamp.gte = new Date(from)
    if (to) where.timestamp.lte = new Date(to + "T23:59:59.999Z")
  }

  const logs = await prisma.auditLog.findMany({
    where,
    include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
    orderBy: { timestamp: "desc" },
    take: 200,
  })
  return NextResponse.json(logs)
}
