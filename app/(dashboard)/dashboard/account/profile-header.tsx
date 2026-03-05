"use client"

import { useUser, useAuth } from "@clerk/nextjs"
import { Shield, Pencil, Mail } from "lucide-react"
import { motion } from "motion/react"

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
    <div className="rounded-2xl bg-primary px-8 py-6">
      <div className="flex items-center gap-6">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={fullName}
            className="size-20 rounded-full object-cover ring-2 ring-white/20"
          />
        ) : (
          <div className="flex size-20 items-center justify-center rounded-full bg-accent text-2xl font-bold text-white">
            {initials}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-primary-foreground truncate">
            {fullName}
          </h1>
          <div className="mt-1 flex items-center gap-2 text-white/60">
            <Mail className="size-3.5" />
            <span className="text-sm truncate">{email}</span>
          </div>
          <div className="mt-3 flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1">
              <Shield className="size-3 text-white/70" />
              <span className="text-xs font-semibold capitalize text-white/80">
                {displayRole}
              </span>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg bg-emerald-500/20 px-2.5 py-1">
              <div className="size-2 rounded-full bg-emerald-400" />
              <span className="text-xs font-semibold text-emerald-300">
                Active
              </span>
            </div>
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onEdit}
          className="flex size-10 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
        >
          <Pencil className="size-4 text-white" />
        </motion.button>
      </div>
    </div>
  )
}
