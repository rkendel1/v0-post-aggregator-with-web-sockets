# Migration: Add is_saved Column

## Purpose
This migration adds an `is_saved` boolean column to the `saved_posts` table to properly separate "saved" and "queued" functionality.

## What Changed
- Previously, the `saved_posts` table used only `queue_position` to determine if a post was saved or queued
- This caused confusion: adding a post to the queue would make the save button think it was saved
- Now, `is_saved` explicitly tracks whether a user has saved a post, independent of queue status

## How to Apply

### Option 1: Using Supabase SQL Editor
1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `scripts/013_add_is_saved_column.sql`
4. Run the SQL

### Option 2: Using Supabase CLI
```bash
supabase db push
```

## Post-Migration Behavior
After applying this migration:
- **Save Button**: Saves a post with `is_saved=true`, visible on the Saved page
- **Add to Queue Button**: Adds a post to queue with `queue_position` set, visible on the Queue page
- **Both**: A post can be both saved AND in the queue
- **Neither**: Removing from both will delete the saved_posts record

## Data Migration
The migration automatically sets `is_saved=true` for all existing records where `queue_position IS NULL`, assuming those were explicitly saved posts.
