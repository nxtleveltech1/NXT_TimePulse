"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Fragment } from "react"

const ROUTE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  worker: "Worker",
  projects: "Projects",
  geozones: "Geozones",
  timesheets: "Timesheets",
  leave: "Leave",
  users: "Users",
  resources: "Resources",
  approvals: "Approvals",
  reports: "Reports",
  financials: "Financials",
  audit: "Audit",
  new: "New",
  edit: "Edit",
}

function getLabel(segment: string, index: number, segments: string[]): string {
  if (ROUTE_LABELS[segment]) return ROUTE_LABELS[segment]
  // Detect UUID/CUID — show "Details" or context from parent segment
  if (/^[a-z0-9_]{20,}$/i.test(segment)) {
    const parent = segments[index - 1]
    if (parent === "projects") return "Project"
    if (parent === "geozones") return "Geozone"
    if (parent === "users") return "User"
    if (parent === "resources") return "User"
    return "Details"
  }
  return segment.charAt(0).toUpperCase() + segment.slice(1)
}

export function AppBreadcrumbs() {
  const pathname = usePathname()
  const segments = pathname.split("/").filter(Boolean)

  if (segments.length <= 1) return null

  const crumbs = segments.map((segment, index) => {
    const href = "/" + segments.slice(0, index + 1).join("/")
    const label = getLabel(segment, index, segments)
    const isLast = index === segments.length - 1
    return { href, label, isLast }
  })

  // Don't show breadcrumb if only "dashboard" root
  if (crumbs.length === 1 && crumbs[0].label === "Dashboard") return null

  return (
    <Breadcrumb className="mb-4 md:mb-6">
      <BreadcrumbList>
        {crumbs.map((crumb, i) => (
          <Fragment key={crumb.href}>
            {i > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem>
              {crumb.isLast ? (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={crumb.href}>{crumb.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
