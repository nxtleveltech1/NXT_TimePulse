"use client"

import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { useNotificationStore } from "@/lib/stores/notification-store"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"

const levelStyles: Record<string, string> = {
  info: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  success: "bg-green-500/10 text-green-600 dark:text-green-400",
  warning: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  error: "bg-destructive/10 text-destructive",
}

export function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead, remove } = useNotificationStore()

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-auto p-0 text-xs text-muted-foreground" onClick={markAllRead}>
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Bell className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No notifications</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    "group relative flex gap-3 px-4 py-3 transition-colors hover:bg-muted/50",
                    !n.read && "bg-primary/5"
                  )}
                  onClick={() => markRead(n.id)}
                >
                  <div className={cn("mt-0.5 h-2 w-2 shrink-0 rounded-full", levelStyles[n.level] ?? levelStyles.info)} />
                  <div className="min-w-0 flex-1">
                    {n.href ? (
                      <Link href={n.href} className="block">
                        <p className={cn("text-sm font-medium", !n.read && "text-foreground")}>
                          {n.title}
                        </p>
                      </Link>
                    ) : (
                      <p className={cn("text-sm font-medium", !n.read && "text-foreground")}>
                        {n.title}
                      </p>
                    )}
                    {n.description && (
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{n.description}</p>
                    )}
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {formatDistanceToNow(n.createdAt, { addSuffix: true })}
                    </p>
                  </div>
                  {!n.read && (
                    <Badge variant="secondary" className="h-4 shrink-0 self-start text-[10px]">
                      New
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={(e) => { e.stopPropagation(); remove(n.id) }}
                    aria-label="Dismiss"
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        {notifications.length > 0 && (
          <div className="border-t px-4 py-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground"
              onClick={() => useNotificationStore.getState().clear()}
            >
              Clear all
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
