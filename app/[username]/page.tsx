import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { notFound } from "next/navigation"
import { UserProfilePage } from "@/components/profile/user-profile-page"
import type { Post, ShowTag } from "@/lib/types"

const POST_SELECT_QUERY = `
  *,
  show_tags (*),
  sources (*),
  comment_counts (*),
  reaction_counts (*, reaction_types (*)),
  user_profiles (*)
`

export default async function ProfilePage({ params }: { params: { username: string } }) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { username } = params

  // Fetch the profile, case-insensitive
  const { data: profile } = await supabase
    .from("user_profiles")
    .select(`*, user_follow_counts (*)`)
    .ilike("username", username)
    .limit(1) // Be resilient to potential duplicates
    .single()

  if (!profile) {
    notFound()
  }

  // Fetch the user's posts and show tags in parallel
  const [postsResult, showTagsResult] = await Promise.all([
    supabase
      .from("posts")
      .select(POST_SELECT_QUERY)
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("show_tags")
      .select("*")
      .order("name")
  ])

  return <UserProfilePage profile={profile} initialPosts={(postsResult.data as Post[]) || []} showTags={(showTagsResult.data as ShowTag[]) || []} />
}