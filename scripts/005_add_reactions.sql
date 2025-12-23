-- Create reaction_types table
create table if not exists public.reaction_types (
  id uuid primary key default gen_random_uuid(),
  name text unique not null, -- 'like', 'love', 'laugh', 'wow', 'sad', 'angry'
  emoji text not null,
  display_order int default 0,
  created_at timestamp with time zone default now()
);

-- Create reactions table for post and comment reactions
create table if not exists public.reactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  reaction_type_id uuid references public.reaction_types(id) on delete cascade,
  created_at timestamp with time zone default now(),
  -- Ensure user can only have one reaction per post or comment
  unique(user_id, post_id, reaction_type_id),
  unique(user_id, comment_id, reaction_type_id),
  -- Ensure reaction is for either a post or comment, not both
  check ((post_id is not null and comment_id is null) or (post_id is null and comment_id is not null))
);

-- Create reaction_counts table for aggregated counts
create table if not exists public.reaction_counts (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  reaction_type_id uuid references public.reaction_types(id) on delete cascade,
  count int default 0,
  unique(post_id, reaction_type_id),
  unique(comment_id, reaction_type_id),
  check ((post_id is not null and comment_id is null) or (post_id is null and comment_id is not null))
);

-- Function to update reaction counts
create or replace function update_reaction_count()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    if new.post_id is not null then
      insert into public.reaction_counts (post_id, reaction_type_id, count)
      values (new.post_id, new.reaction_type_id, 1)
      on conflict (post_id, reaction_type_id) do update set count = reaction_counts.count + 1;
    elsif new.comment_id is not null then
      insert into public.reaction_counts (comment_id, reaction_type_id, count)
      values (new.comment_id, new.reaction_type_id, 1)
      on conflict (comment_id, reaction_type_id) do update set count = reaction_counts.count + 1;
    end if;
  elsif TG_OP = 'DELETE' then
    if old.post_id is not null then
      update public.reaction_counts
      set count = greatest(0, count - 1)
      where post_id = old.post_id and reaction_type_id = old.reaction_type_id;
    elsif old.comment_id is not null then
      update public.reaction_counts
      set count = greatest(0, count - 1)
      where comment_id = old.comment_id and reaction_type_id = old.reaction_type_id;
    end if;
  end if;
  return null;
end;
$$ language plpgsql;

-- Trigger to automatically update reaction counts
create trigger update_reaction_count_trigger
after insert or delete on public.reactions
for each row execute function update_reaction_count();

-- Enable Row Level Security
alter table public.reaction_types enable row level security;
alter table public.reactions enable row level security;
alter table public.reaction_counts enable row level security;

-- RLS Policies for reaction_types
create policy "Anyone can view reaction types"
  on public.reaction_types for select
  using (true);

-- RLS Policies for reactions
create policy "Anyone can view reactions"
  on public.reactions for select
  using (true);

create policy "Authenticated users can create reactions"
  on public.reactions for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own reactions"
  on public.reactions for delete
  using (auth.uid() = user_id);

-- RLS Policies for reaction_counts
create policy "Anyone can view reaction counts"
  on public.reaction_counts for select
  using (true);

-- Create indexes
create index if not exists idx_reactions_user_id on public.reactions(user_id);
create index if not exists idx_reactions_post_id on public.reactions(post_id);
create index if not exists idx_reactions_comment_id on public.reactions(comment_id);
create index if not exists idx_reactions_reaction_type_id on public.reactions(reaction_type_id);
create index if not exists idx_reaction_counts_post_id on public.reaction_counts(post_id);
create index if not exists idx_reaction_counts_comment_id on public.reaction_counts(comment_id);

-- Insert default reaction types
insert into public.reaction_types (name, emoji, display_order) values
  ('like', '👍', 1),
  ('love', '❤️', 2),
  ('laugh', '😂', 3),
  ('wow', '😮', 4),
  ('sad', '😢', 5),
  ('angry', '😠', 6)
on conflict (name) do nothing;

-- Enable realtime for reactions
alter publication supabase_realtime add table public.reactions;
alter publication supabase_realtime add table public.reaction_counts;

-- Update posts table to use reaction counts instead of likes_count
-- We'll keep likes_count for backward compatibility but it will show total reactions
