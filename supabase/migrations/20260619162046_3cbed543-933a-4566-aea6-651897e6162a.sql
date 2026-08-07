-- Restrict sensitive integration metadata to administrative tenant roles.

DROP POLICY IF EXISTS "ERP connections are tenant-isolated" ON public.erp_connections;

CREATE POLICY "Admins and coordinators manage ERP connections within tenant"
  ON public.erp_connections
  FOR ALL
  TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'coordinator'::public.app_role)
    )
  )
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'coordinator'::public.app_role)
    )
  );

DROP POLICY IF EXISTS "tenant isolation punchout_catalogs" ON public.punchout_catalogs;

CREATE POLICY "Admins and coordinators manage PunchOut catalogs within tenant"
  ON public.punchout_catalogs
  FOR ALL
  TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'coordinator'::public.app_role)
    )
  )
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'coordinator'::public.app_role)
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.erp_connections TO authenticated;
GRANT ALL ON public.erp_connections TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.punchout_catalogs TO authenticated;
GRANT ALL ON public.punchout_catalogs TO service_role;