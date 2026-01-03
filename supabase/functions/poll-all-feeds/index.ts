import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import Parser from 'https://esm.sh/rss-parser@3.13.0'

interface Item {
  guid?: string;
  link?: string;
  title?: string;
  creator?: string;
  isoDate?: string;
  content?: string;
  contentSnippet?: string;
  description?: string;
  'content:encoded'?: string;
  enclosure?: {
    url?: string;
    type?: string;
  };
  itunes?: {
    image?: string;
    duration?: string;
    summary?: string;
  };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
}

// @ts-ignore: Deno global
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
// @ts-ignore: Deno global
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
// @ts-ignore: Deno global
const CRON_SECRET = Deno.env.get('CRON_SECRET')!

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization')
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    console.error("Unauthorized cron request")
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  })
  const parser = new Parser()

  // Get all official RSS feed URLs from the new table
  const { data: feeds, error: feedsError } = await supabase
    .from('show_rss_feeds')
    .select('rss_url, show_tags (*)')

  if (feedsError) {
    console.error("Error fetching feeds:", feedsError)
    return new Response(JSON.stringify({ error: 'Failed to fetch feeds' }), { status: 500, headers: corsHeaders })
  }
  if (!feeds || feeds.length === 0) {
    return new Response(JSON.stringify({ message: 'No official feeds to process' }), { status: 200, headers: corsHeaders })
  }

  let totalNewPosts = 0

  for (const feedInfo of feeds) {
    const showTag: any = feedInfo.show_tags
    if (!showTag) continue

    const url = feedInfo.rss_url
    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error(`Failed to fetch RSS feed: ${response.status}`)
      const xmlString = await response.text()
      const feed = await parser.parseString(xmlString)
      const feedTitle = feed.title || showTag.name || 'Untitled Feed'
      // @ts-ignore: Property 'image' might not exist on feed
      const feedImage = feed.itunes?.image || feed.image?.url || null

      const { data: existingPosts } = await supabase
        .from('posts')
        .select('external_guid')
        .eq('show_tag_id', showTag.id)
        .not('external_guid', 'is', null)
      
      const existingGuids = new Set(existingPosts?.map(p => p.external_guid) || [])

      const newPosts = feed.items
        .map((item: Item) => {
          const guid = item.guid || item.link
          if (!guid || existingGuids.has(guid) || !item.title) return null
          
          // Get the richest content available - prefer full content over snippet
          // RSS feeds often put timestamps and chapter markers in content/description
          const episodeDescription = item['content:encoded'] || item.content || item.description || item.itunes?.summary || item.contentSnippet || '';
          
          // Build post content with title and full description
          const postContent = [`#${showTag.tag} ${item.title}`, episodeDescription ? `\n\n${episodeDescription}` : ''].join('');

          return {
            content: postContent,
            author_name: item.creator || feedTitle,
            show_tag_id: showTag.id,
            user_id: showTag.claimed_by_user_id || null, // Attribute post to the claimed user, if any
            created_at: item.isoDate ? new Date(item.isoDate).toISOString() : new Date().toISOString(),
            external_guid: guid,
            external_url: item.link || null,
            image_url: item.itunes?.image || feedImage,
            audio_url: item.enclosure?.type?.startsWith('audio') ? item.enclosure.url : null,
          }
        })
        .filter(Boolean)

      if (newPosts.length > 0) {
        const { error: postsError } = await supabase.from('posts').insert(newPosts)
        if (postsError) throw new Error(`Post insertion failed: ${postsError.message}`)
        totalNewPosts += newPosts.length
      }

      await supabase
        .from('show_rss_feeds')
        .update({ last_fetched_at: new Date().toISOString() })
        .eq('rss_url', url)
        .eq('show_tag_id', showTag.id)

    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e)
      console.error(`Error processing URL ${url}:`, errorMessage)
    }
  }

  return new Response(JSON.stringify({ message: `Polling complete. Found ${totalNewPosts} new posts.` }), { headers: corsHeaders, status: 200 })
})