import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import type { ShowTag } from "@/lib/types"
import { ShowTagFeed } from "@/components/post-aggregator/show-tag-feed"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default async function ShowTagPage({ params }: { params: Promise<{ showTag: string }> }) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { showTag: tagSlug } = await params

  // Step 1: Try for an exact match first (case-insensitive)
  let { data: showTag } = await supabase
    .from("show_tags")
    .select("*")
    .ilike("tag", tagSlug)
    .single()

  // Step 2: If no exact match, try a fuzzy search
  if (!showTag) {
    const { data: fuzzyTags } = await supabase
      .from("show_tags")
      .select("*")
      .ilike("tag", `%${tagSlug}%`)
      .limit(1) // Just get the first match to avoid ambiguity

    if (fuzzyTags && fuzzyTags.length > 0) {
      showTag = fuzzyTags[0]
    }
  }

  if (!showTag) {
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

  return (
    <main className="min-h-screen bg-background">
      <ShowTagFeed showTag={showTag as ShowTag} />
    </main>
  )
}