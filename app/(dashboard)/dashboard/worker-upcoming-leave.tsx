import Link from "next/link"
import { format, parseISO, differenceInCalendarDays } from "date-fns"
import { Calendar, ArrowRight, PlusCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

type LeaveRequest = {
  id: string
  startDate: string
  endDate: string
  type: string
  status: string
  reason: string | null
}

interface WorkerUpcomingLeaveProps {
  leaves: LeaveRequest[]
}

const statusConfig: Record<string, { label: string; className: string }> = {
  approved: { label: "Approved", className: "bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400" },
  pending: { label: "Pending", className: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400" },
  rejected: { label: "Rejected", className: "bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400" },
}

const leaveTypeLabel: Record<string, string> = {
  annual: "Annual Leave",
  sick: "Sick Leave",
  unpaid: "Unpaid Leave",
  compassionate: "Compassionate Leave",
  study: "Study Leave",
  other: "Other",
}

export function WorkerUpcomingLeave({ leaves }: WorkerUpcomingLeaveProps) {
  return (
    <Card>
      <CardHeader className="p-4 pb-2 md:p-6 md:pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4" />
              Leave
            </CardTitle>
            <CardDescription>
              {leaves.length === 0 ? "No upcoming or pending leave" : `${leaves.length} request${leaves.length !== 1 ? "s" : ""}`}
            </CardDescription>
          </div>
          <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
            <Link href="/dashboard/leave">
              {leaves.length === 0 ? (
                <>
                  <PlusCircle className="h-3.5 w-3.5" />
                  Request
                </>
              ) : (
                <>
                  View all
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {leaves.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground md:px-6">
            No upcoming leave requests.{" "}
            <Link href="/dashboard/leave" className="text-primary underline-offset-4 hover:underline">
              Request leave
            </Link>
          </div>
        ) : (
          <ul className="divide-y">
            {leaves.map((leave) => {
              const start = parseISO(leave.startDate)
              const end = parseISO(leave.endDate)
              const days = differenceInCalendarDays(end, start) + 1
              const status = statusConfig[leave.status] ?? { label: leave.status, className: "" }
              return (
                <li key={leave.id} className="flex items-center justify-between gap-3 px-4 py-3 md:px-6">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{leaveTypeLabel[leave.type] ?? leave.type}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(start, "MMM d")}
                      {days > 1 ? ` – ${format(end, "MMM d")}` : ""}
                      {" · "}
                      {days} day{days !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <Badge variant="outline" className={`shrink-0 text-xs font-medium ${status.className}`}>
                    {status.label}
                  </Badge>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
