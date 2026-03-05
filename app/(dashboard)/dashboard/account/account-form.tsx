"use client"

import { useState, useCallback } from "react"
import { useUser, useAuth } from "@clerk/nextjs"
import { Camera, User, Shield, Loader2 } from "lucide-react"
import { motion } from "motion/react"
import { toast } from "sonner"

function mapOrgRole(role: string | undefined): string {
  if (role === "org:admin") return "Admin"
  if (role === "org:manager") return "Manager"
  return "Worker"
}

interface AccountFormProps {
  dbUser?: {
    employeeCode?: string | null
    status?: string | null
    role?: string | null
  }
}

export function AccountForm({ dbUser }: AccountFormProps) {
  const { user, isLoaded } = useUser()
  const { orgRole } = useAuth()

  const [firstName, setFirstName] = useState(user?.firstName ?? "")
  const [lastName, setLastName] = useState(user?.lastName ?? "")
  const [saving, setSaving] = useState(false)

  const initials = `${(firstName[0] ?? "N").toUpperCase()}${(lastName[0] ?? "X").toUpperCase()}`
  const imageUrl = user?.imageUrl
  const displayRole = mapOrgRole(orgRole ?? undefined)
  const status = dbUser?.status ?? "active"

  const handleAvatarUpload = useCallback(async () => {
    if (!isLoaded || !user) return
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "image/*"
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      try {
        await user.setProfileImage({ file })
        toast.success("Profile photo updated")
      } catch {
        toast.error("Failed to update photo")
      }
    }
    input.click()
  }, [isLoaded, user])

  const handleSave = useCallback(async () => {
    if (!isLoaded || !user) return
    if (!firstName.trim()) {
      toast.error("First name is required")
      return
    }

    setSaving(true)
    try {
      await user.update({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      })
      toast.success("Profile updated")
    } catch {
      toast.error("Failed to update profile")
    } finally {
      setSaving(false)
    }
  }, [isLoaded, user, firstName, lastName])

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-3 py-4">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Profile"
            className="size-[88px] rounded-full object-cover"
          />
        ) : (
          <div className="flex size-[88px] items-center justify-center rounded-full bg-primary text-3xl font-bold text-primary-foreground">
            {initials}
          </div>
        )}
        <button
          onClick={handleAvatarUpload}
          className="flex items-center gap-1.5 rounded-full border px-3.5 py-1.5"
        >
          <Camera className="size-3.5 text-primary" />
          <span className="text-sm font-semibold text-primary">Change Photo</span>
        </button>
      </div>

      <div>
        <p className="mb-3 ml-0.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Personal Information
        </p>
        <div className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 ml-0.5 block text-xs font-semibold text-muted-foreground">
                First Name
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                className="w-full rounded-xl border bg-background px-3.5 py-3 text-sm font-medium outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
              />
            </div>
            <div>
              <label className="mb-1.5 ml-0.5 block text-xs font-semibold text-muted-foreground">
                Last Name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
                className="w-full rounded-xl border bg-background px-3.5 py-3 text-sm font-medium outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 ml-0.5 block text-xs font-semibold text-muted-foreground">
              Email
            </label>
            <input
              type="email"
              value={user?.primaryEmailAddress?.emailAddress ?? ""}
              disabled
              className="w-full rounded-xl border bg-muted/50 px-3.5 py-3 text-sm font-medium text-muted-foreground outline-none"
            />
          </div>
        </div>
      </div>

      <div>
        <p className="mb-3 ml-0.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Work Information
        </p>
        <div className="space-y-2.5">
          <div className="flex items-center rounded-xl border bg-muted/50 px-3.5 py-3.5">
            <span className="flex-1 text-sm text-muted-foreground">Employee ID</span>
            <span className="text-sm font-medium">
              {dbUser?.employeeCode ?? "—"}
            </span>
          </div>

          <div className="flex items-center rounded-xl border bg-muted/50 px-3.5 py-3.5">
            <span className="flex-1 text-sm text-muted-foreground">Role</span>
            <div className="flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1">
              <Shield className="size-3 text-primary" />
              <span className="text-xs font-semibold text-primary">
                {displayRole}
              </span>
            </div>
          </div>

          <div className="flex items-center rounded-xl border bg-muted/50 px-3.5 py-3.5">
            <span className="flex-1 text-sm text-muted-foreground">Status</span>
            <div className="flex items-center gap-1.5">
              <div
                className={`size-2 rounded-full ${
                  status === "active" ? "bg-emerald-500" : "bg-destructive"
                }`}
              />
              <span className="text-sm font-medium capitalize">{status}</span>
            </div>
          </div>
        </div>
      </div>

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleSave}
        disabled={saving}
        className="flex w-full items-center justify-center rounded-xl bg-primary py-3.5 text-[15px] font-bold text-primary-foreground disabled:opacity-70"
      >
        {saving ? <Loader2 className="size-5 animate-spin" /> : "Save Changes"}
      </motion.button>
    </div>
  )
}
