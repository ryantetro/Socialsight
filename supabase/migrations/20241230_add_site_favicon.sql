-- Add favicon_url column to analytics_sites to match Audit page branding
ALTER TABLE analytics_sites ADD COLUMN IF NOT EXISTS favicon_url text;
