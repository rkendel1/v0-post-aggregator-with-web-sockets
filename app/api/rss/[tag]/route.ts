import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import RSS from "rss"

export async function GET(
  request: NextRequest,
  { params }: { params: { tag: string } }
) {
  const supabase = createClient()
  const tagSlug = params.tag

  if (!tagSlug) {
    return new NextResponse("Tag parameter is required", { status: 400 })
  }

  // 1. Fetch the show tag details
  const { data: showTag, error: tagError } = await supabase
    .from("show_tags")
    .select("*")
    .eq("tag", tagSlug)
    .single()

  if (tagError || !showTag) {
    return new NextResponse("Tag not found", { status: 404 })
  }

  // 2. Fetch posts for this tag
  const { data: posts, error: postsError } = await supabase
    .from("posts")
    .select("*")
    .eq("show_tag_id", showTag.id)
    .order("created_at", { ascending: false })
    .limit(50) // Limit to the 50 most recent posts

  if (postsError) {
    return new NextResponse("Error fetching posts", { status: 500 })
  }

  // 3. Generate the RSS feed
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  const feed = new RSS({
    title: `#${showTag.tag} - ${showTag.name} on PodBridge`,
    description: `Posts and discussions for the tag #${showTag.tag} on PodBridge.`,
    feed_url: `${siteUrl}/api/rss/${tagSlug}`,
    site_url: siteUrl,
    language: "en",
    pubDate: new Date(),
    ttl: 60,
  })

  posts?.forEach((post) => {
    feed.item({
      title: post.content.substring(0, 100), // Use a snippet of the content as title
      description: post.content,
      url: post.external_url || `${siteUrl}/post/${post.id}`, // Link to external or internal post
      guid: post.id,
      author: post.author_name,
      date: post.created_at,
    })
  })

  const xml = feed.xml({ indent: true })

  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  })
}