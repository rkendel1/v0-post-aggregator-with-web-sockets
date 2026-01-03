import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

/**
 * Webhook Handler for External Platforms
 * 
 * This endpoint receives webhooks from external platforms (Reddit, Discord, etc.)
 * and aggregates posts into the aggregated_posts table.
 * 
 * Each platform has a different webhook format and verification method.
 */

interface WebhookPayload {
  platform: string
  event_type: string
  data: any
  signature?: string
  timestamp?: string
}

export async function POST(request: NextRequest) {
  try {
    // Use service role key for webhooks since they don't have user context
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const body = await request.json() as WebhookPayload
    const platform = body.platform?.toLowerCase()

    if (!platform) {
      return NextResponse.json(
        { error: 'Platform not specified' },
        { status: 400 }
      )
    }

    // Verify webhook signature based on platform
    const isValid = await verifyWebhookSignature(request, platform, body)
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      )
    }

    // Process webhook based on platform
    let result
    switch (platform) {
      case 'reddit':
        result = await handleRedditWebhook(supabase, body)
        break
      case 'discord':
        result = await handleDiscordWebhook(supabase, body)
        break
      case 'mastodon':
        result = await handleMastodonWebhook(supabase, body)
        break
      default:
        return NextResponse.json(
          { error: `Platform ${platform} not supported` },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      platform,
      result
    })

  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Verify webhook signature based on platform requirements
 */
async function verifyWebhookSignature(
  request: NextRequest,
  platform: string,
  body: WebhookPayload
): Promise<boolean> {
  // For development/testing, you might skip verification
  // In production, implement proper signature verification for each platform
  
  const signature = request.headers.get('x-webhook-signature')
  
  switch (platform) {
    case 'reddit':
      // Reddit webhook signature verification
      // https://www.reddit.com/dev/api#section_webhooks
      return verifyRedditSignature(signature, body)
    
    case 'discord':
      // Discord webhook signature verification
      // https://discord.com/developers/docs/resources/webhook
      return verifyDiscordSignature(signature, body)
    
    case 'mastodon':
      // Mastodon webhook signature verification
      return verifyMastodonSignature(signature, body)
    
    default:
      return false
  }
}

function verifyRedditSignature(signature: string | null, body: any): boolean {
  // TODO: Implement Reddit webhook signature verification
  // Reddit uses HMAC-SHA256 with a secret key
  // See: https://www.reddit.com/dev/api#section_webhooks
  
  // For production, implement proper verification:
  // const secret = process.env.REDDIT_WEBHOOK_SECRET
  // const hmac = crypto.createHmac('sha256', secret)
  // const digest = hmac.update(JSON.stringify(body)).digest('hex')
  // return signature === digest
  
  // SECURITY WARNING: Accepting all webhooks in development mode
  console.warn('Reddit webhook signature verification not implemented - accepting all')
  return true
}

function verifyDiscordSignature(signature: string | null, body: any): boolean {
  // TODO: Implement Discord webhook signature verification
  // Discord uses Ed25519 signature verification
  // See: https://discord.com/developers/docs/resources/webhook
  
  // SECURITY WARNING: Accepting all webhooks in development mode
  console.warn('Discord webhook signature verification not implemented - accepting all')
  return true
}

function verifyMastodonSignature(signature: string | null, body: any): boolean {
  // TODO: Implement Mastodon webhook signature verification
  // Mastodon uses HTTP signatures (https://docs.joinmastodon.org/spec/webhooks/)
  
  // SECURITY WARNING: Accepting all webhooks in development mode
  console.warn('Mastodon webhook signature verification not implemented - accepting all')
  return true
}

/**
 * Handle Reddit webhook
 */
async function handleRedditWebhook(supabase: any, payload: WebhookPayload) {
  const { event_type, data } = payload

  // Find connected account for this Reddit user
  const { data: connectedAccount, error: accountError } = await supabase
    .from('connected_accounts')
    .select('id, user_id, platforms(name)')
    .eq('platform_username', data.author)
    .eq('is_active', true)
    .single()

  if (accountError || !connectedAccount) {
    console.log('No connected account found for Reddit user:', data.author)
    return { processed: false, reason: 'No connected account' }
  }

  // Check for duplicate
  const externalPostId = data.id || data.name
  const { data: existing } = await supabase
    .from('aggregated_posts')
    .select('id')
    .eq('external_post_id', externalPostId)
    .single()

  if (existing) {
    return { processed: false, reason: 'Duplicate post' }
  }

  // Filter content
  if (shouldFilterContent(data.body || data.title || '')) {
    return { processed: false, reason: 'Filtered as spam' }
  }

  // Create aggregated post
  const { error: insertError } = await supabase
    .from('aggregated_posts')
    .insert({
      connected_account_id: connectedAccount.id,
      external_post_id: externalPostId,
      external_url: data.url,
      author_name: data.author,
      author_avatar: data.author_icon_url,
      content: data.body || data.title || '',
      external_created_at: data.created_utc 
        ? new Date(data.created_utc * 1000).toISOString() 
        : new Date().toISOString()
    })

  if (insertError) {
    console.error('Error inserting aggregated post:', insertError)
    return { processed: false, reason: insertError.message }
  }

  return { processed: true, post_id: externalPostId }
}

/**
 * Handle Discord webhook
 */
async function handleDiscordWebhook(supabase: any, payload: WebhookPayload) {
  // Similar implementation for Discord
  // Discord webhooks have different structure
  return { processed: false, reason: 'Discord webhook not yet implemented' }
}

/**
 * Handle Mastodon webhook
 */
async function handleMastodonWebhook(supabase: any, payload: WebhookPayload) {
  // Similar implementation for Mastodon
  return { processed: false, reason: 'Mastodon webhook not yet implemented' }
}

/**
 * Basic content filtering
 */
function shouldFilterContent(content: string): boolean {
  const spamPatterns = [
    /\b(buy now|click here|limited time|act now)\b/gi,
    /\b(viagra|cialis|pharmacy)\b/gi,
    /\b(casino|gambling|poker)\b/gi,
  ]

  for (const pattern of spamPatterns) {
    if (pattern.test(content)) {
      return true
    }
  }

  return false
}
