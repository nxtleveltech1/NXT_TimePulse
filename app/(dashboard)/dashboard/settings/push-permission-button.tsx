"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BellRing, BellOff, Check } from "lucide-react"
import { usePushSubscription } from "@/hooks/use-push-subscription"

export function PushPermissionButton() {
  const { permission, isSubscribed, isLoading, subscribe, unsubscribe } =
    usePushSubscription()

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground">
        Checking push notification status...
      </p>
    )
  }

  if (permission === "unsupported") {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <BellOff className="h-4 w-4" />
        Push notifications are not supported in this browser.
      </div>
    )
  }

  if (permission === "denied") {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive">
        <BellOff className="h-4 w-4" />
        Push notifications are blocked. Enable them in your browser settings.
      </div>
    )
  }

  if (isSubscribed) {
    return (
      <div className="flex items-center gap-3">
        <Badge
          variant="secondary"
          className="gap-1.5 text-green-600 dark:text-green-400"
        >
          <Check className="h-3 w-3" />
          Push enabled
        </Badge>
        <Button variant="ghost" size="sm" onClick={unsubscribe}>
          Disable
        </Button>
      </div>
    )
  }

  return (
    <Button variant="outline" size="sm" className="gap-2" onClick={subscribe}>
      <BellRing className="h-4 w-4" />
      Enable push notifications
    </Button>
  )
}
