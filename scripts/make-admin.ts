/**
 * Make a user an admin in the Clerk organization.
 * Run: bun scripts/make-admin.ts gambew@gmail.com
 */
import { createClerkClient } from "@clerk/backend"

const email = process.argv[2] ?? "gambew@gmail.com"
const orgId = process.env.CLERK_ORG_ID ?? "org_3A9oOaeqP8KFo88K5s6dbnGcMOV"

async function main() {
  const secretKey = process.env.CLERK_SECRET_KEY
  if (!secretKey) {
    console.error("CLERK_SECRET_KEY is required. Set it in .env or pass as env var.")
    process.exit(1)
  }

  const clerk = createClerkClient({ secretKey })

  // Find user by email
  const { data: users } = await clerk.users.getUserList({
    emailAddress: [email],
    limit: 1,
  })

  if (!users.length) {
    console.error(`User not found: ${email}`)
    console.error("The user must have signed up first. Check Clerk Dashboard → Users.")
    process.exit(1)
  }

  const user = users[0]
  const userId = user.id
  console.log(`Found user: ${user.firstName ?? ""} ${user.lastName ?? ""} (${user.id})`)

  // Check if user is in the org
  const { data: memberships } = await clerk.organizations.getOrganizationMembershipList({
    organizationId: orgId,
    userId: [userId],
    limit: 1,
  })

  if (memberships.length === 0) {
    // Add user to org as admin
    await clerk.organizations.createOrganizationMembership({
      organizationId: orgId,
      userId,
      role: "org:admin",
    })
    console.log(`Added ${email} to organization as admin.`)
  } else {
    // Update existing membership to admin
    await clerk.organizations.updateOrganizationMembership({
      organizationId: orgId,
      userId,
      role: "org:admin",
    })
    console.log(`Updated ${email} to admin.`)
  }

  console.log("Done. User should now see Admin features after refreshing.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
