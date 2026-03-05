"use client"

import { useUser } from "@clerk/nextjs"
import {
  Mail,
  Phone,
  Hash,
  Building2,
  DollarSign,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface InfoItemProps {
  icon: React.ReactNode
  label: string
  value: string
}

function InfoItem({ icon, label, value }: InfoItemProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate">{value}</p>
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
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader className="p-4 pb-2 md:p-6 md:pb-3">
          <CardTitle className="text-sm font-medium">Contact</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 pt-0 md:p-6 md:pt-0">
          <InfoItem icon={<Mail className="size-4 text-muted-foreground" />} label="Email" value={email} />
          <InfoItem icon={<Phone className="size-4 text-muted-foreground" />} label="Phone" value={phone} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 pb-2 md:p-6 md:pb-3">
          <CardTitle className="text-sm font-medium">Employment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 pt-0 md:p-6 md:pt-0">
          <InfoItem icon={<Hash className="size-4 text-muted-foreground" />} label="Employee ID" value={employeeId} />
          <InfoItem icon={<Building2 className="size-4 text-muted-foreground" />} label="Type" value={empType} />
          <InfoItem icon={<DollarSign className="size-4 text-muted-foreground" />} label="Base Rate" value={baseRate} />
        </CardContent>
      </Card>
    </div>
  )
}
