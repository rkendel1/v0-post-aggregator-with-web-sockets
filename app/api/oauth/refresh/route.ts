/**
 * OAuth Token Refresh Endpoint
 * 
 * Refreshes expired access tokens using refresh tokens.
 * 
 * Route: /api/oauth/refresh
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getOAuthConfig, type OAuthConfig } from '@/lib/oauth/config'
import { encryptToken, decryptToken, calculateTokenExpiry } from '@/lib/oauth/utils'

export async function POST(request: NextRequest) {
  try {
    const { accountId } = await request.json()

    if (!accountId) {
      return NextResponse.json(
        { error: 'Missing accountId' },
        { status: 400 }
      )
    }

    // Get the authenticated user
    const cookieStore = await cookies()
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

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get the connected account with platform info
    const { data: account, error: accountError } = await supabase
      .from('connected_accounts')
      .select(`
        *,
        platforms (
          name,
          display_name
        )
      `)
      .eq('id', accountId)
      .eq('user_id', user.id)
      .single()

    if (accountError || !account) {
      return NextResponse.json(
        { error: 'Connected account not found' },
        { status: 404 }
      )
    }

    if (!account.refresh_token) {
      return NextResponse.json(
        { error: 'No refresh token available' },
        { status: 400 }
      )
    }

    // Get platform OAuth config
    const config = getOAuthConfig(account.platforms.name)
    
    if (!config) {
      return NextResponse.json(
        { error: 'OAuth not configured for this platform' },
        { status: 400 }
      )
    }

    // Decrypt the refresh token
    const refreshToken = decryptToken(account.refresh_token)

    // Refresh the access token
    const tokenResponse = await refreshAccessToken(
      refreshToken,
      config,
      account.platforms.name
    )

    if (!tokenResponse) {
      return NextResponse.json(
        { error: 'Failed to refresh token' },
        { status: 500 }
      )
    }

    // Encrypt new tokens
    const encryptedAccessToken = encryptToken(tokenResponse.access_token)
    const encryptedRefreshToken = tokenResponse.refresh_token
      ? encryptToken(tokenResponse.refresh_token)
      : account.refresh_token // Keep old refresh token if new one not provided

    const expiresAt = tokenResponse.expires_in
      ? calculateTokenExpiry(tokenResponse.expires_in)
      : null

    // Update the connected account with new tokens
    const { error: updateError } = await supabase
      .from('connected_accounts')
      .update({
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        token_expires_at: expiresAt?.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', accountId)

    if (updateError) {
      console.error('Error updating tokens:', updateError)
      return NextResponse.json(
        { error: 'Failed to update tokens' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Token refresh error:', error)
    return NextResponse.json(
      { error: 'Failed to refresh token' },
      { status: 500 }
    )
  }
}

/**
 * Refresh the access token using the refresh token
 */
async function refreshAccessToken(
  refreshToken: string,
  config: OAuthConfig,
  platform: string
): Promise<any> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  })

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
      console.error('Token refresh failed:', response.status, errorText)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('Token refresh error:', error)
    return null
  }
}
