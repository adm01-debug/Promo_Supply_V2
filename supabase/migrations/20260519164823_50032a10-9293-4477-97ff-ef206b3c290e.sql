-- 1. Restrict telemetry logs insertion
DROP POLICY IF EXISTS "Anyone can insert telemetry logs" ON public.telemetry_logs;
CREATE POLICY "Authenticated users can insert telemetry logs" 
ON public.telemetry_logs 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- 2. Revoke public execution from sensitive functions
REVOKE EXECUTE ON FUNCTION public.log_security_event(uuid, text, text, text, text, jsonb, text) FROM public;
REVOKE EXECUTE ON FUNCTION public.log_security_event(uuid, text, text, text, text, jsonb, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.log_security_event(uuid, text, text, text, text, jsonb, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.log_audit_event(text, text, text, text, jsonb, jsonb, jsonb) FROM public;
REVOKE EXECUTE ON FUNCTION public.log_audit_event(text, text, text, text, jsonb, jsonb, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.log_audit_event(text, text, text, text, jsonb, jsonb, jsonb) TO authenticated;

-- 3. Secure search_path for security definer functions
ALTER FUNCTION public.log_security_event(uuid, text, text, text, text, jsonb, text) SET search_path = public;
ALTER FUNCTION public.log_audit_event(text, text, text, text, jsonb, jsonb, jsonb) SET search_path = public;
