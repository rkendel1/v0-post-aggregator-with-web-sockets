"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ConnectedAccountsManager } from "./connected-accounts-manager"
import { ProfileSettings } from "./profile-settings"
import { RssImportManager } from "./rss-import-manager"
import { AppLayoutClient } from "@/components/layout/app-layout-client"
import type { UserProfile, UserRssFeed, ShowTag } from "@/lib/types"
import { UserProfileView } from "./user-profile-view"

interface SettingsPageContentProps {
  profile: UserProfile
  connectedAccounts: any[]
  availablePlatforms: any[]
  rssFeeds: UserRssFeed[]
  showTags: ShowTag[]
}

export function SettingsPageContent({
  profile,
  connectedAccounts,
  availablePlatforms,
  rssFeeds,
  showTags,
}: SettingsPageContentProps) {
  const [activeTab, setActiveTab] = useState("settings")

  return (
    <AppLayoutClient
      showTags={showTags}
      pageTitle="Settings"
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
        <div className="px-6 pt-4">
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
    </AppLayoutClient>
  )
}
