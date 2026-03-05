"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProfileHeader } from "./profile-header"
import { AccountInfoCard } from "./account-info-card"
import { AccountForm } from "./account-form"
import { ChangePasswordForm } from "./change-password-form"

interface AccountPageClientProps {
  dbUser?: {
    employeeCode?: string | null
    employmentType?: string | null
    baseRate?: number | null
    currency?: string | null
    phone?: string | null
    status?: string | null
    role?: string | null
  }
}

export function AccountPageClient({ dbUser }: AccountPageClientProps) {
  const [activeTab, setActiveTab] = useState("overview")

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <ProfileHeader onEdit={() => setActiveTab("edit")} />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full">
          <TabsTrigger value="overview" className="flex-1">
            Overview
          </TabsTrigger>
          <TabsTrigger value="edit" className="flex-1">
            Edit Profile
          </TabsTrigger>
          <TabsTrigger value="security" className="flex-1">
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <AccountInfoCard dbUser={dbUser} />
        </TabsContent>

        <TabsContent value="edit" className="mt-6">
          <AccountForm dbUser={dbUser} />
        </TabsContent>

        <TabsContent value="security" className="mt-6">
          <ChangePasswordForm />
        </TabsContent>
      </Tabs>
    </div>
  )
}
