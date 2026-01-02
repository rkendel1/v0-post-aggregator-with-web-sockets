"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ConnectedAccountsManager } from "./connected-accounts-manager"
import { ProfileSettings } from "./profile-settings"
import { RssImportManager } from "./rss-import-manager"
import type { UserProfile, UserRssFeed } from "@/lib/types"
import { UserProfileView } from "./user-profile-view"

interface SettingsPageContentProps {
  profile: UserProfile
  connectedAccounts: any[]
  availablePlatforms: any[]
  rssFeeds: UserRssFeed[]
}

export function SettingsPageContent({
  profile,
  connectedAccounts,
  availablePlatforms,
  rssFeeds,
}: SettingsPageContentProps) {
  const [activeTab, setActiveTab] = useState("settings")

  return (
    <div className="flex flex-col h-full">
      <header className="border-b bg-card p-4 sticky top-0 z-10">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 pt-4 border-b">
          <TabsList>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="settings" className="flex-1 overflow-auto mt-0">
          <div className="max-w-4xl mx-auto p-6 pb-14 md:pb-6">
            <p className="text-muted-foreground mb-6">Manage your profile, connections, and content sources.</p>
            <div className="space-y-8">
              <ProfileSettings profile={profile} />
              <ConnectedAccountsManager
                connectedAccounts={connectedAccounts}
                availablePlatforms={availablePlatforms}
              />
              <RssImportManager initialRssFeeds={rssFeeds} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="profile" className="flex-1 overflow-auto mt-0">
          <div className="max-w-4xl mx-auto p-6 pb-14 md:pb-6">
            <UserProfileView profile={profile} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
