-- Retencao de system_alerts: o cron passa a chamar a funcao oficial do banco.
--
-- O job 2 (`cleanup-system-alerts`, `10 2 * * *`, role postgres) rodava um DELETE
-- inline de uma geracao anterior as colunas `resolved_at`/`resolved_by`/`dispatch_status`:
--   DELETE FROM public.system_alerts WHERE created_at < NOW() - INTERVAL '30 days'
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
-- Horario preservado (`10 2 * * *`): a correcao nao muda a janela de execucao.
-- Idempotente: remove se existir e recria com a mesma acao.
DO $do$
DECLARE
  v_present boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-system-alerts') INTO v_present;
  IF v_present THEN
    PERFORM cron.unschedule('cleanup-system-alerts');
  END IF;
  PERFORM cron.schedule(
    'cleanup-system-alerts',
    '10 2 * * *',
    'SELECT public.cleanup_old_system_alerts();'
  );
END;
$do$;

-- O comentario aplicado por 20261117230000 dizia o contrario ("NAO AGENDADA. O expurgo
-- de system_alerts e o cron cleanup-system-alerts (30 dias, DELETE inline)"), e aquele
-- texto agora mente. Este e' o registro da politica real.
COMMENT ON FUNCTION public.cleanup_old_system_alerts() IS
  'AGENDADA. O cron cleanup-system-alerts (job 2, 10 2 * * *) chama esta funcao: resolvido expurga em 60 dias, aberto em 180. Sem regra concorrente em apply_lgpd_retention().';