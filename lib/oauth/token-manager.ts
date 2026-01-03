/**
 * Token Manager
 * 
 * Provides utilities for managing OAuth tokens including automatic refresh.
 * Use this when you need to access platform APIs with stored tokens.
 */

import { createClient } from '@/lib/supabase/client'
import { decryptToken, isTokenExpired } from './utils'

export interface PlatformToken {
  accessToken: string
  expiresAt: string | null
  scopes: string[]
}

/**
 * Get a valid access token for a connected account
 * Automatically refreshes if expired
 */
export async function getValidAccessToken(
  accountId: string
): Promise<PlatformToken | null> {
  const supabase = createClient()

  // Get the connected account
  const { data: account, error } = await supabase
    .from('connected_accounts')
    .select('*')
    .eq('id', accountId)
    .single()

  if (error || !account) {
    console.error('Failed to fetch connected account:', error)
    return null
  }

  // Check if token is expired
  if (account.token_expires_at && isTokenExpired(account.token_expires_at)) {
    // Try to refresh the token
    const refreshed = await refreshToken(accountId)
    
    if (!refreshed) {
      console.error('Failed to refresh expired token')
      return null
    }

    // Fetch updated account
    const { data: updatedAccount } = await supabase
      .from('connected_accounts')
      .select('*')
      .eq('id', accountId)
      .single()

    if (updatedAccount) {
      return {
        accessToken: decryptToken(updatedAccount.access_token),
        expiresAt: updatedAccount.token_expires_at,
        scopes: updatedAccount.scopes || [],
      }
    }
  }

  // Token is still valid, return it
  if (!account.access_token) {
    return null
  }

  try {
    return {
      accessToken: decryptToken(account.access_token),
      expiresAt: account.token_expires_at,
      scopes: account.scopes || [],
    }
  } catch (error) {
    console.error('Failed to decrypt token:', error)
    return null
  }
}

/**
 * Refresh an expired token
 */
async function refreshToken(accountId: string): Promise<boolean> {
  try {
    const response = await fetch('/api/oauth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ accountId }),
    })

    if (!response.ok) {
      console.error('Token refresh failed:', response.status)
      return false
    }

    const data = await response.json()
    return data.success === true
  } catch (error) {
    console.error('Error refreshing token:', error)
    return false
  }
}

/**
 * Get all valid access tokens for a user's connected accounts
 * Useful when posting to multiple platforms
 */
export async function getAllValidTokens(
  userId: string,
  platformNames?: string[]
): Promise<Map<string, PlatformToken>> {
  const supabase = createClient()
  const tokens = new Map<string, PlatformToken>()

  let query = supabase
    .from('connected_accounts')
    .select(`
      id,
      access_token,
      token_expires_at,
      scopes,
      platforms (
        name,
        display_name
      )
    `)
    .eq('user_id', userId)
    .eq('is_active', true)

  if (platformNames && platformNames.length > 0) {
    query = query.in('platforms.name', platformNames)
  }

  const { data: accounts, error } = await query

  if (error || !accounts) {
    console.error('Failed to fetch connected accounts:', error)
    return tokens
  }

  // Get valid tokens for each account
  for (const account of accounts) {
    const token = await getValidAccessToken(account.id)
    if (token && account.platforms?.name) {
      tokens.set(account.platforms.name, token)
    }
  }

  return tokens
}

/**
 * Check if a user has a valid connection for a specific platform
 */
export async function hasValidConnection(
  userId: string,
  platformName: string
): Promise<boolean> {
  const supabase = createClient()

  const { data: account } = await supabase
    .from('connected_accounts')
    .select(`
      id,
      token_expires_at,
      platforms!inner (
        name
      )
    `)
    .eq('user_id', userId)
    .eq('platforms.name', platformName)
    .eq('is_active', true)
    .single()

  if (!account) {
    return false
  }

  // Check if token is expired
  if (account.token_expires_at && isTokenExpired(account.token_expires_at)) {
    // Try to refresh
    const refreshed = await refreshToken(account.id)
    return refreshed
  }

  return true
}
