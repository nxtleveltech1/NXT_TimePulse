"use client"

import Link from "next/link"
import { useState } from "react"
import { Plus, LayoutGrid, Calendar, Clock } from "lucide-react"
import { motion } from "motion/react"
import { ManualEntryDialog } from "@/components/time-capture/manual-entry-dialog"

type Allocation = {
  id: string
  projectId: string
  project: { id: string; name: string }
}

interface WorkerQuickActionsProps {
  allocations: Allocation[]
}

const actions = [
  {
    id: "add-entry",
    label: "Add Entry",
    icon: Plus,
    colorClasses:
      "border-primary/20 bg-primary/10 text-primary hover:bg-primary/20 hover:border-primary/40",
    iconBg: "bg-primary/15",
  },
  {
    id: "weekly-view",
    label: "Weekly View",
    icon: LayoutGrid,
    href: "/dashboard/timesheets/weekly",
    colorClasses:
      "border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 hover:border-blue-500/40",
    iconBg: "bg-blue-500/15",
  },
  {
    id: "request-leave",
    label: "Request Leave",
    icon: Calendar,
    href: "/dashboard/leave",
    colorClasses:
      "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 hover:border-amber-500/40",
    iconBg: "bg-amber-500/15",
  },
  {
    id: "my-timesheets",
    label: "My Timesheets",
    icon: Clock,
    href: "/dashboard/timesheets",
    colorClasses:
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/40",
    iconBg: "bg-emerald-500/15",
  },
]

export function WorkerQuickActions({ allocations }: WorkerQuickActionsProps) {
  const [entryOpen, setEntryOpen] = useState(false)

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {actions.map((action, i) => {
          const Icon = action.icon
          const inner = (
            <div className="flex flex-col items-center gap-2">
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${action.iconBg}`}>
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-sm font-semibold leading-tight text-center">{action.label}</span>
            </div>
          )

          return (
            <motion.div
              key={action.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.05, ease: "easeOut" }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              {action.href ? (
                <Link
                  href={action.href}
                  className={`flex w-full flex-col items-center justify-center rounded-xl border min-h-[84px] py-4 px-3 transition-all duration-200 ${action.colorClasses}`}
                >
                  {inner}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => setEntryOpen(true)}
                  className={`flex w-full flex-col items-center justify-center rounded-xl border min-h-[84px] py-4 px-3 transition-all duration-200 ${action.colorClasses}`}
                >
                  {inner}
                </button>
              )}
            </motion.div>
          )
        })}
      </div>

      <ManualEntryDialog
        allocations={allocations}
        open={entryOpen}
        onOpenChange={setEntryOpen}
      />
    </>
  )
}
