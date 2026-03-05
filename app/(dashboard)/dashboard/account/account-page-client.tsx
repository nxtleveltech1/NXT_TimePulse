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
    <div className="space-y-8">
      <ProfileHeader onEdit={() => setActiveTab("edit")} />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="edit">Edit Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-8">
          <AccountInfoCard dbUser={dbUser} />
        </TabsContent>

        <TabsContent value="edit" className="mt-8">
          <AccountForm dbUser={dbUser} />
        </TabsContent>

        <TabsContent value="security" className="mt-8">
          <ChangePasswordForm />
        </TabsContent>
      </Tabs>
    </div>
  )
}
