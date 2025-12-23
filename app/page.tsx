import { createClient } from "@/lib/supabase/server"
import { PostAggregator } from "@/components/post-aggregator/post-aggregator"
import type { ShowTag } from "@/lib/types"

export default async function Home() {
  const supabase = await createClient()

  // Fetch all available show tags
  const { data: showTags } = await supabase.from("show_tags").select("*").order("name")

  return (
    <main className="min-h-screen bg-background">
      <PostAggregator initialShowTags={(showTags as ShowTag[]) || []} />
    </main>
  )
}