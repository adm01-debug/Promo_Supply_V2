-- Reversao da etapa 145 (DB-07). Nao aplicada.
BEGIN;
ALTER TABLE public.devolucoes DROP CONSTRAINT IF EXISTS devolucoes_numero_key;
COMMIT;