-- Clean up and verify the existing socialsight.dev entry
UPDATE analytics_sites
SET 
  is_verified = true,
  site_title = 'Social Sight | Professional Social Preview Tool',
  -- Standardize domain (remove www if you prefer, or keep it but ensure consistency)
  -- The layout query uses ILIKE '%socialsight.dev%' so it matches both.
  domain = 'socialsight.dev', 
  favicon_url = 'https://socialsight.dev/favicon.png'
WHERE id = 'pp_qei4lwe0g';
