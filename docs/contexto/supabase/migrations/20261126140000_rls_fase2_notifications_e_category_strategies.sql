-- security(rls): fase 2 do isolamento por tenant -- as duas tabelas cujo estado-alvo e' 100%
-- derivavel do que ja existe (etapa 004 / achado RLS-01, parte 1).
--
-- Causa (mesma da 20261112170347): `tenant_in_my_group(tenant_id)` como PERMISSIVE FOR ALL e'
-- autorizacao total de CRUD, porque policies PERMISSIVE do mesmo comando somam por OR. Aquela
-- migration tornou RESTRICTIVE as 35 tabelas que ja tinham permissivas por papel/dono; outras 30
-- continuam PERMISSIVE FOR ALL. Nelas NAO existe nenhuma permissiva por papel, e virar RESTRICTIVE
-- sem criar as permissivas que faltam zera o acesso -- a decisao de "qual papel escreve o que" e' de
-- negocio, tabela por tabela, e por isso elas NAO entram neste arquivo (lista na PR).
--
-- Estado real medido no snapshot do banco (docs/contexto/supabase/policies.md, branch `contexto`):
--   notifications (4 policies): tenant_isolation_notifications ALL PERMISSIVE +
--     "Users can view their own notifications" SELECT, "Users can update their own notifications"
--     UPDATE, "Users can create own notifications" INSERT -- todas de dono. NAO havia permissiva de
--     DELETE: quem apagava a notificacao de outra pessoa era a policy de tenant.
--   category_strategies (3 policies): tenant_isolation ALL PERMISSIVE
--     (organization_id = get_my_organization()) + 1 permissiva de SELECT por organizacao
--     (user_organizations). NAO havia permissiva de escrita.
--
-- Reversao: supabase/rollbacks/20261126140000_revert_rls_fase2_notifications_e_category_strategies.sql
-- (nao e' aplicada automaticamente; recria as duas policies como estavam, PERMISSIVE FOR ALL).

-- ============================================================================
-- 1. notifications
-- ============================================================================

-- 1.1 Permissiva de dono que faltava para o DELETE
--     (src/hooks/useRealPushNotifications.ts: auto-remove e limpar todas -> delete().eq('user_id', ...)).
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications

CREATE POLICY "Users can delete their own notifications" ON public.notifications
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (auth.uid() = user_id)

-- 1.2 Leitura entre colegas que o app realmente faz: a thread de follow-up da cotacao
--     (src/pages/pedidos/PedidoDetailsDialog.tsx: reading de type = 'cotacao_followup' por action_url;
--     as linhas sao inseridas pelos crons check-cotacao-followup / check-expiry-alerts para o usuario
--     da vez). E' a unica leitura de notificacao de OUTRA pessoa em todo o app -- fica restrita a esse
--     tipo, em vez de devolver a leitura ampla por empresa que existe hoje.
DROP POLICY IF EXISTS notificacoes_thread_followup_cotacao ON public.notifications

CREATE POLICY notificacoes_thread_followup_cotacao ON public.notifications
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (type = 'cotacao_followup' AND public.tenant_in_my_group(tenant_id))

-- 1.3 O buraco: PERMISSIVE FOR ALL -> RESTRICTIVE.
--     `user_id = auth.uid()` entra no USING para as linhas do proprio dono nunca ficarem invisiveis
--     (tenant_id e' NOT NULL no insert, mas o vinculo do usuario pode mudar de empresa depois).
DROP POLICY IF EXISTS tenant_isolation_notifications ON public.notifications

CREATE POLICY tenant_isolation_notifications ON public.notifications
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id) OR user_id = auth.uid())
  WITH CHECK (public.tenant_in_my_group(tenant_id))

-- ============================================================================
-- 2. category_strategies
-- ============================================================================

-- 2.1 Permissiva de papel que faltava para escrita: o app so' LE a tabela
--     (src/components/compras/executive/KraljicMatrix.tsx, unico consumidor em todo o src).
--     Mesmo par de papeis ja usado nas tabelas de configuracao vizinhas (approval_rules_escrita_admin_coord).
DROP POLICY IF EXISTS category_strategies_escrita_admin_coord ON public.category_strategies

CREATE POLICY category_strategies_escrita_admin_coord ON public.category_strategies
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'coordinator'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'coordinator'::public.app_role))

-- 2.2 tenant_isolation (ALL PERMISSIVE, organization_id = get_my_organization()) -> RESTRICTIVE.
--     O USING mantem as DUAS leituras que funcionam hoje (organizacao atual do profile e as
--     organizacoes de user_organizations), para a troca nao esconder linha nenhuma de quem ja enxerga.
DROP POLICY IF EXISTS tenant_isolation ON public.category_strategies

CREATE POLICY tenant_isolation ON public.category_strategies
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (
    organization_id = public.get_my_organization()
    OR EXISTS (
      SELECT 1 FROM public.user_organizations uo
      WHERE uo.organization_id = category_strategies.organization_id
        AND uo.user_id = auth.uid()
    )
  )
  WITH CHECK (organization_id = public.get_my_organization())
