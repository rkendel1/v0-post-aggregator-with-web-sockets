# PodBridge Database Migrations

This directory contains all database migration scripts for PodBridge. Migrations must be run in numerical order to properly set up the database schema.

## Quick Start

Run all migrations in order in your Supabase SQL Editor:

1. Navigate to your Supabase project dashboard
2. Go to SQL Editor
3. Run each script in numerical order (001 → 014)
4. Verify each script completes successfully before proceeding

## Migration Scripts

### Core Schema

#### 001_create_schema.sql
**Purpose**: Initial database schema  
**Creates**:
- `cash_tags` table (note: referred to as `show_tags` in app)
- `sources` table
- `posts` table
- `user_subscriptions` table
- Initial RLS policies
- Performance indexes
- Realtime configuration

**Note**: The table is named `cash_tags` in the database but the app refers to them as "show tags". See [TECHNICAL_DEBT.md](../TECHNICAL_DEBT.md) for details.

#### 002_seed_data.sql
**Purpose**: Seed initial data  
**Creates**:
- Sample show tags
- Sample sources
- Sample posts
- Provides data for testing

### Feature Additions

#### 003_add_connected_accounts.sql
**Purpose**: External platform integration infrastructure  
**Creates**:
- `platforms` table (Twitter, Reddit, etc.)
- `connected_accounts` table (user OAuth connections)
- RLS policies for account management
- Seed data for platforms

**Status**: Tables exist, OAuth integration not yet implemented (see TECHNICAL_DEBT.md)

#### 004_add_comments_replies.sql
**Purpose**: Threaded comment system  
**Creates**:
- `comments` table with parent_comment_id for threading
- `comment_counts` view for performance
- RLS policies for comment access
- Indexes for efficient queries
- Realtime configuration

#### 005_add_reactions.sql
**Purpose**: Emoji reaction system  
**Creates**:
- `reaction_types` table (Like, Love, Laugh, etc.)
- `reactions` table (user reactions)
- `reaction_counts` view for aggregation
- RLS policies
- Indexes
- Seed data for reaction types

#### 006_add_following_system.sql
**Purpose**: User and tag following  
**Creates**:
- `tag_follows` table (users following show tags)
- `user_follows` table (users following each other)
- `post_follows` table (users following specific posts)
- `user_follow_counts` view for statistics
- RLS policies
- Indexes

#### 007_add_post_federation.sql
**Purpose**: Cross-platform posting infrastructure  
**Creates**:
- `federated_posts` table (outbound posts to external platforms)
- `aggregated_posts` table (inbound posts from external platforms)
- RLS policies
- Indexes

**Status**: Infrastructure exists, actual federation not yet implemented

#### 008_populate_more_shows.sql
**Purpose**: Add more sample show tags  
**Creates**:
- Additional show tag entries for testing
- Variety of podcast categories

### Bug Fixes and Improvements

#### 010_fix_show_tags_constraint.sql
**Purpose**: Fix database constraint issue  
**Note**: Migration 009 was skipped in numbering

#### 011_add_episode_slugs_and_discord.sql
**Purpose**: Episode slug generation and Discord integration  
**Creates**:
- `episode_slug` column on posts
- `show_community_links` table (Discord servers, etc.)
- `subdomain_mappings` table (custom subdomain routing)
- Trigger function to auto-generate episode slugs
- Episode slug generation logic (date-based)
- Indexes

**See also**: [docs/guides/COMPONENT_ARCHITECTURE.md](../docs/guides/COMPONENT_ARCHITECTURE.md)

#### 012_add_test_discord_links.sql
**Purpose**: Add sample Discord links for testing  
**Creates**:
- Sample Discord community links for shows
- Test data for Discord integration

#### 013_add_is_saved_column.sql
**Purpose**: Separate saved vs queued posts  
**Creates**:
- `is_saved` boolean column on `saved_posts`
- Data migration for existing records

**See also**: [013_MIGRATION_README.md](./013_MIGRATION_README.md)

