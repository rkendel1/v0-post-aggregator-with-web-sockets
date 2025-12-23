import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ConnectedAccountsManager } from "@/components/settings/connected-accounts-manager"
import { ProfileSettings } from "@/components/settings/profile-settings"
import { RssImportManager } from "@/components/settings/rss-import-manager"
import { Toaster } from "react-hot-toast"
import type { UserProfile, UserRssFeed } from "@/lib/types"
import { cookies } from "next/headers"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default async function SettingsPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

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
        <div className="flex items-center gap-4 mb-8">
          <Button asChild variant="outline" size="icon">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back to feed</span>
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Settings</h1>
            <p className="text-muted-foreground mt-1">Manage your profile, connections, and content sources.</p>
          </div>
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