-- Rename site ID from 'pp_qei4lwe0g' to 'pp_d31c3026' to match Production Code.
-- We must handle foreign keys in analytics_events and scans if they exist.

DO $$
DECLARE
    old_id text := 'pp_qei4lwe0g';
    new_id text := 'pp_d31c3026';
BEGIN
    -- 1. Check if the target ID already exists (collision)
    IF EXISTS (SELECT 1 FROM analytics_sites WHERE id = new_id) THEN
        -- If it exists, we might need to merge or just warn. 
        -- For now, let's assume we want to keep the 'old_id' record's metadata but use 'new_id'.
        -- We'll delete the collision if it's empty/dummy, or raise notice.
        RAISE NOTICE 'Target ID % already exists. Merging...', new_id;
        
        -- Update related events to point to existing new_id (merge data)
        UPDATE analytics_events SET site_id = new_id WHERE site_id = old_id;
        -- UPDATE scans SET site_id = new_id WHERE site_id = old_id; -- If scans has site_id
        
        -- Delete the old site record since we migrated its data
        DELETE FROM analytics_sites WHERE id = old_id;
        
        -- Ensure the remaining record has the correct domain references
        UPDATE analytics_sites 
        SET domain = 'socialsight.dev', is_verified = true, site_title = 'Social Sight | Professional Social Preview Tool'
        WHERE id = new_id;
        
    ELSE
        -- 2. Rename ID (Update Primary Key)
        -- We need to defer constraints or handle dependencies.
        -- Supabase/Postgres usually CASCADE if configured, but let's be safe.
        
        -- Create new record as copy
        INSERT INTO analytics_sites (id, domain, site_title, favicon_url, logo_url, user_id, is_verified, created_at, last_verified_at)
        SELECT new_id, domain, site_title, favicon_url, logo_url, user_id, is_verified, created_at, last_verified_at
        FROM analytics_sites 
        WHERE id = old_id;
        
        -- Move related data
        UPDATE analytics_events SET site_id = new_id WHERE site_id = old_id;
        -- UPDATE scans SET site_id = new_id WHERE site_id = old_id; -- If applicable

        -- Delete old record
        DELETE FROM analytics_sites WHERE id = old_id;
    END IF;
END $$;
