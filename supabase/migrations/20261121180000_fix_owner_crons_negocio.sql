-- ============================================================================
-- Corrige o OWNER dos 8 crons de negocio criados em
-- 20261121153000_religa_crons_negocio_vault.sql.
--
-- CAUSA (docs/contexto/supabase/cron-runs.md, jobs 113-120):
--   cron.schedule() grava como username do job o ROLE DA CONEXAO que executa a
--   migration. A migration foi aplicada por aplicar-migration-prod.yml usando
--   SUPABASE_DB_URL, cujo role e ci_snapshot (role de leitura do
--   paridade-banco.yml, membro de pg_read_all_data). ci_snapshot NAO tem
--   EXECUTE em public._invoke_edge_function - 20261112171300 revogou de
--   PUBLIC/anon e concedeu so a authenticated/service_role - logo todo disparo
--   falhava:
--
--     ## 113 - alert-dispatcher-1min
--     2026-11-21 17:41:00 | failed | ERROR: permission denied for function
--                                     _invoke_edge_function
--
--   Contraste que confirma o diagnostico: os jobs que funcionam em prod rodam
--   como postgres - 18 outbox-worker-1min (succeeded, 1 row) e
--   112 xbz-sync-pedidos-30min (succeeded, 1 row).
--
-- DECISAO:
--   Este banco tem pg_cron 1.6.4 com apenas schedule(name,sched,cmd) e
--   schedule(sched,cmd) - nao ha a forma de 5 argumentos com username. O owner
--   e corrigido com cron.alter_job(jobid, username => 'postgres', database =>
--   'postgres'), que aceita NULL nos demais campos e portanto preserva agenda e
--   comando. Idempotente: re-aplicar nao muda nada.
--   Sem DDL de tabela, sem alteracao de dados de negocio.
-- ============================================================================

DO $do$
DECLARE
  v_versao text;
  v_job record;
BEGIN
  SELECT extversion INTO v_versao FROM pg_extension WHERE extname = 'pg_cron';

  IF v_versao IS NULL OR string_to_array(v_versao, '.')::int[] < ARRAY[1,4]::int[] THEN
    RAISE EXCEPTION 'pg_cron >= 1.4 necessaria para cron.alter_job com username (encontrada: %)',
      coalesce(v_versao, 'ausente');
  END IF;

  FOR v_job IN
    SELECT jobid, jobname, username FROM cron.job
    WHERE jobname IN (
      'alert-dispatcher-1min','approval-escalation-check','contract-expiry-check',
      'cotacao-followup-check','expiry-alerts-check','sla-alerts-check',
      'weekly-procurement-report','weekly-summary-report-job'
    )
  LOOP
    IF v_job.username = 'postgres' THEN
      RAISE NOTICE 'job % ja roda como postgres', v_job.jobname;
      CONTINUE;
    END IF;

    RAISE NOTICE 'reapontando job % de % para postgres', v_job.jobname, v_job.username;
    PERFORM cron.alter_job(
      job_id   => v_job.jobid,
      username => 'postgres',
      database => 'postgres'
    );
  END LOOP;
END;
$do$;

-- Verificacao embutida: nenhum job de negocio pode ficar com owner != postgres,
-- senao o proximo disparo volta a dar permission denied.
DO $do$
DECLARE v_errados text; v_total int;
BEGIN
  SELECT count(*) INTO v_total FROM cron.job WHERE jobname IN (
    'alert-dispatcher-1min','approval-escalation-check','contract-expiry-check',
    'cotacao-followup-check','expiry-alerts-check','sla-alerts-check',
    'weekly-procurement-report','weekly-summary-report-job');

  IF v_total <> 8 THEN
    RAISE EXCEPTION 'esperados 8 jobs de negocio, encontrados %', v_total;
  END IF;

  SELECT string_agg(jobname || ' (' || username || ')', ', ') INTO v_errados
  FROM cron.job
  WHERE jobname IN (
    'alert-dispatcher-1min','approval-escalation-check','contract-expiry-check',
    'cotacao-followup-check','expiry-alerts-check','sla-alerts-check',
    'weekly-procurement-report','weekly-summary-report-job')
  AND username <> 'postgres';

  IF v_errados IS NOT NULL THEN
    RAISE EXCEPTION 'jobs de negocio ainda com owner errado: %', v_errados;
  END IF;
END;
$do$;