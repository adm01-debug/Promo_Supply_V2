-- ============================================================
-- ROLLBACK da migration 20261127150000_outbox_claim_atomico_e_frequencia.sql
--
-- NAO e aplicado automaticamente. Ele devolve o banco ao estado anterior:
--   * remove a RPC claim_outbox_batch;
--   * volta o job outbox-worker-1min para '* * * * *'.
--
-- Atencao: este rollback NAO restaura o insert de alerta dentro da edge
-- process-outbox (isso e codigo de edge, versionado no mesmo PR). O alerta
-- de DLQ continua sendo emitido pelo gatilho trg_alert_on_outbox_dead, que
-- nunca deixou de existir - portanto nao ha perda de observabilidade.
-- ============================================================

DROP FUNCTION IF EXISTS public.claim_outbox_batch(integer);

DO $$
DECLARE
  v_jobid bigint;
BEGIN
  SELECT j.jobid INTO v_jobid
    FROM cron.job j
   WHERE j.jobname = 'outbox-worker-1min';

  IF v_jobid IS NOT NULL THEN
    PERFORM cron.alter_job(v_jobid, schedule => '* * * * *');
  ELSE
    PERFORM cron.schedule(
      'outbox-worker-1min',
      '* * * * *',
      $cron$SELECT public._invoke_edge_function('process-outbox');$cron$
    );
  END IF;
END;
$$;