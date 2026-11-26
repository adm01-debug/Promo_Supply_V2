-- ============================================================================
-- PERF-05 (etapa 218): alinha indice e consulta quente de system_alerts e da
-- indice + retencao a spot_api_sync_log.
--
-- Causa raiz medida no codigo (etapa 218, docs/qa/04-PLANO.md:4646):
--   1) alert-dispatcher/index.ts:249 (cron alert-dispatcher-1min, a cada minuto)
--      filtra .in('severity',['HIGH','CRITICAL','EMERGENCY','high','critical','emergency'])
--      .is('dispatched_at', null).order('created_at').limit(50).
--      O unico indice feito para isso -- idx_system_alerts_pending_dispatch
--      (severity, dispatched_at) WHERE dispatched_at IS NULL AND severity IN
--      ('HIGH','CRITICAL') -- cobre DOIS valores, entao a condicao da consulta nao
--      implica o predicado e o Postgres nao pode usa-lo (2 scans contra 6.255 seq
--      scans de 460 linhas).
--   2) Os paineis de saude leem a tabela por created_at e nao havia indice nenhum
--      para isso: HealthDashboard.tsx:216-221 (resolved_at IS NULL + ORDER BY
--      created_at DESC LIMIT 50, refetch 60s) e SystemAlertsView.tsx:28-32
--      (ORDER BY created_at DESC LIMIT 50 sem filtro, refetch 15s). O indice que
--      existe, idx_system_alerts_type_created, comeca por alert_type e nao serve.
--   3) check-sla-alerts/index.ts:56-60 le spot_api_sync_log com
--      select(status, created_at, error_message, endpoint)
--      .order('created_at', { ascending: false }).limit(200) -- SEM filtro de
--      endpoint, e o unico indice nao-PK e (endpoint, called_at DESC). A tabela
--      tambem nao tinha retencao: cada chamada da API SPOT insere uma linha
--      (spot-api/index.ts:224) e nada apagava.
--
-- DECISAO
--   1. O indice do dispatcher passa a ter predicado IDENTICO ao filtro da consulta
--      (os 6 valores, de proposito) e chave (created_at), que e a ordem do LIMIT 50.
--      Os valores em minusculas continuam na lista porque existem alertas criados
--      antes da normalizacao de severidade (ver 20261127170000, PR #533) e um
--      indice sem eles tiraria esses alertas do plano -- e um deles e CRITICAL aberto.
--   2. Um unico indice NAO parcial em (created_at DESC) atende as duas leituras dos
--      paineis. O plano recomendava um parcial em resolved_at IS NULL, mas
--      SystemAlertsView consulta a tabela SEM esse filtro e precisaria de um
--      segundo indice; um indice so resolve os dois casos.
--   3. Indice btree em spot_api_sync_log (created_at DESC) para a leitura do
--      check-sla-alerts.
--   4. Retencao de spot_api_sync_log: funcao + cron diario, no mesmo molde de
--      cleanup_old_query_telemetry (20260711191946:8-38). Janela de 90 dias: e
--      log de API, a leitura de negocio usa os ultimos minutos e 90 dias cobrem
--      qualquer investigacao de cota; nada mais apaga a tabela.
--
-- ATALHO EVITADO: nao criar indice em coluna nenhuma sem consulta que o use (o
-- banco ja tem centenas de indices sem uso).
--
-- REVERSAO
--   DROP INDEX IF EXISTS public.idx_system_alerts_pending_dispatch;
--   DROP INDEX IF EXISTS public.idx_system_alerts_created_desc;
--   DROP INDEX IF EXISTS public.idx_spot_sync_log_created;
--   SELECT cron.unschedule('cleanup-spot-api-sync-log');
--   DROP FUNCTION IF EXISTS public.cleanup_old_spot_sync_log();
--   (recriar o indice antigo: 20260711153129:9-11)
-- ============================================================================

-- 1) Dispatcher de alertas: predicado igual ao filtro da consulta.
-- system_alerts tem algumas centenas de linhas, entao o DROP+CREATE nao precisa de
-- CONCURRENTLY (que nao roda dentro da transacao do canal de apply).
DROP INDEX IF EXISTS public.idx_system_alerts_pending_dispatch

CREATE INDEX idx_system_alerts_pending_dispatch
  ON public.system_alerts (created_at)
  WHERE dispatched_at IS NULL
    AND severity IN ('HIGH','CRITICAL','EMERGENCY','high','critical','emergency')

-- 2) Painel de saude e tela de alertas: leitura por created_at (com ou sem o
--    filtro resolved_at IS NULL) sem precisar de Sort.
CREATE INDEX IF NOT EXISTS idx_system_alerts_created_desc
  ON public.system_alerts (created_at DESC)

-- 3) check-sla-alerts: os 200 registros mais recentes, sem filtro de endpoint.
CREATE INDEX IF NOT EXISTS idx_spot_sync_log_created
  ON public.spot_api_sync_log (created_at DESC)

-- 4) Retencao de spot_api_sync_log (append-only, sem expurgo ate agora).
CREATE OR REPLACE FUNCTION public.cleanup_old_spot_sync_log()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_deleted integer;
BEGIN
  WITH d AS (
    DELETE FROM public.spot_api_sync_log
     WHERE created_at < NOW() - INTERVAL '90 days'
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_deleted FROM d;
  RETURN v_deleted;
END;
$$

REVOKE EXECUTE ON FUNCTION public.cleanup_old_spot_sync_log() FROM PUBLIC, anon, authenticated

GRANT EXECUTE ON FUNCTION public.cleanup_old_spot_sync_log() TO service_role

SELECT cron.schedule(
  'cleanup-spot-api-sync-log',
  '40 3 * * *',
  $cron$SELECT public.cleanup_old_spot_sync_log()$cron$
)
WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-spot-api-sync-log')
