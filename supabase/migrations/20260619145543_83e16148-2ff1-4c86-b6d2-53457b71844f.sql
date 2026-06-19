
-- 1. FIX: Policies de estoque e estoque_movimentacoes com subquery quebrada
DROP POLICY IF EXISTS "Usuários podem gerenciar o estoque de sua organização" ON public.estoque;
DROP POLICY IF EXISTS "Usuários podem ver o estoque de sua organização" ON public.estoque;
DROP POLICY IF EXISTS "Usuários podem inserir movimentações de sua organização" ON public.estoque_movimentacoes;
DROP POLICY IF EXISTS "Usuários podem ver movimentações de sua organização" ON public.estoque_movimentacoes;

CREATE POLICY "Estoque: ver da própria organização"
  ON public.estoque FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_organization_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Estoque: gerenciar da própria organização"
  ON public.estoque FOR ALL TO authenticated
  USING (organization_id = (SELECT current_organization_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (organization_id = (SELECT current_organization_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Movimentações: ver da própria organização"
  ON public.estoque_movimentacoes FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_organization_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Movimentações: inserir na própria organização"
  ON public.estoque_movimentacoes FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_organization_id FROM public.profiles WHERE user_id = auth.uid()));

-- 2. FIX: privilege escalation em approval_delegations
DROP POLICY IF EXISTS "Users can manage their organization delegations" ON public.approval_delegations;

-- 3. FIX: budget_transactions readable por qualquer authenticated -> restringir a finance/admin/coordinator
DROP POLICY IF EXISTS "Budget transactions are viewable by authenticated users" ON public.budget_transactions;
CREATE POLICY "Budget transactions viewable by finance roles"
  ON public.budget_transactions FOR SELECT TO authenticated
  USING (
    tenant_id = current_tenant_id() AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'finance'::app_role)
      OR has_role(auth.uid(), 'coordinator'::app_role)
    )
  );

-- 4. FIX: licitacao_lances - remover policies abertas (tenant_isolation já cobre)
DROP POLICY IF EXISTS "Suppliers can place bids" ON public.licitacao_lances;
DROP POLICY IF EXISTS "Users can see bids for their auctions" ON public.licitacao_lances;

-- 5. FIX: Storage - remover policies abertas que permitem leitura cross-tenant
DROP POLICY IF EXISTS "Authenticated users can view documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view comprovantes" ON storage.objects;
DROP POLICY IF EXISTS "Users can view fiscal documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload fiscal documents" ON storage.objects;

-- Recriar fiscal-documents com escopo por usuário (primeiro segmento = user id)
CREATE POLICY "Fiscal docs: upload na própria pasta"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'fiscal-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Fiscal docs: ver da própria pasta"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'fiscal-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Fiscal docs: admin vê todos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'fiscal-documents' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'finance'::app_role)));
