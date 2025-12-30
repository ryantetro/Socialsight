-- Add logo_url to analytics_sites
ALTER TABLE analytics_sites ADD COLUMN IF NOT EXISTS logo_url text;
