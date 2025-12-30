-- Link socialsight.dev to the hardcoded pixel ID in layout.tsx
DO $$
BEGIN
    -- 1. Check if the specific ID already exists
    IF NOT EXISTS (SELECT 1 FROM analytics_sites WHERE id = 'pp_d31c3026') THEN
        -- 2. Check if the domain exists with a different ID
        IF EXISTS (SELECT 1 FROM analytics_sites WHERE domain = 'socialsight.dev') THEN
            -- Update the existing entry to use the correct ID
            UPDATE analytics_sites 
            SET id = 'pp_d31c3026', is_verified = true 
            WHERE domain = 'socialsight.dev';
        ELSE
            -- Insert a new entry if neither exists
            INSERT INTO analytics_sites (id, domain, site_title, is_verified, created_at)
            VALUES ('pp_d31c3026', 'socialsight.dev', 'Social Sight | Professional Social Preview Tool', true, NOW());
        END IF;
    ELSE
        -- ID exists, ensure domain matches (handle collision or just update)
        UPDATE analytics_sites 
        SET domain = 'socialsight.dev', is_verified = true 
        WHERE id = 'pp_d31c3026';
    END IF;
END $$;
