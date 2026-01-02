import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Toaster } from "react-hot-toast"
import type { UserProfile, UserRssFeed } from "@/lib/types"
import { cookies } from "next/headers"
import { AppLayoutWrapper } from "@/components/layout/app-layout-wrapper"
import { SettingsPageContent } from "@/components/settings/settings-page-content"

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
    <AppLayoutWrapper>
      <SettingsPageContent
        profile={profileResult.data as UserProfile}
        connectedAccounts={accountsResult.data || []}
        availablePlatforms={platformsResult.data || []}
        rssFeeds={rssFeedsResult.data as UserRssFeed[] || []}
      />
      <Toaster position="bottom-right" />
    </AppLayoutWrapper>
  )
}