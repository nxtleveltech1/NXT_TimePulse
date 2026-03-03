import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { hasCapability } from "@/lib/auth"
import { serializeForClient } from "@/lib/serialize"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, orgId, orgRole } = await auth()
  if (!userId || !orgId || !orgRole) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!hasCapability(orgRole, "users.read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const canReadComp = hasCapability(orgRole, "compensation.read")
  const { id } = await params

  const user = await prisma.user.findFirst({
    where: { id, orgId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      status: true,
      managerUserId: true,
      employmentType: true,
      offboardedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  })
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const [events, assignments, rates, pendingRequests] = await Promise.all([
    prisma.userLifecycleEvent.findMany({
      where: { orgId, userId: id },
      include: {
        actorUser: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.projectAssignment.findMany({
      where: { orgId, userId: id },
      include: {
        project: { select: { id: true, name: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        updatedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
    }),
    prisma.rateCard.findMany({
      where: { orgId, userId: id },
      include: {
        project: { select: { id: true, name: true } },
        requestedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        approvedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: [{ effectiveFrom: "desc" }, { createdAt: "desc" }],
    }),
    prisma.adminChangeRequest.findMany({
      where: {
        orgId,
        status: "pending",
        OR: [
          { targetId: id },
          { payload: { path: ["userId"], equals: id } },
          { payload: { path: ["data", "userId"], equals: id } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ])

  const safeRates = canReadComp
    ? rates
    : rates.map((r) => ({
        ...r,
        payRate: undefined,
        billRate: undefined,
      }))

  return NextResponse.json(
    serializeForClient({
      user,
      events,
      assignments,
      rates: safeRates,
      pendingRequests,
    })
  )
}
