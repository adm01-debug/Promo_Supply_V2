
-- Drop existing policies and recreate with buyer access for credit management from returns
DROP POLICY IF EXISTS "Admin coordinator finance can manage credits" ON public.creditos_fornecedor;
DROP POLICY IF EXISTS "Buyers can view credits" ON public.creditos_fornecedor;

-- Full management for admin/coordinator/finance/buyer
CREATE POLICY "Authorized roles can manage credits"
  ON public.creditos_fornecedor FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'finance'::app_role) OR has_role(auth.uid(), 'buyer'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'finance'::app_role) OR has_role(auth.uid(), 'buyer'::app_role));
