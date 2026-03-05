"use client"

import { useState, useCallback } from "react"
import { useUser } from "@clerk/nextjs"
import { Lock, Eye, EyeOff, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

export function ChangePasswordForm() {
  const { user, isLoaded } = useUser()

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPasswords, setShowPasswords] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!isLoaded || !user) return

      if (!currentPassword) {
        toast.error("Current password is required")
        return
      }
      if (newPassword.length < 8) {
        toast.error("New password must be at least 8 characters")
        return
      }
      if (newPassword !== confirmPassword) {
        toast.error("Passwords do not match")
        return
      }

      setSaving(true)
      try {
        await user.updatePassword({
          currentPassword,
          newPassword,
        })
        toast.success("Password updated successfully")
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to update password"
        toast.error(message)
      } finally {
        setSaving(false)
      }
    },
    [isLoaded, user, currentPassword, newPassword, confirmPassword]
  )

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-8">
      <div>
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Change Password
        </h3>
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-muted-foreground">
              Current Password
            </label>
            <div className="flex items-center gap-3 rounded-lg border bg-background px-4 h-11 focus-within:ring-2 focus-within:ring-ring/50 focus-within:border-ring">
              <Lock className="size-4 shrink-0 text-muted-foreground" />
              <input
                type={showPasswords ? "text" : "password"}
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-muted-foreground">
              New Password
            </label>
            <div className="flex items-center gap-3 rounded-lg border bg-background px-4 h-11 focus-within:ring-2 focus-within:ring-ring/50 focus-within:border-ring">
              <Lock className="size-4 shrink-0 text-muted-foreground" />
              <input
                type={showPasswords ? "text" : "password"}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <button
                type="button"
                onClick={() => setShowPasswords(!showPasswords)}
                className="shrink-0 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showPasswords ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-muted-foreground">
              Confirm New Password
            </label>
            <div className="flex items-center gap-3 rounded-lg border bg-background px-4 h-11 focus-within:ring-2 focus-within:ring-ring/50 focus-within:border-ring">
              <Lock className="size-4 shrink-0 text-muted-foreground" />
              <input
                type={showPasswords ? "text" : "password"}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>
        </div>
      </div>

      <Button
        type="submit"
        disabled={saving || !currentPassword || !newPassword || !confirmPassword}
        size="lg"
        className="min-w-[160px]"
      >
        {saving ? <Loader2 className="size-4 animate-spin" /> : "Update Password"}
      </Button>
    </form>
  )
}
