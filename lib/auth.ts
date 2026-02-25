import { auth } from "@clerk/nextjs/server"

export type OrgRole = "admin" | "manager" | "worker"

export async function requireAuth() {
  const { userId } = await auth()
  if (!userId) return null
  return userId
}

export async function requireOrgRole(allowedRoles: OrgRole[]) {
  const { userId, orgRole } = await auth()
  if (!userId) return null
  const role = orgRole as OrgRole | undefined
  if (!role || !allowedRoles.includes(role)) return null
  return { userId, orgRole: role }
}

/** Clerk org roles use org: prefix (e.g. org:admin, org:manager). Plan roles: admin, manager, worker. */
export function isAdminOrManager(orgRole: string | undefined) {
  return orgRole === "org:admin" || orgRole === "org:manager"
}

/** Returns auth context for admin/manager only. Returns null if unauthorized or not admin/manager. */
export async function requireAdminOrManager() {
  const { userId, orgId, orgRole } = await auth()
  if (!userId || !orgId) return null
  if (!isAdminOrManager(orgRole as string)) return null
  return { userId, orgId, orgRole: orgRole as string }
}
