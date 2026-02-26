/**
 * Remove test users with @nxttimepulse.test emails.
 * Run: bun scripts/remove-test-users.ts
 * Ensure .env has DATABASE_URL and CLERK_SECRET_KEY.
 */
import { createClerkClient } from "@clerk/backend"
import { PrismaClient } from "../generated/prisma"

const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany({
    where: { email: { endsWith: "@nxttimepulse.test" } },
    select: { id: true, email: true, firstName: true, lastName: true, orgId: true },
  })

  if (users.length === 0) {
    console.log("No test users found.")
    return
  }

  console.log(`Found ${users.length} test user(s):`)
  users.forEach((u) =>
    console.log(`  - ${[u.firstName, u.lastName].filter(Boolean).join(" ") || u.email} (${u.email})`)
  )

  const secretKey = process.env.CLERK_SECRET_KEY
  const clerk = secretKey ? createClerkClient({ secretKey }) : null

  for (const user of users) {
    const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || user.id

    if (clerk && user.orgId && user.orgId !== "org_default" && user.orgId !== "org_removed") {
      try {
        await clerk.organizations.deleteOrganizationMembership({
          organizationId: user.orgId,
          userId: user.id,
        })
        console.log(`  Removed ${displayName} from Clerk org`)
      } catch (err) {
        console.warn(`  Clerk removal failed for ${displayName}:`, err instanceof Error ? err.message : err)
      }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { status: "inactive", orgId: "org_removed" },
    })
    console.log(`  Deactivated ${displayName} in DB`)
  }

  console.log("Done.")
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
