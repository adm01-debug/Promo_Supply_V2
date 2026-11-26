
-- Fix audit_logs: restrict INSERT to only allow user's own entries
DROP POLICY IF EXISTS "Authenticated users can create audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Users can insert audit logs" ON public.audit_logs;
-- Find and drop any open insert policy
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'audit_logs' AND cmd = 'INSERT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.audit_logs', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Only admins and coordinators can insert audit logs" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'coordinator')
  );

-- Fix security_logs: restrict INSERT to privileged roles  
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'security_logs' AND cmd = 'INSERT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.security_logs', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Only admins can insert security logs" ON public.security_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'coordinator')
  );
