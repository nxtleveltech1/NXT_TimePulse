import { KioskClock } from "@/components/time-capture/kiosk-clock"

export const dynamic = "force-dynamic"

export default async function KioskPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string }>
}) {
  const { org } = await searchParams
  const orgId = org ?? process.env.CLERK_ORG_ID ?? ""
  const kioskSecret = process.env.KIOSK_SECRET

  if (!orgId) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-semibold">Kiosk not configured</h1>
          <p className="text-muted-foreground text-sm">
            Add <code className="bg-muted px-1 rounded">?org=YOUR_ORG_ID</code> to the URL, or set{" "}
            <code className="bg-muted px-1 rounded">CLERK_ORG_ID</code> in environment variables.
          </p>
        </div>
      </div>
    )
  }

  return <KioskClock orgId={orgId} kioskSecret={kioskSecret} />
}
