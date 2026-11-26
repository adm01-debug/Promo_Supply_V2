-- Fix permissive RLS on unspsc_codes
DROP POLICY IF EXISTS "unspsc_codes_authenticated_read" ON public.unspsc_codes;
CREATE POLICY "unspsc_codes_authenticated_read" ON public.unspsc_codes
FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

-- Hardening Security Definer functions
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN 
        SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' AND p.prosecdef = true
    LOOP
        -- Set search_path to public for safety
        EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path = public', 
            r.nspname, r.proname, r.args);
        
        -- Revoke from public if not explicitly granted later
        EXECUTE format('REVOKE ALL ON FUNCTION %I.%I(%s) FROM PUBLIC', 
            r.nspname, r.proname, r.args);
    END LOOP;
END $$;

-- Specific grants for essential functions
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_tenant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_login_attempt(text, text, text, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_workflow_sod(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_approval_rule(numeric, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fx_convert(numeric, bpchar, bpchar, date) TO authenticated;

-- Ensure exec_sql is restricted to service_role
REVOKE ALL ON FUNCTION public.exec_sql(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO service_role;
