-- F-017: Ensure Realtime tenant-isolation filter works for UPDATE/DELETE events.
--
-- Supabase Realtime's postgres_changes subscription accepts a `filter` parameter
-- (e.g. tenant_id=eq.<uuid>) that is applied server-side on the Realtime node.
-- For INSERT events the NEW row is always available, but for UPDATE/DELETE the
-- filter can only match OLD values when REPLICA IDENTITY includes non-PK columns.
--
-- REPLICA IDENTITY DEFAULT (the Postgres default) only logs the primary key in the
-- WAL, which means UPDATE/DELETE WAL entries lack `tenant_id` and the server-side
-- filter cannot match them reliably. Setting REPLICA IDENTITY FULL causes Postgres
-- to log ALL column values in the WAL so Realtime can filter correctly.
--
-- Reference: https://supabase.com/docs/guides/realtime/postgres-changes#filtering

BEGIN;

-- Tenant-scoped tables whose UPDATE/DELETE events must pass through Realtime filters
DO $$
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY[
    'solicitacoes',
    'pedidos',
    'pedido_itens',
    'cotacoes',
    'pagamentos',
    'fornecedores',
    'approval_workflows',
    'approval_steps',
    'devolucoes',
    'creditos_fornecedor',
    'notifications',
    'licitacoes',
    'licitacao_lances'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', tbl);
    END IF;
  END LOOP;
END $$;

-- Ensure all tenant-scoped tables are in the supabase_realtime publication
-- (idempotent — no-op if already present)
DO $$
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY[
    'solicitacoes',
    'pedidos',
    'pedido_itens',
    'cotacoes',
    'pagamentos',
    'fornecedores',
    'approval_workflows',
    'approval_steps',
    'devolucoes',
    'creditos_fornecedor',
    'notifications',
    'licitacoes',
    'licitacao_lances',
    'system_alerts',
    'integration_outbox'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) AND NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = tbl
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
    END IF;
  END LOOP;
END $$;

COMMIT;
