
-- Fix cross-tenant leaks: add tenant_in_my_group(tenant_id) to role-based policies.

-- pagamentos
DROP POLICY IF EXISTS "Finance and admin can view payments" ON public.pagamentos;
CREATE POLICY "Finance and admin can view payments" ON public.pagamentos
  FOR SELECT TO authenticated
  USING (tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'finance'::app_role) OR has_role(auth.uid(),'coordinator'::app_role)));

DROP POLICY IF EXISTS "Finance can manage payments" ON public.pagamentos;
CREATE POLICY "Finance can manage payments" ON public.pagamentos
  FOR ALL TO authenticated
  USING (tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'finance'::app_role)))
  WITH CHECK (tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'finance'::app_role)));

-- fornecedores
DROP POLICY IF EXISTS "Buyers coordinators admins can manage suppliers" ON public.fornecedores;
CREATE POLICY "Buyers coordinators admins can manage suppliers" ON public.fornecedores
  FOR ALL TO authenticated
  USING (tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'buyer'::app_role)))
  WITH CHECK (tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'buyer'::app_role)));

DROP POLICY IF EXISTS "Role-restricted supplier access" ON public.fornecedores;
CREATE POLICY "Role-restricted supplier access" ON public.fornecedores
  FOR SELECT TO authenticated
  USING (tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'buyer'::app_role) OR has_role(auth.uid(),'finance'::app_role)));

-- cotacoes
DROP POLICY IF EXISTS "Buyers coordinators admins can manage quotations" ON public.cotacoes;
CREATE POLICY "Buyers coordinators admins can manage quotations" ON public.cotacoes
  FOR ALL TO authenticated
  USING (tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'buyer'::app_role)))
  WITH CHECK (tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'buyer'::app_role)));

DROP POLICY IF EXISTS "Role-restricted quotation access" ON public.cotacoes;
CREATE POLICY "Role-restricted quotation access" ON public.cotacoes
  FOR SELECT TO authenticated
  USING (tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'buyer'::app_role) OR has_role(auth.uid(),'finance'::app_role)));

-- contracts
DROP POLICY IF EXISTS "Admin coordinator finance can manage contracts" ON public.contracts;
CREATE POLICY "Admin coordinator finance can manage contracts" ON public.contracts
  FOR ALL TO authenticated
  USING (tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'finance'::app_role)))
  WITH CHECK (tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'finance'::app_role)));

DROP POLICY IF EXISTS "Role-restricted contract access" ON public.contracts;
CREATE POLICY "Role-restricted contract access" ON public.contracts
  FOR SELECT TO authenticated
  USING (tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'finance'::app_role)));

-- pedidos
DROP POLICY IF EXISTS "Buyers coordinators admins can manage orders" ON public.pedidos;
CREATE POLICY "Buyers coordinators admins can manage orders" ON public.pedidos
  FOR ALL TO authenticated
  USING (tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'buyer'::app_role)))
  WITH CHECK (tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'buyer'::app_role)));

DROP POLICY IF EXISTS "Role-restricted order access" ON public.pedidos;
CREATE POLICY "Role-restricted order access" ON public.pedidos
  FOR SELECT TO authenticated
  USING (tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'buyer'::app_role) OR has_role(auth.uid(),'finance'::app_role)));

-- produtos
DROP POLICY IF EXISTS "Admin coordinator can manage produtos" ON public.produtos;
CREATE POLICY "Admin coordinator can manage produtos" ON public.produtos
  FOR ALL TO authenticated
  USING (tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role)))
  WITH CHECK (tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role)));

DROP POLICY IF EXISTS "Buyers coordinators admins can manage products" ON public.produtos;
CREATE POLICY "Buyers coordinators admins can manage products" ON public.produtos
  FOR ALL TO authenticated
  USING (tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'buyer'::app_role)))
  WITH CHECK (tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'buyer'::app_role)));

-- categorias: substituir política ampla por escopo de tenant
DROP POLICY IF EXISTS "Authenticated users can view categories" ON public.categorias;
CREATE POLICY "Tenant users can view categories" ON public.categorias
  FOR SELECT TO authenticated
  USING (tenant_in_my_group(tenant_id));

-- supplier_documents
DROP POLICY IF EXISTS "Admin coordinator buyer can manage supplier documents" ON public.supplier_documents;
CREATE POLICY "Admin coordinator buyer can manage supplier documents" ON public.supplier_documents
  FOR ALL TO authenticated
  USING (tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'buyer'::app_role)))
  WITH CHECK (tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'buyer'::app_role)));

DROP POLICY IF EXISTS "Role-restricted supplier document select" ON public.supplier_documents;
CREATE POLICY "Role-restricted supplier document select" ON public.supplier_documents
  FOR SELECT TO authenticated
  USING (tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'buyer'::app_role)));

-- supplier_qualification_scores
DROP POLICY IF EXISTS "Admins and coordinators can manage qualification scores" ON public.supplier_qualification_scores;
CREATE POLICY "Admins and coordinators can manage qualification scores" ON public.supplier_qualification_scores
  FOR ALL TO authenticated
  USING (tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role)))
  WITH CHECK (tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role)));

-- sourcing_pipeline: consolidar políticas divergentes; manter apenas a de tenant
DROP POLICY IF EXISTS "Tenant isolation for sourcing_pipeline" ON public.sourcing_pipeline;
DROP POLICY IF EXISTS "tenant_isolation" ON public.sourcing_pipeline;

-- storage.objects: remover política permissiva de upload em 'documentos'
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
