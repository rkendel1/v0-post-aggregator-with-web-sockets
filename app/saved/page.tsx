import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { SavedPostsPageContent } from "@/components/queue/saved-posts-page-content"
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
      <SavedPostsPageContent initialPosts={posts} />
      <Toaster position="bottom-right" />
    </AppLayoutWrapper>
  )
}