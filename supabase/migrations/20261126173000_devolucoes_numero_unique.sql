-- DB-07 / etapa 145: devolucoes.numero era a unica numeracao de documento sem UNIQUE.
--
-- Sete tabelas numeram documento por public.generate_sequential_number, que protege
-- com pg_advisory_xact_lock. O lock termina no COMMIT, mas o chamador faz duas viagens
-- separadas (src/hooks/useDevolucoes.ts:110 pede o numero, :114 insere em outra
-- transacao), entao o lock nao cobre o insert. Nas outras seis tabelas
-- (pedidos, solicitacoes, cotacoes, pagamentos, licitacoes, fornecedores) o UNIQUE
-- transforma a corrida em erro visivel; em devolucoes ela gravava duplicata calada.
--
-- Correcao: a mesma garantia que as seis irmas ja tem, no banco. Nada no front muda.

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.devolucoes') IS NULL THEN
    RAISE EXCEPTION 'etapa 145: public.devolucoes nao existe; migration abortada';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name   = 'devolucoes'
       AND column_name  = 'numero'
  ) IS NOT TRUE THEN
    RAISE EXCEPTION 'etapa 145: public.devolucoes.numero nao existe; migration abortada';
  END IF;

  -- duplicata pre-existente impediria o UNIQUE e a migration abortaria sem explicacao;
  -- aqui o motivo fica escrito.
  IF EXISTS (
    SELECT 1 FROM public.devolucoes GROUP BY numero HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'etapa 145: ha numeros duplicados em devolucoes; corrija antes de criar o UNIQUE';
  END IF;
END
$$;

ALTER TABLE public.devolucoes
  ADD CONSTRAINT devolucoes_numero_key UNIQUE (numero);

COMMIT;