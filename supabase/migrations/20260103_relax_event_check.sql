-- Drop the restrictive check constraint
ALTER TABLE analytics_events DROP CONSTRAINT IF EXISTS analytics_events_event_type_check;

-- Add a new check constraint that includes our conversion events
-- OR just leave it open-ended (safest for future proofing)
-- For now, let's just drop it to allow any text.
