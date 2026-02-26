import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"
import { UserRatesContent } from "./user-rates-content"
import { isAdminOrManager } from "@/lib/auth"

export default async function UserRatesPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { orgId, orgRole } = await auth()
  if (!isAdminOrManager(orgRole as string)) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Manage rates</h1>
        <p className="text-muted-foreground">Access restricted to admins and managers.</p>
      </div>
    )
  }

  const org = orgId ?? "org_default"
  const user = await prisma.user.findFirst({
    where: { id, orgId: org },
    select: { id: true, firstName: true, lastName: true, email: true },
  })
  if (!user) notFound()

  const [allocations, projects, users] = await Promise.all([
    prisma.projectAllocation.findMany({
      where: { userId: id, project: { orgId: org } },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: { startDate: "desc" },
    }),
    prisma.project.findMany({
      where: { orgId: org },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { orgId: org },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" },
    }),
  ])

  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || user.id

  const serializedAllocations = allocations.map((a) => ({
    ...a,
    hourlyRate: Number(a.hourlyRate),
    startDate: a.startDate.toISOString().slice(0, 10),
    endDate: a.endDate ? a.endDate.toISOString().slice(0, 10) : null,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/users">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Manage rates — {displayName}</h1>
          <p className="text-muted-foreground">
            Project allocations and hourly rates for this user
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Allocations</CardTitle>
            <CardDescription>
              {allocations.length} project(s) — Edit rate, role, or remove
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <UserRatesContent
            allocations={serializedAllocations}
            projects={projects}
            users={users}
            userId={id}
          />
        </CardContent>
      </Card>
    </div>
  )
}
