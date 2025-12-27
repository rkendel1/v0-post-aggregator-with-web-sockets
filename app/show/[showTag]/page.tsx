import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
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

// Define a type for the tag data with its parent
type ShowTagWithParent = ShowTag & { parent: ShowTag | null }

export default async function ShowTagPage({ params }: { params: Promise<{ showTag: string }> }) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { showTag: tagSlug } = await params

  // Fetch the tag by slug, and its potential parent
  const { data: tagData } = await supabase
    .from("show_tags")
    .select(`*, parent:parent_tag_id (*)`)
    .ilike("tag", tagSlug)
    .single()

  let requestedTag: ShowTagWithParent | null = tagData as ShowTagWithParent | null

  // Handle fuzzy search if no direct match
  if (!requestedTag) {
    const { data: fuzzyTags } = await supabase
      .from("show_tags")
      .select(`*, parent:parent_tag_id (*)`)
      .ilike("tag", `%${tagSlug}%`)
      .limit(1)

    if (fuzzyTags && fuzzyTags.length > 0) {
      requestedTag = fuzzyTags[0] as ShowTagWithParent
    }
  }

  if (!requestedTag) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 text-center">
        <h1 className="text-4xl font-bold">Tag Not Found</h1>
        <p className="text-muted-foreground">
          The tag <span className="font-mono font-bold">#{tagSlug}</span> does not exist yet.
        </p>
        <p className="max-w-md text-sm text-muted-foreground">
          You can create this tag by making the first post, or check your spelling and try again.
        </p>
        <Button asChild>
          <Link href="/">Return to the Main Feed</Link>
        </Button>
      </div>
    )
  }

  // Determine the canonical tag to use for fetching posts and for the UI.
  // If the requested tag has a parent, use the parent. Otherwise, use the tag itself.
  const canonicalTag = requestedTag.parent || requestedTag

  // Now we use the canonicalTag.id to fetch posts.
  const { data: initialPosts } = await supabase
    .from("posts")
    .select(POST_SELECT_QUERY)
    .eq("show_tag_id", canonicalTag.id) // Use canonical ID here
    .order("created_at", { ascending: false })
    .range(0, POSTS_PER_PAGE - 1)

  // Pass the canonical tag to the feed component.
  // This ensures that any new posts created from this page are associated with the correct canonical tag.
  return (
    <main className="min-h-screen bg-background">
      <ShowTagFeed showTag={canonicalTag as ShowTag} initialPosts={(initialPosts as Post[]) || []} />
    </main>
  )
}