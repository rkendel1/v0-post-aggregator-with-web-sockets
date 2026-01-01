-- Add is_saved column to saved_posts table to track explicit saves separate from queue status
-- This allows posts to be saved, queued, or both independently

-- Add the is_saved column with default value of false
ALTER TABLE public.saved_posts 
ADD COLUMN IF NOT EXISTS is_saved boolean DEFAULT false NOT NULL;

-- Update existing records:
-- If queue_position is NULL, it was explicitly saved, so set is_saved = true
-- If queue_position is NOT NULL, we assume it was only queued (not explicitly saved)
UPDATE public.saved_posts 
SET is_saved = true 
WHERE queue_position IS NULL;

-- Create an index on is_saved for better query performance
CREATE INDEX IF NOT EXISTS idx_saved_posts_is_saved ON public.saved_posts(is_saved);
CREATE INDEX IF NOT EXISTS idx_saved_posts_user_saved ON public.saved_posts(user_id, is_saved);
