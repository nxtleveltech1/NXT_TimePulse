import { create } from "zustand"

export type NotificationLevel = "info" | "success" | "warning" | "error"

export interface Notification {
  id: string
  title: string
  description?: string
  level: NotificationLevel
  createdAt: Date
  read: boolean
  href?: string
}

interface NotificationState {
  notifications: Notification[]
  unreadCount: number
  add: (notification: Omit<Notification, "id" | "createdAt" | "read">) => void
  markRead: (id: string) => void
  markAllRead: () => void
  remove: (id: string) => void
  clear: () => void
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,

  add: (notification) => {
    const entry: Notification = {
      ...notification,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      read: false,
    }
    set((s) => ({
      notifications: [entry, ...s.notifications].slice(0, 50),
      unreadCount: s.unreadCount + 1,
    }))
  },

  markRead: (id) => {
    set((s) => ({
      notifications: s.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
      unreadCount: Math.max(0, s.unreadCount - (s.notifications.find((n) => n.id === id && !n.read) ? 1 : 0)),
    }))
  },

  markAllRead: () => {
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }))
  },

  remove: (id) => {
    const wasUnread = get().notifications.find((n) => n.id === id && !n.read)
    set((s) => ({
      notifications: s.notifications.filter((n) => n.id !== id),
      unreadCount: wasUnread ? Math.max(0, s.unreadCount - 1) : s.unreadCount,
    }))
  },

  clear: () => set({ notifications: [], unreadCount: 0 }),
}))
