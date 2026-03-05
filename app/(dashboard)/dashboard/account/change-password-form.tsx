"use client"

import { useState, useCallback } from "react"
import { useUser } from "@clerk/nextjs"
import { Lock, Eye, EyeOff, Loader2 } from "lucide-react"
import { motion } from "motion/react"
import { toast } from "sonner"

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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <p className="mb-3 ml-0.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Change Password
        </p>
        <div className="space-y-3">
          <div className="flex items-center gap-2.5 rounded-xl border bg-background px-3.5 py-3 focus-within:ring-2 focus-within:ring-ring/50 focus-within:border-ring">
            <Lock className="size-[18px] shrink-0 text-muted-foreground" />
            <input
              type={showPasswords ? "text" : "password"}
              placeholder="Current password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex items-center gap-2.5 rounded-xl border bg-background px-3.5 py-3 focus-within:ring-2 focus-within:ring-ring/50 focus-within:border-ring">
            <Lock className="size-[18px] shrink-0 text-muted-foreground" />
            <input
              type={showPasswords ? "text" : "password"}
              placeholder="New password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground"
            />
            <button
              type="button"
              onClick={() => setShowPasswords(!showPasswords)}
              className="shrink-0 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              {showPasswords ? (
                <EyeOff className="size-[18px]" />
              ) : (
                <Eye className="size-[18px]" />
              )}
            </button>
          </div>

          <div className="flex items-center gap-2.5 rounded-xl border bg-background px-3.5 py-3 focus-within:ring-2 focus-within:ring-ring/50 focus-within:border-ring">
            <Lock className="size-[18px] shrink-0 text-muted-foreground" />
            <input
              type={showPasswords ? "text" : "password"}
              placeholder="Confirm new password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>
      </div>

      <motion.button
        type="submit"
        whileTap={{ scale: 0.97 }}
        disabled={saving || !currentPassword || !newPassword || !confirmPassword}
        className="flex w-full items-center justify-center rounded-xl bg-primary py-3.5 text-[15px] font-bold text-primary-foreground disabled:opacity-70"
      >
        {saving ? <Loader2 className="size-5 animate-spin" /> : "Update Password"}
      </motion.button>
    </form>
  )
}
