-- M-01: Reconciliação de EXECUTE em funções SECURITY DEFINER
-- Revoga anon de todas as funções internas; mantém apenas log_login_attempt (pré-auth).
-- Referência: DOCS/SECURITY.md §3 (allowlist arquitetural)

REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text, text, integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_grupo_id() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.grant_tenant_access_on_insert() FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_permission(uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_ip_blocked(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.tenant_in_my_group(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.tenants_in_my_group() FROM anon;

-- Garante que authenticated e service_role continuam com acesso (idempotente)
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, text, integer, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_grupo_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_ip_blocked(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.tenant_in_my_group(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.tenants_in_my_group() TO authenticated, service_role;
-- grant_tenant_access_on_insert é trigger function, service_role only
GRANT EXECUTE ON FUNCTION public.grant_tenant_access_on_insert() TO service_role;