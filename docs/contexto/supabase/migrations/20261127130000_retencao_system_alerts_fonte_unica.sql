-- Retencao de system_alerts: o cron passa a chamar a funcao oficial do banco.
--
-- O job 2 (`cleanup-system-alerts`, `10 2 * * *`, role postgres) rodava um DELETE
-- inline de uma geracao anterior as colunas `resolved_at`/`resolved_by`/`dispatch_status`:
--   apagar tudo com created_at < NOW() - INTERVAL '30 days' (sem guarda de resolved_at)
-- Sem condicao sobre `resolved_at`, alerta ABERTO -- nunca tratado -- sumia aos 30 dias,
-- enquanto a funcao oficial do mesmo banco (criada em `20260711183647`) guarda o aberto
-- por 180 dias e o resolvido por 60:
--   (resolved_at IS NOT NULL AND resolved_at < now() - interval '60 days')
--   OR (resolved_at IS NULL AND created_at < now() - interval '180 days')
--
-- Efeito observado: alerta cujo produtor reemite (`cron_watchdog.*`,
-- `xbz_sync_stalled`, `SYSTEM_ERROR`) se recria e mascara a perda; os de insercao
-- unica -- `outbox_dead_letter` (`process-outbox/index.ts` + `trg_alert_on_outbox_dead`),
-- `PARTITION_MAINTENANCE` e `PARTITION_CANDIDATE` -- sumiam sem nunca terem sido
-- tratados nem registrados como resolvidos.
--
-- Escolha: chamar a funcao, nao remendar o DELETE. Duas regras de retencao
-- divergentes para a mesma tabela e' exatamente o que
-- `20261117230000_retencao_fonte_unica.sql` existe para eliminar; e' o mesmo padrao
-- do job 16, que chama `public.cleanup_old_integration_outbox()` em vez de DELETE inline.
--
-- COMO O JOB E' ALTERADO (aprendido em producao, ver 20261121180000):
--   `cron.unschedule(nome)` so enxerga job do proprio role e falha com
--   "could not find valid entry for job" quando a conexao nao e' o dono -- o que
--   aborta a aplicacao em vez de cair no Management API. `cron.alter_job(jobid, ...)`
--   nao tem esse problema: le o jobid (leitura permitida a qualquer role) e altera
--   preservando dono, horario e historico. Se a conexao nao puder alterar, o erro e'
--   de permissao -- que e' o caso em que `aplicar-migration-prod.yml` reaplica o
--   arquivo pelo Management API, onde a conexao e' postgres (dono do job).
-- Idempotente: alterar duas vezes com o mesmo comando nao muda nada.
DO $do$
DECLARE
  v_jobid bigint;
BEGIN
  SELECT jobid INTO v_jobid
  FROM cron.job
  WHERE jobname = 'cleanup-system-alerts'
  ORDER BY jobid
  LIMIT 1;

  IF v_jobid IS NULL THEN
    PERFORM cron.schedule(
      'cleanup-system-alerts',
      '10 2 * * *',
      'SELECT public.cleanup_old_system_alerts();'
    );
  ELSE
    -- horario preservado: a correcao nao muda a janela de execucao
    PERFORM cron.alter_job(
      job_id := v_jobid,
      schedule := '10 2 * * *',
      command := 'SELECT public.cleanup_old_system_alerts();'
    );
  END IF;
END;
$do$

-- O comentario aplicado por 20261117230000 dizia o contrario ("NAO AGENDADA. O expurgo
-- de system_alerts e o cron cleanup-system-alerts (30 dias, DELETE inline)"), e aquele
-- texto agora mente. Este e' o registro da politica real.
COMMENT ON FUNCTION public.cleanup_old_system_alerts() IS
  'AGENDADA. O cron cleanup-system-alerts (job 2, 10 2 * * *) chama esta funcao: resolvido expurga em 60 dias, aberto em 180. Sem regra concorrente em apply_lgpd_retention().'
