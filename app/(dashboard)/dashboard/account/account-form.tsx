"use client"

import { useState, useCallback } from "react"
import { useUser, useAuth } from "@clerk/nextjs"
import { Camera, Shield, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

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
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <Card>
        <CardHeader className="p-4 pb-2 md:p-6 md:pb-3">
          <CardTitle className="text-sm font-medium">Profile</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
          <div className="flex items-center gap-5 mb-6">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Profile"
                className="size-16 rounded-full object-cover ring-2 ring-border"
              />
            ) : (
              <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
                {initials}
              </div>
            )}
            <Button variant="outline" size="sm" onClick={handleAvatarUpload} className="gap-1.5">
              <Camera className="size-3.5" />
              Change Photo
            </Button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first-name">First Name</Label>
                <Input
                  id="first-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last-name">Last Name</Label>
                <Input
                  id="last-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                value={user?.primaryEmailAddress?.emailAddress ?? ""}
                disabled
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 pb-2 md:p-6 md:pb-3">
          <CardTitle className="text-sm font-medium">Work Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 pt-0 md:p-6 md:pt-0">
          <div className="space-y-2">
            <Label>Employee ID</Label>
            <Input value={dbUser?.employeeCode ?? "—"} disabled />
          </div>

          <div className="space-y-2">
            <Label>Role</Label>
            <div className="flex h-9 items-center rounded-md border bg-muted/50 px-3">
              <div className="flex items-center gap-1.5">
                <Shield className="size-3.5 text-primary" />
                <span className="text-sm font-medium">{displayRole}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <div className="flex h-9 items-center rounded-md border bg-muted/50 px-3">
              <div className="flex items-center gap-1.5">
                <span
                  className={`size-2 rounded-full ${
                    status === "active" ? "bg-emerald-500" : "bg-destructive"
                  }`}
                />
                <span className="text-sm font-medium capitalize">{status}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
