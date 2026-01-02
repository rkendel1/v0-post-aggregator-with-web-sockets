# Migration: Fix User Profiles Foreign Keys

## Purpose
This migration fixes the 400 error that occurs when fetching posts on the home page. The error was:
```
"Could not find a relationship between 'posts' and 'user_profiles' in the schema cache"
```

## Root Cause
PostgREST (used by Supabase) requires a direct foreign key relationship between tables to perform joins in select queries. Previously:
- `posts.user_id` referenced `auth.users(id)`
- `comments.user_id` referenced `auth.users(id)`
- `user_profiles.id` is a primary key that references `auth.users(id)`

Since there was no **direct** foreign key from `posts`/`comments` to `user_profiles`, PostgREST couldn't resolve the join when using:
```sql
select=*,user_profiles(*)
```

## What Changed
This migration updates the foreign key constraints:
- `posts.user_id` now references `user_profiles(id)` instead of `auth.users(id)`
- `comments.user_id` now references `user_profiles(id)` instead of `auth.users(id)`

Since `user_profiles.id` is itself a foreign key to `auth.users(id)`, all existing relationships remain valid.

## Prerequisites
Before running this migration, ensure that:
1. All users who have created posts or comments have a corresponding entry in `user_profiles`
2. The migration includes safety checks that will fail if orphaned user_ids are found

If the migration fails due to orphaned user_ids, you need to either:
- Create user_profiles entries for those users
- Set the user_id to NULL for those posts/comments
- Delete those posts/comments

## How to Apply

### Option 1: Using Supabase SQL Editor (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `scripts/014_fix_user_profiles_foreign_keys.sql`
4. Run the SQL
5. If it succeeds, the foreign key relationships are now fixed

### Option 2: Using Supabase CLI
```bash
supabase db push
```

## Post-Migration Behavior
After applying this migration:
- The home page will load successfully without 400 errors
- Posts will properly join with user_profiles data
- Comments will properly join with user_profiles data
- All existing RLS policies continue to work correctly
- User profile links on posts will work correctly

## Verification
After running the migration, test that:
1. The home page loads without errors
2. Posts display correctly
3. User profile links on posts work (clicking on author names/avatars)
4. Comments display correctly with user profiles
5. Creating new posts/comments still works

## Rollback
If you need to rollback this migration:
```sql
-- Rollback posts foreign key
alter table public.posts drop constraint if exists posts_user_id_fkey;
alter table public.posts add constraint posts_user_id_fkey 
  foreign key (user_id) references auth.users(id) on delete cascade;

-- Rollback comments foreign key
alter table public.comments drop constraint if exists comments_user_id_fkey;
alter table public.comments add constraint comments_user_id_fkey 
  foreign key (user_id) references auth.users(id) on delete cascade;
```

Note: Rolling back will restore the 400 error on the home page.
