# Supabase Edge Functions

This directory contains Deno-based edge functions for PodBridge.

## Functions

### `poll-all-feeds`
Polls all official RSS feeds from the `show_rss_feeds` table and creates posts.

**Usage**: Scheduled cron job every 15-60 minutes

**Authentication**: Requires `CRON_SECRET` in Authorization header

### `aggregate-connected-accounts`
Polls connected accounts and aggregates posts from external platforms.

**Usage**: Scheduled cron job every 30-60 minutes

**Authentication**: Requires `CRON_SECRET` in Authorization header

### `import-rss`
User-triggered RSS import for adding new feeds.

**Usage**: Called from the UI when users add RSS feeds

**Authentication**: Requires valid JWT token

### `find-rss-from-url`
Discovers RSS feeds from a given URL.

**Usage**: Called from the UI to help users find RSS feeds

**Authentication**: Requires valid JWT token

## Deployment

### Using Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy all functions
supabase functions deploy

# Deploy a specific function
supabase functions deploy aggregate-connected-accounts
```

### Environment Variables

Set these in Supabase Dashboard under Edge Functions:

- `SUPABASE_URL`: Your Supabase project URL (auto-configured)
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key (auto-configured)
- `CRON_SECRET`: Secret token for authenticating cron jobs (create a secure random string)

### Testing Locally

```bash
# Serve a function locally
supabase functions serve aggregate-connected-accounts

# Test with curl
curl -X POST http://localhost:54321/functions/v1/aggregate-connected-accounts \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Scheduling

See the main [AUTOMATED_AGGREGATION.md](../../docs/AUTOMATED_AGGREGATION.md) documentation for setting up scheduled execution using:

- GitHub Actions (recommended for free tier)
- Supabase Cron (requires Pro plan)
- External cron services

## Shared Code

The `_shared` directory contains common utilities used across functions:

- `auth.ts`: JWT verification for user-triggered functions
