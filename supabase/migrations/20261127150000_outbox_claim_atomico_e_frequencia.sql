-- ============================================================
-- Etapa 203 / JOB-06 (parte 1 de 2) - claim atomico da outbox
--
-- PROBLEMA
--   O job 18 (outbox-worker-1min) invoca a edge process-outbox a cada
--   minuto, mas process-outbox fazia um SELECT simples (.select() sem lock)
--   e processava as mesmas linhas. Com o cron de 1 min e um laco de ate
--   20 x 15 s, duas execucoes sobrepostas entregavam a MESMA mensagem duas
--   vezes - o proprio cabecalho da edge prometia
--   "SELECT ... FOR UPDATE SKIP LOCKED (via RPC)" mas nunca houve RPC.
--   Alem disso o job rodava 1.440 vezes por dia sobre uma tabela que nunca
--   teve uma unica linha (nenhum produtor outbound foi ligado ainda).
--
-- O QUE ESTA MIGRATION FAZ
--   1. Cria public.claim_outbox_batch(p_batch_size) SECURITY DEFINER, que
--      reserva um lote de forma atomica com FOR UPDATE SKIP LOCKED e
--      empurra next_attempt_at para now() + 10 min (lease). Nenhum status
--      novo e introduzido: o CHECK de status continua
--      ('pending','retrying','delivered','dead'). Se o worker morrer no
--      meio do lote, o lease expira sozinho e as linhas voltam a ser
--      elegiveis - nao existe linha presa para sempre.
--   2. Baixa a frequencia do job 18 para */15 (decisao A do plano): o
--      backoff do worker e de no minimo 60 s, nenhuma mensagem e perdida
--      por rodar 4x menos, e a pressao de invocacao cai de 1.440 para 96
--      por dia enquanto nao existe produtor. O job NAO e desagendado
--      porque 20261121153000:36-42 o recriaria numa reaplicacao.
--   3. Reforca o alerta unico de DLQ: o gatilho transacional
--      trg_alert_on_outbox_dead (2026-07) continua sendo a unica fonte do
--      alerta outbox_dead_letter. O insert best-effort de dentro da edge
--      foi removido no mesmo PR porque duplicava o alerta e podia se
--      perder (fire-and-forget).
--
-- ROLLBACK: supabase/rollbacks/20261127150000_revert_outbox_claim_atomico.sql
-- ============================================================

CREATE OR REPLACE FUNCTION public.claim_outbox_batch(p_batch_size integer DEFAULT 20)
RETURNS SETOF public.integration_outbox
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit integer;
  v_lease interval := interval '10 minutes';
BEGIN
  -- Teto duro: o worker pede 20; nada acima de 100 evita varredura gigante.
  v_limit := greatest(1, least(coalesce(p_batch_size, 20), 100));

  RETURN QUERY
  WITH claimed AS (
    SELECT o.id
      FROM public.integration_outbox o
     WHERE o.status IN ('pending', 'retrying')
       AND o.next_attempt_at <= now()
     ORDER BY o.next_attempt_at
     LIMIT v_limit
       FOR UPDATE SKIP LOCKED
  )
  UPDATE public.integration_outbox o
     SET next_attempt_at = now() + v_lease
    FROM claimed c
   WHERE o.id = c.id
  RETURNING o.*;
END;
$$;

COMMENT ON FUNCTION public.claim_outbox_batch(integer) IS
  'Reserva atomica de lote da integration_outbox (FOR UPDATE SKIP LOCKED + lease de 10 min). Uso exclusivo do worker process-outbox.';

REVOKE ALL ON FUNCTION public.claim_outbox_batch(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_outbox_batch(integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_outbox_batch(integer) TO service_role;

-- Job 18: 1 min -> 15 min, sem desagendar (nao perde a definicao do job).
DO $$
DECLARE
  v_jobid bigint;
BEGIN
  SELECT j.jobid INTO v_jobid
    FROM cron.job j
   WHERE j.jobname = 'outbox-worker-1min';

  IF v_jobid IS NULL THEN
    PERFORM cron.schedule(
      'outbox-worker-1min',
      '*/15 * * * *',
      $cron$SELECT public._invoke_edge_function('process-outbox');$cron$
    );
  ELSE
    PERFORM cron.alter_job(v_jobid, schedule => '*/15 * * * *');
  END IF;
END;
$$;