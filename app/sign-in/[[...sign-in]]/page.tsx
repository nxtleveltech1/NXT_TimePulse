import { SignIn } from "@clerk/nextjs"
import { ModeToggle } from "@/components/mode-toggle"

export default function SignInPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center">
      <div className="absolute top-4 right-4">
        <ModeToggle />
      </div>
      <SignIn />
    </div>
  )
}
