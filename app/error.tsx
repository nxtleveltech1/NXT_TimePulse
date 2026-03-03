"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[GlobalError]", error)
  }, [error])

  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Something went wrong</h1>
            <p className="text-muted-foreground">
              An unexpected error occurred. Please try again.
            </p>
            {error.digest && (
              <p className="font-mono text-xs text-muted-foreground">Error ID: {error.digest}</p>
            )}
          </div>
          <Button onClick={reset}>Try again</Button>
        </div>
      </body>
    </html>
  )
}
