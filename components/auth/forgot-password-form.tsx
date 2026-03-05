"use client"

import { useState, useCallback } from "react"
import { useSignIn } from "@clerk/nextjs"
import { Mail, Loader2, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

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
      <div className="space-y-6">
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="flex size-14 items-center justify-center rounded-full bg-success/10">
            <CheckCircle2 className="size-7 text-success" />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold">Check your email</p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              We sent a reset code to{" "}
              <span className="font-medium text-foreground">{email}</span>
            </p>
          </div>
        </div>

        <Button asChild size="lg" className="w-full">
          <Link href="/reset-password">Enter Reset Code</Link>
        </Button>

        <button
          type="button"
          onClick={() => {
            setSent(false)
            setEmail("")
          }}
          className="block w-full text-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Try a different email
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-destructive/10 p-3.5">
          <p className="text-sm font-medium text-destructive">{error}</p>
        </div>
      )}

      <div>
        <label className="mb-2 block text-sm font-medium">Email</label>
        <div className="flex items-center gap-3 rounded-lg border bg-background px-4 h-11 focus-within:ring-2 focus-within:ring-ring/50 focus-within:border-ring">
          <Mail className="size-4 shrink-0 text-muted-foreground" />
          <input
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            autoCapitalize="none"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <Button
        type="submit"
        disabled={loading || !email.trim()}
        size="lg"
        className="w-full"
      >
        {loading ? <Loader2 className="size-4 animate-spin" /> : "Send Reset Code"}
      </Button>

      <Link
        href="/sign-in"
        className="block w-full text-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        Back to sign in
      </Link>
    </form>
  )
}
