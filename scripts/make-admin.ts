/**
 * Make a user an admin.
 * Attempts Clerk org membership first; falls back to publicMetadata.role if
 * Organizations is not enabled on the instance.
 *
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

  // Try Clerk org membership first
  let orgSuccess = false
  try {
    await clerk.organizations.updateOrganizationMembership({
      organizationId: orgId,
      userId,
      role: "org:admin",
    })
    console.log(`Updated ${email} to org:admin (organization membership).`)
    orgSuccess = true
  } catch (err: unknown) {
    const e = err as { status?: number; errors?: { code?: string }[] }
    const isOrgDisabled = e.errors?.some(
      (x) => x.code === "organization_not_enabled_in_instance"
    )
    const isNotMember = e.status === 404 || e.status === 422

    if (isNotMember) {
      try {
        await clerk.organizations.createOrganizationMembership({
          organizationId: orgId,
          userId,
          role: "org:admin",
        })
        console.log(`Added ${email} to organization as org:admin.`)
        orgSuccess = true
      } catch (createErr: unknown) {
        console.error("createOrganizationMembership error:", JSON.stringify(createErr, null, 2))
      }
    } else if (!isOrgDisabled) {
      throw err
    } else {
      console.error("Org step failed:", JSON.stringify(e, null, 2))
    }
  }

  // Fallback: publicMetadata.role (works without Organizations feature)
  await clerk.users.updateUser(userId, {
    publicMetadata: {
      ...(user.publicMetadata ?? {}),
      role: "org:admin",
    },
  })
  console.log(`Set publicMetadata.role = "org:admin" on ${email}.`)

  if (!orgSuccess) {
    console.log("")
    console.log("NOTE: Clerk Organizations is not enabled on this instance.")
    console.log("The publicMetadata role is set, but the app must also check it.")
    console.log("Enable Organizations at: https://dashboard.clerk.com")
    console.log("  → Configure → Organizations → Enable")
  }

  console.log("Done.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
