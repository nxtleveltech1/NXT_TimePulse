import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Kiosk — TimePulse",
  description: "Employee time clock kiosk",
}

// Kiosk is public — no Clerk auth wrapper
export default function KioskLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  )
}
