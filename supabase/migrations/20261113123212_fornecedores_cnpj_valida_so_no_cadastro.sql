-- Pedido e pagamento voltam a funcionar para fornecedores com CNPJ antigo inválido.
--
-- Causa: o CHECK fornecedores_cnpj_valid (NOT VALID, migration 20260711192812) é
-- reavaliado em QUALQUER UPDATE da linha. recalculate_saldo_comprometido (chamada por
-- trigger_update_saldo_on_pedido / trigger_update_saldo_on_pagamento) faz
-- UPDATE fornecedores SET saldo_comprometido = ... e falha com 23514 para os
-- fornecedores cujo CNPJ legado é inválido → INSERT em pedidos/pagamentos quebra.
--
-- Decisão do dono: a regra continua valendo no cadastro e na alteração do CNPJ, mas
-- não é rechecada quando o sistema só atualiza outros campos (saldo, nome etc.).
-- Os dados dos fornecedores NÃO são alterados.
--
-- Idempotente: pode rodar mais de uma vez.

CREATE OR REPLACE FUNCTION public.tg_fornecedores_validate_cnpj()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.cnpj IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.cnpj IS DISTINCT FROM OLD.cnpj)
     AND NOT public.is_valid_cnpj(NEW.cnpj) THEN
    RAISE EXCEPTION 'new row for relation "fornecedores" violates check constraint "fornecedores_cnpj_valid"'
      USING ERRCODE = 'check_violation',
            SCHEMA = 'public',
            TABLE = 'fornecedores',
            CONSTRAINT = 'fornecedores_cnpj_valid';
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.tg_fornecedores_validate_cnpj() IS
  'Valida CNPJ de fornecedores só no INSERT ou quando o CNPJ muda (substitui o CHECK fornecedores_cnpj_valid, que quebrava a atualização de saldo de fornecedores com CNPJ legado inválido).';

-- Nome "trg_validate_cnpj" roda depois de "trg_normalize_cnpj" (ordem alfabética),
-- então valida o CNPJ já normalizado — mesmo comportamento do CHECK antigo.
DROP TRIGGER IF EXISTS trg_validate_cnpj ON public.fornecedores;
CREATE TRIGGER trg_validate_cnpj
  BEFORE INSERT OR UPDATE OF cnpj ON public.fornecedores
  FOR EACH ROW EXECUTE FUNCTION public.tg_fornecedores_validate_cnpj();

ALTER TABLE public.fornecedores DROP CONSTRAINT IF EXISTS fornecedores_cnpj_valid;
