-- Add og_image to geo_scans for displaying on history cards
ALTER TABLE geo_scans ADD COLUMN IF NOT EXISTS og_image text;
