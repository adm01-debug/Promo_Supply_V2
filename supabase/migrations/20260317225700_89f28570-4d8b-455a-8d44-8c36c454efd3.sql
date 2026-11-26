-- 1. Fix supplier_compliance_summary: already a view with security_invoker=true
-- It inherits RLS from fornecedores table. No action needed for the view itself.
-- But the scan says "table" - let's check if it's being treated as a table.
-- The view was recreated with security_invoker in a previous migration, so it's protected.

-- 2. Fix rate_limit_logs: restrict INSERT to authenticated users only
DROP POLICY IF EXISTS "System can insert rate limit logs" ON public.rate_limit_logs;
DROP POLICY IF EXISTS "Anyone can insert rate limit logs" ON public.rate_limit_logs;
DROP POLICY IF EXISTS "Authenticated users can insert rate limit logs" ON public.rate_limit_logs;

-- Find and drop the problematic INSERT policy
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname FROM pg_policies 
    WHERE tablename = 'rate_limit_logs' AND cmd = 'INSERT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.rate_limit_logs', pol.policyname);
  END LOOP;
END $$;

-- Create secure INSERT policy requiring authentication
CREATE POLICY "Authenticated insert rate limit logs" ON public.rate_limit_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);