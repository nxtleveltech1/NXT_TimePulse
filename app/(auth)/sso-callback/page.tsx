"use client"

import { useEffect } from "react"
import { useSignIn, useSignUp } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { AuthCard } from "@/components/auth/auth-card"

export default function SSOCallbackPage() {
  const { signIn, setActive: setSignInActive } = useSignIn()
  const { signUp, setActive: setSignUpActive } = useSignUp()
  const router = useRouter()

  useEffect(() => {
    async function handle() {
      if (!signIn || !signUp) return

      const params = new URLSearchParams(window.location.search)
      const transferable = params.get("__clerk_status") === "sign_up"

      try {
        if (transferable && signUp.status === "missing_requirements") {
          const result = await signUp.create({ transfer: true })
          if (result.status === "complete" && result.createdSessionId) {
            await setSignUpActive({ session: result.createdSessionId })
            router.push("/request-access")
          }
        } else {
          if (signIn.status === "complete" && signIn.createdSessionId) {
            await setSignInActive({ session: signIn.createdSessionId })
            router.push("/dashboard")
          }
        }
      } catch {
        router.push("/sign-in")
      }
    }

    handle()
  }, [signIn, signUp, setSignInActive, setSignUpActive, router])

  return (
    <AuthCard title="Completing sign in" description="Please wait...">
      <div className="flex items-center justify-center py-8">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    </AuthCard>
  )
}
