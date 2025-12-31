import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { AdminDashboard } from "./admin-dashboard"
import type { ShowTag, HashtagMapping } from "@/lib/types"

export default async function AdminPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // In a real app, you'd have role-based access control.
  // For now, we'll just check if the user is logged in.
  // A simple check could be against a list of admin user IDs.
  // const ADMIN_USER_IDS = ['...'];
  // if (!ADMIN_USER_IDS.includes(user.id)) {
  //   redirect('/');
  // }

  const [tagsResult, mappingsResult] = await Promise.all([
    supabase
      .from("show_tags")
      .select("*, user_rss_feeds(rss_url), subdomain_mappings(subdomain)")
      .order("tag", { ascending: true }),
    supabase
      .from("hashtag_mappings")
      .select("*, show_tags(*)")
      .order("hashtag", { ascending: true }),
  ])

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card p-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">Manage tags, mappings, and system settings.</p>
        </div>
      </header>
      <main className="max-w-7xl mx-auto p-4">
        <AdminDashboard
          initialTags={(tagsResult.data as ShowTag[]) || []}
          initialMappings={(mappingsResult.data as HashtagMapping[]) || []}
        />
      </main>
    </div>
  )
}