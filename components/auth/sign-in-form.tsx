"use client"

import { useState, useCallback } from "react"
import { useSignIn } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react"
import { motion } from "motion/react"
import Link from "next/link"
import { MfaForm } from "./mfa-form"

type Stage = "credentials" | "mfa"

export function SignInForm() {
  const { signIn, setActive, isLoaded } = useSignIn()
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [stage, setStage] = useState<Stage>("credentials")

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!isLoaded || !signIn) return
      if (!email.trim() || !password.trim()) {
        setError("Please enter your email and password")
        return
      }

      setError("")
      setLoading(true)

      try {
        const attempt = await signIn.create({
          identifier: email.trim(),
          password,
        })

        if (attempt.status === "complete") {
          await setActive({ session: attempt.createdSessionId })
          router.push("/dashboard")
          return
        }

        if (
          attempt.status === "needs_second_factor" ||
          attempt.status === "needs_first_factor"
        ) {
          const emailFactor =
            attempt.supportedSecondFactors?.find(
              (f) => f.strategy === "email_code"
            ) ??
            attempt.supportedFirstFactors?.find(
              (f: { strategy: string }) => f.strategy === "email_code"
            )

          if (emailFactor) {
            await signIn
              .prepareSecondFactor?.({ strategy: "email_code" })
              .catch(() =>
                signIn.prepareFirstFactor?.({
                  strategy: "email_code",
                  emailAddressId:
                    (emailFactor as { emailAddressId?: string })
                      .emailAddressId ?? "",
                })
              )
          }

          setStage("mfa")
          setError("")
          return
        }

        setError("Unexpected sign-in state. Please try again.")
      } catch (err: unknown) {
        setError(parseClerkError(err))
      } finally {
        setLoading(false)
      }
    },
    [isLoaded, signIn, setActive, email, password, router]
  )

  const handleMfaVerify = useCallback(
    async (code: string) => {
      if (!isLoaded || !signIn) return
      setError("")
      setLoading(true)

      try {
        const result = await signIn
          .attemptSecondFactor?.({ strategy: "email_code", code })
          .catch(() =>
            signIn.attemptFirstFactor?.({ strategy: "email_code", code })
          )

        if (result?.status === "complete") {
          await setActive({ session: result.createdSessionId })
          router.push("/dashboard")
        } else {
          setError("Verification incomplete. Please try again.")
        }
      } catch (err: unknown) {
        setError(parseClerkError(err))
      } finally {
        setLoading(false)
      }
    },
    [isLoaded, signIn, setActive, router]
  )

  const handleBackToSignIn = useCallback(() => {
    setStage("credentials")
    setError("")
  }, [])

  if (stage === "mfa") {
    return (
      <MfaForm
        error={error}
        loading={loading}
        onVerify={handleMfaVerify}
        onBack={handleBackToSignIn}
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
            autoComplete="current-password"
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
      </div>

      <div className="flex justify-end">
        <Link
          href="/forgot-password"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Forgot password?
        </Link>
      </div>

      <motion.button
        type="submit"
        disabled={loading || !email.trim() || !password.trim()}
        whileTap={{ scale: 0.97 }}
        className="flex w-full items-center justify-center rounded-xl bg-primary py-4 text-base font-semibold text-primary-foreground disabled:opacity-70"
      >
        {loading ? <Loader2 className="size-5 animate-spin" /> : "Sign In"}
      </motion.button>

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/sign-up" className="font-medium text-foreground hover:underline">
          Sign up
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
    return first?.longMessage ?? first?.message ?? "Sign in failed"
  }
  return "Sign in failed. Please try again."
}
