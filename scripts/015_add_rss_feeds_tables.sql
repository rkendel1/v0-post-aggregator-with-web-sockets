-- Migration 015: Add RSS Feeds Tables for Automated Aggregation
-- This migration adds support for RSS feed management and automated polling

-- Create show_rss_feeds table for official show RSS feeds
create table if not exists public.show_rss_feeds (
  id uuid primary key default gen_random_uuid(),
  show_tag_id uuid references public.cash_tags(id) on delete cascade not null,
  rss_url text not null,
  title text not null,
  last_fetched_at timestamp with time zone,
  is_active boolean default true,
  fetch_interval_minutes int default 60, -- How often to poll this feed
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(show_tag_id, rss_url)
);

-- Create user_rss_feeds table for user-submitted RSS feeds
create table if not exists public.user_rss_feeds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  show_tag_id uuid references public.cash_tags(id) on delete set null,
  rss_url text not null,
  title text not null,
  last_fetched_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(user_id, rss_url)
);

-- Create aggregation_logs table to track polling activity
create table if not exists public.aggregation_logs (
  id uuid primary key default gen_random_uuid(),
  source_type text not null, -- 'rss', 'webhook', 'api'
  source_id uuid, -- Reference to feed or account
  status text not null, -- 'success', 'failed', 'partial'
  posts_found int default 0,
  posts_created int default 0,
  error_message text,
  created_at timestamp with time zone default now()
);

-- Enable Row Level Security
alter table public.show_rss_feeds enable row level security;
alter table public.user_rss_feeds enable row level security;
alter table public.aggregation_logs enable row level security;

-- RLS Policies for show_rss_feeds (public read, admin write)
create policy "Anyone can view show RSS feeds"
  on public.show_rss_feeds for select
  using (true);

create policy "Authenticated users can create show RSS feeds"
  on public.show_rss_feeds for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can update show RSS feeds"
  on public.show_rss_feeds for update
  using (auth.role() = 'authenticated');

-- RLS Policies for user_rss_feeds (private to user)
create policy "Users can view their own RSS feeds"
  on public.user_rss_feeds for select
  using (auth.uid() = user_id);

create policy "Users can create their own RSS feeds"
  on public.user_rss_feeds for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own RSS feeds"
  on public.user_rss_feeds for update
  using (auth.uid() = user_id);

create policy "Users can delete their own RSS feeds"
  on public.user_rss_feeds for delete
  using (auth.uid() = user_id);

-- RLS Policies for aggregation_logs (admin only)
create policy "Authenticated users can view aggregation logs"
  on public.aggregation_logs for select
  using (auth.role() = 'authenticated');

-- Create indexes for performance
create index if not exists idx_show_rss_feeds_show_tag_id on public.show_rss_feeds(show_tag_id);
create index if not exists idx_show_rss_feeds_last_fetched on public.show_rss_feeds(last_fetched_at);
create index if not exists idx_show_rss_feeds_is_active on public.show_rss_feeds(is_active);
create index if not exists idx_user_rss_feeds_user_id on public.user_rss_feeds(user_id);
create index if not exists idx_user_rss_feeds_show_tag_id on public.user_rss_feeds(show_tag_id);
create index if not exists idx_aggregation_logs_created_at on public.aggregation_logs(created_at desc);
create index if not exists idx_aggregation_logs_source_type on public.aggregation_logs(source_type);

-- Add external_guid to posts table if it doesn't exist (for duplicate detection)
alter table public.posts add column if not exists external_guid text;
create index if not exists idx_posts_external_guid on public.posts(external_guid);

-- Add external_url to posts table if it doesn't exist
alter table public.posts add column if not exists external_url text;

-- Add image_url to posts table if it doesn't exist
alter table public.posts add column if not exists image_url text;

-- Add audio_url to posts table if it doesn't exist  
alter table public.posts add column if not exists audio_url text;
