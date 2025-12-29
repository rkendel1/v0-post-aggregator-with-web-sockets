-- Create hashtag_mappings table for mapping hashtags to show_tags (RSS tags)
CREATE TABLE IF NOT EXISTS hashtag_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hashtag text UNIQUE NOT NULL,  -- e.g., 'ai' or '#ai' (normalized without # in storage, but UI can add)
  show_tag_id uuid REFERENCES show_tags(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE hashtag_mappings ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Public read, authenticated write
CREATE POLICY "Public read on hashtag_mappings" ON hashtag_mappings
  FOR SELECT USING (true);

CREATE POLICY "Authenticated insert on hashtag_mappings" ON hashtag_mappings
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated update on hashtag_mappings" ON hashtag_mappings
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated delete on hashtag_mappings" ON hashtag_mappings
  FOR DELETE USING (auth.role() = 'authenticated');

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_hashtag_mappings_hashtag ON hashtag_mappings (hashtag);
CREATE INDEX IF NOT EXISTS idx_hashtag_mappings_show_tag_id ON hashtag_mappings (show_tag_id);

-- Enable realtime for hashtag_mappings
ALTER PUBLICATION supabase_realtime ADD TABLE hashtag_mappings;