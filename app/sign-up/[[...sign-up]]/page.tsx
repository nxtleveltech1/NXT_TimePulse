import { SignUp } from "@clerk/nextjs"
import { ModeToggle } from "@/components/mode-toggle"

export default function SignUpPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center">
      <div className="absolute top-4 right-4">
        <ModeToggle />
      </div>
      <SignUp />
    </div>
  )
}
