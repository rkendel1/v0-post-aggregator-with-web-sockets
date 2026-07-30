/**
 * OAuth Callback Endpoint
 * 
 * Handles the OAuth callback from external platforms, exchanges the authorization code
 * for access tokens, and stores them securely in the database.
 * 
 * Route: /api/oauth/[platform]/callback
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getOAuthConfig, type OAuthConfig } from '@/lib/oauth/config'
import { validateOAuthState, encryptToken, calculateTokenExpiry } from '@/lib/oauth/utils'
import type { OAuthState } from '@/lib/oauth/utils'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ platform: string }> }
) {
  try {
    const { platform } = await context.params
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // Handle OAuth errors
    if (error) {
      const errorDescription = searchParams.get('error_description') || 'Authorization failed'
      console.error(`OAuth error for ${platform}:`, error, errorDescription)
      return NextResponse.redirect(
        `${request.nextUrl.origin}/settings?error=oauth_failed&platform=${platform}`
      )
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${request.nextUrl.origin}/settings?error=missing_params`
      )
    }

    // Get and validate state from cookie
    const cookieStore = await cookies()
    const stateCookie = cookieStore.get(`oauth_state_${platform}`)
    
    if (!stateCookie) {
      return NextResponse.redirect(
        `${request.nextUrl.origin}/settings?error=invalid_state`
      )
    }

    const oauthState: OAuthState = JSON.parse(stateCookie.value)
    
    if (!validateOAuthState(oauthState, state)) {
      return NextResponse.redirect(
        `${request.nextUrl.origin}/settings?error=invalid_state`
      )
    }

    // Exchange code for tokens
    const config = getOAuthConfig(platform)
    
    if (!config) {
      return NextResponse.redirect(
        `${request.nextUrl.origin}/settings?error=config_error`
      )
    }

    const tokenResponse = await exchangeCodeForTokens(
      code,
      config,
      platform,
      oauthState.codeVerifier
    )

    if (!tokenResponse) {
      return NextResponse.redirect(
        `${request.nextUrl.origin}/settings?error=token_exchange_failed`
      )
    }

    // Get user info from the platform
    const platformUserInfo = await fetchPlatformUserInfo(
      platform,
      tokenResponse.access_token
    )

    if (!platformUserInfo) {
      return NextResponse.redirect(
        `${request.nextUrl.origin}/settings?error=user_info_failed`
      )
    }

    // Store the connected account
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {}
          },
        },
      }
    )

    // Encrypt tokens before storing
    const encryptedAccessToken = encryptToken(tokenResponse.access_token)
    const encryptedRefreshToken = tokenResponse.refresh_token
      ? encryptToken(tokenResponse.refresh_token)
      : null

    const expiresAt = tokenResponse.expires_in
      ? calculateTokenExpiry(tokenResponse.expires_in)
      : null

    const { error: dbError } = await supabase
      .from('connected_accounts')
      .upsert({
        user_id: oauthState.userId,
        platform_id: oauthState.platformId,
        platform_user_id: platformUserInfo.id,
        platform_username: platformUserInfo.username,
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        token_expires_at: expiresAt?.toISOString(),
        scopes: tokenResponse.scope?.split(' ') || config.scope,
        is_active: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,platform_id,platform_user_id',
      })

    if (dbError) {
      console.error('Error storing connected account:', dbError)
      return NextResponse.redirect(
        `${request.nextUrl.origin}/settings?error=storage_failed`
      )
    }

    // Clear the state cookie
    const response = NextResponse.redirect(
      `${request.nextUrl.origin}/settings?success=connected&platform=${platform}`
    )
    response.cookies.delete(`oauth_state_${platform}`)

    return response
  } catch (error) {
    console.error('OAuth callback error:', error)
    return NextResponse.redirect(
      `${request.nextUrl.origin}/settings?error=callback_failed`
    )
  }
}

/**
 * Exchange authorization code for access tokens
 */
async function exchangeCodeForTokens(
  code: string,
  config: OAuthConfig,
  platform: string,
  codeVerifier?: string
): Promise<any> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: config.redirectUri,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  })

  // Add PKCE verifier for platforms that support it
  if (codeVerifier && (platform === 'twitter' || platform === 'reddit')) {
    body.append('code_verifier', codeVerifier)
  }

  try {
    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        // Reddit requires Basic auth
        ...(platform === 'reddit' && {
          Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`,
        }),
      },
      body: body.toString(),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Token exchange failed:', response.status, errorText)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('Token exchange error:', error)
    return null
  }
}

/**
 * Fetch user information from the platform
 */
async function fetchPlatformUserInfo(
  platform: string,
  accessToken: string
): Promise<{ id: string; username: string } | null> {
  const endpoints: Record<string, string> = {
    twitter: 'https://api.twitter.com/2/users/me',
    reddit: 'https://oauth.reddit.com/api/v1/me',
    mastodon: `${process.env.MASTODON_INSTANCE_URL || 'https://mastodon.social'}/api/v1/accounts/verify_credentials`,
    linkedin: 'https://api.linkedin.com/v2/userinfo',
    discord: 'https://discord.com/api/users/@me',
  }

  const endpoint = endpoints[platform]
  if (!endpoint) {
    console.error(`No user info endpoint for platform: ${platform}`)
    return null
  }

  try {
    const response = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      console.error('Failed to fetch user info:', response.status)
      return null
    }

    const data = await response.json()

    // Map platform-specific response to standard format
    switch (platform) {
      case 'twitter':
        // Twitter API v2 returns data in a nested structure
        if (!data.data || !data.data.id || !data.data.username) {
          console.error('Invalid Twitter API response structure:', data)
          return null
        }
        return { id: data.data.id, username: data.data.username }
      case 'reddit':
        return { id: data.id, username: data.name }
      case 'mastodon':
        return { id: data.id, username: data.username }
      case 'linkedin':
        return { id: data.sub, username: data.name || data.email }
      case 'discord':
        return { id: data.id, username: data.username }
      default:
        return null
    }
  } catch (error) {
    console.error('Error fetching user info:', error)
    return null
  }
}
