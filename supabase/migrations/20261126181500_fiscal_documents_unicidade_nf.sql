-- DB-06 / etapa 129: fiscal_documents nao tem unicidade de nota fiscal.
--
-- A tabela aceita duas linhas com a mesma chave de acesso e duas linhas com o mesmo
-- (fornecedor, serie, numero), entao o painel de conferencia soma a mesma nota duas vezes
-- e a importacao de XML duplica o documento quando o usuario reenvia o arquivo.
--
-- Padrao usado: indice unico PARCIAL, o mesmo de uq_fornecedores_tenant_cnpj e uq_tenants_cnpj
-- (20260711192812_449d919a:84-92). Parcial porque serie, chave_acesso e fornecedor_id
-- aceitam NULL e nota antiga pode estar sem chave - NULL nao deve bloquear.
--
-- Arquivos de aplicacao (tela e importacao) ficam na etapa 130.
--
-- Reversao: supabase/rollbacks/20261126181500_revert_fiscal_documents_unicidade_nf.sql

BEGIN;

DO $$
DECLARE
  v_dup_chave bigint;
  v_dup_nf    bigint;
BEGIN
  IF to_regclass('public.fiscal_documents') IS NULL THEN
    RAISE EXCEPTION 'etapa 129: public.fiscal_documents nao existe; migration abortada';
  END IF;

  SELECT count(*) INTO v_dup_chave FROM (
    SELECT 1 FROM public.fiscal_documents
     WHERE chave_acesso IS NOT NULL AND chave_acesso <> ''
     GROUP BY chave_acesso HAVING count(*) > 1
  ) d;

  IF v_dup_chave > 0 THEN
    RAISE EXCEPTION 'etapa 129: % chave(s) de acesso duplicada(s) em fiscal_documents; corrija antes do indice unico', v_dup_chave;
  END IF;

  SELECT count(*) INTO v_dup_nf FROM (
    SELECT 1 FROM public.fiscal_documents
     WHERE fornecedor_id IS NOT NULL
     GROUP BY tenant_id, fornecedor_id, serie, numero_nf HAVING count(*) > 1
  ) d;

  IF v_dup_nf > 0 THEN
    RAISE EXCEPTION 'etapa 129: % nota(s) repetida(s) por (empresa, fornecedor, serie, numero) em fiscal_documents; corrija antes do indice unico', v_dup_nf;
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_fiscal_documents_chave
  ON public.fiscal_documents (chave_acesso)
  WHERE chave_acesso IS NOT NULL AND chave_acesso <> '';

CREATE UNIQUE INDEX IF NOT EXISTS uq_fiscal_documents_nf
  ON public.fiscal_documents (tenant_id, fornecedor_id, serie, numero_nf)
  WHERE fornecedor_id IS NOT NULL;

COMMIT;