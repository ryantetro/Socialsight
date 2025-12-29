-- Make user_id nullable to support anonymous scans
ALTER TABLE public.scans ALTER COLUMN user_id DROP NOT NULL;

-- Allow public insert access for scans (e.g. anonymous audits)
CREATE POLICY "Enable insert for all users"
ON public.scans
FOR INSERT
TO public
WITH CHECK (true);

-- Allow public read access to scans (for stats counting) if needed, or just keep it stricter.
-- For counting, we might use a DEFINER function or service role.
-- But let's verify if 'select count' requires RLS. Yes.
-- So we need a policy to allow reading IDs or just use service role in 'recordScore'.

