"use client"

import { useUser, useAuth } from "@clerk/nextjs"
import { Shield, Pencil, Mail } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

function mapOrgRole(role: string | undefined): string {
  if (role === "org:admin") return "Admin"
  if (role === "org:manager") return "Manager"
  return "Worker"
}

interface ProfileHeaderProps {
  onEdit: () => void
}

export function ProfileHeader({ onEdit }: ProfileHeaderProps) {
  const { user } = useUser()
  const { orgRole } = useAuth()

  const firstName = user?.firstName ?? ""
  const lastName = user?.lastName ?? ""
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || "User"
  const initials = `${(firstName[0] ?? "N").toUpperCase()}${(lastName[0] ?? "X").toUpperCase()}`
  const imageUrl = user?.imageUrl
  const email = user?.primaryEmailAddress?.emailAddress ?? ""
  const displayRole = mapOrgRole(orgRole ?? undefined)

  return (
    <Card className="overflow-hidden border p-0">
      <div className="h-1.5 bg-primary" />
      <div className="flex items-center gap-6 px-6 py-5 sm:px-8">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={fullName}
            className="size-[72px] rounded-full object-cover ring-2 ring-border"
          />
        ) : (
          <div className="flex size-[72px] shrink-0 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
            {initials}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-semibold truncate">{fullName}</h1>
          <div className="mt-1 flex items-center gap-1.5 text-muted-foreground">
            <Mail className="size-3.5" />
            <span className="text-sm truncate">{email}</span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {displayRole}
            </span>
            <span className="flex items-center gap-1.5 rounded-md bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
              <span className="size-1.5 rounded-full bg-current" />
              Active
            </span>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={onEdit} className="shrink-0 gap-1.5">
          <Pencil className="size-3.5" />
          Edit
        </Button>
      </div>
    </Card>
  )
}
