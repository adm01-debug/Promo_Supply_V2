-- Reversao da migration 20261128194000_supplier_qualification_scores_tenant.sql.
-- Remove o gatilho e a funcao que faziam a nota de qualificacao herdar o tenant do fornecedor.
-- Efeito colateral de aplicar isto: o insert de calculate_supplier_qualification_score volta a depender do
-- default de tenant_id (etapa 143) - reaplique a etapa 143 junto.

DROP TRIGGER IF EXISTS a_fill_tenant_id_supplier ON public.supplier_qualification_scores;
DROP FUNCTION IF EXISTS public.fill_tenant_id_from_supplier();