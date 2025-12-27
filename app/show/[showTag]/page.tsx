import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import type { ShowTag, Post } from "@/lib/types"
import { ShowTagFeed } from "@/components/post-aggregator/show-tag-feed"
import { Button } from "@/components/ui/button"
import Link from "next/link"

const POST_SELECT_QUERY = `
  *,
  show_tags (*),
  sources (*),
  comment_counts (*),
  reaction_counts (*, reaction_types (*))
`
const POSTS_PER_PAGE = 20

export default async function ShowTagPage({ params }: { params: Promise<{ showTag: string }> }) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { showTag: tagSlug } = await params

  // Step 1: Find the requested tag by its slug (case-insensitive).
  const { data: requestedTag } = await supabase
    .from("show_tags")
    .select(`*`)
    .ilike("tag", tagSlug)
    .single()

  if (!requestedTag) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 text-center">
        <h1 className="text-4xl font-bold">Tag Not Found</h1>
        <p className="text-muted-foreground">
          The tag <span className="font-mono font-bold">#{tagSlug}</span> does not exist.
        </p>
        <Button asChild>
          <Link href="/">Return to the Main Feed</Link>
        </Button>
      </div>
    )
  }

  let canonicalTag = requestedTag as ShowTag

  // Step 2: If the tag is an alias (it has a parent_tag_id), fetch the canonical parent tag.
  if (requestedTag.parent_tag_id) {
    const { data: parentTagData } = await supabase
      .from("show_tags")
      .select(`*`)
      .eq("id", requestedTag.parent_tag_id)
      .single()
    
    // If the parent is found, it becomes the canonical tag for this page.
    if (parentTagData) {
      canonicalTag = parentTagData as ShowTag
    }
  }

  // Step 3: Fetch posts using the canonical tag's ID.
  const { data: initialPosts } = await supabase
    .from("posts")
    .select(POST_SELECT_QUERY)
    .eq("show_tag_id", canonicalTag.id)
    .order("created_at", { ascending: false })
    .range(0, POSTS_PER_PAGE - 1)

  // Render the feed using the canonical tag's data. The URL in the browser remains the alias.
  return (
    <main className="min-h-screen bg-background">
      <ShowTagFeed showTag={canonicalTag} initialPosts={(initialPosts as Post[]) || []} />
    </main>
  )
}