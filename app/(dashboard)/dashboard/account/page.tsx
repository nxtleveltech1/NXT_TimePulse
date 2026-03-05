import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { AccountPageClient } from "./account-page-client"

export const dynamic = "force-dynamic"

export default async function AccountPage() {
  const { userId, orgId } = await auth()
  if (!userId) return null

  const dbUser = await prisma.user.findFirst({
    where: { id: userId, ...(orgId ? { orgId } : {}) },
    select: {
      employeeCode: true,
      employmentType: true,
      baseRate: true,
      currency: true,
      phone: true,
      status: true,
      role: true,
    },
  })

  const serialized = dbUser
    ? {
        employeeCode: dbUser.employeeCode,
        employmentType: dbUser.employmentType,
        baseRate: dbUser.baseRate ? Number(dbUser.baseRate) : null,
        currency: dbUser.currency,
        phone: dbUser.phone,
        status: dbUser.status,
        role: dbUser.role,
      }
    : undefined

  return <AccountPageClient dbUser={serialized} />
}
