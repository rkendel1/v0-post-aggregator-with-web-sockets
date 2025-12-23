import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ConnectedAccountsManager } from "@/components/settings/connected-accounts-manager"
import { ProfileSettings } from "@/components/settings/profile-settings"
import { RssImportManager } from "@/components/settings/rss-import-manager"
import { Toaster } from "react-hot-toast"
import type { UserProfile, UserRssFeed } from "@/lib/types"

export default async function SettingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Fetch all necessary data in parallel
  const [profileResult, accountsResult, platformsResult, rssFeedsResult] = await Promise.all([
    supabase.from("user_profiles").select(`*`).eq("id", user.id).single(),
    supabase.from("connected_accounts").select(`*, platforms (*)`).eq("user_id", user.id),
    supabase.from("platforms").select("*").order("display_name"),
    supabase.from("user_rss_feeds").select("*").eq("user_id", user.id).order("title"),
  ])

  if (!profileResult.data) {
    redirect("/")
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-2">Manage your profile, connections, and content sources.</p>
        </div>

        <div className="space-y-8">
          <ProfileSettings profile={profileResult.data as UserProfile} />
          <ConnectedAccountsManager
            connectedAccounts={accountsResult.data || []}
            availablePlatforms={platformsResult.data || []}
          />
          <RssImportManager 
            initialRssFeeds={rssFeedsResult.data as UserRssFeed[] || []} 
          />
        </div>
      </div>
      <Toaster position="bottom-right" />
    </div>
  )
}