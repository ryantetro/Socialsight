-- User Stats Query
-- Replace 'USER_UUID_HERE' with the target user_id
-- Usage: Run in Supabase SQL Editor

WITH target_user AS (
  SELECT '1d8cd569-57b9-4003-a87b-602cb7cd8ac4'::uuid AS id
),

-- 1. Scan Stats
scan_stats AS (
  SELECT 
    COUNT(*) as total_scans,
    ROUND(AVG((result->>'score')::int)) as avg_score,
    MAX(created_at) as last_scan_date
  FROM scans
  WHERE user_id = (SELECT id FROM target_user)
),

-- 2. Sites Owned
sites_owned AS (
  SELECT 
    id as site_id,
    domain,
    created_at
  FROM analytics_sites
  WHERE user_id = (SELECT id FROM target_user)
),

-- 3. AI Images Generated
ai_stats AS (
  SELECT 
    COUNT(*) as total_images_generated
  FROM ai_images
  WHERE user_id = (SELECT id FROM target_user)
),

-- 4. Analytics Events (Aggregated across all owned sites)
analytics_stats AS (
  SELECT 
    COUNT(*) as total_analytics_events,
    COUNT(DISTINCT site_id) as active_sites_with_traffic
  FROM analytics_events
  WHERE site_id IN (SELECT site_id FROM sites_owned)
)

SELECT 
  (SELECT id FROM target_user) as user_id,
  
  -- Scan Info
  COALESCE((SELECT total_scans FROM scan_stats), 0) as total_scans,
  (SELECT avg_score FROM scan_stats) as avg_scan_score,
  (SELECT last_scan_date FROM scan_stats) as last_scanned_at,
  
  -- Site Info
  (SELECT COUNT(*) FROM sites_owned) as total_sites_registered,
  (SELECT string_agg(domain, ', ') FROM sites_owned) as domains_list,
  
  -- AI Usage
  COALESCE((SELECT total_images_generated FROM ai_stats), 0) as total_ai_images,
  
  -- Analytics Traffic
  COALESCE((SELECT total_analytics_events FROM analytics_stats), 0) as total_traffic_events
;

-- Detailed Breakdown of Recent Scans (Optional - Uncomment to run separately)
-- SELECT url, result->>'score' as score, created_at 
-- FROM scans 
-- WHERE user_id = '1d8cd569-57b9-4003-a87b-602cb7cd8ac4' 
-- ORDER BY created_at DESC LIMIT 10;
