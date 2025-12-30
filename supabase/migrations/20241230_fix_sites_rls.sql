-- Allow public update of the is_verified status
-- This is necessary for the anonymous onboarding flow
CREATE POLICY "Allow public update of verification status"
ON analytics_sites
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);
