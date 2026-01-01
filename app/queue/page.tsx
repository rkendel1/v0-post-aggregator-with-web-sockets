import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { QueueFeed } from "../../components/queue/queue-feed"
import type { Post } from "@/lib/types"
import { Toaster } from "react-hot-toast"
import { cookies } from "next/headers"
import { MobileNav } from "@/components/post-aggregator/mobile-nav"
import { Logo } from "@/components/logo"

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
    <div className="min-h-screen bg-background pb-14 md:pb-0">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-8">
          <div className="flex items-center justify-center">
            <Logo />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Queue</h1>
            <p className="text-muted-foreground mt-1">You have {posts.length} item(s) in your queue. Drag to reorder.</p>
          </div>
        </div>
        <div className="max-w-2xl mx-auto">
          <QueueFeed initialPosts={posts} />
        </div>
      </div>
      <MobileNav />
      <Toaster position="bottom-right" />
    </div>
  )
}