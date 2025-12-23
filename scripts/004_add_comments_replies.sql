-- Create comments table for post comments and replies
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts(id) on delete cascade,
  parent_comment_id uuid references public.comments(id) on delete cascade, -- null for top-level comments
  user_id uuid references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create comment_counts materialized view for performance
create table if not exists public.comment_counts (
  post_id uuid primary key references public.posts(id) on delete cascade,
  count int default 0
);

-- Function to update comment counts
create or replace function update_comment_count()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    insert into public.comment_counts (post_id, count)
    values (new.post_id, 1)
    on conflict (post_id) do update set count = comment_counts.count + 1;
  elsif TG_OP = 'DELETE' then
    update public.comment_counts
    set count = greatest(0, count - 1)
    where post_id = old.post_id;
  end if;
  return null;
end;
$$ language plpgsql;

-- Trigger to automatically update comment counts
create trigger update_comment_count_trigger
after insert or delete on public.comments
for each row execute function update_comment_count();

-- Enable Row Level Security
alter table public.comments enable row level security;
alter table public.comment_counts enable row level security;

-- RLS Policies for comments
create policy "Anyone can view comments"
  on public.comments for select
  using (true);

create policy "Authenticated users can create comments"
  on public.comments for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own comments"
  on public.comments for update
  using (auth.uid() = user_id);

create policy "Users can delete their own comments"
  on public.comments for delete
  using (auth.uid() = user_id);

-- RLS Policies for comment_counts
create policy "Anyone can view comment counts"
  on public.comment_counts for select
  using (true);

-- Create indexes for better performance
create index if not exists idx_comments_post_id on public.comments(post_id);
create index if not exists idx_comments_parent_comment_id on public.comments(parent_comment_id);
create index if not exists idx_comments_user_id on public.comments(user_id);
create index if not exists idx_comments_created_at on public.comments(created_at desc);

-- Enable realtime for comments table
alter publication supabase_realtime add table public.comments;
alter publication supabase_realtime add table public.comment_counts;
