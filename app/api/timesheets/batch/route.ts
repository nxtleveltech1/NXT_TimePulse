import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { batchEntrySchema } from "@/lib/validations/timesheet"

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = batchEntrySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 })
  }

  const { entries } = parsed.data

  // Verify all projectIds belong to valid allocations for this user
  const projectIds = [...new Set(entries.map((e) => e.projectId))]
  const allocations = await prisma.projectAllocation.findMany({
    where: { userId, projectId: { in: projectIds }, isActive: true },
    select: { projectId: true },
  })
  const allowedIds = new Set(allocations.map((a) => a.projectId))
  const unauthorized = projectIds.filter((id) => !allowedIds.has(id))
  if (unauthorized.length > 0) {
    return NextResponse.json(
      { error: `Not allocated to project(s): ${unauthorized.join(", ")}` },
      { status: 403 }
    )
  }

  const projects = await prisma.project.findMany({
    where: { id: { in: projectIds } },
    select: { id: true, isBillable: true },
  })
  const projectBillableMap = new Map(projects.map((p) => [p.id, p.isBillable]))

  const created = await prisma.$transaction(
    entries.map((e) => {
      const clockIn = new Date(e.clockIn)
      const clockOut = new Date(e.clockOut)
      const rawDuration = Math.floor((clockOut.getTime() - clockIn.getTime()) / 60000)
      const durationMinutes = Math.max(0, rawDuration - (e.breakMinutes ?? 0))
      const projBillable = projectBillableMap.get(e.projectId) ?? true
      return prisma.timesheet.create({
        data: {
          userId,
          projectId: e.projectId,
          date: clockIn.toISOString().split("T")[0],
          clockIn,
          clockOut,
          durationMinutes,
          source: "manual",
          status: "pending",
          notes: e.notes ?? "",
          breakMinutes: e.breakMinutes ?? 0,
          isBillable: projBillable === false ? false : (e.isBillable ?? true),
        },
      })
    })
  )

  await prisma.auditLog.create({
    data: {
      userId,
      action: "timesheets.batch_created",
      entityType: "timesheet",
      entityId: userId,
      details: `Batch created ${created.length} timesheet entries`,
    },
  })

  return NextResponse.json({ created: created.length })
}
