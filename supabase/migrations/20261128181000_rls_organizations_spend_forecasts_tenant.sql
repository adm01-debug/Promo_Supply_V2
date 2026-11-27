-- security(rls): organizations e spend_forecasts deixam de depender de user_organizations (achado RLS-07, etapa 068).
--
-- Causa: a unica leitura de public.organizations era
--   USING (id IN (SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()))
-- e spend_forecasts tinha a mesma subconsulta na unica policy permissiva de SELECT. public.user_organizations
-- esta vazia (heap de 0 bytes no snapshot) e nada no codigo escreve nela, entao nenhum usuario enxergava a
-- propria organizacao nem o proprio forecast, apesar de organizations ter linha e profiles guardar
-- current_organization_id. O resto do banco resolve empresa por public.get_user_grupo_id()
-- (profiles.current_organization_id).
--
-- Correcao: a fonte de verdade passa a ser profiles.current_organization_id, mantendo a subconsulta antiga
-- como OR para nao esconder nada de quem hoje enxerga por user_organizations (hoje: ninguem; depois de
-- qualquer carga futura, continua valendo). Nao populamos user_organizations (evita terceira fonte de verdade)
-- e nao apagamos a tabela.
--
-- Fora do escopo: as policies "Tenant isolation for solicitacoes" e "Tenant isolation for category_strategies".
--
-- Reversao: supabase/rollbacks/20261128181000_revert_rls_organizations_spend_forecasts_tenant.sql

DROP POLICY IF EXISTS "Users can see their organizations" ON public.organizations;
CREATE POLICY "Users can see their organizations" ON public.organizations
  FOR SELECT
  USING (
    id = public.get_user_grupo_id()
    OR id IN (SELECT uo.organization_id FROM public.user_organizations uo WHERE uo.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Tenant isolation for spend_forecasts" ON public.spend_forecasts;
CREATE POLICY "Tenant isolation for spend_forecasts" ON public.spend_forecasts
  FOR SELECT
  USING (
    organization_id = public.get_user_grupo_id()
    OR organization_id IN (SELECT uo.organization_id FROM public.user_organizations uo WHERE uo.user_id = auth.uid())
    OR public.tenant_in_my_group(tenant_id)
  );

-- Prova: as duas policies existem, sao de SELECT e citam o vinculo real de empresa.
DO $prova$
DECLARE
  v_org_qual   text;
  v_fore_qual  text;
BEGIN
  SELECT p.qual INTO v_org_qual FROM pg_policies p
  WHERE p.schemaname = 'public' AND p.tablename = 'organizations'
    AND p.policyname = 'Users can see their organizations' AND p.cmd = 'SELECT';

  IF v_org_qual IS NULL OR v_org_qual NOT LIKE '%get_user_grupo_id%' THEN
    RAISE EXCEPTION 'policy de leitura de organizations nao usa get_user_grupo_id (qual=%)', v_org_qual;
  END IF;

  SELECT p.qual INTO v_fore_qual FROM pg_policies p
  WHERE p.schemaname = 'public' AND p.tablename = 'spend_forecasts'
    AND p.policyname = 'Tenant isolation for spend_forecasts' AND p.cmd = 'SELECT';

  IF v_fore_qual IS NULL OR v_fore_qual NOT LIKE '%get_user_grupo_id%' THEN
    RAISE EXCEPTION 'policy de leitura de spend_forecasts nao usa get_user_grupo_id (qual=%)', v_fore_qual;
  END IF;
END $prova$;