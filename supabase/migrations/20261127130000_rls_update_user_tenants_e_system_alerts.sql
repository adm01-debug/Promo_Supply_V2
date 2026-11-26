-- Etapa 029 (RLS-04, parte 1 de 2) -- onda 1 -- Alta
--
-- Problema: `user_tenants` e `system_alerts` tem RLS habilitado e APENAS policy de
-- SELECT. Em Postgres, um UPDATE sem policy de UPDATE nao enxerga nenhuma linha:
-- afeta 0 linhas e NAO gera erro. O front tratava `error === null` como sucesso
-- ("Organizacao alterada com sucesso!", "Alerta resolvido") e nada era gravado.
--
-- Correcao no menor escopo possivel (sem `FOR ALL USING (true)`):
--   user_tenants  -> o proprio usuario, e SO a coluna is_default (GRANT por coluna:
--                    tenant_id/role continuam intocaveis)
--   system_alerts -> admin do tenant, mesma expressao da policy de SELECT vigente
--
-- Aplicacao: .github/workflows/aplicar-migration-prod.yml (dispatch manual com APLICAR)
-- Rollback:  supabase/rollbacks/20261127130000_revert_rls_update_user_tenants_e_system_alerts.sql
-- Verificacao antes: SELECT policyname, cmd FROM pg_policies
--   WHERE schemaname = 'public' AND tablename IN ('user_tenants','system_alerts');
-- (esperado: apenas cmd = 'SELECT' nas duas tabelas)

-- ---------------------------------------------------------------------------
-- 1) user_tenants: o usuario pode alternar o proprio vinculo padrao
-- ---------------------------------------------------------------------------
-- Sem UPDATE nas demais colunas: alterar tenant_id/role continua bloqueado, mesmo
-- com a policy permissiva -- e' o vinculo que guard_profile_org_change valida.
GRANT UPDATE (is_default) ON public.user_tenants TO authenticated;

DROP POLICY IF EXISTS "Users can toggle their own default tenant" ON public.user_tenants;
CREATE POLICY "Users can toggle their own default tenant"
  ON public.user_tenants
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 2) system_alerts: o admin do tenant pode marcar o alerta como resolvido
-- ---------------------------------------------------------------------------
GRANT UPDATE ON public.system_alerts TO authenticated;

DROP POLICY IF EXISTS "Admins update system alerts" ON public.system_alerts;
CREATE POLICY "Admins update system alerts"
  ON public.system_alerts
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    AND (
      (tenant_id IS NOT NULL AND public.tenant_in_my_group(tenant_id))
      OR tenant_id IS NULL
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    AND (
      (tenant_id IS NOT NULL AND public.tenant_in_my_group(tenant_id))
      OR tenant_id IS NULL
    )
  );