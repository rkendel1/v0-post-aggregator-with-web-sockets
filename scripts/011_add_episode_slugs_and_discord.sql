-- Migration: Add episode slug support and Discord integration fields
-- This migration adds auto-generated slug support for episodes and enhances Discord integration

BEGIN;

-- Add episode_slug column to posts table
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS episode_slug TEXT;

-- Add Discord-specific fields to show_community_links
ALTER TABLE public.show_community_links 
ADD COLUMN IF NOT EXISTS is_discord BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS discord_server_id TEXT;

-- Create an index on episode_slug for faster lookups
CREATE INDEX IF NOT EXISTS idx_posts_episode_slug ON public.posts(episode_slug);

-- Create a function to auto-generate episode slugs
CREATE OR REPLACE FUNCTION generate_episode_slug()
RETURNS TRIGGER AS $$
DECLARE
  date_prefix TEXT;
  title_text TEXT;
  cleaned_title TEXT;
  words TEXT[];
  slug_words TEXT[];
  title_slug TEXT;
  final_slug TEXT;
BEGIN
  -- Only generate slug for episodes with audio_url (actual episodes)
  IF NEW.audio_url IS NOT NULL AND (NEW.episode_slug IS NULL OR NEW.episode_slug = '') THEN
    -- Format date as YYYY-MM-DD
    date_prefix := TO_CHAR(NEW.created_at, 'YYYY-MM-DD');
    
    -- Extract title from content (first line, remove hashtags)
    title_text := SPLIT_PART(NEW.content, E'\n', 1);
    cleaned_title := REGEXP_REPLACE(title_text, '#\w+', '', 'g');
    cleaned_title := REGEXP_REPLACE(cleaned_title, 'episode\s*#?\d+', '', 'gi');
    cleaned_title := REGEXP_REPLACE(cleaned_title, 'ep\.?\s*\d+', '', 'gi');
    cleaned_title := TRIM(cleaned_title);
    
    -- Convert to lowercase and split into words
    words := STRING_TO_ARRAY(LOWER(cleaned_title), ' ');
    
    -- Filter out very short words and take first 6
    slug_words := ARRAY(
      SELECT word 
      FROM UNNEST(words) AS word 
      WHERE LENGTH(word) > 2 
      LIMIT 6
    );
    
    -- Join words with hyphens and clean up
    title_slug := ARRAY_TO_STRING(slug_words, '-');
    title_slug := REGEXP_REPLACE(title_slug, '[^\w\s-]', '', 'g');
    title_slug := REGEXP_REPLACE(title_slug, '\s+', '-', 'g');
    title_slug := REGEXP_REPLACE(title_slug, '-+', '-', 'g');
    title_slug := TRIM(BOTH '-' FROM title_slug);
    
    -- Limit to 60 characters
    IF LENGTH(title_slug) > 60 THEN
      title_slug := SUBSTRING(title_slug FROM 1 FOR 60);
      title_slug := REGEXP_REPLACE(title_slug, '-+$', '');
    END IF;
    
    -- Combine date and title slug
    final_slug := date_prefix || '-' || title_slug;
    
    NEW.episode_slug := final_slug;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate episode slugs on insert
DROP TRIGGER IF EXISTS trigger_generate_episode_slug ON public.posts;
CREATE TRIGGER trigger_generate_episode_slug
  BEFORE INSERT ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION generate_episode_slug();

-- Backfill episode slugs for existing posts with audio
UPDATE public.posts
SET episode_slug = (
  SELECT 
    TO_CHAR(created_at, 'YYYY-MM-DD') || '-' || 
    TRIM(BOTH '-' FROM REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          REGEXP_REPLACE(
            LOWER(
              REGEXP_REPLACE(
                REGEXP_REPLACE(
                  REGEXP_REPLACE(
                    TRIM(SPLIT_PART(content, E'\n', 1)),
                    '#\w+', '', 'g'
                  ),
                  'episode\s*#?\d+', '', 'gi'
                ),
                'ep\.?\s*\d+', '', 'gi'
              )
            ),
            '[^\w\s-]', '', 'g'
          ),
          '\s+', '-', 'g'
        ),
        '-+', '-', 'g'
      ),
      '^-+|-+$', '', 'g'
    ))
)
WHERE audio_url IS NOT NULL 
  AND (episode_slug IS NULL OR episode_slug = '');

COMMIT;

-- Display summary
DO $$
DECLARE
  posts_updated INTEGER;
BEGIN
  SELECT COUNT(*) INTO posts_updated 
  FROM public.posts 
  WHERE episode_slug IS NOT NULL;
  
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Posts with episode slugs: %', posts_updated;
END $$;
