import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { isAdminOrManager } from "@/lib/auth"
import { serializeForClient } from "@/lib/serialize"

export async function GET(req: Request) {
  try {
    const { userId, orgId, orgRole } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (!isAdminOrManager(orgRole as string)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get("projectId")
    const userIdParam = searchParams.get("userId")
    const org = orgId ?? "org_default"

    const where: Record<string, unknown> = { isActive: true }
    if (projectId) where.projectId = projectId
    if (userIdParam) where.userId = userIdParam
    where.project = { orgId: org }

    const allocations = await prisma.projectAllocation.findMany({
      where,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: { startDate: "desc" },
    })
    const serialized = serializeForClient(allocations)
    return NextResponse.json(serialized)
  } catch (e) {
    console.error("[GET /api/allocations]", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch allocations" },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const { userId, orgId, orgRole } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (!isAdminOrManager(orgRole as string)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const b = body as Record<string, unknown>
    const userIdParam = typeof b.userId === "string" ? b.userId : ""
    const projectId = typeof b.projectId === "string" ? b.projectId : ""
    const roleOnProject = typeof b.roleOnProject === "string" ? b.roleOnProject : ""
    const startDate = b.startDate ? new Date(b.startDate as string) : new Date()
    const endDate = b.endDate ? new Date(b.endDate as string) : null
    const hourlyRate = typeof b.hourlyRate === "number" ? b.hourlyRate : 0

    if (!userIdParam || !projectId || !roleOnProject) {
      return NextResponse.json(
        { error: "userId, projectId, roleOnProject required" },
        { status: 400 }
      )
    }

    const org = orgId ?? "org_default"
    const [project, user] = await Promise.all([
      prisma.project.findFirst({ where: { id: projectId, orgId: org }, select: { id: true } }),
      prisma.user.findFirst({ where: { id: userIdParam, orgId: org }, select: { id: true } }),
    ])
    if (!project || !user) {
      return NextResponse.json(
        { error: "Project or user not found in organization" },
        { status: 404 }
      )
    }

    const existing = await prisma.projectAllocation.findUnique({
      where: { userId_projectId: { userId: userIdParam, projectId } },
      select: { id: true },
    })
    if (existing) {
      return NextResponse.json(
        { error: "This user is already allocated to this project. Edit the existing allocation instead." },
        { status: 409 }
      )
    }

    const allocation = await prisma.projectAllocation.create({
      data: {
        userId: userIdParam,
        projectId,
        roleOnProject,
        startDate,
        endDate,
        hourlyRate,
        isActive: true,
      },
    })
    await prisma.auditLog.create({
      data: {
        userId,
        action: "allocation.created",
        entityType: "project_allocation",
        entityId: allocation.id,
        details: `Allocation created: user ${userIdParam} → project ${projectId}`,
      },
    }).catch(() => {})
    const serialized = serializeForClient(allocation)
    return NextResponse.json(serialized)
  } catch (e) {
    const err = e as { code?: string }
    if (err.code === "P2002") {
      return NextResponse.json(
        { error: "This user is already allocated to this project. Edit the existing allocation instead." },
        { status: 409 }
      )
    }
    console.error("[POST /api/allocations]", e)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create allocation" },
      { status: 500 }
    )
  }
}
