import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { isAdminOrManager } from "@/lib/auth"
import { getOvertimePolicy, type OvertimePolicy } from "@/lib/payroll"

export async function GET() {
  const { orgId, orgRole } = await auth()
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!isAdminOrManager(orgRole as string)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const policy = await getOvertimePolicy(orgId)
  return NextResponse.json(policy)
}

const overtimePolicySchema = {
  saturdayMultiplier: (v: unknown) => typeof v === "number" && v >= 0 && v <= 10,
  sundayMultiplier: (v: unknown) => typeof v === "number" && v >= 0 && v <= 10,
  weekdayMultiplier: (v: unknown) => typeof v === "number" && v >= 0 && v <= 10,
}

export async function PATCH(req: Request) {
  const { userId, orgId, orgRole } = await auth()
  if (!userId || !orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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
  const saturdayMultiplier = typeof b.saturdayMultiplier === "number" ? b.saturdayMultiplier : undefined
  const sundayMultiplier = typeof b.sundayMultiplier === "number" ? b.sundayMultiplier : undefined
  const weekdayMultiplier = typeof b.weekdayMultiplier === "number" ? b.weekdayMultiplier : undefined

  if (
    (saturdayMultiplier !== undefined && !overtimePolicySchema.saturdayMultiplier(saturdayMultiplier)) ||
    (sundayMultiplier !== undefined && !overtimePolicySchema.sundayMultiplier(sundayMultiplier)) ||
    (weekdayMultiplier !== undefined && !overtimePolicySchema.weekdayMultiplier(weekdayMultiplier))
  ) {
    return NextResponse.json(
      { error: "Multipliers must be numbers between 0 and 10" },
      { status: 400 }
    )
  }

  const current = await getOvertimePolicy(orgId)
  const updated: OvertimePolicy = {
    saturdayMultiplier: saturdayMultiplier ?? current.saturdayMultiplier,
    sundayMultiplier: sundayMultiplier ?? current.sundayMultiplier,
    weekdayMultiplier: weekdayMultiplier ?? current.weekdayMultiplier,
  }

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { settings: true },
  })

  const settings = (org?.settings as Record<string, unknown>) ?? {}
  const merged = { ...settings, overtimePolicy: updated }

  await prisma.organization.upsert({
    where: { id: orgId },
    create: { id: orgId, name: "Organization", settings: merged },
    update: { settings: merged },
  })

  await prisma.auditLog.create({
    data: {
      userId,
      action: "overtime_policy.updated",
      entityType: "organization",
      entityId: orgId,
      details: "Overtime policy updated",
      newValue: JSON.stringify(updated),
    },
  })

  return NextResponse.json(updated)
}
