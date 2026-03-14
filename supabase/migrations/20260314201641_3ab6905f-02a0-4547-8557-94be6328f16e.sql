-- =============================================
-- FIX remaining critical RLS issues
-- =============================================

-- 1. supplier_documents: restrict ALL to admin/coordinator/buyer
DROP POLICY IF EXISTS "Buyers and admins can manage supplier documents" ON public.supplier_documents;
CREATE POLICY "Admin coordinator buyer can manage supplier documents"
ON public.supplier_documents
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

-- 2. pedido_itens: restrict ALL to buyer/coordinator/admin
DROP POLICY IF EXISTS "Buyers can manage order items" ON public.pedido_itens;
CREATE POLICY "Buyers coordinators admins can manage order items"
ON public.pedido_itens
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

-- 3. contracts: remove overly-permissive INSERT/UPDATE policies that override the role-based one
DROP POLICY IF EXISTS "Authenticated users can create contracts" ON public.contracts;
DROP POLICY IF EXISTS "Authenticated users can update contracts" ON public.contracts;

-- 4. contract_history: restrict INSERT to require performed_by = auth.uid()
DROP POLICY IF EXISTS "Authenticated users can create contract history" ON public.contract_history;
CREATE POLICY "Users can create own contract history entries"
ON public.contract_history
FOR INSERT TO authenticated
WITH CHECK (
  (auth.uid() IS NOT NULL) AND (performed_by IS NULL OR performed_by = auth.uid())
);

-- 5. approval_steps: restrict SELECT to assigned approvers + admin/coordinator
DROP POLICY IF EXISTS "Users can view steps they are assigned to" ON public.approval_steps;
CREATE POLICY "Users can view assigned steps or admin"
ON public.approval_steps
FOR SELECT TO authenticated
USING (
  auth.uid() = aprovador_id
  OR auth.uid() = aprovador_efetivo_id
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'coordinator'::app_role)
);