"use client"

import { useState, useCallback } from "react"
import { useSignIn } from "@clerk/nextjs"
import { Mail, Loader2, CheckCircle2 } from "lucide-react"
import { motion } from "motion/react"
import Link from "next/link"

export function ForgotPasswordForm() {
  const { signIn, isLoaded } = useSignIn()

  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!isLoaded || !signIn) return
      if (!email.trim()) {
        setError("Please enter your email address")
        return
      }

      setError("")
      setLoading(true)

      try {
        await signIn.create({
          strategy: "reset_password_email_code",
          identifier: email.trim(),
        })
        setSent(true)
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
          setError(first?.longMessage ?? first?.message ?? "Failed to send reset code")
        } else {
          setError("Failed to send reset code. Please try again.")
        }
      } finally {
        setLoading(false)
      }
    },
    [isLoaded, signIn, email]
  )

  if (sent) {
    return (
      <div className="space-y-5">
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="flex size-12 items-center justify-center rounded-full bg-success/10">
            <CheckCircle2 className="size-6 text-success" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">Check your email</p>
            <p className="mt-1 text-sm text-muted-foreground">
              We sent a reset code to{" "}
              <span className="font-medium text-foreground">{email}</span>
            </p>
          </div>
        </div>

        <Link
          href="/reset-password"
          className="flex w-full items-center justify-center rounded-xl bg-primary py-4 text-base font-semibold text-primary-foreground"
        >
          Enter Reset Code
        </Link>

        <button
          type="button"
          onClick={() => {
            setSent(false)
            setEmail("")
          }}
          className="block w-full text-center text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Try a different email
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg bg-destructive/10 p-3">
          <p className="text-sm font-medium text-destructive">{error}</p>
        </div>
      )}

      <div className="flex items-center gap-2.5 rounded-xl border bg-background px-3.5 py-3 focus-within:ring-2 focus-within:ring-ring/50 focus-within:border-ring">
        <Mail className="size-[18px] shrink-0 text-muted-foreground" />
        <input
          type="email"
          placeholder="Email address"
          autoComplete="email"
          autoCapitalize="none"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
        />
      </div>

      <motion.button
        type="submit"
        disabled={loading || !email.trim()}
        whileTap={{ scale: 0.97 }}
        className="flex w-full items-center justify-center rounded-xl bg-primary py-4 text-base font-semibold text-primary-foreground disabled:opacity-70"
      >
        {loading ? <Loader2 className="size-5 animate-spin" /> : "Send Reset Code"}
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
