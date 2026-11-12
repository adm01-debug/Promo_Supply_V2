-- ============================================
-- MIGRATION: comprador (buyer) passa a LER contratos, itens e documentos
-- Data: 2026-11-12 — decisão do dono ("APROVADO opção A")
--
-- Causa: depois da #56 (tenant_isolation_* RESTRICTIVE), as regras por papel
-- voltaram a valer e contracts/contract_items/contract_documents só têm SELECT
-- para admin/coordinator/finance. O comprador abria /contratos e via lista vazia,
-- sem saber dos acordos vigentes com fornecedores.
--
-- Efeito: buyer lê (SELECT) — não cria, não altera, não apaga. A regra
-- restritiva por empresa (tenant_isolation_*) continua valendo por cima.
-- ============================================

DROP POLICY IF EXISTS buyer_le_contracts ON public.contracts;
CREATE POLICY buyer_le_contracts ON public.contracts
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'buyer'::app_role));

DROP POLICY IF EXISTS buyer_le_contract_items ON public.contract_items;
CREATE POLICY buyer_le_contract_items ON public.contract_items
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'buyer'::app_role));

DROP POLICY IF EXISTS buyer_le_contract_documents ON public.contract_documents;
CREATE POLICY buyer_le_contract_documents ON public.contract_documents
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'buyer'::app_role));
