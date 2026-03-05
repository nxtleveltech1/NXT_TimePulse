"use client"

import { useState, useCallback } from "react"
import { useSignIn } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { Lock, Eye, EyeOff, Loader2, KeyRound } from "lucide-react"
import { motion } from "motion/react"
import Link from "next/link"

export function ResetPasswordForm() {
  const { signIn, setActive, isLoaded } = useSignIn()
  const router = useRouter()

  const [code, setCode] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!isLoaded || !signIn) return

      if (!code.trim()) {
        setError("Please enter the reset code")
        return
      }
      if (password.length < 8) {
        setError("Password must be at least 8 characters")
        return
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match")
        return
      }

      setError("")
      setLoading(true)

      try {
        const result = await signIn.attemptFirstFactor({
          strategy: "reset_password_email_code",
          code: code.trim(),
          password,
        })

        if (result.status === "complete") {
          await setActive({ session: result.createdSessionId })
          router.push("/dashboard")
        } else {
          setError("Password reset incomplete. Please try again.")
        }
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message)
        } else if (
          typeof err === "object" &&
          err !== null &&
          "errors" in err
        ) {
          const first = (
            err as { errors: Array<{ message?: string; longMessage?: string }> }
          ).errors[0]
          setError(first?.longMessage ?? first?.message ?? "Reset failed")
        } else {
          setError("Password reset failed. Please try again.")
        }
      } finally {
        setLoading(false)
      }
    },
    [isLoaded, signIn, setActive, code, password, confirmPassword, router]
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg bg-destructive/10 p-3">
          <p className="text-sm font-medium text-destructive">{error}</p>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center gap-2.5 rounded-xl border bg-background px-3.5 py-3 focus-within:ring-2 focus-within:ring-ring/50 focus-within:border-ring">
          <KeyRound className="size-[18px] shrink-0 text-muted-foreground" />
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="Reset code"
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div className="flex items-center gap-2.5 rounded-xl border bg-background px-3.5 py-3 focus-within:ring-2 focus-within:ring-ring/50 focus-within:border-ring">
          <Lock className="size-[18px] shrink-0 text-muted-foreground" />
          <input
            type={showPassword ? "text" : "password"}
            placeholder="New password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="shrink-0 text-muted-foreground hover:text-foreground"
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="size-[18px]" />
            ) : (
              <Eye className="size-[18px]" />
            )}
          </button>
        </div>

        <div className="flex items-center gap-2.5 rounded-xl border bg-background px-3.5 py-3 focus-within:ring-2 focus-within:ring-ring/50 focus-within:border-ring">
          <Lock className="size-[18px] shrink-0 text-muted-foreground" />
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Confirm new password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <motion.button
        type="submit"
        disabled={loading || !code.trim() || !password || !confirmPassword}
        whileTap={{ scale: 0.97 }}
        className="flex w-full items-center justify-center rounded-xl bg-primary py-4 text-base font-semibold text-primary-foreground disabled:opacity-70"
      >
        {loading ? <Loader2 className="size-5 animate-spin" /> : "Reset Password"}
      </motion.button>

      <Link
        href="/sign-in"
        className="block w-full text-center text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        Back to sign in
      </Link>
    </form>
  )
}
