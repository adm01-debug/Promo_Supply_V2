
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ut.tenant_id
  FROM public.user_tenants ut
  WHERE ut.user_id = auth.uid()
    AND ut.tenant_id = NULLIF(auth.jwt() ->> 'tenant_id', '')::uuid
  LIMIT 1;
$$;
