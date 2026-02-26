"use client"

import { motion } from "motion/react"
import { FolderKanban, MapPin, Clock, Users, FileText, BarChart3, ScrollText } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "folder-kanban": FolderKanban,
  "map-pin": MapPin,
  clock: Clock,
  users: Users,
  "file-text": FileText,
  "bar-chart-3": BarChart3,
  "scroll-text": ScrollText,
}

type Stat = {
  label: string
  value: number | string
  icon: string
  href: string
}

export function DashboardCards({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, i) => {
        const Icon = ICONS[stat.icon] ?? FileText
        return (
          <motion.div
            key={stat.href}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Link href={stat.href}>
              <Card className="min-h-[44px] transition-colors hover:bg-muted/50">
                <CardHeader className="flex flex-row items-center justify-between p-4 pb-2 md:p-6">
                  <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="p-4 pt-0 md:p-6">
                  <div className="text-2xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        )
      })}
    </div>
  )
}
