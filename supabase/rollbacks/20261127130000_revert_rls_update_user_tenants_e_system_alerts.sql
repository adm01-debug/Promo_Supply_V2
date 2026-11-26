-- Reversao da etapa 029 (RLS-04). Desfaz a migration
-- 20261127130000_rls_update_user_tenants_e_system_alerts.sql.
-- NAO e aplicada automaticamente: fica fora de supabase/migrations/ de proposito.
-- Aplicar somente se a 029 precisar ser desfeita.

DROP POLICY IF EXISTS "Admins update system alerts" ON public.system_alerts;
REVOKE UPDATE ON public.system_alerts FROM authenticated;

DROP POLICY IF EXISTS "Users can toggle their own default tenant" ON public.user_tenants;
REVOKE UPDATE (is_default) ON public.user_tenants FROM authenticated;