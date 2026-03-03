import { auth } from "@clerk/nextjs/server"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { SignOutButtonStyled } from "@/components/sign-out-button"
import { ModeToggle } from "@/components/mode-toggle"
import { BrandLogo } from "@/components/brand-logo"

export default async function RequestAccessPage() {
  const { userId } = await auth()

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center p-8">
      <div className="absolute top-4 right-4">
        <ModeToggle />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="items-center gap-3">
          <BrandLogo height={48} />
          <CardDescription className="text-center">
            You must be invited to NXT TIME PULSE to access this application.
            Contact your administrator to receive an invitation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {userId ? (
            <SignOutButtonStyled />
          ) : (
            <Button asChild className="w-full">
              <Link href="/sign-in">Sign in</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
