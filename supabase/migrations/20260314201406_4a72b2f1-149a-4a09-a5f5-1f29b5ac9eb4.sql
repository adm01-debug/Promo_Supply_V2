-- =============================================
-- BATCH RLS HARDENING: Restrict write access on critical business tables
-- to appropriate roles only (admin, coordinator, buyer)
-- =============================================

-- 1. supplier_qualification_scores: restrict ALL to admin/coordinator
DROP POLICY IF EXISTS "Authenticated users can manage qualification scores" ON public.supplier_qualification_scores;
CREATE POLICY "Admins and coordinators can manage qualification scores"
ON public.supplier_qualification_scores
FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role)
);

-- 2. approval_workflows: restrict INSERT/UPDATE to admin/coordinator
DROP POLICY IF EXISTS "Authenticated users can create workflows" ON public.approval_workflows;
DROP POLICY IF EXISTS "Authenticated users can update workflows" ON public.approval_workflows;

CREATE POLICY "Admins and coordinators can create workflows"
ON public.approval_workflows
FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role)
);

CREATE POLICY "Admins and coordinators can update workflows"
ON public.approval_workflows
FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role)
);

-- 3. approval_steps: restrict INSERT to admin/coordinator
DROP POLICY IF EXISTS "System can create steps" ON public.approval_steps;
CREATE POLICY "Admins and coordinators can create steps"
ON public.approval_steps
FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role)
);

-- 4. fornecedores: restrict ALL to buyer/coordinator/admin
DROP POLICY IF EXISTS "Buyers can manage suppliers" ON public.fornecedores;
CREATE POLICY "Buyers coordinators admins can manage suppliers"
ON public.fornecedores
FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'coordinator'::app_role)
  OR has_role(auth.uid(), 'buyer'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'coordinator'::app_role)
  OR has_role(auth.uid(), 'buyer'::app_role)
);

-- 5. pedidos: restrict ALL to buyer/coordinator/admin
DROP POLICY IF EXISTS "Buyers can manage orders" ON public.pedidos;
CREATE POLICY "Buyers coordinators admins can manage orders"
ON public.pedidos
FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'coordinator'::app_role)
  OR has_role(auth.uid(), 'buyer'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'coordinator'::app_role)
  OR has_role(auth.uid(), 'buyer'::app_role)
);

-- 6. cotacoes: restrict ALL to buyer/coordinator/admin
DROP POLICY IF EXISTS "Buyers can manage quotations" ON public.cotacoes;
CREATE POLICY "Buyers coordinators admins can manage quotations"
ON public.cotacoes
FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'coordinator'::app_role)
  OR has_role(auth.uid(), 'buyer'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'coordinator'::app_role)
  OR has_role(auth.uid(), 'buyer'::app_role)
);

-- 7. contracts: restrict ALL to admin/coordinator/finance
DROP POLICY IF EXISTS "Authenticated users can manage contracts" ON public.contracts;
CREATE POLICY "Admin coordinator finance can manage contracts"
ON public.contracts
FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'coordinator'::app_role)
  OR has_role(auth.uid(), 'finance'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'coordinator'::app_role)
  OR has_role(auth.uid(), 'finance'::app_role)
);

-- 8. produtos: restrict ALL to buyer/coordinator/admin (keep SELECT open)
DROP POLICY IF EXISTS "Buyers and above can manage products" ON public.produtos;
CREATE POLICY "Buyers coordinators admins can manage products"
ON public.produtos
FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'coordinator'::app_role)
  OR has_role(auth.uid(), 'buyer'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'coordinator'::app_role)
  OR has_role(auth.uid(), 'buyer'::app_role)
);

-- 9. contract_documents: restrict ALL to admin/coordinator/finance
DROP POLICY IF EXISTS "Authenticated users can manage contract documents" ON public.contract_documents;
CREATE POLICY "Admin coordinator finance can manage contract documents"
ON public.contract_documents
FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'coordinator'::app_role)
  OR has_role(auth.uid(), 'finance'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'coordinator'::app_role)
  OR has_role(auth.uid(), 'finance'::app_role)
);

-- 10. contract_items: restrict ALL to admin/coordinator/finance
DROP POLICY IF EXISTS "Authenticated users can manage contract items" ON public.contract_items;
CREATE POLICY "Admin coordinator finance can manage contract items"
ON public.contract_items
FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'coordinator'::app_role)
  OR has_role(auth.uid(), 'finance'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'coordinator'::app_role)
  OR has_role(auth.uid(), 'finance'::app_role)
);

-- 11. order_contracts: restrict ALL to buyer/coordinator/admin
DROP POLICY IF EXISTS "Authenticated users can manage order contracts" ON public.order_contracts;
CREATE POLICY "Buyers coordinators admins can manage order contracts"
ON public.order_contracts
FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'coordinator'::app_role)
  OR has_role(auth.uid(), 'buyer'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'coordinator'::app_role)
  OR has_role(auth.uid(), 'buyer'::app_role)
);