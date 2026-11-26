-- Final search_path cleanup for all public functions
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN 
        SELECT p.oid, p.proname, n.nspname
        FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public'
    LOOP
        EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path = public', 
            r.nspname, r.proname, pg_get_function_identity_arguments(r.oid));
    END LOOP;
END $$;
