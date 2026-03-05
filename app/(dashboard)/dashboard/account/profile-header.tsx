"use client"

import { useUser, useAuth } from "@clerk/nextjs"
import { Shield, Pencil } from "lucide-react"
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
  const displayRole = mapOrgRole(orgRole ?? undefined)

  return (
    <div className="rounded-2xl bg-primary px-5 pb-5 pt-1">
      <div className="flex items-center gap-3.5">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={fullName}
            className="size-14 rounded-full object-cover ring-2 ring-white/20"
          />
        ) : (
          <div className="flex size-14 items-center justify-center rounded-full bg-accent text-xl font-bold text-white">
            {initials}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="text-xl font-bold text-primary-foreground truncate">
            {fullName}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg bg-white/10 px-2 py-0.5">
              <Shield className="size-2.5 text-white/70" />
              <span className="text-[11px] font-semibold capitalize text-white/75">
                {displayRole}
              </span>
            </div>
            <div className="flex items-center gap-1 rounded-lg bg-emerald-500/20 px-2 py-0.5">
              <div className="size-1.5 rounded-full bg-emerald-400" />
              <span className="text-[11px] font-semibold text-emerald-300">
                Active
              </span>
            </div>
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onEdit}
          className="flex size-[34px] items-center justify-center rounded-[10px] bg-white/10 hover:bg-white/20"
        >
          <Pencil className="size-3.5 text-white" />
        </motion.button>
      </div>
    </div>
  )
}
