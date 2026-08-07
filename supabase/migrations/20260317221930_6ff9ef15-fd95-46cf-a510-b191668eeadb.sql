
-- =====================================================
-- SECURITY HARDENING: Replace open SELECT policies with role-restricted ones
-- Tables affected: fornecedores, fiscal_documents, contracts, department_budgets,
--   cotacoes, pedidos, contract_history, approval_workflows, pedido_itens,
--   negotiation_analyses, contact_notes
-- =====================================================

-- 1. FORNECEDORES: restrict to admin, coordinator, buyer, finance
DROP POLICY IF EXISTS "Authenticated users can view suppliers" ON public.fornecedores;
CREATE POLICY "Role-restricted supplier access" ON public.fornecedores
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'coordinator') OR
    public.has_role(auth.uid(), 'buyer') OR
    public.has_role(auth.uid(), 'finance')
  );

-- 2. FISCAL_DOCUMENTS: restrict to admin, coordinator, buyer, finance
DROP POLICY IF EXISTS "Authenticated users can view fiscal documents" ON public.fiscal_documents;
CREATE POLICY "Role-restricted fiscal document access" ON public.fiscal_documents
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'coordinator') OR
    public.has_role(auth.uid(), 'buyer') OR
    public.has_role(auth.uid(), 'finance')
  );

-- 3. CONTRACTS: restrict to admin, coordinator, finance
DROP POLICY IF EXISTS "Authenticated users can view contracts" ON public.contracts;
CREATE POLICY "Role-restricted contract access" ON public.contracts
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'coordinator') OR
    public.has_role(auth.uid(), 'finance')
  );

-- 4. DEPARTMENT_BUDGETS: restrict to admin, coordinator, finance
DROP POLICY IF EXISTS "Authenticated users can view budgets" ON public.department_budgets;
CREATE POLICY "Role-restricted budget access" ON public.department_budgets
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'coordinator') OR
    public.has_role(auth.uid(), 'finance')
  );

-- 5. COTACOES: restrict to admin, coordinator, buyer, finance
DROP POLICY IF EXISTS "Authenticated users can view quotations" ON public.cotacoes;
CREATE POLICY "Role-restricted quotation access" ON public.cotacoes
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'coordinator') OR
    public.has_role(auth.uid(), 'buyer') OR
    public.has_role(auth.uid(), 'finance')
  );

-- 6. PEDIDOS: restrict to admin, coordinator, buyer, finance
DROP POLICY IF EXISTS "Authenticated users can view orders" ON public.pedidos;
CREATE POLICY "Role-restricted order access" ON public.pedidos
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'coordinator') OR
    public.has_role(auth.uid(), 'buyer') OR
    public.has_role(auth.uid(), 'finance')
  );

-- 7. CONTRACT_HISTORY: restrict to admin, coordinator, finance
DROP POLICY IF EXISTS "Authenticated users can view contract history" ON public.contract_history;
CREATE POLICY "Role-restricted contract history access" ON public.contract_history
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'coordinator') OR
    public.has_role(auth.uid(), 'finance')
  );

-- 8. APPROVAL_WORKFLOWS: restrict to admin, coordinator, finance
DROP POLICY IF EXISTS "Authenticated users can view workflows" ON public.approval_workflows;
CREATE POLICY "Role-restricted workflow access" ON public.approval_workflows
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'coordinator') OR
    public.has_role(auth.uid(), 'finance')
  );

-- 9. PEDIDO_ITENS: restrict to admin, coordinator, buyer, finance
DROP POLICY IF EXISTS "Authenticated users can view order items" ON public.pedido_itens;
CREATE POLICY "Role-restricted order items access" ON public.pedido_itens
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'coordinator') OR
    public.has_role(auth.uid(), 'buyer') OR
    public.has_role(auth.uid(), 'finance')
  );

-- 10. NEGOTIATION_ANALYSES: restrict to admin, coordinator, buyer
DROP POLICY IF EXISTS "Authenticated users can view negotiation analyses" ON public.negotiation_analyses;
CREATE POLICY "Role-restricted negotiation analysis access" ON public.negotiation_analyses
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'coordinator') OR
    public.has_role(auth.uid(), 'buyer')
  );

-- 11. CONTACT_NOTES: restrict to author + admin/coordinator
DROP POLICY IF EXISTS "Authenticated users can view contact notes" ON public.contact_notes;
CREATE POLICY "Author and privileged roles can view contact notes" ON public.contact_notes
  FOR SELECT TO authenticated
  USING (
    auth.uid() = author_id OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'coordinator')
  );
