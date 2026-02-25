import { auth } from "@clerk/nextjs/server"
import { UserButton } from "@clerk/nextjs"
import Link from "next/link"
import {
  LayoutDashboard,
  FolderKanban,
  MapPin,
  Clock,
  Users,
  BarChart3,
  Briefcase,
  Calendar,
  FileText,
  ScrollText,
  Shield,
} from "lucide-react"
export const dynamic = "force-dynamic"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { isAdminOrManager } from "@/lib/auth"

const mainNavItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/worker", label: "Worker", icon: Briefcase },
  { href: "/dashboard/projects", label: "Projects", icon: FolderKanban },
  { href: "/dashboard/geozones", label: "Geozones", icon: MapPin },
  { href: "/dashboard/timesheets", label: "Timesheets", icon: Clock },
  { href: "/dashboard/leave", label: "Leave", icon: Calendar },
]

const adminNavItems = [
  { href: "/dashboard/users", label: "Users", icon: Users },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3 },
  { href: "/dashboard/financials", label: "Financials", icon: FileText },
  { href: "/dashboard/audit", label: "Audit", icon: ScrollText },
]

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { orgRole } = await auth()
  const isAdmin = isAdminOrManager(orgRole as string)

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>NXT TIME PULSE</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {mainNavItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild>
                      <Link href={item.href}>
                        <item.icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          {isAdmin && (
            <SidebarGroup>
              <SidebarGroupLabel className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Admin
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {adminNavItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild>
                        <Link href={item.href}>
                          <item.icon className="h-4 w-4" />
                          {item.label}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>
      </Sidebar>
      <main className="flex-1 overflow-auto">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background px-6">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-lg">NXT TIME PULSE</span>
            {isAdmin && (
              <Badge variant="default" className="gap-1">
                <Shield className="h-3 w-3" />
                Admin
              </Badge>
            )}
          </div>
          <UserButton afterSignOutUrl="/" />
        </header>
        <div className="p-6">{children}</div>
      </main>
    </div>
    </SidebarProvider>
  )
}
