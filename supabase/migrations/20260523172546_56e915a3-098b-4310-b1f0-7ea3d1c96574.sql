-- Helper function for the audit edge function to execute dynamic SQL for policy inspection
CREATE OR REPLACE FUNCTION public.exec_sql(sql_query text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result jsonb;
BEGIN
    EXECUTE 'SELECT jsonb_agg(t) FROM (' || sql_query || ') t' INTO result;
    RETURN result;
END;
$$;

-- Fix overly permissive policies identified in audit
-- Solicitacoes
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.solicitacoes;
DROP POLICY IF EXISTS "tenant_isolation_solicitacoes" ON public.solicitacoes;
CREATE POLICY "tenant_isolation_solicitacoes" ON public.solicitacoes
    FOR ALL TO authenticated
    USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
    WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Cotacoes
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.cotacoes;
DROP POLICY IF EXISTS "tenant_isolation_cotacoes" ON public.cotacoes;
CREATE POLICY "tenant_isolation_cotacoes" ON public.cotacoes
    FOR ALL TO authenticated
    USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
    WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Fornecedores
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.fornecedores;
DROP POLICY IF EXISTS "tenant_isolation_fornecedores" ON public.fornecedores;
CREATE POLICY "tenant_isolation_fornecedores" ON public.fornecedores
    FOR ALL TO authenticated
    USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
    WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Cost Centers
DROP POLICY IF EXISTS "Authenticated users can view cost_centers" ON public.cost_centers;
DROP POLICY IF EXISTS "Authenticated users can insert cost_centers" ON public.cost_centers;
DROP POLICY IF EXISTS "tenant_isolation_cost_centers" ON public.cost_centers;
CREATE POLICY "tenant_isolation_cost_centers" ON public.cost_centers
    FOR ALL TO authenticated
    USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
    WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Ensure current_tenant_id() helper exists
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid
LANGUAGE sql STABLE
AS $$
  SELECT (auth.jwt() ->> 'tenant_id')::uuid;
$$;
