import { auth } from "@clerk/nextjs/server"
import { Prisma } from "@/generated/prisma"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { hasCapability } from "@/lib/auth"

export async function GET() {
  const { userId, orgId, orgRole } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!hasCapability(orgRole, "users.read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const org = orgId ?? "org_default"
  try {
    const users = await prisma.user.findMany({
      where: { orgId: org },
      include: {
        _count: { select: { timesheets: true, allocations: true } },
      },
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(users)
  } catch {
    const fallbackUsers = await prisma.$queryRaw<
      Array<{
        id: string
        email: string | null
        first_name: string | null
        last_name: string | null
        role: string
        status: string
        created_at: Date
        updated_at: Date
        timesheets_count: bigint
        allocations_count: bigint
      }>
    >(Prisma.sql`
      SELECT
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.role,
        u.status::text AS status,
        u.created_at,
        u.updated_at,
        (
          SELECT COUNT(*)
          FROM timesheets t
          WHERE t.user_id = u.id
        ) AS timesheets_count,
        (
          SELECT COUNT(*)
          FROM project_allocations pa
          WHERE pa.user_id = u.id
        ) AS allocations_count
      FROM users u
      WHERE u.org_id = ${org}
      ORDER BY u.created_at DESC
    `)

    return NextResponse.json(
      fallbackUsers.map((u) => ({
        id: u.id,
        email: u.email,
        firstName: u.first_name,
        lastName: u.last_name,
        role: u.role,
        status: u.status,
        createdAt: u.created_at,
        updatedAt: u.updated_at,
        _count: {
          timesheets: Number(u.timesheets_count),
          allocations: Number(u.allocations_count),
        },
      })),
    )
  }
}
