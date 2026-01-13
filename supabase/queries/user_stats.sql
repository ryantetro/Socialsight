-- User ID to investigate: f4c6f744-290a-4624-b7b5-31005906aa1c
-- Run this in your Supabase SQL Editor

-- 1. Get Profile & Subscription Status
SELECT 
    id, 
    email, 
    tier, 
    credits, 
    stripe_subscription_id, 
    created_at 
FROM profiles 
WHERE id = 'f4c6f744-290a-4624-b7b5-31005906aa1c';

-- 2. Count Total Scans Performed
SELECT count(*) as total_audit_scans 
FROM scans 
WHERE user_id = 'f4c6f744-290a-4624-b7b5-31005906aa1c';

-- 3. Get Recent Scans (Last 5)
SELECT 
    url, 
    score, 
    created_at 
FROM scans 
WHERE user_id = 'f4c6f744-290a-4624-b7b5-31005906aa1c' 
ORDER BY created_at DESC 
LIMIT 5;

-- 4. Get Connected Analytics Sites
SELECT 
    id as site_id, 
    domain, 
    is_verified, 
    created_at 
FROM analytics_sites 
WHERE user_id = 'f4c6f744-290a-4624-b7b5-31005906aa1c';

-- 5. (Optional) Check key usage if you have an API keys table
-- SELECT * FROM api_keys WHERE user_id = 'f4c6f744-290a-4624-b7b5-31005906aa1c';
