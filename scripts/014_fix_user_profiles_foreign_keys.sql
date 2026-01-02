-- Fix foreign key relationships to allow PostgREST to join posts/comments with user_profiles
-- The issue: posts.user_id and comments.user_id reference auth.users(id), but PostgREST needs
-- a direct relationship to user_profiles for the join to work in select queries.

-- Safety check: Verify all non-null user_ids in posts have corresponding user_profiles
-- This query will fail if there are orphaned user_ids (which is what we want before changing the FK)
do $$
declare
  orphaned_count integer;
begin
  select count(*) into orphaned_count
  from public.posts p
  where p.user_id is not null
    and not exists (select 1 from public.user_profiles up where up.id = p.user_id);
  
  if orphaned_count > 0 then
    raise exception 'Found % posts with user_id values that do not have corresponding user_profiles entries. Please create user_profiles for these users first.', orphaned_count;
  end if;
end $$;

-- Safety check: Same for comments
do $$
declare
  orphaned_count integer;
begin
  select count(*) into orphaned_count
  from public.comments c
  where c.user_id is not null
    and not exists (select 1 from public.user_profiles up where up.id = c.user_id);
  
  if orphaned_count > 0 then
    raise exception 'Found % comments with user_id values that do not have corresponding user_profiles entries. Please create user_profiles for these users first.', orphaned_count;
  end if;
end $$;

-- First, drop the existing foreign key constraint on posts.user_id
alter table public.posts 
  drop constraint if exists posts_user_id_fkey;

-- Add new foreign key constraint to user_profiles instead of auth.users
-- This works because user_profiles.id is a primary key that references auth.users(id)
-- NULL values are allowed (for posts without an associated user)
alter table public.posts 
  add constraint posts_user_id_fkey 
  foreign key (user_id) 
  references public.user_profiles(id) 
  on delete cascade;

-- Do the same for comments table
alter table public.comments 
  drop constraint if exists comments_user_id_fkey;

alter table public.comments 
  add constraint comments_user_id_fkey 
  foreign key (user_id) 
  references public.user_profiles(id) 
  on delete cascade;

-- Update RLS policies in federated_posts that check posts.user_id = auth.uid()
-- These will still work because user_profiles.id = auth.users.id
-- No changes needed to RLS policies as they still validate correctly
