import { AuthCard } from "@/components/auth/auth-card"
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Forgot password?"
      description="Enter your email and we'll send you a reset code"
    >
      <ForgotPasswordForm />
    </AuthCard>
  )
}
