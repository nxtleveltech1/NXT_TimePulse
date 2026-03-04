import { clerkClient } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

/**
 * Guarantee a user row exists in the DB for the given Clerk userId + orgId.
 * If the webhook was missed or delayed, this lazily backfills the record.
 * Returns the user record (existing or newly created).
 */
export async function ensureUser(userId: string, orgId: string) {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  })
  if (existing) return existing

  let email: string | null = null
  let firstName: string | null = null
  let lastName: string | null = null
  let role = "worker"

  try {
    const clerk = await clerkClient()
    const clerkUser = await clerk.users.getUser(userId)
    email = clerkUser.emailAddresses?.[0]?.emailAddress ?? null
    firstName = clerkUser.firstName ?? null
    lastName = clerkUser.lastName ?? null

    const memberships = await clerk.organizations.getOrganizationMembershipList({
      organizationId: orgId,
    })
    const membership = memberships.data?.find(
      (m) => m.publicUserData?.userId === userId
    )
    if (membership?.role === "org:admin") role = "admin"
    else if (membership?.role === "org:manager") role = "manager"
  } catch {
    // Clerk lookup failed; create with minimal data
  }

  return prisma.user.upsert({
    where: { id: userId },
    create: {
      id: userId,
      email,
      orgId,
      role,
      firstName,
      lastName,
      status: "active",
      lastIdentitySyncAt: new Date(),
    },
    update: {},
  })
}
