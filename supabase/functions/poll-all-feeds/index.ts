import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import Parser from 'https://esm.sh/rss-parser@3.13.0'

interface Item {
  guid?: string;
  link?: string;
  title?: string;
  creator?: string;
  isoDate?: string;
  contentSnippet?: string;
  itunes?: {
    image?: string;
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

const sanitizeForTag = (title: string) => {
  return title
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
    .slice(0, 50)
}

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

  // Get all unique RSS feed URLs from the system
  const { data: feeds, error: feedsError } = await supabase
    .from('user_rss_feeds')
    .select('rss_url, user_id, title')

  if (feedsError) {
    console.error("Error fetching feeds:", feedsError)
    return new Response(JSON.stringify({ error: 'Failed to fetch feeds' }), { status: 500, headers: corsHeaders })
  }
  if (!feeds || feeds.length === 0) {
    return new Response(JSON.stringify({ message: 'No feeds to process' }), { status: 200, headers: corsHeaders })
  }

  const uniqueUrls = [...new Map(feeds.map(item => [item.rss_url, item])).values()]
  let totalNewPosts = 0

  for (const feedInfo of uniqueUrls) {
    const url = feedInfo.rss_url
    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error(`Failed to fetch RSS feed: ${response.status}`)
      const xmlString = await response.text()
      const feed = await parser.parseString(xmlString)
      const feedTitle = feed.title || feedInfo.title || 'Untitled Feed'
      // @ts-ignore: Property 'image' might not exist on feed
      const feedImage = feed.itunes?.image || feed.image?.url || null

      const tagSlug = sanitizeForTag(feedTitle)
      const { data: tagData, error: tagError } = await supabase
        .from('show_tags')
        .upsert({ tag: tagSlug, name: feedTitle, category: 'RSS Imports' }, { onConflict: 'tag' })
        .select()
        .single()
      
      if (tagError) throw new Error(`Tag creation failed: ${tagError.message}`)
      const show_tag_id = tagData.id

      const { data: existingPosts } = await supabase
        .from('posts')
        .select('external_guid')
        .eq('show_tag_id', show_tag_id)
        .not('external_guid', 'is', null)
      
      const existingGuids = new Set(existingPosts?.map(p => p.external_guid) || [])

      const newPosts = feed.items
        .map((item: Item) => {
          const guid = item.guid || item.link
          if (!guid || existingGuids.has(guid) || !item.title) return null
          
          const postContent = [`#${tagData.tag} ${item.title}`, item.contentSnippet ? `\n\n${item.contentSnippet.split('\n')[0]}`: ''].join('');

          return {
            content: postContent,
            author_name: item.creator || feedTitle,
            show_tag_id: show_tag_id,
            user_id: feedInfo.user_id, // Attribute post to the user who added the feed
            created_at: item.isoDate ? new Date(item.isoDate).toISOString() : new Date().toISOString(),
            external_guid: guid,
            external_url: item.link || null,
            image_url: item.itunes?.image || feedImage,
          }
        })
        .filter(Boolean)

      if (newPosts.length > 0) {
        const { error: postsError } = await supabase.from('posts').insert(newPosts)
        if (postsError) throw new Error(`Post insertion failed: ${postsError.message}`)
        totalNewPosts += newPosts.length
      }

      await supabase
        .from('user_rss_feeds')
        .update({ last_fetched_at: new Date().toISOString() })
        .eq('rss_url', url)

    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e)
      console.error(`Error processing URL ${url}:`, errorMessage)
    }
  }

  return new Response(JSON.stringify({ message: `Polling complete. Found ${totalNewPosts} new posts.` }), { headers: corsHeaders, status: 200 })
})