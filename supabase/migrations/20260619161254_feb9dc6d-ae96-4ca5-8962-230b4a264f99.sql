-- Security hardening: audit logs, product suppliers, and repurchase suggestions

-- 1) Prevent unauthenticated audit-log injection.
DROP POLICY IF EXISTS "System can insert audit logs anonymously" ON public.audit_logs;
DROP POLICY IF EXISTS "Allow anon to insert audit logs" ON public.audit_logs;
REVOKE INSERT ON public.audit_logs FROM anon;
REVOKE INSERT ON public.audit_logs FROM public;
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;

-- 2) Fix produto_fornecedores tenant policy: auth.uid() must compare to profiles.user_id, not profiles.id.
DROP POLICY IF EXISTS "Users can view product suppliers within tenant" ON public.produto_fornecedores;
DROP POLICY IF EXISTS "Users can manage product suppliers within tenant" ON public.produto_fornecedores;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.produto_fornecedores TO authenticated;
GRANT ALL ON public.produto_fornecedores TO service_role;

CREATE POLICY "Users can view product suppliers within tenant"
  ON public.produto_fornecedores
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.tenant_id = produto_fornecedores.tenant_id
    )
  );

CREATE POLICY "Users can manage product suppliers within tenant"
  ON public.produto_fornecedores
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.tenant_id = produto_fornecedores.tenant_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.tenant_id = produto_fornecedores.tenant_id
    )
  );

-- 3) Add tenant isolation to repurchase_suggestions and replace cross-tenant policies.
ALTER TABLE public.repurchase_suggestions
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

UPDATE public.repurchase_suggestions rs
SET tenant_id = COALESCE(
  rs.tenant_id,
  (SELECT p.tenant_id FROM public.produtos p WHERE p.id = rs.produto_id LIMIT 1),
  (SELECT f.tenant_id FROM public.fornecedores f WHERE f.id = rs.fornecedor_id LIMIT 1),
  (SELECT ped.tenant_id FROM public.pedidos ped WHERE ped.id = rs.ultimo_pedido_id LIMIT 1),
  '00000000-0000-0000-0000-000000000000'::uuid
)
WHERE rs.tenant_id IS NULL;

ALTER TABLE public.repurchase_suggestions
  ALTER COLUMN tenant_id SET NOT NULL,
  ALTER COLUMN tenant_id SET DEFAULT public.current_tenant_id();

CREATE INDEX IF NOT EXISTS idx_repurchase_suggestions_tenant_status
  ON public.repurchase_suggestions(tenant_id, status, proxima_compra_estimada);

DROP POLICY IF EXISTS "Authenticated users can view repurchase suggestions" ON public.repurchase_suggestions;
DROP POLICY IF EXISTS "Buyers coordinators admins can manage repurchase suggestions" ON public.repurchase_suggestions;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.repurchase_suggestions TO authenticated;
GRANT ALL ON public.repurchase_suggestions TO service_role;

CREATE POLICY "Users can view repurchase suggestions within tenant"
  ON public.repurchase_suggestions
  FOR SELECT
  TO authenticated
  USING (tenant_id = public.current_tenant_id());

CREATE POLICY "Buyers coordinators admins can manage repurchase suggestions within tenant"
  ON public.repurchase_suggestions
  FOR ALL
  TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'coordinator'::public.app_role)
      OR public.has_role(auth.uid(), 'buyer'::public.app_role)
    )
  )
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'coordinator'::public.app_role)
      OR public.has_role(auth.uid(), 'buyer'::public.app_role)
    )
  );