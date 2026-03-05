"use client"

import { useState, useCallback } from "react"
import { useSignUp } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { Mail, Lock, Eye, EyeOff, User, Loader2 } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { VerifyEmailForm } from "./verify-email-form"

type Stage = "form" | "verify"

export function SignUpForm() {
  const { signUp, setActive, isLoaded } = useSignUp()
  const router = useRouter()

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [stage, setStage] = useState<Stage>("form")

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!isLoaded || !signUp) return

      if (!firstName.trim() || !lastName.trim()) {
        setError("First and last name are required")
        return
      }
      if (!email.trim()) {
        setError("Email is required")
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
        await signUp.create({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          emailAddress: email.trim(),
          password,
        })

        await signUp.prepareEmailAddressVerification({
          strategy: "email_code",
        })

        setStage("verify")
      } catch (err: unknown) {
        setError(parseClerkError(err))
      } finally {
        setLoading(false)
      }
    },
    [isLoaded, signUp, firstName, lastName, email, password, confirmPassword]
  )

  const handleVerify = useCallback(
    async (code: string) => {
      if (!isLoaded || !signUp) return
      setError("")
      setLoading(true)

      try {
        const result = await signUp.attemptEmailAddressVerification({ code })

        if (result.status === "complete") {
          await setActive({ session: result.createdSessionId })
          router.push("/request-access")
        } else {
          setError("Verification incomplete. Please try again.")
        }
      } catch (err: unknown) {
        setError(parseClerkError(err))
      } finally {
        setLoading(false)
      }
    },
    [isLoaded, signUp, setActive, router]
  )

  if (stage === "verify") {
    return (
      <VerifyEmailForm
        email={email}
        error={error}
        loading={loading}
        onVerify={handleVerify}
        onBack={() => {
          setStage("form")
          setError("")
        }}
      />
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-destructive/10 p-3.5">
          <p className="text-sm font-medium text-destructive">{error}</p>
        </div>
      )}

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-2 block text-sm font-medium">First name</label>
            <div className="flex items-center gap-3 rounded-lg border bg-background px-4 h-11 focus-within:ring-2 focus-within:ring-ring/50 focus-within:border-ring">
              <User className="size-4 shrink-0 text-muted-foreground" />
              <input
                type="text"
                autoComplete="given-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Last name</label>
            <div className="flex items-center rounded-lg border bg-background px-4 h-11 focus-within:ring-2 focus-within:ring-ring/50 focus-within:border-ring">
              <input
                type="text"
                autoComplete="family-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Email</label>
          <div className="flex items-center gap-3 rounded-lg border bg-background px-4 h-11 focus-within:ring-2 focus-within:ring-ring/50 focus-within:border-ring">
            <Mail className="size-4 shrink-0 text-muted-foreground" />
            <input
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              autoCapitalize="none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Password</label>
          <div className="flex items-center gap-3 rounded-lg border bg-background px-4 h-11 focus-within:ring-2 focus-within:ring-ring/50 focus-within:border-ring">
            <Lock className="size-4 shrink-0 text-muted-foreground" />
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Confirm password</label>
          <div className="flex items-center gap-3 rounded-lg border bg-background px-4 h-11 focus-within:ring-2 focus-within:ring-ring/50 focus-within:border-ring">
            <Lock className="size-4 shrink-0 text-muted-foreground" />
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>
      </div>

      <Button
        type="submit"
        disabled={loading || !firstName.trim() || !email.trim() || !password}
        size="lg"
        className="w-full"
      >
        {loading ? <Loader2 className="size-4 animate-spin" /> : "Create Account"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-medium text-foreground hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  )
}

function parseClerkError(err: unknown): string {
  if (err instanceof Error) return err.message
  if (
    typeof err === "object" &&
    err !== null &&
    "errors" in err &&
    Array.isArray((err as { errors: unknown[] }).errors)
  ) {
    const first = (err as { errors: Array<{ message?: string; longMessage?: string }> })
      .errors[0]
    return first?.longMessage ?? first?.message ?? "Sign up failed"
  }
  return "Sign up failed. Please try again."
}
