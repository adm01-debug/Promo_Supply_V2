-- Versiona o cron job xbz-sync-pedidos-30min (estava apenas manual em prod, jobid 23).
-- Idempotente: remove se existir e recria com a mesma agenda/acao.
DO $do$
DECLARE
  v_present boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'xbz-sync-pedidos-30min') INTO v_present;
  IF v_present THEN
    PERFORM cron.unschedule('xbz-sync-pedidos-30min');
  END IF;
  PERFORM cron.schedule(
    'xbz-sync-pedidos-30min',
    '*/30 * * * *',
    'SELECT public._invoke_xbz_sync();'
  );
END;
$do$;