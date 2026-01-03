-- Migration 016: Add Aggregated Posts Sync Function
-- This migration adds a trigger to automatically create posts from aggregated_posts

-- Create function to sync aggregated posts to posts table
create or replace function sync_aggregated_post_to_posts()
returns trigger as $$
declare
  v_show_tag_id uuid;
  v_source_id uuid;
  v_user_id uuid;
begin
  -- Get the user_id from the connected account
  select user_id into v_user_id
  from connected_accounts
  where id = NEW.connected_account_id;

  -- Try to determine show_tag_id from user preferences or content
  -- For now, we'll leave it null and require manual assignment
  -- TODO: Implement smart tag detection based on content
  v_show_tag_id := null;

  -- Get or create a source for "Aggregated"
  select id into v_source_id
  from sources
  where name = 'Aggregated'
  limit 1;

  -- If no "Aggregated" source exists, create it
  if v_source_id is null then
    insert into sources (name, icon)
    values ('Aggregated', '📥')
    returning id into v_source_id;
  end if;

  -- Only create post if local_post_id is not already set
  if NEW.local_post_id is null then
    -- Create the post in the posts table
    insert into posts (
      content,
      author_name,
      author_avatar,
      show_tag_id,
      source_id,
      user_id,
      external_guid,
      external_url,
      created_at
    )
    values (
      NEW.content,
      NEW.author_name,
      NEW.author_avatar,
      v_show_tag_id,
      v_source_id,
      v_user_id,
      NEW.external_post_id,
      NEW.external_url,
      coalesce(NEW.external_created_at, NEW.created_at)
    )
    returning id into NEW.local_post_id;
  end if;

  return NEW;
end;
$$ language plpgsql security definer;

-- Create trigger to automatically sync new aggregated posts
drop trigger if exists trigger_sync_aggregated_post on aggregated_posts;
create trigger trigger_sync_aggregated_post
  before insert on aggregated_posts
  for each row
  execute function sync_aggregated_post_to_posts();

-- Add comment for documentation
comment on function sync_aggregated_post_to_posts() is 
  'Automatically creates a post in the posts table when a new aggregated post is inserted. This enables aggregated content to appear in the main feed.';
