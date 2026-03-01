import { auth } from "@clerk/nextjs/server"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { SignOutButtonStyled } from "@/components/sign-out-button"

export default async function RequestAccessPage() {
  const { userId } = await auth()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center gap-3">
          <Image
            src="/timepulse-logo.png"
            alt="NXT TIME PULSE"
            width={200}
            height={57}
            className="h-12 w-auto object-contain"
            priority
          />
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
