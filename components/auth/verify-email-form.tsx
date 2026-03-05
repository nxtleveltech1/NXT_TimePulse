"use client"

import { useState } from "react"
import { Lock, Loader2 } from "lucide-react"
import { motion } from "motion/react"

interface VerifyEmailFormProps {
  email: string
  error: string
  loading: boolean
  onVerify: (code: string) => Promise<void>
  onBack: () => void
}

export function VerifyEmailForm({
  email,
  error,
  loading,
  onVerify,
  onBack,
}: VerifyEmailFormProps) {
  const [code, setCode] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim()) return
    await onVerify(code.trim())
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold">Verify your email</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter the code sent to{" "}
          <span className="font-medium text-foreground">{email}</span>
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 p-3">
          <p className="text-sm font-medium text-destructive">{error}</p>
        </div>
      )}

      <div className="flex items-center gap-2.5 rounded-xl border bg-background px-3.5 py-3 focus-within:ring-2 focus-within:ring-ring/50 focus-within:border-ring">
        <Lock className="size-[18px] shrink-0 text-muted-foreground" />
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="Verification code"
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
        />
      </div>

      <motion.button
        type="submit"
        disabled={loading || !code.trim()}
        whileTap={{ scale: 0.97 }}
        className="flex w-full items-center justify-center rounded-xl bg-primary py-4 text-base font-semibold text-primary-foreground disabled:opacity-70"
      >
        {loading ? <Loader2 className="size-5 animate-spin" /> : "Verify Email"}
      </motion.button>

      <button
        type="button"
        onClick={onBack}
        className="block w-full text-center text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        Back to sign up
      </button>
    </form>
  )
}
