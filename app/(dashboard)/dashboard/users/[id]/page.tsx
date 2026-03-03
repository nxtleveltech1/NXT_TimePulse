import Link from "next/link"
import { notFound } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { hasCapability } from "@/lib/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { decimalToNumber } from "@/lib/serialize"
import { UserRateCard } from "./user-rate-card"

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { orgId, orgRole } = await auth()
  if (!orgId || !orgRole || !hasCapability(orgRole, "users.read")) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">User Details</h1>
        <p className="text-muted-foreground">Access restricted.</p>
      </div>
    )
  }
  const canReadComp = hasCapability(orgRole, "compensation.read")

  const user = await prisma.user.findFirst({
    where: { id, orgId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      status: true,
      employmentType: true,
      offboardedAt: true,
      baseRate: true,
      currency: true,
      createdAt: true,
      updatedAt: true,
    },
  })
  if (!user) notFound()

  const [assignments, events, pendingRequests, allocations] = await Promise.all([
    prisma.projectAssignment.findMany({
      where: { orgId, userId: id },
      include: {
        project: { select: { id: true, name: true } },
      },
      orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
      take: 100,
    }),
    prisma.userLifecycleEvent.findMany({
      where: { orgId, userId: id },
      include: {
        actorUser: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
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
      take: 50,
    }),
    canReadComp
      ? prisma.projectAllocation.findMany({
          where: { userId: id },
          include: { project: { select: { id: true, name: true } } },
          orderBy: { startDate: "desc" },
        })
      : Promise.resolve([]),
  ])

  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || user.id

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/users">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">{displayName}</h1>
          <p className="text-muted-foreground">Profile, rates, assignments, and lifecycle timeline</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Current access and lifecycle state</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            <p><span className="font-medium">Email:</span> {user.email ?? "—"}</p>
            <p><span className="font-medium">Role:</span> <Badge variant="secondary">{user.role}</Badge></p>
            <p><span className="font-medium">Status:</span> <Badge>{user.status}</Badge></p>
            <p><span className="font-medium">Employment:</span> {user.employmentType}</p>
            <p><span className="font-medium">Created:</span> {user.createdAt.toISOString().slice(0, 10)}</p>
          </CardContent>
        </Card>

        {canReadComp && (
          <UserRateCard
            userId={id}
            initialBaseRate={decimalToNumber(user.baseRate)}
            initialCurrency={user.currency}
          />
        )}
      </div>

      {canReadComp && allocations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Project Bill Rates</CardTitle>
            <CardDescription>
              Per-project billing overrides — if blank, the base rate above is used
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y text-sm">
              {allocations.map((a) => {
                const br = a.billRate != null ? decimalToNumber(a.billRate) : null
                return (
                  <div key={a.id} className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-medium">{a.project.name}</p>
                      <p className="text-xs text-muted-foreground">{a.roleOnProject}</p>
                    </div>
                    <div className="text-right">
                      {br != null && br > 0 ? (
                        <p className="font-medium tabular-nums">
                          {user.currency.trim()} {br.toFixed(2)}<span className="text-muted-foreground font-normal">/hr</span>
                        </p>
                      ) : (
                        <p className="text-muted-foreground text-xs">Uses base rate</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {pendingRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Change Requests</CardTitle>
            <CardDescription>{pendingRequests.length} pending request(s)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {pendingRequests.map((r) => (
              <div key={r.id} className="rounded border p-2">
                <p className="font-medium">{r.changeType}</p>
                <p className="text-muted-foreground">{r.targetType} · {r.createdAt.toISOString().slice(0, 10)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Assignments</CardTitle>
          <CardDescription>{assignments.length} assignment record(s)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {assignments.length === 0 && <p className="text-muted-foreground">No assignments found.</p>}
          {assignments.map((a) => (
            <div key={a.id} className="rounded border p-2">
              <p className="font-medium">{a.project.name}</p>
              <p className="text-muted-foreground">
                {a.roleOnProject} · {a.status} · {a.startDate.toISOString().slice(0, 10)} to {a.endDate ? a.endDate.toISOString().slice(0, 10) : "open"}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lifecycle Timeline</CardTitle>
          <CardDescription>{events.length} event(s)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {events.length === 0 && <p className="text-muted-foreground">No lifecycle events found.</p>}
          {events.map((e) => (
            <div key={e.id} className="rounded border p-2">
              <p className="font-medium">{e.eventType}</p>
              <p className="text-muted-foreground">
                {e.createdAt.toISOString().slice(0, 19).replace("T", " ")} by {[e.actorUser.firstName, e.actorUser.lastName].filter(Boolean).join(" ") || e.actorUser.email || e.actorUser.id}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
