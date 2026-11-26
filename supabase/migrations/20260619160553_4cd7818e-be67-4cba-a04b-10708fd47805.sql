REVOKE EXECUTE ON FUNCTION public.log_security_event(uuid, text, text, text, text, jsonb, text) FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.log_audit_event(text, text, text, text, jsonb, jsonb, jsonb) FROM authenticated, anon;
GRANT EXECUTE ON FUNCTION public.log_security_event(uuid, text, text, text, text, jsonb, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.log_audit_event(text, text, text, text, jsonb, jsonb, jsonb) TO service_role;