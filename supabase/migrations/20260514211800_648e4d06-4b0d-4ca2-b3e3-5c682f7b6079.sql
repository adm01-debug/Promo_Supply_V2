-- Revoke execute from public for all SECURITY DEFINER functions in public schema
DO $$ 
DECLARE 
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT p.oid, n.nspname, p.proname
        FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' 
        AND p.prosecdef = true
    LOOP
        EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated;', 
            func_record.oid::regprocedure);
            
        -- Ensure service_role still has access
        EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role;', 
            func_record.oid::regprocedure);
    END LOOP;
END $$;
