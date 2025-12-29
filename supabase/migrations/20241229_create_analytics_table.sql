-- Drop table if it exists to ensure fresh schema (since we are in dev)
DROP TABLE IF EXISTS analytics_events CASCADE;

-- Create the analytics events table
CREATE TABLE analytics_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id text NOT NULL,
  event_type text CHECK (event_type IN ('impression', 'page_view', 'click')),
  source text, -- 'twitter', 'linkedin', 'facebook', 'direct'
  path text,
  referrer text,
  country text,
  user_agent text,
  is_bot boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Allow public insert (for the pixel to work from anywhere)
CREATE POLICY "Allow public insert to analytics_events"
ON analytics_events
FOR INSERT
TO public
WITH CHECK (true);

-- Allow authenticated users to read events (for the dashboard)
CREATE POLICY "Allow authenticated read access"
ON analytics_events
FOR SELECT
TO authenticated
USING (true);

-- Create index for faster querying by site_id and time
CREATE INDEX idx_analytics_site_date ON analytics_events (site_id, created_at DESC);
CREATE INDEX idx_analytics_is_bot ON analytics_events (is_bot);
