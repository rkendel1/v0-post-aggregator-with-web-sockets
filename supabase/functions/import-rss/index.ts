import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
// @ts-ignore: Deno relative import
import { verifyJwt } from '../_shared/auth.ts'
import Parser from 'https://esm.sh/rss-parser@3.13.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
}

// @ts-ignore: Deno global
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
// @ts-ignore: Deno global
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

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

    // Use the service role key for database operations that might involve complex inserts/updates
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
      }
    })

    const parser = new Parser()
    const results = []

    for (const url of rssUrls) {
      try {
        // 1. Fetch and parse the RSS feed to get the title
        const feed = await parser.parseURL(url)
        const title = feed.title || 'Untitled Feed'

        // 2. Insert into user_rss_feeds table
        const { data, error } = await supabase
          .from('user_rss_feeds')
          .insert({
            user_id: user_id,
            rss_url: url,
            title: title,
          })
          .select()
          .single()
        
        if (error && error.code === '23505') { // Unique violation (already exists)
          results.push({ url, status: 'skipped', message: 'Feed already imported' })
        } else if (error) {
          throw error
        } else {
          results.push({ url, status: 'success', title: data.title })
        }

      } catch (e) {
        console.error(`Error processing URL ${url}:`, e)
        // Safely access error message
        const errorMessage = e instanceof Error ? e.message : 'Unknown error during feed processing'
        results.push({ url, status: 'failed', message: errorMessage })
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: corsHeaders,
      status: 200,
    })

  } catch (error) {
    console.error('Request error:', error)
    // Safely access error message
    const errorMessage = error instanceof Error ? error.message : 'Unknown request error'
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: corsHeaders,
      status: 500,
    })
  }
})