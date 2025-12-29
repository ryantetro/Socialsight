-- Add monitoring fields to analytics_sites
ALTER TABLE analytics_sites
ADD COLUMN IF NOT EXISTS is_monitored boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS last_verified_at timestamptz;

-- Index for faster guardian lookups
CREATE INDEX IF NOT EXISTS idx_sites_is_monitored ON analytics_sites (is_monitored) WHERE is_monitored = true;
