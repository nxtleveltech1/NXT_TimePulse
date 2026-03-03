"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { SidebarMenuButton } from "@/components/ui/sidebar"
import type { LucideIcon } from "lucide-react"

interface NavLinkProps {
  href: string
  label: string
  icon: LucideIcon
}

export function NavLink({ href, label, icon: Icon }: NavLinkProps) {
  const pathname = usePathname()
  const isActive =
    href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname === href || pathname.startsWith(`${href}/`)

  return (
    <SidebarMenuButton asChild isActive={isActive}>
      <Link href={href}>
        <Icon className="h-4 w-4" />
        {label}
      </Link>
    </SidebarMenuButton>
  )
}
