-- Hardening cost_centers INSERT policy
DROP POLICY IF EXISTS "Apenas administradores podem inserir centros de custo" ON public.cost_centers;
CREATE POLICY "Apenas administradores podem inserir centros de custo" 
ON public.cost_centers 
FOR INSERT 
TO authenticated 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Hardening audit_logs INSERT policy
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated users can insert audit logs" 
ON public.audit_logs 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() IS NOT NULL);

-- Setting search_path for critical functions with exact signatures
ALTER FUNCTION public.log_login_attempt(text, text, text, boolean, text) SET search_path = public;
ALTER FUNCTION public.check_workflow_sod(uuid, uuid, uuid) SET search_path = public;
ALTER FUNCTION public.find_approval_rule(numeric, uuid) SET search_path = public;
ALTER FUNCTION public.fx_convert(numeric, bpchar, bpchar, date) SET search_path = public;
ALTER FUNCTION public.sanitize_audit_metadata() SET search_path = public;
ALTER FUNCTION public.record_failed_login(text) SET search_path = public;
