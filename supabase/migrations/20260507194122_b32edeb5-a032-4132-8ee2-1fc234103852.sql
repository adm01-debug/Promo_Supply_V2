-- Revoke EXECUTE on all functions in public from PUBLIC
DO $$ 
DECLARE 
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT 
            n.nspname as schema_name,
            p.proname as func_name,
            pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public'
    LOOP
        EXECUTE 'REVOKE EXECUTE ON FUNCTION public.' || quote_ident(func_record.func_name) || '(' || func_record.args || ') FROM PUBLIC';
    END LOOP;
END $$;

-- Specifically re-grant to authenticated users for functions used by the frontend
-- Using signatures matched from the database metadata
GRANT EXECUTE ON FUNCTION public.generate_sequential_number(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_approval_rule(numeric, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_effective_approver(uuid, uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_account_locked(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_failed_login(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clear_login_lockout(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_budget_availability(text, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_login_attempt(text, text, text, boolean, text) TO authenticated;

-- Ensure role/permission check functions are available to authenticated users
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;
