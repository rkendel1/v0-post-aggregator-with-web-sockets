# OAuth Environment Variables

This file documents all environment variables needed for OAuth integration with external platforms.

## Required Base Variables

### Encryption Key
```bash
# Required for encrypting/decrypting OAuth tokens
# Generate with: openssl rand -base64 32
OAUTH_ENCRYPTION_KEY=your-32-character-encryption-key-here
```

### Base URL (Optional)
```bash
# Base URL for OAuth callbacks (auto-detected in most cases)
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```

## Platform-Specific OAuth Credentials

### Twitter/X OAuth 2.0
```bash
TWITTER_CLIENT_ID=your-twitter-client-id
TWITTER_CLIENT_SECRET=your-twitter-client-secret
```

**Setup Instructions:**
1. Go to https://developer.twitter.com/en/portal/dashboard
2. Create a new app or select existing app
3. Enable OAuth 2.0 in app settings
4. Add callback URL: `https://your-domain.com/api/oauth/twitter/callback`
5. Set required scopes: `tweet.read`, `tweet.write`, `users.read`, `offline.access`
6. Copy Client ID and Client Secret

### Reddit OAuth
```bash
REDDIT_CLIENT_ID=your-reddit-client-id
REDDIT_CLIENT_SECRET=your-reddit-client-secret
```

**Setup Instructions:**
1. Go to https://www.reddit.com/prefs/apps
2. Click "Create App" or "Create Another App"
3. Select "web app" as app type
4. Add redirect URI: `https://your-domain.com/api/oauth/reddit/callback`
5. Copy the client ID (under app name) and secret

### Mastodon OAuth
```bash
MASTODON_CLIENT_ID=your-mastodon-client-id
MASTODON_CLIENT_SECRET=your-mastodon-client-secret
MASTODON_INSTANCE_URL=https://mastodon.social  # or your instance
```

**Setup Instructions:**
1. Go to your Mastodon instance (e.g., https://mastodon.social)
2. Navigate to Settings > Development > New Application
3. Set application name and redirect URI: `https://your-domain.com/api/oauth/mastodon/callback`
4. Select scopes: `read`, `write`
5. Save application and copy Client ID and Client Secret

**Note:** Each Mastodon instance requires separate credentials. The instance URL must match where you registered your app.

### LinkedIn OAuth
```bash
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret
```

**Setup Instructions:**
1. Go to https://www.linkedin.com/developers/apps
2. Create a new app or select existing app
3. Go to "Auth" tab
4. Add redirect URL: `https://your-domain.com/api/oauth/linkedin/callback`
5. Request access to required scopes: `openid`, `profile`, `w_member_social`
6. Copy Client ID and Client Secret from "Auth" tab

### Discord OAuth
```bash
DISCORD_CLIENT_ID=your-discord-client-id
DISCORD_CLIENT_SECRET=your-discord-client-secret
```

**Setup Instructions:**
1. Go to https://discord.com/developers/applications
2. Create a new application or select existing
3. Go to "OAuth2" section
4. Add redirect: `https://your-domain.com/api/oauth/discord/callback`
5. Select scopes: `identify`, `guilds`
6. Copy Client ID and Client Secret from "OAuth2" tab

### Telegram (Special Case)
```bash
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
```

**Setup Instructions:**
1. Message [@BotFather](https://t.me/botfather) on Telegram
2. Send `/newbot` and follow instructions
3. Copy the bot token provided
4. Note: Telegram uses a widget-based auth, not standard OAuth 2.0

**Note:** Telegram authentication works differently. You'll need to implement the Telegram Login Widget for actual authentication. The current implementation is a placeholder.

## Environment File Example

Create a `.env.local` file in your project root:

```bash
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OAuth Encryption (Required)
OAUTH_ENCRYPTION_KEY=generate-with-openssl-rand-base64-32

# Twitter/X
TWITTER_CLIENT_ID=your-twitter-client-id
TWITTER_CLIENT_SECRET=your-twitter-client-secret

# Reddit
REDDIT_CLIENT_ID=your-reddit-client-id
REDDIT_CLIENT_SECRET=your-reddit-client-secret

# Mastodon
MASTODON_CLIENT_ID=your-mastodon-client-id
MASTODON_CLIENT_SECRET=your-mastodon-client-secret
MASTODON_INSTANCE_URL=https://mastodon.social

# LinkedIn
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret

# Discord
DISCORD_CLIENT_ID=your-discord-client-id
DISCORD_CLIENT_SECRET=your-discord-client-secret

# Telegram
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
```

## Security Best Practices

1. **Never commit `.env.local` to version control**
2. **Rotate credentials regularly**
3. **Use different credentials for development and production**
4. **Store production secrets in your hosting platform's secret manager** (Vercel, Netlify, etc.)
5. **Generate a strong encryption key**: `openssl rand -base64 32`
6. **Monitor OAuth app usage** in each platform's developer console

## Testing OAuth Flow

To test the OAuth flow without production credentials:

1. Set up a developer account on each platform
2. Use localhost callback URLs during development: `http://localhost:3000/api/oauth/[platform]/callback`
3. Some platforms (like Twitter) require you to add localhost URLs explicitly
4. Update to production URLs before deploying

## Troubleshooting

### "OAuth not configured" error
- Ensure environment variables are set correctly
- Restart your Next.js server after adding/changing environment variables
- Verify variable names match exactly (case-sensitive)

### "Invalid redirect URI" error
- Check that callback URL in platform settings matches exactly
- Include protocol (https://) and trailing path
- Some platforms are case-sensitive

### "Token encryption failed" error
- Ensure `OAUTH_ENCRYPTION_KEY` is set
- Key must be a valid base64 string
- Generate new key with: `openssl rand -base64 32`

### OAuth flow doesn't start
- Check browser console for JavaScript errors
- Verify user is authenticated (logged in to PodBridge)
- Check network tab for failed requests to `/api/oauth/[platform]/authorize`
