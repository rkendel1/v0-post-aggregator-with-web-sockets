# Automated Aggregation System

This document describes the automated aggregation system for PodBridge, which pulls posts from external platforms and RSS feeds.

## Overview

The automated aggregation system consists of:

1. **Database tables** for storing feeds and tracking aggregation
2. **Background jobs** (Supabase Edge Functions) for polling RSS feeds and connected accounts
3. **Webhook handlers** for real-time updates from platforms that support webhooks
4. **Content filtering** to prevent spam and inappropriate content
5. **Duplicate detection** to avoid showing the same content multiple times

## Architecture

### Database Tables

#### `show_rss_feeds`
Official RSS feeds associated with show tags. These are polled automatically.

```sql
- id: uuid
- show_tag_id: uuid (FK to cash_tags)
- rss_url: text
- title: text
- last_fetched_at: timestamp
- is_active: boolean
- fetch_interval_minutes: int (default 60)
```

#### `user_rss_feeds`
User-submitted RSS feeds that are linked to show tags.

```sql
- id: uuid
- user_id: uuid (FK to auth.users)
- show_tag_id: uuid (FK to cash_tags)
- rss_url: text
- title: text
- last_fetched_at: timestamp
```

#### `aggregation_logs`
Logs of aggregation runs for monitoring and debugging.

```sql
- id: uuid
- source_type: text ('rss', 'webhook', 'api')
- source_id: uuid
- status: text ('success', 'failed', 'partial')
- posts_found: int
- posts_created: int
- error_message: text
- created_at: timestamp
```

### Background Jobs

#### `poll-all-feeds`
Existing edge function that polls all official RSS feeds from `show_rss_feeds` table.

- **Schedule**: Run via cron (recommended every 15-60 minutes)
- **Authentication**: Requires `CRON_SECRET` in Authorization header
- **Duplicate detection**: Uses `external_guid` field to prevent duplicates

#### `aggregate-connected-accounts`
New edge function that polls connected accounts for new content.

- **Schedule**: Run via cron (recommended every 30-60 minutes)
- **Authentication**: Requires `CRON_SECRET` in Authorization header
- **Supports**: RSS feeds (other platforms to be implemented)
- **Features**:
  - Duplicate detection via `external_guid`
  - Content filtering/spam detection
  - Error logging

### Webhook Handler

#### `/api/webhooks`
REST API endpoint for receiving webhooks from external platforms.

**Supported Platforms**:
- Reddit (planned)
- Discord (planned)
- Mastodon (planned)

**Authentication**:
- Platform-specific signature verification
- Currently accepts all webhooks in development mode

**Payload Format**:
```json
{
  "platform": "reddit",
  "event_type": "post.created",
  "data": {
    "id": "abc123",
    "author": "username",
    "title": "Post title",
    "body": "Post content",
    "url": "https://reddit.com/...",
    "created_utc": 1234567890
  },
  "signature": "...",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### Data Flow

1. **RSS Polling**:
   ```
   Cron Job → poll-all-feeds → Parse RSS → Check duplicates → Insert to posts
   ```

2. **Connected Account Polling**:
   ```
   Cron Job → aggregate-connected-accounts → Fetch data → Check duplicates → 
   Insert to aggregated_posts → Trigger → Insert to posts
   ```

3. **Webhook**:
   ```
   External Platform → /api/webhooks → Verify signature → Check duplicates → 
   Insert to aggregated_posts → Trigger → Insert to posts
   ```

## Setup Instructions

### 1. Database Migrations

Run these migration scripts in order:

```bash
# In Supabase SQL Editor:
scripts/015_add_rss_feeds_tables.sql
scripts/016_add_aggregated_posts_sync.sql
```

### 2. Edge Functions

Deploy the edge functions to Supabase:

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy edge functions
supabase functions deploy poll-all-feeds
supabase functions deploy aggregate-connected-accounts
```

