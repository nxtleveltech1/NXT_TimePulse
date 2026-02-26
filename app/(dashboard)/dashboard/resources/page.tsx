import { auth } from "@clerk/nextjs/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ResourcesContent } from "./resources-content"
import { isAdminOrManager } from "@/lib/auth"

export default async function ResourcesPage() {
  const { orgRole } = await auth()
  if (!isAdminOrManager(orgRole as string)) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Resources</h1>
        <p className="text-muted-foreground">Access restricted to admins and managers.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold">Resources</h1>
          <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            Admin
          </span>
        </div>
        <p className="text-muted-foreground">
          User rates, overtime policy, and project allocations
        </p>
      </div>

      <Tabs defaultValue="overtime" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overtime">Overtime policy</TabsTrigger>
          <TabsTrigger value="allocations">Allocations overview</TabsTrigger>
        </TabsList>
        <TabsContent value="overtime" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Overtime multipliers</CardTitle>
              <CardDescription>
                Configure day-of-week multipliers for labour cost calculations. Saturday and Sunday default to 1.5x and 2x.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResourcesContent />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="allocations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All allocations</CardTitle>
              <CardDescription>
                Manage user rates per project. Use &quot;Manage rates&quot; on the Users page or the Team section on each project.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Go to <a href="/dashboard/users" className="underline">Users</a> and click &quot;Manage rates&quot; for a user, or open a <a href="/dashboard/projects" className="underline">Project</a> to manage its team allocations.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
