/**
 * OAuth Authorization Endpoint
 * 
 * Initiates the OAuth flow by redirecting the user to the platform's authorization page.
 * 
 * Route: /api/oauth/[platform]/authorize
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getOAuthConfig } from '@/lib/oauth/config'
import { createOAuthState, generatePKCE } from '@/lib/oauth/utils'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ platform: string }> }
) {
  try {
    const { platform } = await context.params
    
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

    // Get OAuth config for the platform
    const config = getOAuthConfig(platform)
    
    if (!config) {
      return NextResponse.json(
        { error: `OAuth not configured for platform: ${platform}` },
        { status: 400 }
      )
    }

    // Get platform ID from database
    const { data: platformData } = await supabase
      .from('platforms')
      .select('id')
      .eq('name', platform.toLowerCase())
      .single()

    if (!platformData) {
      return NextResponse.json(
        { error: `Platform not found: ${platform}` },
        { status: 404 }
      )
    }

    // Generate PKCE for platforms that support it (Twitter, etc.)
    const pkce = generatePKCE()
    
    // Create OAuth state
    const oauthState = createOAuthState(platformData.id, user.id, pkce.codeVerifier)
    
    // Store state in a cookie (expires in 10 minutes)
    const response = NextResponse.redirect(
      buildAuthorizationUrl(config, oauthState.state, pkce.codeChallenge, platform)
    )
    
    response.cookies.set(`oauth_state_${platform}`, JSON.stringify(oauthState), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    })

    return response
  } catch (error) {
    console.error('OAuth authorization error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate OAuth flow' },
      { status: 500 }
    )
  }
}

/**
 * Build the authorization URL with all required parameters
 */
function buildAuthorizationUrl(
  config: any,
  state: string,
  codeChallenge: string,
  platform: string
): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    state,
    scope: config.scope.join(' '),
  })

  // Add PKCE parameters for platforms that support it
  if (platform === 'twitter' || platform === 'reddit') {
    params.append('code_challenge', codeChallenge)
    params.append('code_challenge_method', 'S256')
  }

  // Platform-specific parameters
  if (platform === 'reddit') {
    params.append('duration', 'permanent')
  }

  return `${config.authorizationUrl}?${params.toString()}`
}
