-- Create the analytics sites table
CREATE TABLE IF NOT EXISTS analytics_sites (
  id text PRIMARY KEY, -- We use the 'pp_uuid' format as the ID
  domain text NOT NULL,
  user_id uuid, -- Optional for now, linkable to auth.users later
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE analytics_sites ENABLE ROW LEVEL SECURITY;

-- Allow public insert (for now, during onboarding)
-- Ideally this is authenticated only, but our flow allows anonymous setup first.
CREATE POLICY "Allow public insert to analytics_sites"
ON analytics_sites
FOR INSERT
TO public
WITH CHECK (true);

-- Allow public read (for the dashboard to check existence)
-- In a real app, strict RLS would be 'user_id = auth.uid()'
CREATE POLICY "Allow public read of sites"
ON analytics_sites
FOR SELECT
TO public
USING (true);

-- Optional: Link analytics_events to sites if we want strict FK
-- ALTER TABLE analytics_events ADD CONSTRAINT fk_site FOREIGN KEY (site_id) REFERENCES analytics_sites(id);
