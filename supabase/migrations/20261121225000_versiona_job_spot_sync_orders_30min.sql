-- Versiona o cron spot-api-sync-orders-30min.
--
-- `getOrders` e a unica acao do spot-api que popula `spot_pedidos`, mas ate
-- 2026-11-21 nenhum agendador a chamava: a tabela ficava permanentemente vazia
-- mesmo com 1279 produtos sincronizados. A edge foi corrigida (#256 liberou a
-- acao na allowlist do cron, #257 enviou o parametro `Status` que a OrdersV1
-- exige); falta apenas a agenda.
--
-- Idempotente: remove se existir e recria com a mesma agenda/acao.
DO $do$
DECLARE
  v_present boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'spot-api-sync-orders-30min') INTO v_present;
  IF v_present THEN
    PERFORM cron.unschedule('spot-api-sync-orders-30min');
  END IF;
  PERFORM cron.schedule(
    'spot-api-sync-orders-30min',
    '*/30 * * * *',
    'SELECT public._invoke_spot_sync(''getOrders'');'
  );
END;
$do$;