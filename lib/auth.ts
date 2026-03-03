import { auth } from "@clerk/nextjs/server"

export type OrgRole = "admin" | "manager" | "worker"
export type ClerkOrgRole = "org:admin" | "org:manager" | "org:member" | string
export type AppCapability =
  | "users.read"
  | "users.write"
  | "users.offboard"
  | "assignments.read"
  | "assignments.write"
  | "compensation.read"
  | "compensation.write"
  | "approvals.review"
  | "audit.read"
  | "financials.read"

const capabilityMap: Record<"org:admin" | "org:manager" | "org:member", Set<AppCapability>> = {
  "org:admin": new Set<AppCapability>([
    "users.read",
    "users.write",
    "users.offboard",
    "assignments.read",
    "assignments.write",
    "compensation.read",
    "compensation.write",
    "approvals.review",
    "audit.read",
    "financials.read",
  ]),
  "org:manager": new Set<AppCapability>([
    "users.read",
    "users.write",
    "assignments.read",
    "assignments.write",
    "audit.read",
    "financials.read",
  ]),
  "org:member": new Set<AppCapability>([]),
}

export async function requireAuth() {
  const { userId } = await auth()
  if (!userId) return null
  return userId
}

export async function requireOrgRole(allowedRoles: OrgRole[]) {
  const { userId, orgRole } = await auth()
  if (!userId) return null
  const role = mapClerkRoleToAppRole(orgRole as string | undefined)
  if (!role || !allowedRoles.includes(role)) return null
  return { userId, orgRole: role as OrgRole }
}

/** Clerk org roles use org: prefix (e.g. org:admin, org:manager). Plan roles: admin, manager, worker. */
export function isAdminOrManager(orgRole: string | undefined) {
  return orgRole === "org:admin" || orgRole === "org:manager"
}

export function isAdmin(orgRole: string | undefined) {
  return orgRole === "org:admin"
}

export function mapClerkRoleToAppRole(orgRole: string | undefined): OrgRole | null {
  if (orgRole === "org:admin") return "admin"
  if (orgRole === "org:manager") return "manager"
  if (orgRole === "org:member") return "worker"
  return null
}

export function hasCapability(orgRole: ClerkOrgRole | undefined, capability: AppCapability): boolean {
  if (!orgRole) return false
  if (!(orgRole in capabilityMap)) return false
  return capabilityMap[orgRole as "org:admin" | "org:manager" | "org:member"].has(capability)
}

/** Returns auth context for admin/manager only. Returns null if unauthorized or not admin/manager. */
export async function requireAdminOrManager() {
  const { userId, orgId, orgRole } = await auth()
  if (!userId || !orgId) return null
  if (!isAdminOrManager(orgRole as string)) return null
  return { userId, orgId, orgRole: orgRole as string }
}

/** Returns auth context for a required capability. Returns null if unauthorized or lacks permission. */
export async function requireCapability(capability: AppCapability) {
  const { userId, orgId, orgRole } = await auth()
  if (!userId || !orgId || !orgRole) return null
  if (!hasCapability(orgRole, capability)) return null
  return { userId, orgId, orgRole }
}
