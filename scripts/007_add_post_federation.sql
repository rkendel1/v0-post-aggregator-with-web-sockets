-- Create federated_posts table to track posts across platforms
create table if not exists public.federated_posts (
  id uuid primary key default gen_random_uuid(),
  local_post_id uuid references public.posts(id) on delete cascade,
  connected_account_id uuid references public.connected_accounts(id) on delete cascade,
  external_post_id text,
  external_url text,
  status text default 'pending',
  error_message text,
  published_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create aggregated_posts table for posts pulled from external platforms
create table if not exists public.aggregated_posts (
  id uuid primary key default gen_random_uuid(),
  local_post_id uuid references public.posts(id) on delete set null,
  connected_account_id uuid references public.connected_accounts(id) on delete cascade,
  external_post_id text not null,
  external_url text,
  author_name text not null,
  author_avatar text,
  content text not null,
  external_created_at timestamp with time zone,
  synced_at timestamp with time zone default now(),
  created_at timestamp with time zone default now(),
  unique(connected_account_id, external_post_id)
);

-- Add user_id to posts table for tracking post ownership
alter table public.posts add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- Create index for user_id
create index if not exists idx_posts_user_id on public.posts(user_id);

-- Enable Row Level Security
alter table public.federated_posts enable row level security;
alter table public.aggregated_posts enable row level security;

-- RLS Policies for federated_posts
create policy "Users can view their own federated posts"
  on public.federated_posts for select
  using (
    exists (
      select 1 from public.posts
      where posts.id = federated_posts.local_post_id
      and posts.user_id = auth.uid()
    )
  );

create policy "Users can create federated posts for their posts"
  on public.federated_posts for insert
  with check (
    exists (
      select 1 from public.posts
      where posts.id = federated_posts.local_post_id
      and posts.user_id = auth.uid()
    )
  );

create policy "Users can update their own federated posts"
  on public.federated_posts for update
  using (
    exists (
      select 1 from public.posts
      where posts.id = federated_posts.local_post_id
      and posts.user_id = auth.uid()
    )
  );

-- RLS Policies for aggregated_posts
create policy "Anyone can view aggregated posts"
  on public.aggregated_posts for select
  using (true);

create policy "Users can create aggregated posts from their accounts"
  on public.aggregated_posts for insert
  with check (
    exists (
      select 1 from public.connected_accounts
      where connected_accounts.id = aggregated_posts.connected_account_id
      and connected_accounts.user_id = auth.uid()
    )
  );

-- Create indexes
create index if not exists idx_federated_posts_local_post_id on public.federated_posts(local_post_id);
create index if not exists idx_federated_posts_connected_account_id on public.federated_posts(connected_account_id);
create index if not exists idx_federated_posts_status on public.federated_posts(status);
create index if not exists idx_aggregated_posts_connected_account_id on public.aggregated_posts(connected_account_id);
create index if not exists idx_aggregated_posts_external_post_id on public.aggregated_posts(external_post_id);
