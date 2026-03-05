import { AuthCard } from "@/components/auth/auth-card"
import { ResetPasswordForm } from "@/components/auth/reset-password-form"

export default function ResetPasswordPage() {
  return (
    <AuthCard
      title="Reset your password"
      description="Enter the code from your email and choose a new password"
    >
      <ResetPasswordForm />
    </AuthCard>
  )
}
