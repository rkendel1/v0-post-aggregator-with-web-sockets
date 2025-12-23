-- Create cash_tags table
create table if not exists public.cash_tags (
  id uuid primary key default gen_random_uuid(),
  tag text unique not null, -- e.g., 'AAPL', 'BTC' (without the $ prefix)
  name text not null, -- e.g., 'Apple Inc.', 'Bitcoin'
  created_at timestamp with time zone default now()
);

-- Create sources table
create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  name text not null, -- e.g., 'Twitter', 'Reddit', 'News'
  icon text, -- URL to icon or emoji
  created_at timestamp with time zone default now()
);

-- Create posts table
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  author_name text not null,
  author_avatar text,
  cash_tag_id uuid references public.cash_tags(id) on delete cascade,
  source_id uuid references public.sources(id) on delete set null,
  likes_count int default 0,
  created_at timestamp with time zone default now()
);

-- Create user_subscriptions table for users following specific tags
create table if not exists public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  cash_tag_id uuid references public.cash_tags(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique(user_id, cash_tag_id)
);

-- Enable Row Level Security
alter table public.cash_tags enable row level security;
alter table public.sources enable row level security;
alter table public.posts enable row level security;
alter table public.user_subscriptions enable row level security;

-- RLS Policies for cash_tags (public read, authenticated write)
create policy "Anyone can view cash tags"
  on public.cash_tags for select
  using (true);

create policy "Authenticated users can create cash tags"
  on public.cash_tags for insert
  with check (auth.role() = 'authenticated');

-- RLS Policies for sources (public read, authenticated write)
create policy "Anyone can view sources"
  on public.sources for select
  using (true);

create policy "Authenticated users can create sources"
  on public.sources for insert
  with check (auth.role() = 'authenticated');

-- RLS Policies for posts (public read, authenticated write)
create policy "Anyone can view posts"
  on public.posts for select
  using (true);

create policy "Authenticated users can create posts"
  on public.posts for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can update their own posts"
  on public.posts for update
  using (auth.role() = 'authenticated');

-- RLS Policies for user_subscriptions (users manage their own)
create policy "Users can view their own subscriptions"
  on public.user_subscriptions for select
  using (auth.uid() = user_id);

create policy "Users can create their own subscriptions"
  on public.user_subscriptions for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own subscriptions"
  on public.user_subscriptions for delete
  using (auth.uid() = user_id);

-- Create indexes for better performance
create index if not exists idx_posts_cash_tag_id on public.posts(cash_tag_id);
create index if not exists idx_posts_created_at on public.posts(created_at desc);
create index if not exists idx_user_subscriptions_user_id on public.user_subscriptions(user_id);
create index if not exists idx_user_subscriptions_cash_tag_id on public.user_subscriptions(cash_tag_id);

-- Enable realtime for posts table
alter publication supabase_realtime add table public.posts;
