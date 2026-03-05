"use client"

import { useState } from "react"
import { Lock, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface MfaFormProps {
  error: string
  loading: boolean
  onVerify: (code: string) => Promise<void>
  onBack: () => void
}

export function MfaForm({ error, loading, onVerify, onBack }: MfaFormProps) {
  const [code, setCode] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim()) return
    await onVerify(code.trim())
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-destructive/10 p-3.5">
          <p className="text-sm font-medium text-destructive">{error}</p>
        </div>
      )}

      <div>
        <label className="mb-2 block text-sm font-medium">Verification Code</label>
        <div className="flex items-center gap-3 rounded-lg border bg-background px-4 h-11 focus-within:ring-2 focus-within:ring-ring/50 focus-within:border-ring">
          <Lock className="size-4 shrink-0 text-muted-foreground" />
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="Enter code"
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <Button
        type="submit"
        disabled={loading || !code.trim()}
        size="lg"
        className="w-full"
      >
        {loading ? <Loader2 className="size-4 animate-spin" /> : "Verify"}
      </Button>

      <button
        type="button"
        onClick={onBack}
        className="block w-full text-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        Back to sign in
      </button>
    </form>
  )
}
