import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { AdminDashboard } from "./admin-dashboard"
import type { ShowTag } from "@/lib/types"

export default async function AdminPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: tagsResult } = await supabase
    .from("show_tags")
    .select("*, show_rss_feeds(rss_url), subdomain_mappings(subdomain), show_community_links(*)")
    .order("tag", { ascending: true })

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card p-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">Manage tags, mappings, and system settings.</p>
        </div>
      </header>
      <main className="max-w-7xl mx-auto p-4">
        <AdminDashboard initialTags={(tagsResult as any[]) || []} />
      </main>
    </div>
  )
}