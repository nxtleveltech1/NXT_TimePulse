"use client"

import { useUser } from "@clerk/nextjs"
import {
  Mail,
  Phone,
  Hash,
  Building2,
  DollarSign,
} from "lucide-react"

interface InfoRowProps {
  icon: React.ReactNode
  label: string
  value: string
}

function InfoRow({ icon, label, value }: InfoRowProps) {
  return (
    <div className="flex items-center gap-4 rounded-xl border bg-card px-5 py-4">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-sm font-semibold truncate">{value}</p>
      </div>
    </div>
  )
}

interface AccountInfoCardProps {
  dbUser?: {
    employeeCode?: string | null
    employmentType?: string | null
    baseRate?: string | number | null
    currency?: string | null
    phone?: string | null
  }
}

export function AccountInfoCard({ dbUser }: AccountInfoCardProps) {
  const { user } = useUser()

  const email = user?.primaryEmailAddress?.emailAddress ?? "—"
  const phone = dbUser?.phone ?? user?.phoneNumbers?.[0]?.phoneNumber ?? "—"
  const employeeId = dbUser?.employeeCode ?? "—"
  const empType = dbUser?.employmentType
    ? dbUser.employmentType.charAt(0).toUpperCase() +
      dbUser.employmentType.slice(1)
    : "—"
  const baseRate =
    dbUser?.baseRate != null
      ? `${dbUser.currency ?? "ZAR"} ${dbUser.baseRate}/hr`
      : "—"

  return (
    <div className="space-y-8">
      <div>
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Contact
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <InfoRow icon={<Mail className="size-4 text-muted-foreground" />} label="Email" value={email} />
          <InfoRow icon={<Phone className="size-4 text-muted-foreground" />} label="Phone" value={phone} />
        </div>
      </div>

      <div>
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Employment
        </h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <InfoRow icon={<Hash className="size-4 text-muted-foreground" />} label="Employee ID" value={employeeId} />
          <InfoRow icon={<Building2 className="size-4 text-muted-foreground" />} label="Type" value={empType} />
          <InfoRow icon={<DollarSign className="size-4 text-muted-foreground" />} label="Base Rate" value={baseRate} />
        </div>
      </div>
    </div>
  )
}
