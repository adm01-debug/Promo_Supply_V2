-- M-01 (parte 2): funções herdam EXECUTE de PUBLIC — revogar de PUBLIC também.

REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text, text, integer, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_grupo_id() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.grant_tenant_access_on_insert() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_permission(uuid, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_ip_blocked(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.tenant_in_my_group(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.tenants_in_my_group() FROM PUBLIC;
-- Reafirma grants aos papéis certos
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, text, integer, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_grupo_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_ip_blocked(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.tenant_in_my_group(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.tenants_in_my_group() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.grant_tenant_access_on_insert() TO service_role;