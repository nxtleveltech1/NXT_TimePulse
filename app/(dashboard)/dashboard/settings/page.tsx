import { auth } from "@clerk/nextjs/server"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { isAdminOrManager } from "@/lib/auth"
import { NotificationSettingsForm } from "./notification-settings"

export default async function SettingsPage() {
  const { orgRole } = await auth()
  if (!isAdminOrManager(orgRole as string)) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground">
          Access restricted to admins and managers.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold">Settings</h1>
          <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            Admin
          </span>
        </div>
        <p className="text-muted-foreground">
          Notification schedules and push notification configuration
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Notification schedule</CardTitle>
          <CardDescription>
            Configure when automatic clock-in, clock-out, and timesheet
            submission reminders are sent to workers. Reminders repeat until the
            action is completed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NotificationSettingsForm />
        </CardContent>
      </Card>
    </div>
  )
}
