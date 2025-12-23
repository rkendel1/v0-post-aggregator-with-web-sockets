import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { QueueFeed } from "../../components/queue/queue-feed"
import type { Post } from "@/lib/types"
import { Toaster } from "react-hot-toast"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default async function QueuePage() {
  const supabase = createClient()

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
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching saved posts:", error)
    // Render the page with an empty array in case of error
  }

  // Explicitly type the data from Supabase to guide TypeScript's inference
  const savedPosts = savedPostsData as ({ posts: Post | null })[] | null

  const posts = savedPosts?.map((sp) => sp.posts).filter((p): p is Post => p !== null) || []

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card p-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button asChild variant="outline" size="icon">
              <Link href="/">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">My Queue</h1>
              <p className="text-sm text-muted-foreground">You have {posts.length} item(s) saved for later.</p>
            </div>
          </div>
        </div>
      </header>
      <div className="max-w-2xl mx-auto p-4">
        <QueueFeed initialPosts={posts} />
      </div>
      <Toaster position="bottom-right" />
    </div>
  )
}