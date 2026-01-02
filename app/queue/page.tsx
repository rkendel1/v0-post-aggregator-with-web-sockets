import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { QueueFeed } from "../../components/queue/queue-feed"
import type { Post } from "@/lib/types"
import { Toaster } from "react-hot-toast"
import { cookies } from "next/headers"
import { AppLayoutWrapper } from "@/components/layout/app-layout-wrapper"
import { QueuePageContent } from "@/components/queue/queue-page-content"

export default async function QueuePage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: queuedPostsData, error } = await supabase
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
    .not("queue_position", "is", null) // Fetch only items with a queue position
    .order("queue_position", { ascending: true })

  if (error) {
    console.error("Error fetching queued posts:", error)
  }

  const queuedPosts = queuedPostsData as ({ posts: Post | null })[] | null
  const posts = queuedPosts?.map((sp) => sp.posts).filter((p): p is Post => p !== null) || []

  return (
    <AppLayoutWrapper>
      <QueuePageContent initialPosts={posts} />
      <Toaster position="bottom-right" />
    </AppLayoutWrapper>
  )
}