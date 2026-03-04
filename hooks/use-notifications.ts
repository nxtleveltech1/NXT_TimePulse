"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useCallback } from "react"

export interface DBNotification {
  id: string
  userId: string
  orgId: string
  type: string
  title: string
  description: string | null
  level: string
  href: string | null
  read: boolean
  dismissed: boolean
  resolvedAt: string | null
  createdAt: string
}

interface NotificationsResponse {
  notifications: DBNotification[]
  unreadCount: number
  nextCursor: string | null
}

const QUERY_KEY = ["notifications"] as const

async function fetchNotifications(): Promise<NotificationsResponse> {
  const res = await fetch("/api/notifications?limit=50")
  if (!res.ok) throw new Error(`Failed to fetch notifications: ${res.status}`)
  return res.json()
}

async function patchNotifications(
  body: Record<string, unknown>
): Promise<void> {
  const res = await fetch("/api/notifications", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Failed to update notifications: ${res.status}`)
}

export function useNotifications() {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchNotifications,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  })

  const mutation = useMutation({
    mutationFn: patchNotifications,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })

  const markRead = useCallback(
    (id: string) => {
      queryClient.setQueryData<NotificationsResponse>(QUERY_KEY, (old) => {
        if (!old) return old
        const target = old.notifications.find((n) => n.id === id && !n.read)
        return {
          ...old,
          notifications: old.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
          unreadCount: target
            ? Math.max(0, old.unreadCount - 1)
            : old.unreadCount,
        }
      })
      mutation.mutate({ ids: [id], read: true })
    },
    [mutation, queryClient]
  )

  const markAllRead = useCallback(() => {
    queryClient.setQueryData<NotificationsResponse>(QUERY_KEY, (old) => {
      if (!old) return old
      return {
        ...old,
        notifications: old.notifications.map((n) => ({ ...n, read: true })),
        unreadCount: 0,
      }
    })
    mutation.mutate({ markAllRead: true })
  }, [mutation, queryClient])

  const dismiss = useCallback(
    (id: string) => {
      queryClient.setQueryData<NotificationsResponse>(QUERY_KEY, (old) => {
        if (!old) return old
        const target = old.notifications.find((n) => n.id === id)
        return {
          ...old,
          notifications: old.notifications.filter((n) => n.id !== id),
          unreadCount:
            target && !target.read
              ? Math.max(0, old.unreadCount - 1)
              : old.unreadCount,
        }
      })
      mutation.mutate({ ids: [id], dismissed: true })
    },
    [mutation, queryClient]
  )

  const clearAll = useCallback(() => {
    const ids = data?.notifications.map((n) => n.id) ?? []
    if (ids.length === 0) return
    queryClient.setQueryData<NotificationsResponse>(QUERY_KEY, () => ({
      notifications: [],
      unreadCount: 0,
      nextCursor: null,
    }))
    mutation.mutate({ ids, dismissed: true })
  }, [data, mutation, queryClient])

  return {
    notifications: data?.notifications ?? [],
    unreadCount: data?.unreadCount ?? 0,
    isLoading,
    markRead,
    markAllRead,
    dismiss,
    clearAll,
  }
}
