-- ============================================
-- MIGRATION: comprador (buyer) passa a LER contratos, itens e documentos
-- Data: 2026-11-12 — decisão do dono ("APROVADO opção A")
--
-- Causa: as policies atuais de SELECT em contracts/contract_items/
-- contract_documents são restritas a admin/coordinator/finance. O comprador
-- abria /contratos e via lista vazia, sem saber dos acordos vigentes com
-- fornecedores.
--
-- Efeito: buyer lê (SELECT) — não cria, não altera, não apaga. Cada policy
-- exige tenant_in_my_group(tenant_id) junto do papel, mantendo o isolamento
-- por empresa (as policies tenant_isolation_* são PERMISSIVE e combinam por OR,
-- então o check de tenant precisa estar em todas as policies).
-- ============================================

DROP POLICY IF EXISTS buyer_le_contracts ON public.contracts;
CREATE POLICY buyer_le_contracts ON public.contracts
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'buyer'::app_role)
         AND public.tenant_in_my_group(tenant_id));

DROP POLICY IF EXISTS buyer_le_contract_items ON public.contract_items;
CREATE POLICY buyer_le_contract_items ON public.contract_items
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'buyer'::app_role)
         AND public.tenant_in_my_group(tenant_id));

DROP POLICY IF EXISTS buyer_le_contract_documents ON public.contract_documents;
CREATE POLICY buyer_le_contract_documents ON public.contract_documents
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'buyer'::app_role)
         AND public.tenant_in_my_group(tenant_id));
