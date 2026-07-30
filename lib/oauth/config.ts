/**
 * OAuth Configuration for External Platforms
 * 
 * This file contains OAuth 2.0 configuration for each supported platform.
 * Add platform-specific credentials to your .env.local file.
 */

export interface OAuthConfig {
  clientId: string
  clientSecret: string
  authorizationUrl: string
  tokenUrl: string
  scope: string[]
  redirectUri: string
}

export interface PlatformOAuthConfig {
  [platformName: string]: OAuthConfig
}

/**
 * Get the base URL for OAuth callbacks
 */
export function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
  }
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL
  }
  return 'http://localhost:3000'
}

/**
 * OAuth configurations for each platform
 */
export const oauthConfigs: PlatformOAuthConfig = {
  twitter: {
    clientId: process.env.TWITTER_CLIENT_ID || '',
    clientSecret: process.env.TWITTER_CLIENT_SECRET || '',
    authorizationUrl: 'https://twitter.com/i/oauth2/authorize',
    tokenUrl: 'https://api.twitter.com/2/oauth2/token',
    scope: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
    redirectUri: `${getBaseUrl()}/api/oauth/twitter/callback`,
  },
  reddit: {
    clientId: process.env.REDDIT_CLIENT_ID || '',
    clientSecret: process.env.REDDIT_CLIENT_SECRET || '',
    authorizationUrl: 'https://www.reddit.com/api/v1/authorize',
    tokenUrl: 'https://www.reddit.com/api/v1/access_token',
    scope: ['identity', 'read', 'submit'],
    redirectUri: `${getBaseUrl()}/api/oauth/reddit/callback`,
  },
  mastodon: {
    clientId: process.env.MASTODON_CLIENT_ID || '',
    clientSecret: process.env.MASTODON_CLIENT_SECRET || '',
    // Note: Mastodon is decentralized, so this would need instance-specific config
    authorizationUrl: process.env.MASTODON_INSTANCE_URL 
      ? `${process.env.MASTODON_INSTANCE_URL}/oauth/authorize`
      : 'https://mastodon.social/oauth/authorize',
    tokenUrl: process.env.MASTODON_INSTANCE_URL
      ? `${process.env.MASTODON_INSTANCE_URL}/oauth/token`
      : 'https://mastodon.social/oauth/token',
    scope: ['read', 'write'],
    redirectUri: `${getBaseUrl()}/api/oauth/mastodon/callback`,
  },
  linkedin: {
    clientId: process.env.LINKEDIN_CLIENT_ID || '',
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
    authorizationUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    scope: ['openid', 'profile', 'w_member_social'],
    redirectUri: `${getBaseUrl()}/api/oauth/linkedin/callback`,
  },
  discord: {
    clientId: process.env.DISCORD_CLIENT_ID || '',
    clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
    authorizationUrl: 'https://discord.com/api/oauth2/authorize',
    tokenUrl: 'https://discord.com/api/oauth2/token',
    scope: ['identify', 'guilds'],
    redirectUri: `${getBaseUrl()}/api/oauth/discord/callback`,
  },
  telegram: {
    // Telegram uses a different auth flow (not OAuth 2.0)
    // This is a placeholder - actual implementation would use Telegram Login Widget
    clientId: process.env.TELEGRAM_BOT_TOKEN || '',
    clientSecret: '', // Not used for Telegram
    authorizationUrl: '', // Telegram uses widget-based auth
    tokenUrl: '',
    scope: [],
    redirectUri: `${getBaseUrl()}/api/oauth/telegram/callback`,
  },
}

/**
 * Get OAuth configuration for a specific platform
 */
export function getOAuthConfig(platform: string): OAuthConfig | null {
  const config = oauthConfigs[platform.toLowerCase()]
  
  if (!config) {
    return null
  }
  
  // Validate that required credentials are present
  if (!config.clientId || (!config.clientSecret && platform !== 'telegram')) {
    console.warn(`Missing OAuth credentials for platform: ${platform}`)
    return null
  }
  
  return config
}

/**
 * Check if a platform has OAuth configured
 */
export function isPlatformConfigured(platform: string): boolean {
  const config = getOAuthConfig(platform)
  return config !== null && config.clientId !== ''
}
