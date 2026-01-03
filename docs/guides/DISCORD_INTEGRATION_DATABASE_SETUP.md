# Discord Integration - Database Setup Instructions

## Overview

This guide explains how to set up the database for Discord integration with auto-generated episode slugs.

## Prerequisites

- Supabase project configured
- Admin access to run SQL migrations
- Existing show_tags and posts tables

## Migration Steps

### Step 1: Add Episode Slugs and Discord Fields

Run the migration script: `scripts/011_add_episode_slugs_and_discord.sql`

This migration will:
1. Add `episode_slug` column to the `posts` table
2. Add `is_discord` and `discord_server_id` columns to `show_community_links` table
3. Create an auto-generation function for episode slugs
4. Create a trigger to auto-generate slugs on new episodes
5. Backfill slugs for existing episodes with audio

**How to run:**
```bash
# Via Supabase Dashboard
1. Go to SQL Editor
2. Paste contents of scripts/011_add_episode_slugs_and_discord.sql
3. Click "Run"

# Via Supabase CLI
supabase db push < scripts/011_add_episode_slugs_and_discord.sql
```

**Expected Output:**
```
NOTICE:  Migration completed successfully!
NOTICE:  Posts with episode slugs: XX
```

### Step 2: Add Test Discord Community Links (Optional)

Run the test data script: `scripts/012_add_test_discord_links.sql`

This will add Discord community links for:
- Huberman Lab
- Joe Rogan Experience
- Darknet Diaries

**How to run:**
```bash
# Via Supabase Dashboard
1. Go to SQL Editor
2. Paste contents of scripts/012_add_test_discord_links.sql
3. Click "Run"
```

**Expected Output:**
```
NOTICE:  Discord community links added successfully!
```

## Verification

After running migrations, verify the setup:

### Check Episode Slugs

```sql
-- Check that episodes have slugs
SELECT 
  id, 
  content, 
  created_at, 
  episode_slug
FROM posts
WHERE audio_url IS NOT NULL
LIMIT 10;
```

Expected result: All episodes should have slugs like `2025-12-22-episode-title-slug`

### Check Discord Community Links

```sql
-- Check Discord links
SELECT 
  st.tag as show_tag,
  scl.name,
  scl.url,
  scl.is_discord,
  scl.discord_server_id
FROM show_community_links scl
JOIN show_tags st ON st.id = scl.show_tag_id
WHERE scl.is_discord = true;
```

Expected result: Discord links for test shows

### Test Slug Generation

```sql
-- Insert a test episode and verify slug is auto-generated
INSERT INTO posts (
  content, 
  author_name, 
  show_tag_id, 
  audio_url,
  created_at
)
SELECT 
  '#hubermanlab Test Episode - Amazing New Science Discovery',
  'Andrew Huberman',
  id,
  'https://example.com/audio.mp3',
  NOW()
FROM show_tags 
WHERE tag = 'hubermanlab'
LIMIT 1
RETURNING id, episode_slug;
```

Expected result: Should return a slug like `2026-01-01-test-episode-amazing-new-science`

## Adding Discord Links to Your Shows

To add Discord community links to your shows:

```sql
-- Add a Discord server link
INSERT INTO show_community_links (
  show_tag_id,
  platform,
  name,
  description,
  url,
  is_discord,
  discord_server_id
)
SELECT 
  id,
  'discord',
  'Your Show Discord',
  'Official Discord community for episode discussions',
  'https://discord.gg/your-invite',
  true,
  'your-show-slug'
FROM show_tags
WHERE tag = 'your-show-tag';
```

## Schema Reference

### posts table additions

| Column | Type | Description |
|--------|------|-------------|
| episode_slug | TEXT | Auto-generated slug (YYYY-MM-DD-title-slug) |

### show_community_links table additions

| Column | Type | Description |
|--------|------|-------------|
| is_discord | BOOLEAN | True if this is a Discord server link |
| discord_server_id | TEXT | Discord server identifier for the show |

## Rollback (If Needed)

If you need to rollback the changes:

```sql
BEGIN;

-- Remove episode slugs
ALTER TABLE posts DROP COLUMN IF EXISTS episode_slug;

-- Remove Discord fields
ALTER TABLE show_community_links 
  DROP COLUMN IF EXISTS is_discord,
  DROP COLUMN IF EXISTS discord_server_id;

-- Remove trigger and function
DROP TRIGGER IF EXISTS trigger_generate_episode_slug ON posts;
DROP FUNCTION IF EXISTS generate_episode_slug();

COMMIT;
```

## Troubleshooting

### Issue: Slugs not generating for new episodes

**Check:**
1. Verify trigger exists: `SELECT * FROM pg_trigger WHERE tgname = 'trigger_generate_episode_slug';`
2. Check function exists: `SELECT * FROM pg_proc WHERE proname = 'generate_episode_slug';`
3. Ensure episode has `audio_url` set (slugs only generate for episodes with audio)

### Issue: Existing episodes don't have slugs

**Solution:**
Re-run the backfill query from the migration:

```sql
UPDATE posts
SET episode_slug = (
  SELECT 
    TO_CHAR(created_at, 'YYYY-MM-DD') || '-' || 
    TRIM(BOTH '-' FROM REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          REGEXP_REPLACE(
            LOWER(
              REGEXP_REPLACE(
                REGEXP_REPLACE(
                  REGEXP_REPLACE(
                    TRIM(SPLIT_PART(content, E'\n', 1)),
                    '#\w+', '', 'g'
                  ),
                  'episode\s*#?\d+', '', 'gi'
                ),
                'ep\.?\s*\d+', '', 'gi'
              )
            ),
            '[^\w\s-]', '', 'g'
          ),
          '\s+', '-', 'g'
        ),
        '-+', '-', 'g'
      ),
      '^-+|-+$', '', 'g'
    ))
)
WHERE audio_url IS NOT NULL 
  AND (episode_slug IS NULL OR episode_slug = '');
```

## Next Steps

After setting up the database:

1. Deploy the frontend code with the new components
2. Test the "Join the conversation" dropdown
3. Test episode-specific Discord links
4. Add Discord community links for your shows
5. Monitor slug generation for new episodes

## Support

For issues or questions:
- Check the main README.md
- Review the code in `lib/utils/slugs.ts`
- Inspect the UI components in `components/post-aggregator/`
