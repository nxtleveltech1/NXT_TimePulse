import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { isAdminOrManager } from "@/lib/auth"

export async function GET() {
  const { userId, orgId, orgRole } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!isAdminOrManager(orgRole as string)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const org = orgId ?? "org_default"
  const users = await prisma.user.findMany({
    where: { orgId: org },
    include: {
      _count: { select: { timesheets: true, allocations: true } },
    },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(users)
}
