import { createClient } from "@/lib/supabase/server"
import { PostAggregator } from "@/components/post-aggregator/post-aggregator"
import type { ShowTag } from "@/lib/types"
import { cookies } from "next/headers"

export default async function Home() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  // Fetch all available show tags
  const { data: showTags } = await supabase.from("show_tags").select("*").order("name")

  return (
    <main className="min-h-screen bg-background">
      <PostAggregator initialShowTags={(showTags as ShowTag[]) || []} />
    </main>
  )
}