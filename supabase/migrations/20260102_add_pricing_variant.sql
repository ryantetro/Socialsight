-- Add pricing_variant column to analytics_events
ALTER TABLE IF EXISTS public.analytics_events 
ADD COLUMN IF NOT EXISTS pricing_variant TEXT;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_analytics_pricing_variant ON public.analytics_events(pricing_variant);
