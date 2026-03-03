import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireCapability } from "@/lib/auth"
import { resolveRateQuerySchema } from "@/lib/schemas/rate"
import { resolveRateFromCards } from "@/lib/rates"

export async function GET(req: Request) {
  const auth = await requireCapability("compensation.read")
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const parsed = resolveRateQuerySchema.safeParse({
    userId: searchParams.get("userId"),
    projectId: searchParams.get("projectId"),
    date: searchParams.get("date"),
  })
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { userId, projectId, date } = parsed.data
  const project = await prisma.project.findFirst({
    where: { id: projectId, orgId: auth.orgId },
    select: { id: true, defaultRate: true, clientRate: true },
  })
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 })

  const rateCards = await prisma.rateCard.findMany({
    where: {
      orgId: auth.orgId,
      userId,
      OR: [{ projectId }, { projectId: null }],
    },
    select: {
      id: true,
      projectId: true,
      payRate: true,
      billRate: true,
      currency: true,
      effectiveFrom: true,
      effectiveTo: true,
      status: true,
    },
  })

  const resolved = resolveRateFromCards({
    date,
    projectId,
    projectDefaultRate: project.defaultRate,
    projectClientRate: project.clientRate,
    rateCards,
  })

  return NextResponse.json(resolved)
}
