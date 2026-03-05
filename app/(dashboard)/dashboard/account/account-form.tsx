"use client"

import { useState, useCallback } from "react"
import { useUser, useAuth } from "@clerk/nextjs"
import { Camera, Shield, Loader2 } from "lucide-react"
import { motion } from "motion/react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

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
    <div className="grid gap-10 lg:grid-cols-[280px_1fr]">
      <div className="flex flex-col items-center gap-4 lg:sticky lg:top-24 lg:self-start">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Profile"
            className="size-28 rounded-full object-cover ring-4 ring-muted"
          />
        ) : (
          <div className="flex size-28 items-center justify-center rounded-full bg-primary text-4xl font-bold text-primary-foreground ring-4 ring-muted">
            {initials}
          </div>
        )}
        <button
          onClick={handleAvatarUpload}
          className="flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold hover:bg-muted transition-colors"
        >
          <Camera className="size-4 text-primary" />
          Change Photo
        </button>
      </div>

      <div className="space-y-8">
        <div>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Personal Information
          </h3>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-muted-foreground">
                First Name
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                className="h-11 w-full rounded-lg border bg-background px-4 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-muted-foreground">
                Last Name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
                className="h-11 w-full rounded-lg border bg-background px-4 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-muted-foreground">
                Email
              </label>
              <input
                type="email"
                value={user?.primaryEmailAddress?.emailAddress ?? ""}
                disabled
                className="h-11 w-full rounded-lg border bg-muted/50 px-4 text-sm text-muted-foreground outline-none"
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Work Information
          </h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border bg-muted/30 px-4 py-3.5">
              <p className="text-xs text-muted-foreground">Employee ID</p>
              <p className="mt-1 text-sm font-semibold">{dbUser?.employeeCode ?? "—"}</p>
            </div>
            <div className="rounded-lg border bg-muted/30 px-4 py-3.5">
              <p className="text-xs text-muted-foreground">Role</p>
              <div className="mt-1.5 flex items-center gap-1.5">
                <Shield className="size-3.5 text-primary" />
                <span className="text-sm font-semibold text-primary">{displayRole}</span>
              </div>
            </div>
            <div className="rounded-lg border bg-muted/30 px-4 py-3.5">
              <p className="text-xs text-muted-foreground">Status</p>
              <div className="mt-1.5 flex items-center gap-1.5">
                <div className={`size-2 rounded-full ${status === "active" ? "bg-emerald-500" : "bg-destructive"}`} />
                <span className="text-sm font-semibold capitalize">{status}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving}
            size="lg"
            className="min-w-[160px]"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  )
}
