
-- 1. system_alerts: substituir policy que confia em raw_user_meta_data
DROP POLICY IF EXISTS "Users can view alerts for their tenant" ON public.system_alerts;
CREATE POLICY "Users view tenant alerts via verified mapping"
  ON public.system_alerts FOR SELECT TO authenticated
  USING (
    (tenant_id IS NOT NULL AND public.tenant_in_my_group(tenant_id))
    OR (tenant_id IS NULL AND public.has_role(auth.uid(), 'admin'::app_role))
  );

-- 2. approval_hierarchy: remover SELECT amplo (mantém tenant_isolation_approval_hierarchy)
DROP POLICY IF EXISTS "Approval hierarchy is viewable by authenticated users" ON public.approval_hierarchy;

-- 3. order_contracts: remover SELECT amplo (mantém tenant_isolation_order_contracts)
DROP POLICY IF EXISTS "Authenticated users can view order contracts" ON public.order_contracts;

-- 4. permissions: restringir SELECT a admin
DROP POLICY IF EXISTS "Authenticated users can view permissions" ON public.permissions;
CREATE POLICY "Admins can view permissions"
  ON public.permissions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 5. role_permissions: restringir SELECT a admin
DROP POLICY IF EXISTS "Authenticated users can view role permissions" ON public.role_permissions;
CREATE POLICY "Admins can view role permissions"
  ON public.role_permissions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 6. qualification_requirements: restringir a papéis de compras
DROP POLICY IF EXISTS "Authenticated users can view qualification requirements" ON public.qualification_requirements;
CREATE POLICY "Procurement roles can view qualification requirements"
  ON public.qualification_requirements FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'coordinator'::app_role)
    OR public.has_role(auth.uid(), 'buyer'::app_role)
  );

-- 7. allowed_countries / blocked_countries: restringir SELECT a admin
DROP POLICY IF EXISTS "Authenticated users can view allowed countries" ON public.allowed_countries;
CREATE POLICY "Admins can view allowed countries"
  ON public.allowed_countries FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated users can view blocked countries" ON public.blocked_countries;
CREATE POLICY "Admins can view blocked countries"
  ON public.blocked_countries FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
