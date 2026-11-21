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
-- POR QUE NAO alter_job:
--   cron.alter_job(username => ...) responde
--   "XX000: must be superuser to alter username". O schema cron pertence a
--   supabase_admin e o role postgres - o unico que tem EXECUTE em
--   _invoke_edge_function - nao e superuser neste projeto. O owner de um job
--   so e definido na CRIACAO, como o role da conexao.
--
-- DECISAO:
--   Recriar os 8 jobs com unschedule + schedule. Como este arquivo e aplicado
--   pelo canal Management API (role postgres), os jobs nascem com owner
--   postgres. Se rodar pelo psql (role ci_snapshot), a verificacao final
--   aborta e a transacao inteira sofre rollback - fail-closed, nenhum job fica
--   em estado pior. Agenda e comando sao os mesmos de 20261121153000.
--   Sem DDL de tabela, sem alteracao de dados de negocio.
-- ============================================================================

DO $do$
DECLARE
  v_role text := current_user;
  v_job record;
  v_errados text;
  v_total int;
BEGIN
  IF v_role <> 'postgres' THEN
    RAISE EXCEPTION 'esta migration exige conexao como postgres (owner do job cron); atual: %', v_role;
  END IF;

  FOR v_job IN
    SELECT * FROM (VALUES
      ('alert-dispatcher-1min',     '* * * * *',   'alert-dispatcher'),
      ('approval-escalation-check', '*/15 * * * *','check-approval-escalations'),
      ('contract-expiry-check',     '0 7 * * *',   'check-expiry-alerts'),
      ('cotacao-followup-check',    '0 12 * * *',  'check-cotacao-followup'),
      ('expiry-alerts-check',       '0 10 * * *',  'check-expiry-alerts'),
      ('sla-alerts-check',          '*/30 * * * *','check-sla-alerts'),
      ('weekly-procurement-report', '0 11 * * 1',  'weekly-report'),
      ('weekly-summary-report-job', '0 8 * * 1',   'weekly-summary-report')
    ) AS t(jobname, sched, edge)
  LOOP
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = v_job.jobname) THEN
      PERFORM cron.unschedule(v_job.jobname);
      RAISE NOTICE 'job % removido para recriacao com owner postgres', v_job.jobname;
    END IF;

    PERFORM cron.schedule(
      v_job.jobname,
      v_job.sched,
      format('SELECT public._invoke_edge_function(%L);', v_job.edge)
    );
  END LOOP;

  SELECT count(*), string_agg(jobname || ' (' || username || ')', ', ')
    FILTER (WHERE username <> 'postgres')
  INTO v_total, v_errados
  FROM cron.job
  WHERE jobname IN (
    'alert-dispatcher-1min','approval-escalation-check','contract-expiry-check',
    'cotacao-followup-check','expiry-alerts-check','sla-alerts-check',
    'weekly-procurement-report','weekly-summary-report-job');

  IF v_total <> 8 THEN
    RAISE EXCEPTION 'esperados 8 jobs de negocio, encontrados %', v_total;
  END IF;
  IF v_errados IS NOT NULL THEN
    RAISE EXCEPTION 'jobs de negocio ainda com owner errado: %', v_errados;
  END IF;

  RAISE NOTICE 'ok: 8 jobs de negocio recriados com owner postgres';
END;
$do$;