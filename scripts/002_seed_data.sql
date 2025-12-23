-- Insert sample cash tags
insert into public.cash_tags (tag, name) values
  ('AAPL', 'Apple Inc.'),
  ('TSLA', 'Tesla Inc.'),
  ('BTC', 'Bitcoin'),
  ('ETH', 'Ethereum'),
  ('GOOGL', 'Alphabet Inc.')
on conflict (tag) do nothing;

-- Insert sample sources
insert into public.sources (name, icon) values
  ('Twitter', '𝕏'),
  ('Reddit', '🔴'),
  ('News', '📰'),
  ('Discord', '💬'),
  ('Telegram', '✈️')
on conflict do nothing;

-- Insert sample posts
insert into public.posts (content, author_name, author_avatar, cash_tag_id, source_id, likes_count)
select 
  'Just bought more shares! $AAPL looking strong 📈',
  'John Trader',
  '/placeholder.svg?height=40&width=40',
  (select id from public.cash_tags where tag = 'AAPL' limit 1),
  (select id from public.sources where name = 'Twitter' limit 1),
  42
union all
select 
  'Great earnings report from Apple! Revenue up 12% YoY',
  'Market News',
  '/placeholder.svg?height=40&width=40',
  (select id from public.cash_tags where tag = 'AAPL' limit 1),
  (select id from public.sources where name = 'News' limit 1),
  127
union all
select 
  '$TSLA delivery numbers exceeded expectations! 🚗⚡',
  'EV Enthusiast',
  '/placeholder.svg?height=40&width=40',
  (select id from public.cash_tags where tag = 'TSLA' limit 1),
  (select id from public.sources where name = 'Reddit' limit 1),
  89
union all
select 
  'Bitcoin breaking through resistance! $BTC to the moon 🚀',
  'Crypto Bull',
  '/placeholder.svg?height=40&width=40',
  (select id from public.cash_tags where tag = 'BTC' limit 1),
  (select id from public.sources where name = 'Twitter' limit 1),
  234
union all
select 
  'Ethereum 2.0 upgrade showing promising results $ETH',
  'DeFi Daily',
  '/placeholder.svg?height=40&width=40',
  (select id from public.cash_tags where tag = 'ETH' limit 1),
  (select id from public.sources where name = 'Discord' limit 1),
  156;
