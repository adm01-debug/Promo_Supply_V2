-- =============================================
-- SECURITY HARDENING: Fix all scan findings
-- =============================================

-- 1. approval_history: Restrict INSERT to admin/coordinator or own user
DROP POLICY IF EXISTS "System can create history" ON public.approval_history;
CREATE POLICY "Restricted approval history insert" ON public.approval_history
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = usuario_id OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'coordinator')
  );

-- 1b. approval_history: Restrict SELECT to admin/coordinator or own records
DROP POLICY IF EXISTS "Authenticated users can view history" ON public.approval_history;
CREATE POLICY "Role-restricted approval history select" ON public.approval_history
  FOR SELECT TO authenticated
  USING (
    auth.uid() = usuario_id OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'coordinator')
  );

-- 2. qualification_history: Restrict INSERT to admin/coordinator with performed_by enforcement
DROP POLICY IF EXISTS "Authenticated users can insert qualification history" ON public.qualification_history;
CREATE POLICY "Role-restricted qualification history insert" ON public.qualification_history
  FOR INSERT TO authenticated
  WITH CHECK (
    (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator'))
    AND performed_by = auth.uid()
  );

-- 3. supplier_documents: Restrict SELECT to admin/coordinator/buyer
DROP POLICY IF EXISTS "Authenticated users can view supplier documents" ON public.supplier_documents;
CREATE POLICY "Role-restricted supplier document select" ON public.supplier_documents
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'coordinator') OR
    public.has_role(auth.uid(), 'buyer')
  );

-- 4. contract_items: Restrict SELECT to admin/coordinator/finance
DROP POLICY IF EXISTS "Authenticated users can view contract items" ON public.contract_items;
CREATE POLICY "Role-restricted contract items select" ON public.contract_items
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'coordinator') OR
    public.has_role(auth.uid(), 'finance')
  );

-- 5. contract_penalties: Restrict SELECT to admin/coordinator/finance
DROP POLICY IF EXISTS "Authenticated users can view contract penalties" ON public.contract_penalties;
CREATE POLICY "Role-restricted contract penalties select" ON public.contract_penalties
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'coordinator') OR
    public.has_role(auth.uid(), 'finance')
  );