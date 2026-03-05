"use client"

import { useState, useCallback } from "react"
import { useSignUp } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { Mail, Lock, Eye, EyeOff, User, Loader2 } from "lucide-react"
import { motion } from "motion/react"
import Link from "next/link"
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
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg bg-destructive/10 p-3">
          <p className="text-sm font-medium text-destructive">{error}</p>
        </div>
      )}

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2.5 rounded-xl border bg-background px-3.5 py-3 focus-within:ring-2 focus-within:ring-ring/50 focus-within:border-ring">
            <User className="size-[18px] shrink-0 text-muted-foreground" />
            <input
              type="text"
              placeholder="First name"
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex items-center gap-2.5 rounded-xl border bg-background px-3.5 py-3 focus-within:ring-2 focus-within:ring-ring/50 focus-within:border-ring">
            <input
              type="text"
              placeholder="Last name"
              autoComplete="family-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <div className="flex items-center gap-2.5 rounded-xl border bg-background px-3.5 py-3 focus-within:ring-2 focus-within:ring-ring/50 focus-within:border-ring">
          <Mail className="size-[18px] shrink-0 text-muted-foreground" />
          <input
            type="email"
            placeholder="Email address"
            autoComplete="email"
            autoCapitalize="none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div className="flex items-center gap-2.5 rounded-xl border bg-background px-3.5 py-3 focus-within:ring-2 focus-within:ring-ring/50 focus-within:border-ring">
          <Lock className="size-[18px] shrink-0 text-muted-foreground" />
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
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
            placeholder="Confirm password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <motion.button
        type="submit"
        disabled={loading || !firstName.trim() || !email.trim() || !password}
        whileTap={{ scale: 0.97 }}
        className="flex w-full items-center justify-center rounded-xl bg-primary py-4 text-base font-semibold text-primary-foreground disabled:opacity-70"
      >
        {loading ? <Loader2 className="size-5 animate-spin" /> : "Create Account"}
      </motion.button>

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
