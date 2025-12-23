-- Create user_follows table for following other users
create table if not exists public.user_follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid references auth.users(id) on delete cascade, -- The user who is following
  following_id uuid references auth.users(id) on delete cascade, -- The user being followed
  created_at timestamp with time zone default now(),
  unique(follower_id, following_id),
  check (follower_id != following_id) -- Users can't follow themselves
);

-- Create post_follows table for following specific posts
create table if not exists public.post_follows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique(user_id, post_id)
);

-- Rename user_subscriptions to tag_follows for consistency
alter table if exists public.user_subscriptions rename to tag_follows;

-- Create follower/following counts for users
create table if not exists public.user_follow_counts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  followers_count int default 0,
  following_count int default 0
);

-- Function to update user follow counts
create or replace function update_user_follow_count()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    -- Increment follower count for the user being followed
    insert into public.user_follow_counts (user_id, followers_count, following_count)
    values (new.following_id, 1, 0)
    on conflict (user_id) do update set followers_count = user_follow_counts.followers_count + 1;
    
    -- Increment following count for the follower
    insert into public.user_follow_counts (user_id, followers_count, following_count)
    values (new.follower_id, 0, 1)
    on conflict (user_id) do update set following_count = user_follow_counts.following_count + 1;
    
  elsif TG_OP = 'DELETE' then
    -- Decrement follower count
    update public.user_follow_counts
    set followers_count = greatest(0, followers_count - 1)
    where user_id = old.following_id;
    
    -- Decrement following count
    update public.user_follow_counts
    set following_count = greatest(0, following_count - 1)
    where user_id = old.follower_id;
  end if;
  return null;
end;
$$ language plpgsql;

-- Trigger to automatically update follow counts
create trigger update_user_follow_count_trigger
after insert or delete on public.user_follows
for each row execute function update_user_follow_count();

-- Enable Row Level Security
alter table public.user_follows enable row level security;
alter table public.post_follows enable row level security;
alter table public.user_follow_counts enable row level security;

-- RLS Policies for user_follows
create policy "Anyone can view user follows"
  on public.user_follows for select
  using (true);

create policy "Authenticated users can follow others"
  on public.user_follows for insert
  with check (auth.uid() = follower_id);

create policy "Users can unfollow others"
  on public.user_follows for delete
  using (auth.uid() = follower_id);

-- RLS Policies for post_follows
create policy "Anyone can view post follows"
  on public.post_follows for select
  using (true);

create policy "Authenticated users can follow posts"
  on public.post_follows for insert
  with check (auth.uid() = user_id);

create policy "Users can unfollow posts"
  on public.post_follows for delete
  using (auth.uid() = user_id);

-- RLS Policies for user_follow_counts
create policy "Anyone can view user follow counts"
  on public.user_follow_counts for select
  using (true);

-- Create indexes
create index if not exists idx_user_follows_follower_id on public.user_follows(follower_id);
create index if not exists idx_user_follows_following_id on public.user_follows(following_id);
create index if not exists idx_post_follows_user_id on public.post_follows(user_id);
create index if not exists idx_post_follows_post_id on public.post_follows(post_id);

-- Enable realtime for follows
alter publication supabase_realtime add table public.user_follows;
alter publication supabase_realtime add table public.post_follows;
alter publication supabase_realtime add table public.user_follow_counts;
