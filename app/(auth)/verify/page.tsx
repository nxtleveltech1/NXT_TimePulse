"use client"

import { useEffect, useState } from "react"
import { useSignUp } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { Loader2, CheckCircle2, XCircle } from "lucide-react"
import { AuthCard } from "@/components/auth/auth-card"

export default function VerifyPage() {
  const { signUp, setActive, isLoaded } = useSignUp()
  const router = useRouter()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")

  useEffect(() => {
    if (!isLoaded || !signUp) return

    if (signUp.status === "complete" && signUp.createdSessionId) {
      setActive({ session: signUp.createdSessionId }).then(() => {
        setStatus("success")
        setTimeout(() => router.push("/request-access"), 1500)
      })
    } else {
      setStatus("error")
    }
  }, [isLoaded, signUp, setActive, router])

  return (
    <AuthCard title="Email Verification" description="Confirming your email address">
      <div className="flex flex-col items-center gap-3 py-6">
        {status === "loading" && (
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        )}
        {status === "success" && (
          <>
            <CheckCircle2 className="size-8 text-success" />
            <p className="text-sm text-muted-foreground">
              Email verified! Redirecting...
            </p>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="size-8 text-destructive" />
            <p className="text-sm text-muted-foreground">
              Verification failed.{" "}
              <a href="/sign-up" className="font-medium text-foreground hover:underline">
                Try again
              </a>
            </p>
          </>
        )}
      </div>
    </AuthCard>
  )
}
