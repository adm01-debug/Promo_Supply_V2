-- Colunas de moeda estão character(1) em produção (drift: as migrations
-- 20260513191304 e 20260513184438 declaram CHAR(3)). O default 'BRL' não cabe
-- em 1 caractere, então todo INSERT que não informa a moeda falha com 22001
-- ("value too long for type character(1)") — cotação e pedido não são criados.
-- As linhas antigas ficaram com 'B' (truncado); são convertidas para 'BRL'
-- no próprio USING (sem UPDATE, sem disparar triggers de cotacoes/pedidos).
-- Idempotente: só altera coluna cujo tamanho ainda é diferente de 3.
-- FKs para currencies(code) e índices são recriados pelo próprio ALTER TYPE.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.table_name, c.column_name
      FROM information_schema.columns c
     WHERE c.table_schema = 'public'
       AND (c.table_name, c.column_name) IN (
             ('cotacoes', 'currency'),
             ('pedidos', 'currency'),
             ('savings_tracker', 'currency'),
             ('exchange_rates', 'base_currency'),
             ('exchange_rates', 'quote_currency'))
       AND c.data_type = 'character'
       AND c.character_maximum_length IS DISTINCT FROM 3
  LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ALTER COLUMN %I TYPE character(3) USING (CASE WHEN %I = %L THEN %L ELSE %I END)::character(3)',
      r.table_name, r.column_name, r.column_name, 'B', 'BRL', r.column_name);
  END LOOP;
END
$$;

-- Defaults e NOT NULL mantidos como estavam (exchange_rates não tem default;
-- savings_tracker.currency continua aceitando NULL).
ALTER TABLE public.cotacoes        ALTER COLUMN currency SET DEFAULT 'BRL';
ALTER TABLE public.pedidos         ALTER COLUMN currency SET DEFAULT 'BRL';
ALTER TABLE public.savings_tracker ALTER COLUMN currency SET DEFAULT 'BRL';
