-- 002_seed_data.sql
-- This script CLEARS existing posts and tags and seeds the database with
-- a fresh set of data for major podcast platforms.
-- It is designed to be run multiple times for a clean slate.

-- Clear existing data to ensure a fresh seed
-- Note: We are intentionally not deleting from `sources` as they are generic.
-- The ON DELETE CASCADE on show_tags should handle related data in other tables.
DELETE FROM public.posts;
DELETE FROM public.show_tags;

-- Step 1: Seed sources for major platforms
INSERT INTO public.sources (name, icon) VALUES
('Spotify', '🎵'),
('Apple Podcasts', '🍏'),
('YouTube', '📺'),
('RSS', '📡')
ON CONFLICT (name) DO NOTHING;

-- Step 2: Seed show_tags for major podcasts
INSERT INTO public.show_tags (tag, name, category) VALUES
('joe-rogan-experience', 'The Joe Rogan Experience', 'Society & Culture'),
('smartless', 'SmartLess', 'Comedy'),
('hot-ones', 'Hot Ones', 'Food'),
('darknet-diaries', 'Darknet Diaries', 'Technology')
ON CONFLICT (tag) DO NOTHING;

-- Step 3: Seed posts for each major platform show
DO $$
DECLARE
    spotify_source_id uuid;
    apple_source_id uuid;
    youtube_source_id uuid;
    rss_source_id uuid;
    rogan_tag_id uuid;
    smartless_tag_id uuid;
    hot_ones_tag_id uuid;
    darknet_diaries_tag_id uuid;
BEGIN
    -- Get source IDs
    SELECT id INTO spotify_source_id FROM public.sources WHERE name = 'Spotify';
    SELECT id INTO apple_source_id FROM public.sources WHERE name = 'Apple Podcasts';
    SELECT id INTO youtube_source_id FROM public.sources WHERE name = 'YouTube';
    SELECT id INTO rss_source_id FROM public.sources WHERE name = 'RSS';

    -- Get show_tag IDs
    SELECT id INTO rogan_tag_id FROM public.show_tags WHERE tag = 'joe-rogan-experience';
    SELECT id INTO smartless_tag_id FROM public.show_tags WHERE tag = 'smartless';
    SELECT id INTO hot_ones_tag_id FROM public.show_tags WHERE tag = 'hot-ones';
    SELECT id INTO darknet_diaries_tag_id FROM public.show_tags WHERE tag = 'darknet-diaries';

    -- Insert posts
    -- Joe Rogan (Spotify)
    INSERT INTO public.posts (content, author_name, author_avatar, show_tag_id, source_id, image_url, external_url, audio_url, external_guid)
    VALUES
    ('#joe-rogan-experience JRE #2054 - Elon Musk', 'The Joe Rogan Experience', 'https://i.scdn.co/image/ab67656300005f1f242931922207329839050813', rogan_tag_id, spotify_source_id, 'https://i.scdn.co/image/ab6765630000ba8a242931922207329839050813', 'https://open.spotify.com/episode/6aC3I62J1y1p6F1N6o3h3f', 'https://traffic.megaphone.fm/DGT3363421588.mp3', 'spotify:episode:6aC3I62J1y1p6F1N6o3h3f');

    -- SmartLess (Apple Podcasts)
    INSERT INTO public.posts (content, author_name, author_avatar, show_tag_id, source_id, image_url, external_url, audio_url, external_guid)
    VALUES
    ('#smartless "Weird Al" Yankovic', 'SmartLess', 'https://is1-ssl.mzstatic.com/image/thumb/Podcasts116/v4/1a/23/39/1a23394c-1521-124c-7217-3903251335f7/mza_14993315286993882189.jpg/1200x1200bb.jpg', smartless_tag_id, apple_source_id, 'https://is1-ssl.mzstatic.com/image/thumb/Podcasts116/v4/1a/23/39/1a23394c-1521-124c-7217-3903251335f7/mza_14993315286993882189.jpg/626x626bb.jpg', 'https://podcasts.apple.com/us/podcast/weird-al-yankovic/id1521578868?i=1000624969583', 'https://pdst.fm/e/chtbl.com/track/524GE/traffic.megaphone.fm/AMPM8321888305.mp3', 'AMPM8321888305');

    -- Hot Ones (YouTube)
    INSERT INTO public.posts (content, author_name, author_avatar, show_tag_id, source_id, image_url, external_url, audio_url, external_guid)
    VALUES
    ('#hot-ones Gordon Ramsay Savagely Critiques Spicy Wings', 'First We Feast', 'https://yt3.googleusercontent.com/ytc/AIdro_k-T0-_5a7n5dc_2z7-y2x2_2H3G-S_6R-p_Q=s176-c-k-c0x00ffffff-no-rj', hot_ones_tag_id, youtube_source_id, 'https://i.ytimg.com/vi/U9DyHthJ6LA/maxresdefault.jpg', 'https://www.youtube.com/watch?v=U9DyHthJ6LA', 'https://example.com/hot-ones-gordon-ramsay.mp3', 'youtube:U9DyHthJ6LA');

    -- Darknet Diaries (RSS)
    INSERT INTO public.posts (content, author_name, author_avatar, show_tag_id, source_id, image_url, external_url, audio_url, external_guid)
    VALUES
    ('#darknet-diaries Ep 100: The Spy', 'Darknet Diaries', 'https://darknetdiaries.com/images/darknet-diaries-2000.jpg', darknet_diaries_tag_id, rss_source_id, 'https://darknetdiaries.com/images/darknet-diaries-2000.jpg', 'https://darknetdiaries.com/episode/100/', 'https://traffic.megaphone.fm/CSN4611366151.mp3', 'darknet-diaries-100');

END $$;