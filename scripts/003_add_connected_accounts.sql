-- Create user_profiles table for extended user data
create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create platforms table for supported platforms
create table if not exists public.platforms (
  id uuid primary key default gen_random_uuid(),
  name text unique not null, -- e.g., 'Twitter', 'Reddit', 'Mastodon', 'LinkedIn'
  display_name text not null,
  icon text,
  supports_read boolean default true,
  supports_write boolean default true,
  created_at timestamp with time zone default now()
);

-- Create connected_accounts table for user's connected social accounts
create table if not exists public.connected_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  platform_id uuid references public.platforms(id) on delete cascade,
  platform_user_id text not null, -- The user's ID on the external platform
  platform_username text, -- The user's username on the external platform
  access_token text, -- Encrypted OAuth token
  refresh_token text, -- Encrypted OAuth refresh token
  token_expires_at timestamp with time zone,
  scopes text[], -- OAuth scopes granted
  is_active boolean default true,
  last_synced_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(user_id, platform_id, platform_user_id)
);

-- Enable Row Level Security
alter table public.user_profiles enable row level security;
alter table public.platforms enable row level security;
alter table public.connected_accounts enable row level security;

-- RLS Policies for user_profiles
create policy "Anyone can view user profiles"
  on public.user_profiles for select
  using (true);

create policy "Users can update their own profile"
  on public.user_profiles for update
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.user_profiles for insert
  with check (auth.uid() = id);

-- RLS Policies for platforms
create policy "Anyone can view platforms"
  on public.platforms for select
  using (true);

-- RLS Policies for connected_accounts (private to user)
create policy "Users can view their own connected accounts"
  on public.connected_accounts for select
  using (auth.uid() = user_id);

create policy "Users can insert their own connected accounts"
  on public.connected_accounts for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own connected accounts"
  on public.connected_accounts for update
  using (auth.uid() = user_id);

create policy "Users can delete their own connected accounts"
  on public.connected_accounts for delete
  using (auth.uid() = user_id);

-- Create indexes
create index if not exists idx_connected_accounts_user_id on public.connected_accounts(user_id);
create index if not exists idx_connected_accounts_platform_id on public.connected_accounts(platform_id);
create index if not exists idx_user_profiles_username on public.user_profiles(username);

-- Insert default platforms
insert into public.platforms (name, display_name, icon, supports_read, supports_write) values
  ('twitter', 'Twitter/X', '𝕏', true, true),
  ('reddit', 'Reddit', '🔴', true, false),
  ('mastodon', 'Mastodon', '🐘', true, true),
  ('linkedin', 'LinkedIn', '💼', true, true),
  ('discord', 'Discord', '💬', true, false),
  ('telegram', 'Telegram', '✈️', true, true)
on conflict (name) do nothing;