### 3. Environment Variables

Set these environment variables in Supabase Dashboard:

- `SUPABASE_URL`: Your Supabase project URL (auto-set)
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key (auto-set)
- `CRON_SECRET`: Secret token for cron authentication (create a secure random string)

### 4. Cron Jobs

Set up cron jobs to run the edge functions periodically.

**Option A: GitHub Actions** (Recommended for free tier)

Create `.github/workflows/aggregate.yml`:

```yaml
name: Aggregate Posts
on:
  schedule:
    - cron: '*/30 * * * *'  # Every 30 minutes
  workflow_dispatch:

jobs:
  aggregate:
    runs-on: ubuntu-latest
    steps:
      - name: Poll RSS Feeds
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            https://YOUR_PROJECT_REF.supabase.co/functions/v1/poll-all-feeds
      
      - name: Aggregate Connected Accounts
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            https://YOUR_PROJECT_REF.supabase.co/functions/v1/aggregate-connected-accounts
```

**Option B: Supabase Cron** (Requires Pro plan)

Use Supabase's built-in pg_cron extension to schedule functions.

**Option C: External Cron Service** (e.g., cron-job.org, EasyCron)

Set up HTTP requests to the edge function URLs.

### 5. Webhook Setup

To receive webhooks from external platforms:

1. **Get your webhook URL**: `https://your-domain.com/api/webhooks`

2. **Register webhook with platform**:
   - Reddit: Configure in app settings
   - Discord: Set up webhook in server settings
   - Mastodon: Configure in account settings

3. **Configure signature verification**:
   - Edit `/app/api/webhooks/route.ts`
   - Implement platform-specific signature verification
   - Store webhook secrets in environment variables

## Content Filtering

The system includes basic spam detection:

### Spam Patterns
- Marketing phrases: "buy now", "click here", "limited time"
- Adult content keywords
- Excessive URLs (>3 in a single post)
- Excessive capitalization (>50% caps)

### Customization

Edit the `shouldFilterContent()` function in:
- `/supabase/functions/aggregate-connected-accounts/index.ts`
- `/app/api/webhooks/route.ts`

## Duplicate Detection

Posts are checked for duplicates using:

1. **External GUID**: Exact match on `external_guid` field
2. **Content similarity**: Normalized content comparison for recent posts

### How it works:

```typescript
// Check for exact GUID match
const { data } = await supabase
  .from('posts')
  .select('id')
  .eq('external_guid', externalGuid)

// If found, skip this post
if (data.length > 0) return true
```

## Monitoring

### Check Aggregation Logs

```sql
-- View recent aggregation runs
SELECT 
  source_type,
  status,
  posts_found,
  posts_created,
  error_message,
  created_at
FROM aggregation_logs
ORDER BY created_at DESC
LIMIT 50;

-- View success rate by source type
SELECT 
  source_type,
  status,
  COUNT(*) as count
FROM aggregation_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY source_type, status;
```

### Check Feed Status

```sql
-- View RSS feeds and last fetch time
SELECT 
  sr.title,
  sr.rss_url,
  sr.last_fetched_at,
  sr.is_active,
  st.name as show_name
FROM show_rss_feeds sr
JOIN cash_tags st ON st.id = sr.show_tag_id
ORDER BY sr.last_fetched_at DESC;
```

## Troubleshooting

### Feeds not updating

1. Check if `is_active` is true:
   ```sql
   UPDATE show_rss_feeds SET is_active = true WHERE id = 'feed_id';
   ```

2. Check aggregation logs for errors:
   ```sql
   SELECT * FROM aggregation_logs WHERE status = 'failed' ORDER BY created_at DESC;
   ```

3. Manually test the edge function:
   ```bash
   curl -X POST \
     -H "Authorization: Bearer YOUR_CRON_SECRET" \
     https://YOUR_PROJECT_REF.supabase.co/functions/v1/poll-all-feeds
   ```

