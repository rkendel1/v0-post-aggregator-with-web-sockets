import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { SavedPostsPageContent } from "@/components/queue/saved-posts-page-content"
import type { Post, ShowTag } from "@/lib/types"
import { Toaster } from "react-hot-toast"
import { cookies } from "next/headers"

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

  // Fetch all available show tags
  const { data: showTags } = await supabase
    .from("show_tags")
    .select("*")
    .order("name")

  return (
    <>
      <SavedPostsPageContent initialPosts={posts} showTags={(showTags as ShowTag[]) || []} />
      <Toaster position="bottom-right" />
    </>
  )
}