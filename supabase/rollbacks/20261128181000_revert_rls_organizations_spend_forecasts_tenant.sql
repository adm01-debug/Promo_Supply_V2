-- Reversao de 20261128181000_rls_organizations_spend_forecasts_tenant.sql (etapa 068). Nao aplicada automaticamente.
DROP POLICY IF EXISTS "Users can see their organizations" ON public.organizations;
CREATE POLICY "Users can see their organizations" ON public.organizations
  FOR SELECT
  USING (id IN (SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Tenant isolation for spend_forecasts" ON public.spend_forecasts;
CREATE POLICY "Tenant isolation for spend_forecasts" ON public.spend_forecasts
  FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()));