### Duplicate posts appearing

1. Verify `external_guid` is being set:
   ```sql
   SELECT id, content, external_guid FROM posts WHERE external_guid IS NULL LIMIT 10;
   ```

2. Check for GUID collisions:
   ```sql
   SELECT external_guid, COUNT(*) 
   FROM posts 
   WHERE external_guid IS NOT NULL 
   GROUP BY external_guid 
   HAVING COUNT(*) > 1;
   ```

### Webhooks not working

1. Check webhook signature verification is implemented
2. Verify platform webhook configuration
3. Check Next.js API route logs in Vercel
4. Test webhook with curl:
   ```bash
   curl -X POST https://your-domain.com/api/webhooks \
     -H "Content-Type: application/json" \
     -d '{
       "platform": "reddit",
       "event_type": "post.created",
       "data": {...}
     }'
   ```

## Future Enhancements

- [ ] Add support for Twitter API v2
- [ ] Implement Mastodon streaming API
- [ ] Add LinkedIn integration
- [ ] Smart tag detection using ML
- [ ] Advanced content filtering with ML models
- [ ] Rate limiting per platform
- [ ] Retry logic for failed aggregations
- [ ] Dashboard for monitoring aggregation health

## Security Considerations

### Critical Security Items

1. **⚠️ WEBHOOK SIGNATURE VERIFICATION**: The webhook endpoint currently accepts all requests without verification. This MUST be implemented before production use:
   - Implement platform-specific signature verification in `/app/api/webhooks/route.ts`
   - Store webhook secrets in environment variables
   - See TODO comments in the code for implementation guidance

2. **⚠️ RSS FEED ACCESS CONTROL**: The current RLS policies allow any authenticated user to create/update show RSS feeds. For production:
   - Implement admin-only access control
   - Add an `is_admin` field to user_profiles
   - Update RLS policies to check admin status
   - See TODO comments in `scripts/015_add_rss_feeds_tables.sql`

### Best Practices

3. **Rate limit** the webhook endpoint to prevent abuse
4. **Sanitize content** before storing in database (partially implemented)
5. **Use service role key** only in server-side code (edge functions, not client)
6. **Rotate CRON_SECRET** periodically (every 90 days recommended)
7. **Monitor aggregation logs** for suspicious activity
8. **Validate input** from external sources before processing
9. **Use HTTPS only** for webhook endpoints
10. **Set up alerts** for failed aggregations or unusual patterns


## API Reference

### Edge Functions

#### POST /functions/v1/poll-all-feeds
Polls all active RSS feeds from `show_rss_feeds` table.

**Headers**:
- `Authorization: Bearer {CRON_SECRET}`

**Response**:
```json
{
  "message": "Polling complete. Found 42 new posts."
}
```

#### POST /functions/v1/aggregate-connected-accounts
Aggregates posts from all active connected accounts.

**Headers**:
- `Authorization: Bearer {CRON_SECRET}`

**Response**:
```json
{
  "message": "Aggregation complete",
  "accountsProcessed": 5,
  "totalPostsFound": 15,
  "totalPostsCreated": 12,
  "totalErrors": 0,
  "durationMs": 3421
}
```

### REST API

#### POST /api/webhooks
Receives webhook events from external platforms.

**Headers**:
- `Content-Type: application/json`
- `X-Webhook-Signature: {signature}` (platform-specific)

**Body**:
```json
{
  "platform": "reddit",
  "event_type": "post.created",
  "data": {...}
}
```

**Response**:
```json
{
  "success": true,
  "platform": "reddit",
  "result": {
    "processed": true,
    "post_id": "abc123"
  }
}
```

**⚠️ SECURITY WARNING**: The current webhook implementation accepts all requests without signature verification. This is suitable for development but **MUST** be fixed before production deployment. See the TODO comments in `/app/api/webhooks/route.ts` for implementation guidance.

