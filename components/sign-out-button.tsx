"use client"

import { SignOutButton } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"

export function SignOutButtonStyled() {
  return (
    <SignOutButton signOutOptions={{ redirectUrl: "/" }}>
      <Button variant="outline" className="w-full">
        Sign out
      </Button>
    </SignOutButton>
  )
}
