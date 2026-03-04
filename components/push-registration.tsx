"use client"

import { useEffect } from "react"
import { usePushSubscription } from "@/hooks/use-push-subscription"

export function PushRegistration() {
  const { permission, isSubscribed, isLoading, subscribe } =
    usePushSubscription()

  useEffect(() => {
    if (isLoading || permission === "unsupported" || permission === "denied")
      return
    if (permission === "granted" && !isSubscribed) {
      subscribe()
    }
  }, [isLoading, permission, isSubscribed, subscribe])

  return null
}
