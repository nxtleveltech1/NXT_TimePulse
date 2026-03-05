"use client"

import { useClerk } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"

export function SignOutButtonStyled() {
  const { signOut } = useClerk()

  return (
    <Button
      variant="outline"
      className="w-full"
      onClick={() => signOut({ redirectUrl: "/" })}
    >
      Sign out
    </Button>
  )
}
