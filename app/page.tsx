import { createClient } from "@/lib/supabase/server"
import { PostAggregator } from "@/components/post-aggregator/post-aggregator"
import type { CashTag } from "@/lib/types"

export default async function Home() {
  const supabase = await createClient()

  // Fetch all available cash tags
  const { data: cashTags } = await supabase.from("cash_tags").select("*").order("name")

  return (
    <main className="min-h-screen bg-background">
      <PostAggregator initialCashTags={(cashTags as CashTag[]) || []} />
    </main>
  )
}
