import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { notFound } from "next/navigation"
import type { ShowTag } from "@/lib/types"
import { ShowTagFeed } from "@/components/post-aggregator/show-tag-feed"

export default async function ShowTagPage({ params }: { params: { showTag: string } }) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const tagSlug = params.showTag

  const { data: showTag } = await supabase
    .from("show_tags")
    .select("*")
    .ilike("tag", tagSlug)
    .single()

  if (!showTag) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-background">
      <ShowTagFeed showTag={showTag as ShowTag} />
    </main>
  )
}