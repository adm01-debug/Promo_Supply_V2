-- ---------------------------------------------------------------------------
-- ROLLBACK da migration 20261127160000_versiona_jobs_manutencao_e_watchdog_xbz.
-- NAO aplicado automaticamente.
--
-- ATENCAO - este rollback e deliberadamente NO-OP e isso e a decisao correta:
-- os 5 jobs ('cleanup-health-scan-runs', 'weekly-vacuum-analyze',
-- 'reset-pg-stat-statements', 'cleanup-checkpoint-snapshots',
-- 'xbz-sync-watchdog-hourly') JA existiam em producao antes desta migration - ela
-- so os declara em codigo (WHERE NOT EXISTS -> no-op no banco atual). Portanto
-- desagendar aqui APAGARIA jobs de producao que nao foram criados pela migration:
-- fim da retencao de health_scan_runs/checkpoint_snapshots, fim do ANALYZE
-- semanal e, o mais grave, desligaria o unico vigia da sincronizacao XBZ.
--
-- Se algum dia for realmente necessario remover esses jobs, o caminho e uma
-- migration nova e explicita de desligamento (com decisao de negocio registrada),
-- nunca este rollback. Ver tambem 20260712195527:144-151
-- ('cleanup-health-scan-runs-daily'): desagendar o job com sufixo -daily e
-- seguro, ele nao existe em producao.
-- ---------------------------------------------------------------------------

DO $rollback$
BEGIN
  RAISE NOTICE 'NO-OP intencional: os 5 jobs de manutencao/watchdog sao pre-existentes em producao e nao foram criados por esta migration.';
END
$rollback$;