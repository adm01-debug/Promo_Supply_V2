-- data(schema): remove o default de tenant inexistente e garante o preenchimento por gatilho em toda tabela com
-- tenant_id (etapa 143, parte a; achado DB-06).
--
-- Causa: a migration de multi-tenant de 2026-05 (20260513165732, linha 10) adicionou tenant_id com
-- DEFAULT '00000000-0000-0000-0000-000000000000' apontando para um tenant "legacy" que depois foi apagado
-- (20260805160000, linhas 46-47). O default ficou. Com isso, um insert que esquece a coluna nao falha no NOT NULL:
-- grava o tenant zero e so quebra na FK, quando quebra. Pior: em caminho de servico (cron, pg_net, edge com
-- service_role) nao existe auth.uid(), entao fill_tenant_id_from_profile e um no-op e o default invalido e o que
-- vale.
--
-- O que esta migration faz:
--   1) ALTER COLUMN tenant_id DROP DEFAULT em toda tabela public cujo default ainda seja o tenant zero - assim a
--      falta de tenant vira erro explicito de NOT NULL, e nao linha apontando para empresa inexistente;
--   2) cria o gatilho BEFORE INSERT a_fill_tenant_id em toda tabela com tenant_id que ainda nao tenha um gatilho
--      BEFORE INSERT chamando public.fill_tenant_id_from_profile (o mesmo das 37 tabelas ja cobertas).
-- Nenhuma FK e removida, nenhuma coluna muda de tipo e nenhum dado existente e tocado. As duas listas sao lidas do
-- catalogo em tempo de execucao, entao a migration cobre as 43 tabelas do levantamento e qualquer outra que entre
-- nesse estado antes da aplicacao.
--
-- Ordem: aplicar DEPOIS de 20261128194000_supplier_qualification_scores_tenant.sql, que faz o insert da funcao de
-- qualificacao herdar o tenant do fornecedor. Sem isso, tirar o default transformaria o insert em falha visivel
-- (que e o objetivo), mas quebraria a recalculcao de score ate a correcao chegar.
--
-- Reversao: supabase/rollbacks/20261128195000_revert_tenant_id_sem_default_invalido.sql (nao aplicada).

DO $default$
DECLARE
  r record;
  v_n integer := 0;
BEGIN
  FOR r IN
    SELECT c.table_name
      FROM information_schema.columns c
      JOIN information_schema.tables t
        ON t.table_schema = c.table_schema
       AND t.table_name = c.table_name
       AND t.table_type = 'BASE TABLE'
     WHERE c.table_schema = 'public'
       AND c.column_name = 'tenant_id'
       AND c.column_default LIKE '%00000000-0000-0000-0000-000000000000%'
     ORDER BY c.table_name
  LOOP
    EXECUTE format('alter table public.%I alter column tenant_id drop default', r.table_name);
    -- Marca reversivel: o rollback restaura o default exatamente nestas colunas, sem adivinhar por ausencia de
    -- default (o que pegaria tabela que nunca teve default zero).
    EXECUTE format(
      'comment on column public.%I.tenant_id is %L',
      r.table_name, 'rollback:default_tenant_zero:20261128195000'
    );
    v_n := v_n + 1;
  END LOOP;

  RAISE NOTICE 'tenant_id: default do tenant zero removido de % tabela(s)', v_n;
END $default$;

DO $gatilho$
DECLARE
  r record;
  v_n integer := 0;
  v_nome text;
BEGIN
  FOR r IN
    SELECT c.table_name
      FROM information_schema.columns c
      JOIN information_schema.tables t
        ON t.table_schema = c.table_schema
       AND t.table_name = c.table_name
       AND t.table_type = 'BASE TABLE'
     WHERE c.table_schema = 'public'
       AND c.column_name = 'tenant_id'
       AND NOT EXISTS (
         SELECT 1
           FROM pg_trigger tg
           JOIN pg_class cl ON cl.oid = tg.tgrelid
           JOIN pg_namespace ns ON ns.oid = cl.relnamespace
           JOIN pg_proc pr ON pr.oid = tg.tgfoid
          WHERE ns.nspname = 'public'
            AND cl.relname = c.table_name
            AND NOT tg.tgisinternal
            AND tg.tgtype & 2 = 2
            AND tg.tgtype & 4 = 4
            AND pr.proname = 'fill_tenant_id_from_profile'
       )
     ORDER BY c.table_name
  LOOP
    IF EXISTS (
      SELECT 1
        FROM pg_trigger tg
        JOIN pg_class cl ON cl.oid = tg.tgrelid
        JOIN pg_namespace ns ON ns.oid = cl.relnamespace
       WHERE ns.nspname = 'public'
         AND cl.relname = r.table_name
         AND tg.tgname = 'a_fill_tenant_id'
    ) THEN
      v_nome := 'a_fill_tenant_id_tenant';
    ELSE
      v_nome := 'a_fill_tenant_id';
    END IF;

    EXECUTE format(
      'create trigger %I before insert on public.%I for each row execute function public.fill_tenant_id_from_profile()',
      v_nome, r.table_name
    );
    v_n := v_n + 1;
  END LOOP;

  RAISE NOTICE 'tenant_id: gatilho a_fill_tenant_id criado em % tabela(s)', v_n;
END $gatilho$;

-- Prova: aborta a transacao inteira se sobrar default do tenant zero ou tabela com tenant_id sem o gatilho.
DO $prova$
DECLARE
  v_default integer;
  v_sem_gatilho integer;
BEGIN
  SELECT count(*) INTO v_default
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema
     AND t.table_name = c.table_name
     AND t.table_type = 'BASE TABLE'
   WHERE c.table_schema = 'public'
     AND c.column_name = 'tenant_id'
     AND c.column_default LIKE '%00000000-0000-0000-0000-000000000000%';

  IF v_default > 0 THEN
    RAISE EXCEPTION 'prova falhou: % tabela(s) ainda com default do tenant zero', v_default;
  END IF;

  SELECT count(*) INTO v_sem_gatilho
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema
     AND t.table_name = c.table_name
     AND t.table_type = 'BASE TABLE'
   WHERE c.table_schema = 'public'
     AND c.column_name = 'tenant_id'
     AND NOT EXISTS (
       SELECT 1
         FROM pg_trigger tg
         JOIN pg_class cl ON cl.oid = tg.tgrelid
         JOIN pg_namespace ns ON ns.oid = cl.relnamespace
         JOIN pg_proc pr ON pr.oid = tg.tgfoid
        WHERE ns.nspname = 'public'
          AND cl.relname = c.table_name
          AND NOT tg.tgisinternal
          AND tg.tgtype & 2 = 2
          AND tg.tgtype & 4 = 4
          AND pr.proname IN ('fill_tenant_id_from_profile', 'fill_tenant_id_from_supplier')
     );

  IF v_sem_gatilho > 0 THEN
    RAISE EXCEPTION 'prova falhou: % tabela(s) com tenant_id sem gatilho de preenchimento', v_sem_gatilho;
  END IF;
END $prova$;