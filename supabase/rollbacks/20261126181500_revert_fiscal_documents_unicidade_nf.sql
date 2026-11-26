-- Reversao da etapa 129 (DB-06). Nao aplicada.
BEGIN;
DROP INDEX IF EXISTS public.uq_fiscal_documents_chave;
DROP INDEX IF EXISTS public.uq_fiscal_documents_nf;
COMMIT;