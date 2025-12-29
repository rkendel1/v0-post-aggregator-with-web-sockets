-- Fix legacy unique constraint name after table rename from cash_tags to show_tags
-- Drop the old constraint if it exists
ALTER TABLE show_tags DROP CONSTRAINT IF EXISTS cash_tags_tag_key;

-- Add new unique constraint on tag column
ALTER TABLE show_tags ADD CONSTRAINT show_tags_tag_key UNIQUE (tag);

-- Ensure RLS is enabled (if not already)
ALTER TABLE show_tags ENABLE ROW LEVEL SECURITY;

-- Existing policies should remain, but verify public read, authenticated write
-- If needed, recreate policies (assuming they exist):
-- CREATE POLICY "Public read on show_tags" ON show_tags FOR SELECT USING (true);
-- CREATE POLICY "Authenticated insert on show_tags" ON show_tags FOR INSERT WITH CHECK (auth.role() = 'authenticated');
-- CREATE POLICY "Authenticated update on show_tags" ON show_tags FOR UPDATE USING (auth.role() = 'authenticated');
-- CREATE POLICY "Authenticated delete on show_tags" ON show_tags FOR DELETE USING (auth.role() = 'authenticated');

-- Index for performance (if not exists)
CREATE INDEX IF NOT EXISTS idx_show_tags_tag ON show_tags (tag);