-- Add verification status to analytics sites
ALTER TABLE analytics_sites ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;
ALTER TABLE analytics_sites ADD COLUMN IF NOT EXISTS last_verified_at timestamptz;

-- Update existing sites to be verified (assuming previous setup attempts were "live tracking" as per old design)
-- However, since the user complained about junk, maybe we should leave them unverified.
-- Let's leave them unverified so the user can see only the ones they actually fix.
-- UPDATE analytics_sites SET is_verified = true WHERE is_verified IS NULL;
