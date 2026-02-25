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
  const projects = await prisma.project.findMany({
    where: { orgId: org },
    include: { _count: { select: { geozones: true, timesheets: true } } },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(projects)
}

export async function POST(req: Request) {
  const { userId, orgId, orgRole } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!isAdminOrManager(orgRole as string)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const org = orgId ?? "org_default"
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const b = body as Record<string, unknown>
  const name = typeof b.name === "string" ? b.name : ""
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 })

  const project = await prisma.project.create({
    data: {
      orgId: org,
      name,
      client: typeof b.client === "string" ? b.client : null,
      description: typeof b.description === "string" ? b.description : "",
      status: typeof b.status === "string" ? b.status : "active",
      defaultRate: typeof b.defaultRate === "number" ? b.defaultRate : 0,
      address: typeof b.address === "string" ? b.address : "",
      startDate: b.startDate ? new Date(b.startDate as string) : null,
      endDate: b.endDate ? new Date(b.endDate as string) : null,
    },
  })
  await prisma.auditLog.create({
    data: {
      userId,
      action: "project.created",
      entityType: "project",
      entityId: project.id,
      details: `Project created: ${project.name}`,
    },
  })
  return NextResponse.json(project)
}
