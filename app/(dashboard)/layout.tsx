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
  Calendar,
  FileText,
  ScrollText,
  Shield,
  Wallet,
  CheckSquare,
  Settings,
} from "lucide-react"
// Auth layout must be force-dynamic — Clerk's auth() reads per-request headers
export const dynamic = "force-dynamic"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { ModeToggle } from "@/components/mode-toggle"
import { BrandLogo } from "@/components/brand-logo"
import { isAdminOrManager } from "@/lib/auth"
import { AppBreadcrumbs } from "@/components/breadcrumbs"
import { NavLink } from "@/components/nav-link"
import { NotificationBell } from "@/components/notification-bell"
import { PushRegistration } from "@/components/push-registration"

const mainNavItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/projects", label: "Projects", icon: FolderKanban },
  { href: "/dashboard/geozones", label: "Geozones", icon: MapPin },
  { href: "/dashboard/timesheets", label: "Timesheets", icon: Clock },
  { href: "/dashboard/leave", label: "Leave", icon: Calendar },
]

const adminNavItems = [
  { href: "/dashboard/users", label: "Users", icon: Users },
  { href: "/dashboard/resources", label: "Resources", icon: Wallet },
  { href: "/dashboard/approvals", label: "Approvals", icon: CheckSquare, adminOnly: true },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3 },
  { href: "/dashboard/financials", label: "Financials", icon: FileText },
  { href: "/dashboard/audit", label: "Audit", icon: ScrollText },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
]

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { orgRole } = await auth()
  const isAdmin = isAdminOrManager(orgRole as string)
  const isSuperAdmin = orgRole === "org:admin"

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel asChild>
              <Link href="/dashboard" className="flex items-center py-2">
                <BrandLogo height={32} />
              </Link>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {mainNavItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <NavLink href={item.href}>
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </NavLink>
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
                  {adminNavItems
                    .filter((item) => !item.adminOnly || isSuperAdmin)
                    .map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <NavLink href={item.href}>
                        <item.icon className="h-4 w-4" />
                        {item.label}
                      </NavLink>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>
      </Sidebar>
      <main className="flex-1 overflow-auto">
        <header className="sticky top-0 z-10 flex h-14 min-h-[44px] items-center justify-between border-b bg-background px-4 md:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <SidebarTrigger className="size-10 shrink-0 md:size-7" />
            <Link href="/dashboard" className="flex items-center shrink-0">
              <BrandLogo height={28} />
            </Link>
            {isAdmin && (
              <Badge variant="default" className="shrink-0 gap-1">
                <Shield className="h-3 w-3" />
                Admin
              </Badge>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <NotificationBell />
            <ModeToggle />
            <div className="flex min-h-[44px] min-w-[44px] items-center justify-center">
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        </header>
        <div className="p-4 md:p-6">
          <AppBreadcrumbs />
          {children}
        </div>
      </main>
      <PushRegistration />
    </div>
    </SidebarProvider>
  )
}
