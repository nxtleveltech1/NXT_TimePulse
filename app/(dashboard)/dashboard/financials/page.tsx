import { auth } from "@clerk/nextjs/server"
import { FinancialsContent } from "./financials-content"
import { isAdminOrManager } from "@/lib/auth"

export default async function FinancialsPage() {
  const { orgRole } = await auth()
  if (!isAdminOrManager(orgRole as string)) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Financials</h1>
        <p className="text-muted-foreground">Access restricted to admins and managers.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold">Financials</h1>
          <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            Admin
          </span>
        </div>
        <p className="text-muted-foreground">
          Revenue, costs, margins, and labour breakdown
        </p>
      </div>
      <FinancialsContent />
    </div>
  )
}
