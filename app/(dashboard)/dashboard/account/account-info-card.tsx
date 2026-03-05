"use client"

import { useUser } from "@clerk/nextjs"
import {
  Mail,
  Phone,
  Hash,
  Building2,
  DollarSign,
  ChevronRight,
} from "lucide-react"

interface InfoRowProps {
  icon: React.ReactNode
  label: string
  value: string
  action?: () => void
}

function InfoRow({ icon, label, value, action }: InfoRowProps) {
  const Wrapper = action ? "button" : "div"
  return (
    <Wrapper
      onClick={action}
      className="flex items-center gap-2.5 px-3.5 py-3 w-full text-left hover:bg-muted/50 transition-colors"
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="w-[90px] shrink-0 text-sm text-muted-foreground">
        {label}
      </span>
      <span className="flex-1 text-right text-sm font-medium truncate">
        {value}
      </span>
      {action && <ChevronRight className="size-4 text-muted-foreground" />}
    </Wrapper>
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
    <div>
      <p className="mb-2 ml-0.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        Account
      </p>
      <div className="overflow-hidden rounded-[14px] border">
        <InfoRow icon={<Mail className="size-3.5" />} label="Email" value={email} />
        <div className="ml-[38px] border-b" />
        <InfoRow icon={<Phone className="size-3.5" />} label="Phone" value={phone} />
        <div className="ml-[38px] border-b" />
        <InfoRow icon={<Hash className="size-3.5" />} label="Employee ID" value={employeeId} />
        <div className="ml-[38px] border-b" />
        <InfoRow icon={<Building2 className="size-3.5" />} label="Type" value={empType} />
        <div className="ml-[38px] border-b" />
        <InfoRow icon={<DollarSign className="size-3.5" />} label="Base Rate" value={baseRate} />
      </div>
    </div>
  )
}
