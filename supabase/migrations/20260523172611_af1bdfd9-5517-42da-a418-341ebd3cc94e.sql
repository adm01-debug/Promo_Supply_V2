-- Update profiles policy
DROP POLICY IF EXISTS "profiles_tenant_isolation" ON public.profiles;
CREATE POLICY "profiles_tenant_isolation" ON public.profiles
    FOR ALL TO authenticated
    USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
    WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Update produtos policy
DROP POLICY IF EXISTS "Authenticated users can view produtos" ON public.produtos;
DROP POLICY IF EXISTS "tenant_isolation_produtos" ON public.produtos;
CREATE POLICY "tenant_isolation_produtos" ON public.produtos
    FOR SELECT TO authenticated
    USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Update the audit function to be more robust
CREATE OR REPLACE FUNCTION public.exec_sql(sql_query text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    result jsonb;
BEGIN
    EXECUTE 'SELECT jsonb_agg(t) FROM (' || sql_query || ') t' INTO result;
    RETURN result;
END;
$$;
