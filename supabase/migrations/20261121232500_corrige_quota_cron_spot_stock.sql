-- Corrige a agenda do spot-api-sync-stock: */15 estourava a cota diaria.
--
-- O endpoint `Stocks` da API SPOT tem limite de 96 chamadas por dia
-- (`SPOT_DAILY_LIMITS` em supabase/functions/_shared/spot_api.ts) e o cron rodava
-- a cada 15 minutos = 96 rodadas exatas. Como a `SPOT_QUOTA_RESERVE` bloqueia as
-- ultimas posicoes, as rodadas finais do dia eram recusadas todos os dias:
--   spot_api_sync_log: quota_blocked 94/96 e 95/96 as 23:30 e 23:45 BRT
--   (2026-11-19, 2026-11-20 e 2026-11-21)
-- Resultado: estoque desatualizado justamente no fechamento do dia util.
--
-- Passa para a cada 20 minutos = 72 rodadas/dia, deixando 24 de folga e mantendo
-- o estoque com no maximo 20 min de defasagem (antes eram 15 min, mas as ultimas
-- 2 horas do dia ficavam sem atualizacao nenhuma).
--
-- Idempotente: remove se existir e recria com a mesma acao.
DO $do$
DECLARE
  v_present boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'spot-api-sync-stock') INTO v_present;
  IF v_present THEN
    PERFORM cron.unschedule('spot-api-sync-stock');
  END IF;
  PERFORM cron.schedule(
    'spot-api-sync-stock',
    '*/20 * * * *',
    'SELECT public._invoke_spot_sync(''syncStock'');'
  );
END;
$do$;