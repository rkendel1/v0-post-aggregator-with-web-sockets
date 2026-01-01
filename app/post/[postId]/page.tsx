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

export default async function PostDetailPage({ params }: { params: { postId: string } }) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

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
    .eq("id", params.postId)
    .single()

  if (error || !postData) {
    redirect("/")
  }

  const post = postData as Post

  return (
    <div className="min-h-screen bg-background pb-14 md:pb-0">
      <header className="border-b bg-card p-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <div className="flex items-center justify-center">
            <Logo />
          </div>
          <div className="hidden md:block">
            <h1 className="text-2xl font-bold text-foreground">Post</h1>
          </div>
        </div>
        <div className="md:hidden mt-2">
          <h1 className="text-xl font-bold text-foreground">Post</h1>
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
