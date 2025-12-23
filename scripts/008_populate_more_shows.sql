-- Use a transaction to ensure all or nothing
BEGIN;

-- This script populates the database with more show tags and posts
-- to demonstrate the live feed and episode catalog features.

DO $$
DECLARE
    lex_fridman_id UUID;
    huberman_lab_id UUID;
    tim_ferriss_id UUID;
    mfm_id UUID;
    smartless_id UUID;
    joe_rogan_id UUID; -- Added Joe Rogan
    user_id_placeholder UUID;
BEGIN
    -- Find an existing user to attribute posts to.
    -- If no user exists, posts will be created without a user_id, which is allowed by the schema.
    SELECT id INTO user_id_placeholder FROM auth.users LIMIT 1;

    -- Insert new show tags and capture their generated IDs
    INSERT INTO public.show_tags (tag, name, category) VALUES
    ('lexfridman', 'Lex Fridman Podcast', 'Technology') RETURNING id INTO lex_fridman_id;

    INSERT INTO public.show_tags (tag, name, category) VALUES
    ('hubermanlab', 'Huberman Lab', 'Science') RETURNING id INTO huberman_lab_id;

    INSERT INTO public.show_tags (tag, name, category) VALUES
    ('timferriss', 'The Tim Ferriss Show', 'Business') RETURNING id INTO tim_ferriss_id;

    INSERT INTO public.show_tags (tag, name, category) VALUES
    ('myfavoritemurder', 'My Favorite Murder', 'True Crime') RETURNING id INTO mfm_id;

    INSERT INTO public.show_tags (tag, name, category) VALUES
    ('smartless', 'SmartLess', 'Comedy') RETURNING id INTO smartless_id;

    INSERT INTO public.show_tags (tag, name, category) VALUES
    ('joerogan', 'The Joe Rogan Experience', 'Society & Culture') RETURNING id INTO joe_rogan_id;

    -- Insert posts for Lex Fridman Podcast (a mix of episodes with audio and discussion posts)
    INSERT INTO public.posts (user_id, show_tag_id, author_name, content, image_url, audio_url, created_at) VALUES
    (user_id_placeholder, lex_fridman_id, 'Lex Fridman', '#lexfridman Episode #432 - Sam Altman: OpenAI, GPT-5, and the Future of AGI', 'https://picsum.photos/seed/lex432/400', 'https://cdn.simplecast.com/audio/cae8b030-ae45-4a55-877c-56b25c5f859f/episodes/a1502912-4015-459a-9a53-a05554c78b5a/audio/128/default.mp3', NOW() - INTERVAL '1 day'),
    (user_id_placeholder, lex_fridman_id, 'Lex Fridman', '#lexfridman Episode #431 - Jeff Bezos: Amazon, Blue Origin, and Day 1', 'https://picsum.photos/seed/lex431/400', 'https://cdn.simplecast.com/audio/cae8b030-ae45-4a55-877c-56b25c5f859f/episodes/a1502912-4015-459a-9a53-a05554c78b5a/audio/128/default.mp3', NOW() - INTERVAL '3 days'),
    (user_id_placeholder, lex_fridman_id, 'User123', '#lexfridman Just listened to the Sam Altman episode. Mind-blowing stuff! What does everyone think about the GPT-5 predictions?', NULL, NULL, NOW() - INTERVAL '20 hours');

    -- Insert posts for Huberman Lab
    INSERT INTO public.posts (user_id, show_tag_id, author_name, content, image_url, audio_url, created_at) VALUES
    (user_id_placeholder, huberman_lab_id, 'Andrew Huberman', '#hubermanlab The Science of Setting & Achieving Goals', 'https://picsum.photos/seed/huberman_goals/400', 'https://cdn.simplecast.com/audio/cae8b030-ae45-4a55-877c-56b25c5f859f/episodes/a1502912-4015-459a-9a53-a05554c78b5a/audio/128/default.mp3', NOW() - INTERVAL '2 days'),
    (user_id_placeholder, huberman_lab_id, 'Andrew Huberman', '#hubermanlab Using Light to Optimize Health, Sleep, and Learning', 'https://picsum.photos/seed/huberman_light/400', 'https://cdn.simplecast.com/audio/cae8b030-ae45-4a55-877c-56b25c5f859f/episodes/a1502912-4015-459a-9a53-a05554c78b5a/audio/128/default.mp3', NOW() - INTERVAL '5 days'),
    (user_id_placeholder, huberman_lab_id, 'BiohackerJane', '#hubermanlab The episode on cold exposure changed my morning routine completely. Anyone else trying this?', NULL, NULL, NOW() - INTERVAL '1 day');

    -- Insert posts for The Tim Ferriss Show
    INSERT INTO public.posts (user_id, show_tag_id, author_name, content, image_url, audio_url, created_at) VALUES
    (user_id_placeholder, tim_ferriss_id, 'Tim Ferriss', '#timferriss #701: Dr. Peter Attia - The Science of Longevity, Optimal Health, and Peak Performance', 'https://picsum.photos/seed/tim701/400', 'https://cdn.simplecast.com/audio/cae8b030-ae45-4a55-877c-56b25c5f859f/episodes/a1502912-4015-459a-9a53-a05554c78b5a/audio/128/default.mp3', NOW() - INTERVAL '4 days');

    -- Insert posts for My Favorite Murder
    INSERT INTO public.posts (user_id, show_tag_id, author_name, content, image_url, audio_url, created_at) VALUES
    (user_id_placeholder, mfm_id, 'Karen & Georgia', '#myfavoritemurder 450 - Proclensity', 'https://picsum.photos/seed/mfm450/400', 'https://cdn.simplecast.com/audio/cae8b030-ae45-4a55-877c-56b25c5f859f/episodes/a1502912-4015-459a-9a53-a05554c78b5a/audio/128/default.mp3', NOW() - INTERVAL '6 days');

    -- Insert posts for SmartLess
    INSERT INTO public.posts (user_id, show_tag_id, author_name, content, image_url, audio_url, created_at) VALUES
    (user_id_placeholder, smartless_id, 'SmartLess', '#smartless Bradley Cooper', 'https://picsum.photos/seed/smartless_cooper/400', 'https://cdn.simplecast.com/audio/cae8b030-ae45-4a55-877c-56b25c5f859f/episodes/a1502912-4015-459a-9a53-a05554c78b5a/audio/128/default.mp3', NOW() - INTERVAL '1 week');

    -- Insert posts for Joe Rogan Experience
    INSERT INTO public.posts (user_id, show_tag_id, author_name, content, image_url, audio_url, created_at) VALUES
    (user_id_placeholder, joe_rogan_id, 'Joe Rogan', '#joerogan #2161 - Bill Maher', 'https://picsum.photos/seed/jre2161/400', 'https://cdn.simplecast.com/audio/cae8b030-ae45-4a55-877c-56b25c5f859f/episodes/a1502912-4015-459a-9a53-a05554c78b5a/audio/128/default.mp3', NOW() - INTERVAL '2 days'),
    (user_id_placeholder, joe_rogan_id, 'Joe Rogan', '#joerogan #2160 - Action Bronson', 'https://picsum.photos/seed/jre2160/400', 'https://cdn.simplecast.com/audio/cae8b030-ae45-4a55-877c-56b25c5f859f/episodes/a1502912-4015-459a-9a53-a05554c78b5a/audio/128/default.mp3', NOW() - INTERVAL '4 days'),
    (user_id_placeholder, joe_rogan_id, 'JREListener', '#joerogan The Bill Maher episode was fascinating. Their dynamic is always interesting to watch.', NULL, NULL, NOW() - INTERVAL '1 day');

END $$;

COMMIT;