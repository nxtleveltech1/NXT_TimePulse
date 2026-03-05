import { ModeToggle } from "@/components/mode-toggle"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-foreground p-6 dark:bg-background">
      <div className="absolute top-4 right-4">
        <ModeToggle />
      </div>
      {children}
    </div>
  )
}
