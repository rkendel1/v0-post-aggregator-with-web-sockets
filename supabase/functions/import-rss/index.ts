import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
// @ts-ignore: Deno relative import
import { verifyJwt } from '../_shared/auth.ts'
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

  const authResult = await verifyJwt(req)
  if (!authResult) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
  }
  const user_id = authResult.user_id

  try {
    const { rssUrls } = await req.json()
    
    if (!Array.isArray(rssUrls) || rssUrls.length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid or empty rssUrls array' }), { status: 400, headers: corsHeaders })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false }
    })

    const parser = new Parser()
    const results = []

    for (const url of rssUrls) {
      try {
        const response = await fetch(url)
        if (!response.ok) throw new Error(`Failed to fetch RSS feed: ${response.status} ${response.statusText}`)
        const xmlString = await response.text()
        const feed = await parser.parseString(xmlString)
        const feedTitle = feed.title || 'Untitled Feed'
        // @ts-ignore: Property 'image' might not exist on feed
        const feedImage = feed.itunes?.image || feed.image?.url || null

        const tagSlug = sanitizeForTag(feedTitle)
        const { data: tagData, error: tagError } = await supabase
          .from('show_tags')
          .upsert({ tag: tagSlug, name: feedTitle, category: 'RSS Imports' }, { onConflict: 'tag' })
          .select()
          .single()
        
        if (tagError) throw new Error(`Failed to create tag: ${tagError.message}`)
        const show_tag_id = tagData.id

        await supabase.from('tag_follows').upsert({ user_id, show_tag_id })
        await supabase.from('user_rss_feeds').upsert({ user_id, rss_url: url, title: feedTitle })

        const { data: existingPosts } = await supabase
          .from('posts')
          .select('external_guid')
          .eq('show_tag_id', show_tag_id)
          .not('external_guid', 'is', null)
        
        const existingGuids = new Set(existingPosts?.map(p => p.external_guid) || [])

        const newPosts = feed.items
          .map((item: Item) => {
            const guid = item.guid || item.link
            if (!guid || existingGuids.has(guid) || !item.title) {
              return null
            }
            
            const postContent = [
              `#${tagData.tag} ${item.title}`,
              item.contentSnippet ? `\n\n${item.contentSnippet.split('\n')[0]}` : '' // Use first line of snippet
            ].join('');

            return {
              content: postContent,
              author_name: item.creator || feedTitle,
              show_tag_id: show_tag_id,
              user_id: user_id,
              created_at: item.isoDate ? new Date(item.isoDate).toISOString() : new Date().toISOString(),
              external_guid: guid,
              external_url: item.link || null,
              image_url: item.itunes?.image || feedImage,
            }
          })
          .filter(Boolean)

        if (newPosts.length > 0) {
          const { error: postsError } = await supabase.from('posts').insert(newPosts)
          if (postsError) throw new Error(`Failed to insert posts: ${postsError.message}`)
        }

        results.push({ url, status: 'success', title: feedTitle, new_posts: newPosts.length })

      } catch (e) {
        console.error(`Error processing URL ${url}:`, e)
        const errorMessage = e instanceof Error ? e.message : 'Unknown error during feed processing'
        results.push({ url, status: 'failed', message: errorMessage })
      }
    }

    return new Response(JSON.stringify({ results }), { headers: corsHeaders, status: 200 })

  } catch (error) {
    console.error('Request error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown request error'
    return new Response(JSON.stringify({ error: errorMessage }), { headers: corsHeaders, status: 500 })
  }
})