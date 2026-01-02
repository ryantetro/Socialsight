-- Add ab_variant column to analytics_events if it doesn't already exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='analytics_events' AND column_name='ab_variant') THEN
        ALTER TABLE analytics_events ADD COLUMN ab_variant text;
    END IF;
END $$;

-- Create index for filtering by variant if it doesn't already exist
CREATE INDEX IF NOT EXISTS idx_analytics_ab_variant ON analytics_events (ab_variant);

-- Comment for clarity
COMMENT ON COLUMN analytics_events.ab_variant IS 'The A/B test variant assigned to the user (e.g., A, B)';
