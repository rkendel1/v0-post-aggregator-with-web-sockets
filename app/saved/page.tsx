import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { SavedPostsFeed } from "@/components/queue/saved-posts-feed"
import type { Post } from "@/lib/types"
import { Toaster } from "react-hot-toast"
import { cookies } from "next/headers"
import { AppLayoutWrapper } from "@/components/layout/app-layout-wrapper"

export default async function SavedPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: savedPostsData, error } = await supabase
    .from("saved_posts")
    .select(
      `
      posts (
        *,
        show_tags (*),
        sources (*),
        comment_counts (*)
      )
    `,
    )
    .eq("user_id", user.id)
    .eq("is_saved", true)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching saved posts:", error)
  }

  const savedPosts = savedPostsData as ({ posts: Post | null })[] | null
  const posts = savedPosts?.map((sp) => sp.posts).filter((p): p is Post => p !== null) || []

  return (
    <AppLayoutWrapper>
      <div className="max-w-4xl mx-auto p-6 pb-14 md:pb-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Saved Posts</h1>
          <p className="text-muted-foreground mt-1">You have {posts.length} item(s) saved.</p>
        </div>
        <div className="max-w-2xl mx-auto">
          <SavedPostsFeed initialPosts={posts} />
        </div>
      </div>
      <Toaster position="bottom-right" />
    </AppLayoutWrapper>
  )
}