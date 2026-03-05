import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/forgot-password",
  "/reset-password",
  "/verify",
  "/sso-callback",
  "/api/webhooks(.*)",
  "/api/health",
  "/api/kiosk(.*)",
  "/api/cron(.*)",
  "/kiosk(.*)",
  "/request-access",
])

const isDashboardRoute = createRouteMatcher(["/dashboard(.*)"])

const isAdminRoute = createRouteMatcher([
  "/dashboard/users",
  "/dashboard/users/(.*)",
  "/dashboard/reports",
  "/dashboard/reports/(.*)",
  "/dashboard/financials",
  "/dashboard/financials/(.*)",
  "/dashboard/resources",
  "/dashboard/resources/(.*)",
  "/dashboard/approvals",
  "/dashboard/approvals/(.*)",
  "/dashboard/audit",
  "/dashboard/audit/(.*)",
  "/dashboard/settings",
  "/dashboard/settings/(.*)",
])

const isSuperAdminRoute = createRouteMatcher([
  "/dashboard/approvals",
  "/dashboard/approvals/(.*)",
  "/api/admin/change-requests",
  "/api/admin/change-requests/(.*)",
])

function isAdminOrManager(orgRole: string | undefined) {
  return orgRole === "org:admin" || orgRole === "org:manager"
}

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return

  const path = req.nextUrl.pathname
  const isApiRoute = path.startsWith("/api/")
  const isWebhookRoute = path.startsWith("/api/webhooks")
  const isProtected = isDashboardRoute(req) || (isApiRoute && !isWebhookRoute)

  if (isProtected) {
    await auth.protect()
    const { orgId, orgRole } = await auth()

    // Single org: NXT TIME PULSE — users must be invited
    if (isDashboardRoute(req) && !orgId) {
      return Response.redirect(new URL("/request-access", req.url))
    }

    // Admin routes require org:admin or org:manager
    if (isAdminRoute(req) && !isAdminOrManager(orgRole as string)) {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }
    if (isSuperAdminRoute(req) && orgRole !== "org:admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }
  }
})

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
}
