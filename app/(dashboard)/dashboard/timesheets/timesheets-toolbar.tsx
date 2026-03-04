"use client"

import { useCallback, useTransition } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { format } from "date-fns"
import { CalendarIcon, X, ListFilter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { BulkApproveWeekDialog } from "./bulk-approve-week-dialog"
import { BulkRejectDayDialog } from "./bulk-reject-day-dialog"

const STATUS_OPTIONS = ["pending", "approved", "rejected"] as const
const SOURCE_OPTIONS = ["manual", "timer", "geofence", "kiosk"] as const
const BILLABLE_OPTIONS = ["all", "yes", "no"] as const

type FilterProject = { id: string; name: string }
type FilterWorker = { id: string; name: string }

interface TimesheetsToolbarProps {
  projects: FilterProject[]
  workers: FilterWorker[]
  isAdmin: boolean
}

export function TimesheetsToolbar({
  projects,
  workers,
  isAdmin,
}: TimesheetsToolbarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const activeStatus = searchParams.get("status") ?? ""
  const activeProject = searchParams.get("project") ?? ""
  const activeWorker = searchParams.get("worker") ?? ""
  const activeSource = searchParams.get("source") ?? ""
  const activeBillable = searchParams.get("billable") ?? ""
  const activeFrom = searchParams.get("from") ?? ""
  const activeTo = searchParams.get("to") ?? ""

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") {
          params.delete(key)
        } else {
          params.set(key, value)
        }
      }
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false })
      })
    },
    [searchParams, pathname, router]
  )

  const clearAll = useCallback(() => {
    startTransition(() => {
      router.replace(pathname, { scroll: false })
    })
  }, [pathname, router])

  const activeFilterCount = [
    activeStatus,
    activeProject,
    activeWorker,
    activeSource,
    activeBillable,
    activeFrom,
    activeTo,
  ].filter(Boolean).length

  const fromDate = activeFrom ? new Date(`${activeFrom}T00:00:00`) : undefined
  const toDate = activeTo ? new Date(`${activeTo}T00:00:00`) : undefined

  return (
    <div
      className={cn(
        "flex flex-col gap-3 pb-4 transition-opacity",
        isPending && "opacity-60 pointer-events-none"
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
          <ListFilter className="h-4 w-4" />
          Filters
        </div>

        {/* Date range */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-8 gap-1.5 text-xs font-normal",
                (activeFrom || activeTo) && "border-primary/50 bg-primary/5 text-primary"
              )}
            >
              <CalendarIcon className="h-3.5 w-3.5" />
              {activeFrom && activeTo
                ? `${format(new Date(`${activeFrom}T00:00:00`), "MMM d")} – ${format(new Date(`${activeTo}T00:00:00`), "MMM d")}`
                : activeFrom
                  ? `From ${format(new Date(`${activeFrom}T00:00:00`), "MMM d")}`
                  : activeTo
                    ? `Until ${format(new Date(`${activeTo}T00:00:00`), "MMM d")}`
                    : "Date range"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={
                fromDate || toDate
                  ? { from: fromDate, to: toDate }
                  : undefined
              }
              onSelect={(range) => {
                updateParams({
                  from: range?.from ? format(range.from, "yyyy-MM-dd") : null,
                  to: range?.to ? format(range.to, "yyyy-MM-dd") : null,
                })
              }}
              numberOfMonths={2}
            />
            {(activeFrom || activeTo) && (
              <div className="border-t px-3 py-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-full text-xs"
                  onClick={() => updateParams({ from: null, to: null })}
                >
                  Clear dates
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        {/* Status */}
        <div className="flex items-center gap-1">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() =>
                updateParams({ status: activeStatus === s ? null : s })
              }
              className="outline-none"
            >
              <Badge
                variant={activeStatus === s ? "default" : "outline"}
                className={cn(
                  "cursor-pointer capitalize transition-colors",
                  activeStatus === s && s === "approved" && "bg-primary",
                  activeStatus === s && s === "rejected" && "bg-destructive",
                  activeStatus === s && s === "pending" && "bg-secondary text-secondary-foreground",
                  activeStatus !== s && "hover:bg-accent"
                )}
              >
                {s}
              </Badge>
            </button>
          ))}
        </div>

        {/* Project */}
        <Select
          value={activeProject || "all"}
          onValueChange={(v) =>
            updateParams({ project: v === "all" ? null : v })
          }
        >
          <SelectTrigger
            size="sm"
            className={cn(
              "h-8 text-xs",
              activeProject && "border-primary/50 bg-primary/5 text-primary"
            )}
          >
            <SelectValue placeholder="Project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All projects</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Worker (admin only) */}
        {isAdmin && workers.length > 0 && (
          <Select
            value={activeWorker || "all"}
            onValueChange={(v) =>
              updateParams({ worker: v === "all" ? null : v })
            }
          >
            <SelectTrigger
              size="sm"
              className={cn(
                "h-8 text-xs",
                activeWorker && "border-primary/50 bg-primary/5 text-primary"
              )}
            >
              <SelectValue placeholder="Worker" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All workers</SelectItem>
              {workers.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Source */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-8 text-xs font-normal",
                activeSource && "border-primary/50 bg-primary/5 text-primary"
              )}
            >
              {activeSource
                ? SOURCE_OPTIONS.find((s) => s === activeSource) ?? "Source"
                : "Source"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-40 p-2" align="start">
            <div className="flex flex-col gap-1">
              {SOURCE_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() =>
                    updateParams({ source: activeSource === s ? null : s })
                  }
                  className={cn(
                    "flex items-center rounded-md px-2 py-1.5 text-sm capitalize transition-colors",
                    activeSource === s
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Billable */}
        <div className="flex items-center rounded-md border">
          {BILLABLE_OPTIONS.map((b) => (
            <button
              key={b}
              onClick={() =>
                updateParams({ billable: b === "all" ? null : activeBillable === b ? null : b })
              }
              className={cn(
                "px-2.5 py-1 text-xs capitalize transition-colors first:rounded-l-md last:rounded-r-md",
                (activeBillable === b || (b === "all" && !activeBillable))
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent"
              )}
            >
              {b === "all" ? "All" : b === "yes" ? "Billable" : "Non-billable"}
            </button>
          ))}
        </div>

        {/* Clear all */}
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground"
            onClick={clearAll}
          >
            <X className="h-3.5 w-3.5" />
            Clear ({activeFilterCount})
          </Button>
        )}

        {/* Bulk admin actions */}
        {isAdmin && workers.length > 0 && (
          <>
            <div className="mx-1 h-5 w-px bg-border" />
            <BulkApproveWeekDialog workers={workers} />
            <BulkRejectDayDialog workers={workers} />
          </>
        )}
      </div>
    </div>
  )
}
