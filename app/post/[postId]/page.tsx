import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import type { Post } from "@/lib/types"
import { Toaster } from "react-hot-toast"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { cookies } from "next/headers"
import { PostDetailView } from "@/components/post-aggregator/post-detail-view"
import { MobileNav } from "@/components/post-aggregator/mobile-nav"
import { Logo } from "@/components/logo"

export default async function PostDetailPage({ params }: { params: Promise<{ postId: string }> }) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { postId } = await params

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: postData, error } = await supabase
    .from("posts")
    .select(
      `
      *,
      show_tags (*),
      sources (*),
      comment_counts (*),
      reaction_counts (*, reaction_types (*)),
      user_profiles (*)
    `,
    )
    .eq("id", postId)
    .single()

  if (error || !postData) {
    redirect("/")
  }

  const post = postData as Post

  return (
    <div className="min-h-screen bg-background pb-14 md:pb-0">
      <header className="border-b bg-card p-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto">
          <Logo />
          <div className="mt-2">
            <h1 className="text-xl md:text-2xl font-bold text-foreground">Post</h1>
          </div>
        </div>
      </header>
      <div className="max-w-2xl mx-auto p-4">
        <PostDetailView post={post} currentUser={user} />
      </div>
      <MobileNav />
      <Toaster position="bottom-right" />
    </div>
  )
}
