import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import Parser from 'https://esm.sh/rss-parser@3.13.0'

interface RssItem {
  guid?: string;
  link?: string;
  title?: string;
  creator?: string;
  isoDate?: string;
  contentSnippet?: string;
  enclosure?: {
    url?: string;
    type?: string;
  };
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
const CRON_SECRET = Deno.env.get('CRON_SECRET')

/**
 * Automated Aggregation Function
 * This function polls RSS feeds from connected accounts and aggregates posts
 * It runs on a schedule and processes all active connected accounts
 */
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Verify cron secret for scheduled invocations
  if (CRON_SECRET) {
    const authHeader = req.headers.get('Authorization')
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      console.error("Unauthorized cron request")
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: corsHeaders 
      })
    }
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  })

  const startTime = new Date()
  let totalPostsFound = 0
  let totalPostsCreated = 0
  let totalErrors = 0

  try {
    // Get all active connected accounts that support reading
    const { data: connectedAccounts, error: accountsError } = await supabase
      .from('connected_accounts')
      .select(`
        id,
        user_id,
        platform_id,
        platform_username,
        is_active,
        last_synced_at,
        platforms (
          name,
          display_name,
          supports_read
        )
      `)
      .eq('is_active', true)

    if (accountsError) {
      console.error("Error fetching connected accounts:", accountsError)
      throw new Error(`Failed to fetch connected accounts: ${accountsError.message}`)
    }

    if (!connectedAccounts || connectedAccounts.length === 0) {
      return new Response(JSON.stringify({ 
        message: 'No active connected accounts to process',
        totalPostsFound: 0,
        totalPostsCreated: 0
      }), { 
        status: 200, 
        headers: corsHeaders 
      })
    }

    console.log(`Processing ${connectedAccounts.length} connected accounts`)

    // Process each connected account
    for (const account of connectedAccounts) {
      const platform = account.platforms as any
      
      // Skip if platform doesn't support reading
      if (!platform?.supports_read) {
        console.log(`Skipping ${account.id} - platform doesn't support reading`)
        continue
      }

      try {
        let postsFound = 0
        let postsCreated = 0

        // Platform-specific aggregation logic
        if (platform.name === 'rss') {
          const result = await aggregateRssFeed(supabase, account)
          postsFound = result.found
          postsCreated = result.created
        } else {
          // Placeholder for other platform integrations (Twitter, Reddit, etc.)
          console.log(`Platform ${platform.name} integration not yet implemented`)
          continue
        }

        totalPostsFound += postsFound
        totalPostsCreated += postsCreated

        // Update last_synced_at for the account
        await supabase
          .from('connected_accounts')
          .update({ 
            last_synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', account.id)

        // Log successful aggregation
        await supabase.from('aggregation_logs').insert({
          source_type: 'connected_account',
          source_id: account.id,
          status: 'success',
          posts_found: postsFound,
          posts_created: postsCreated
        })

      } catch (error) {
        totalErrors++
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.error(`Error processing account ${account.id}:`, errorMessage)

        // Log failed aggregation
        await supabase.from('aggregation_logs').insert({
          source_type: 'connected_account',
          source_id: account.id,
          status: 'failed',
          posts_found: 0,
          posts_created: 0,
          error_message: errorMessage
        })
      }
    }

    const duration = new Date().getTime() - startTime.getTime()
    const response = {
      message: 'Aggregation complete',
      accountsProcessed: connectedAccounts.length,
      totalPostsFound,
      totalPostsCreated,
      totalErrors,
      durationMs: duration
    }

    console.log('Aggregation complete:', response)
    return new Response(JSON.stringify(response), { 
      status: 200, 
      headers: corsHeaders 
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('Fatal error in aggregation:', errorMessage)
    
    return new Response(JSON.stringify({ 
      error: 'Aggregation failed',
      message: errorMessage 
    }), { 
      status: 500, 
      headers: corsHeaders 
    })
  }
})

/**
 * Aggregate posts from an RSS feed
 */
async function aggregateRssFeed(
  supabase: any,
  account: any
): Promise<{ found: number; created: number }> {
  // This would require the connected_account to have RSS feed URL stored
  // For now, this is a placeholder implementation
  // In a real implementation, you'd need to store RSS URLs in connected_accounts
  // or link them to user_rss_feeds table
  
  console.log(`RSS aggregation for account ${account.id} - not yet fully implemented`)
  return { found: 0, created: 0 }
}

/**
 * Detect if a post is a duplicate based on external_guid or content similarity
 */
async function isDuplicate(
  supabase: any,
  externalGuid: string,
  content: string,
  showTagId: string
): Promise<boolean> {
  // Check for exact GUID match
  if (externalGuid) {
    const { data, error } = await supabase
      .from('posts')
      .select('id')
      .eq('external_guid', externalGuid)
      .limit(1)

    if (error) {
      console.error('Error checking duplicate:', error)
      return false
    }

    if (data && data.length > 0) {
      return true
    }
  }

  // Check for content similarity (basic implementation)
  // In a production system, you might want fuzzy matching or hash-based comparison
  const { data, error } = await supabase
    .from('posts')
    .select('id, content')
    .eq('show_tag_id', showTagId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('Error checking content similarity:', error)
    return false
  }

  // Check if any recent post has very similar content
  const normalizedContent = content.toLowerCase().trim()
  for (const post of data || []) {
    const postContent = post.content.toLowerCase().trim()
    if (postContent === normalizedContent) {
      return true
    }
  }

  return false
}

/**
 * Basic content filtering and moderation
 * Returns true if content should be blocked
 */
function shouldFilterContent(content: string): boolean {
  // Basic spam detection patterns
  const spamPatterns = [
    /\b(buy now|click here|limited time|act now)\b/gi,
    /\b(viagra|cialis|pharmacy)\b/gi,
    /\b(casino|gambling|poker)\b/gi,
    /\b(weight loss|lose weight)\b/gi,
    /http[s]?:\/\/[^\s]+/gi, // Too many URLs might indicate spam
  ]

  let urlCount = 0
  for (const pattern of spamPatterns) {
    const matches = content.match(pattern)
    if (matches) {
      if (pattern.source.includes('http')) {
        urlCount = matches.length
        if (urlCount > 3) return true // Block if more than 3 URLs
      } else {
        return true // Block if matches other spam patterns
      }
    }
  }

  // Check for excessive caps (might be shouting/spam)
  const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length
  if (capsRatio > 0.5 && content.length > 20) {
    return true
  }

  return false
}
