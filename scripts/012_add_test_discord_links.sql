-- Test data: Add Discord community links to existing shows
-- This script adds Discord server links to shows for testing the integration

BEGIN;

-- Find or create test Discord community links for popular shows
DO $$
DECLARE
    huberman_id UUID;
    joe_rogan_id UUID;
    darknet_id UUID;
BEGIN
    -- Get show tag IDs
    SELECT id INTO huberman_id FROM public.show_tags WHERE tag = 'hubermanlab' LIMIT 1;
    SELECT id INTO joe_rogan_id FROM public.show_tags WHERE tag = 'joerogan' LIMIT 1;
    SELECT id INTO darknet_id FROM public.show_tags WHERE tag = 'darknet-diaries' LIMIT 1;

    -- Add Discord community link for Huberman Lab if it doesn't exist
    IF huberman_id IS NOT NULL THEN
        INSERT INTO public.show_community_links (show_tag_id, platform, name, description, url, is_discord, discord_server_id)
        VALUES (
            huberman_id,
            'discord',
            'Huberman Lab Discord',
            'Official Discord community for Huberman Lab podcast discussions',
            'https://discord.gg/hubermanlab',
            true,
            'hubermanlab'
        )
        ON CONFLICT DO NOTHING;
    END IF;

    -- Add Discord community link for Joe Rogan if it doesn't exist
    IF joe_rogan_id IS NOT NULL THEN
        INSERT INTO public.show_community_links (show_tag_id, platform, name, description, url, is_discord, discord_server_id)
        VALUES (
            joe_rogan_id,
            'discord',
            'JRE Discord',
            'Fan community Discord for The Joe Rogan Experience',
            'https://discord.gg/joerogan',
            true,
            'joerogan'
        )
        ON CONFLICT DO NOTHING;
    END IF;

    -- Add Discord community link for Darknet Diaries if it exists
    IF darknet_id IS NOT NULL THEN
        INSERT INTO public.show_community_links (show_tag_id, platform, name, description, url, is_discord, discord_server_id)
        VALUES (
            darknet_id,
            'discord',
            'Darknet Diaries Discord',
            'Community discussion server for Darknet Diaries episodes',
            'https://discord.gg/u6UfnKpj6Z',
            true,
            'darknet-diaries'
        )
        ON CONFLICT DO NOTHING;
    END IF;

    -- If Darknet Diaries doesn't exist, create it
    IF darknet_id IS NULL THEN
        INSERT INTO public.show_tags (tag, name, category)
        VALUES ('darknet-diaries', 'Darknet Diaries', 'Technology')
        RETURNING id INTO darknet_id;

        -- Add the Discord link
        INSERT INTO public.show_community_links (show_tag_id, platform, name, description, url, is_discord, discord_server_id)
        VALUES (
            darknet_id,
            'discord',
            'Darknet Diaries Discord',
            'Community discussion server for Darknet Diaries episodes',
            'https://discord.gg/u6UfnKpj6Z',
            true,
            'darknet-diaries'
        );
    END IF;

    RAISE NOTICE 'Discord community links added successfully!';
END $$;

COMMIT;