#### 014_fix_user_profiles_foreign_keys.sql
**Purpose**: Fix PostgREST relationship for user profiles  
**Changes**:
- Updates `posts.user_id` to reference `user_profiles(id)`
- Updates `comments.user_id` to reference `user_profiles(id)`
- Enables proper joins in Supabase queries

**See also**: [014_MIGRATION_README.md](./014_MIGRATION_README.md)

## Migration Best Practices

### Running Migrations

1. **Always run in order**: Start from 001 and go sequentially
2. **Verify success**: Check for errors after each script
3. **Backup first**: Consider backing up before running on production
4. **Read the README**: Some migrations have accompanying README files with important notes

### Creating New Migrations

When adding new migrations:

1. **Number sequentially**: Next migration is 015
2. **Use descriptive names**: `015_your_feature_name.sql`
3. **Include comments**: Document what the migration does
4. **Add RLS policies**: Security should be part of the migration
5. **Create indexes**: Performance considerations upfront
6. **Create README if complex**: Explain non-obvious changes
7. **Test thoroughly**: Test on development database first

### Migration Template

```sql
-- Migration: [Number] - [Description]
-- Purpose: [What this migration accomplishes]
-- Dependencies: [Any required previous migrations]

-- Create table
create table if not exists public.your_table (
  id uuid primary key default gen_random_uuid(),
  -- columns
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.your_table enable row level security;

-- RLS Policies
create policy "Public read" on public.your_table
  for select using (true);

create policy "Authenticated write" on public.your_table
  for insert with check (auth.role() = 'authenticated');

-- Indexes
create index idx_your_table_column on public.your_table(column);

-- Enable Realtime (if needed)
alter publication supabase_realtime add table public.your_table;
```

## Common Issues

### Foreign Key Violations

If a migration fails due to foreign key violations:
- Check that referenced records exist
- Consider adding data to parent tables first
- Review the migration README if it exists

### RLS Policy Errors

If you can't query data after migration:
- Verify RLS policies are created
- Check policy conditions match your use case
- Test with authenticated user in Supabase dashboard

### Realtime Not Working

If Realtime subscriptions don't work:
- Verify table is added to `supabase_realtime` publication
- Check table is enabled in Supabase Dashboard > Database > Replication
- Confirm RLS policies allow read access

## Rollback Procedures

Most migrations don't include rollback scripts. To rollback:

1. **Identify changes**: Review the migration SQL
2. **Write reverse operations**: 
   - `CREATE TABLE` → `DROP TABLE`
   - `ALTER TABLE ADD COLUMN` → `ALTER TABLE DROP COLUMN`
   - `CREATE INDEX` → `DROP INDEX`
3. **Test on development first**
4. **Consider data loss**: Some rollbacks lose data

### Example Rollback

```sql
-- Rollback migration 015 (example)
drop table if exists public.your_table cascade;
drop index if exists idx_your_table_column;
-- Remove from realtime publication
alter publication supabase_realtime drop table public.your_table;
```

## Migration History

| Number | Date | Description | Breaking? |
|--------|------|-------------|-----------|
| 001 | Initial | Create base schema | N/A |
| 002 | Initial | Seed data | No |
| 003 | | Connected accounts | No |
| 004 | | Comments and replies | No |
| 005 | | Reactions system | No |
| 006 | | Following system | No |
| 007 | | Post federation | No |
| 008 | | More show tags | No |
| 010 | | Fix show tags constraint | No |
| 011 | | Episode slugs & Discord | No |
| 012 | | Test Discord links | No |
| 013 | | is_saved column | No |
| 014 | | Fix user profiles FK | No |

## Related Documentation

- **[ARCHITECTURE.md](../ARCHITECTURE.md)** - Complete database schema documentation
- **[DEVELOPMENT.md](../DEVELOPMENT.md)** - Development setup guide
- **[TECHNICAL_DEBT.md](../TECHNICAL_DEBT.md)** - Known schema issues

## Questions?

For issues with migrations:
1. Check the migration's README file if it exists
2. Review the SQL comments in the migration file
3. See [DEVELOPMENT.md](../DEVELOPMENT.md#troubleshooting)
4. Create a GitHub issue with migration number and error details
