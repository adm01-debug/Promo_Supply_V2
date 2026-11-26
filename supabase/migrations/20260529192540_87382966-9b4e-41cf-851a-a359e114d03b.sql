-- 1. Restrict exec_sql to service_role only
REVOKE ALL ON FUNCTION public.exec_sql(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.exec_sql(text) FROM anon;
REVOKE ALL ON FUNCTION public.exec_sql(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO service_role;

-- 2. Security functions hardening using OIDs to handle overloads
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN 
        SELECT p.oid, p.proname, n.nspname
        FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' AND p.prosecdef = true
    LOOP
        EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path = public', 
            r.nspname, r.proname, pg_get_function_identity_arguments(r.oid));
        
        EXECUTE format('REVOKE ALL ON FUNCTION %I.%I(%s) FROM PUBLIC', 
            r.nspname, r.proname, pg_get_function_identity_arguments(r.oid));
            
        EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO service_role', 
            r.nspname, r.proname, pg_get_function_identity_arguments(r.oid));
    END LOOP;
END $$;

-- 3. Specific grants for functions used by authenticated users
GRANT EXECUTE ON FUNCTION public.log_login_attempt(_email text, _ip_address text, _user_agent text, _success boolean, _failure_reason text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_workflow_sod(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_approval_rule(numeric, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fx_convert(numeric, bpchar, bpchar, date) TO authenticated;
