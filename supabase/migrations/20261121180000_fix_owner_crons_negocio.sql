-- ============================================================================
-- Corrige o OWNER dos 8 crons de negocio criados em
-- 20261121153000_religa_crons_negocio_vault.sql.
--
-- CAUSA (cron-runs.md, branch contexto, jobs 113-120):
--   cron.schedule() na forma de 2-3 argumentos grava como username do job o
--   ROLE DA CONEXAO que executa a migration. A migration foi aplicada por
--   aplicar-migration-prod.yml usando SUPABASE_DB_URL, cujo role e ci_snapshot
--   (role de leitura do paridade-banco.yml). ci_snapshot NAO tem EXECUTE em
--   public._invoke_edge_function (20261112171300 revogou de PUBLIC/anon e
--   concedeu so a authenticated/service_role), logo todo disparo falhava:
--
--     id 113 alert-dispatcher-1min
--     2026-11-21 17:41:00 | failed | ERROR: permission denied for function
--                                     _invoke_edge_function
--
--   Os jobs que JA funcionam em prod (112 xbz-sync-pedidos-30min,
--   18 outbox-worker-1min) rodam como postgres. Os jobs 113-120 devem rodar
--   como postgres tambem.
--
-- DECISAO:
--   Recriar cada job com username explicito via cron.schedule(jobname, sched,
--   cmd, database, username) - a forma de 5 argumentos do pg_cron. Idempotente:
--   unschedule so quando existe, e o schedule final usa ON CONFLICT DO NOTHING
--   implicito da propria funcao (recriacao a partir de estado conhecido).
--   Sem DDL de tabela, sem alteracao de dados de negocio.
-- ============================================================================

DO $do$
DECLARE
  v_versao text;
  v_job record;
BEGIN
  -- A assinatura com username exige pg_cron >= 1.4. Falha alto se for menor,
  -- para nao gravar job silenciosamente sem dono correto.
  SELECT extversion INTO v_versao
  FROM pg_extension WHERE extname = 'pg_cron';

  IF v_versao IS NULL OR string_to_array(v_versao, '.')::int[] < ARRAY[1,4]::int[] THEN
    RAISE EXCEPTION 'pg_cron >= 1.4 necessaria para cron.schedule com username (encontrada: %)',
      coalesce(v_versao, 'ausente');
  END IF;

  FOR v_job IN
    SELECT * FROM (VALUES
      ('alert-dispatcher-1min',       '* * * * *',  'alert-dispatcher'),
      ('approval-escalation-check',   '*/15 * * * *','check-approval-escalations'),
      ('contract-expiry-check',       '0 7 * * *',  'check-expiry-alerts'),
      ('cotacao-followup-check',      '0 12 * * *', 'check-cotacao-followup'),
      ('expiry-alerts-check',         '0 10 * * *', 'check-expiry-alerts'),
      ('sla-alerts-check',            '*/30 * * * *','check-sla-alerts'),
      ('weekly-procurement-report',   '0 11 * * 1', 'weekly-report'),
      ('weekly-summary-report-job',   '0 8 * * 1',  'weekly-summary-report')
    ) AS t(jobname, sched, edge)
  LOOP
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = v_job.jobname) THEN
      PERFORM cron.unschedule(v_job.jobname);
    END IF;

    PERFORM cron.schedule(
      v_job.jobname,
      v_job.sched,
      format($cmd$SELECT public._invoke_edge_function(%L);$cmd$, v_job.edge),
      'postgres',
      'postgres'
    );
  END LOOP;
END;
$do$;

-- Verificacao embutida: nenhum job de negocio pode ficar com owner != postgres,
-- senao o proximo disparo volta a dar permission denied.
DO $do$
DECLARE v_errados text;
BEGIN
  SELECT string_agg(jobname || ' (' || username || ')', ', ') INTO v_errados
  FROM cron.job
  WHERE jobname IN (
    'alert-dispatcher-1min','approval-escalation-check','contract-expiry-check',
    'cotacao-followup-check','expiry-alerts-check','sla-alerts-check',
    'weekly-procurement-report','weekly-summary-report-job'
  )
  AND username <> 'postgres';

  IF v_errados IS NOT NULL THEN
    RAISE EXCEPTION 'jobs de negocio ainda com owner errado: %', v_errados;
  END IF;
END;
$do$;