import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ConnectedAccountsManager } from "@/components/settings/connected-accounts-manager"
import { ProfileSettings } from "@/components/settings/profile-settings"
import { Toaster } from "react-hot-toast"
import type { UserProfile } from "@/lib/types"

export default async function SettingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Fetch user's profile
  const { data: profile } = await supabase.from("user_profiles").select(`*`).eq("id", user.id).single()

  if (!profile) {
    // This case should ideally not happen for a logged-in user who has completed setup,
    // but as a fallback, we can redirect them.
    redirect("/")
  }

  // Fetch user's connected accounts
  const { data: connectedAccounts } = await supabase
    .from("connected_accounts")
    .select(
      `
      *,
      platforms (*)
    `,
    )
    .eq("user_id", user.id)

  // Fetch all available platforms
  const { data: platforms } = await supabase.from("platforms").select("*").order("display_name")

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-2">Manage your connected accounts and preferences</p>
        </div>

        <div className="space-y-8">
          <ProfileSettings profile={profile as UserProfile} />
          <ConnectedAccountsManager connectedAccounts={connectedAccounts || []} availablePlatforms={platforms || []} />
        </div>
      </div>
      <Toaster position="bottom-right" />
    </div>
  )
}