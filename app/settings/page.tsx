import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ConnectedAccountsManager } from "@/components/settings/connected-accounts-manager"
import { RssImportManager } from "@/components/settings/rss-import-manager"
import { Toaster } from "react-hot-toast"

export default async function SettingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Fetch user's connected accounts
  const { data: connectedAccounts } = await supabase
    .from("connected_accounts")
    .select(`
      *,
      platforms (*)
    `)
    .eq("user_id", user.id)

  // Fetch all available platforms
  const { data: platforms } = await supabase.from("platforms").select("*").order("display_name")

  // Fetch user's imported RSS feeds
  const { data: rssFeeds } = await supabase
    .from("user_rss_feeds")
    .select("*")
    .eq("user_id", user.id)
    .order("title")

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-2">Manage your connected accounts and preferences</p>
        </div>

        <div className="space-y-8">
          <RssImportManager initialRssFeeds={rssFeeds || []} />
          <ConnectedAccountsManager connectedAccounts={connectedAccounts || []} availablePlatforms={platforms || []} />
        </div>
      </div>
      <Toaster position="bottom-right" />
    </div>
  )
}