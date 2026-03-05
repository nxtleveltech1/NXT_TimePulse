import { AuthCard } from "@/components/auth/auth-card"
import { SignInForm } from "@/components/auth/sign-in-form"

export default function SignInPage() {
  return (
    <AuthCard
      title="Welcome back"
      description="Sign in to your account"
    >
      <SignInForm />
    </AuthCard>
  )
}
