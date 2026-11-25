-- Reversao da etapa 004 (RLS-01 parte 1): devolve `notifications` e `category_strategies` ao estado
-- anterior a 20261126140000_rls_fase2_notifications_e_category_strategies.sql.
-- NAO e' aplicada automaticamente: fica fora de supabase/migrations/ de proposito.
-- Aplicar somente se a migration precisar ser desfeita: as duas policies de tenant voltam a ser
-- PERMISSIVE FOR ALL, e as duas permissivas criadas pela migration sao removidas.

-- 1. notifications
DROP POLICY IF EXISTS tenant_isolation_notifications ON public.notifications;
CREATE POLICY tenant_isolation_notifications ON public.notifications
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id))
  WITH CHECK (public.tenant_in_my_group(tenant_id));

DROP POLICY IF EXISTS notificacoes_thread_followup_cotacao ON public.notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;

-- 2. category_strategies
DROP POLICY IF EXISTS tenant_isolation ON public.category_strategies;
CREATE POLICY tenant_isolation ON public.category_strategies
  AS PERMISSIVE FOR ALL TO authenticated
  USING (organization_id = public.get_my_organization());

DROP POLICY IF EXISTS category_strategies_escrita_admin_coord ON public.category_strategies;
