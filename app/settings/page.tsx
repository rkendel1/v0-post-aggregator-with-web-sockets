import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Toaster } from "react-hot-toast"
import type { UserProfile, UserRssFeed, ShowTag } from "@/lib/types"
import { cookies } from "next/headers"
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
  const [profileResult, accountsResult, platformsResult, rssFeedsResult, showTagsResult] = await Promise.all([
    supabase.from("user_profiles").select(`*`).eq("id", user.id).single(),
    supabase.from("connected_accounts").select(`*, platforms (*)`).eq("user_id", user.id),
    supabase.from("platforms").select("*").order("display_name"),
    supabase.from("user_rss_feeds").select("*").eq("user_id", user.id).order("title"),
    supabase.from("show_tags").select("*").order("name"),
  ])

  if (!profileResult.data) {
    redirect("/")
  }

  return (
    <>
      <SettingsPageContent
        profile={profileResult.data as UserProfile}
        connectedAccounts={accountsResult.data || []}
        availablePlatforms={platformsResult.data || []}
        rssFeeds={rssFeedsResult.data as UserRssFeed[] || []}
        showTags={showTagsResult.data as ShowTag[] || []}
      />
      <Toaster position="bottom-right" />
    </>
  )
}