export const dynamic = "force-dynamic"

import { auth } from "@clerk/nextjs/server"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function HomePage() {
  const { userId } = await auth()

  if (userId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
        <h1 className="text-2xl font-semibold">NXT TIME PULSE</h1>
        <p className="text-muted-foreground text-center">
          Geo-tracked workforce timesheet management
        </p>
        <Button asChild>
          <Link href="/dashboard">Go to Dashboard</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-2xl font-semibold">NXT TIME PULSE</h1>
      <p className="text-muted-foreground max-w-md text-center">
        Workforce timesheet and resource management with automatic geofence
        clock-in/out. Sign in to get started.
      </p>
      <div className="flex gap-4">
        <Button asChild>
          <Link href="/sign-in">Sign In</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/sign-up">Sign Up</Link>
        </Button>
      </div>
    </div>
  )
}
