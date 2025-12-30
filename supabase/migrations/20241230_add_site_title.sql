-- Add site_title column to analytics_sites
ALTER TABLE analytics_sites ADD COLUMN IF NOT EXISTS site_title text;
