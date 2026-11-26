-- ============================================================================
-- Versiona 5 jobs de MANUTENCAO/WATCHDOG que existem apenas em producao.
--
-- CAUSA (etapa 205 do plano, docs/qa/04-PLANO.md:4368-4387):
--   Destes 5 jobs ativos em producao, NENHUM tem cron.schedule em migration:
--     id 1  cleanup-health-scan-runs      0 2 * * *   DELETE ... interval '7 days'
--     id 10 weekly-vacuum-analyze         0 4 * * 0   ANALYZE de 6 tabelas
--     id 11 reset-pg-stat-statements      0 5 * * 1   SELECT pg_stat_statements_reset()
--     id 14 cleanup-checkpoint-snapshots  30 3 * * 0  DELETE ... interval '30 days'
--     id 24 xbz-sync-watchdog-hourly      15 * * * *  select public.xbz_sync_watchdog()
--   Efeito: um restore/ambiente novo fica sem retencao de health_scan_runs e
--   checkpoint_snapshots, sem ANALYZE semanal e, o mais grave, sem o unico vigia
--   da integracao XBZ (xbz-sync-watchdog-hourly) - falha de sincronizacao de
--   pedidos XBZ fica silenciosa.
--
--   Achado refinado: 4 dos 5 nomes aparecem em migrations apenas em COMENTARIO
--   (20261127140000:10-11) ou com NOME DIFERENTE - 20260712195527:144-151 agenda
--   'cleanup-health-scan-runs-daily' (sufixo -daily, '5 8 * * *', chamando
--   public.cleanup_health_scan_runs()), que NAO existe em producao. Ou seja:
--   nenhum dos 5 nomes vivos tem cron.schedule. Provado no snapshot do banco
--   vivo (branch contexto, docs/contexto/supabase/cron.md, 27 jobs ativos).
--
-- DECISAO:
--   1. Recriar os 5 jobs EXATAMENTE como estao em producao (mesmo nome,
--      schedule e comando, copiados byte a byte de docs/contexto/supabase/cron.md).
--      Nenhuma mudanca de comportamento em producao: os 5 ja existem e o
--      WHERE NOT EXISTS torna a migration NO-OP no banco atual.
--   2. Idempotente e conservador (mesmo padrao de 20261121153000:29-42): cria o
--      job apenas se NAO existir em cron.job. Job ja ativo NAO e sobrescrito nem
--      duplicado.
--   3. NAO desagenda nem renomeia nada. Em especial, NAO toca nos jobs 113-120
--      (usuario ci_snapshot) nem no conflito pre-existente
--      'cleanup-health-scan-runs' (7 dias, sem funcao) x
--      'cleanup-health-scan-runs-daily' (30 dias via funcao) - achado registrado
--      para decisao de negocio, nao resolvido aqui.
-- ============================================================================

-- 1) id 1 - retencao de health_scan_runs (7 dias)
SELECT cron.schedule(
  'cleanup-health-scan-runs',
  '0 2 * * *',
  $cron$DELETE FROM public.health_scan_runs WHERE started_at < NOW() - INTERVAL '7 days'$cron$
)
WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-health-scan-runs')

-- 2) id 10 - ANALYZE semanal (estatisticas do planner)
SELECT cron.schedule(
  'weekly-vacuum-analyze',
  '0 4 * * 0',
  $cron$ANALYZE public.health_scan_runs; ANALYZE public.system_alerts; ANALYZE public.telemetry_logs; ANALYZE public.fornecedores; ANALYZE public.pedidos; ANALYZE public.cotacoes$cron$
)
WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'weekly-vacuum-analyze')

-- 3) id 11 - reset do pg_stat_statements (janela de medicao semanal)
SELECT cron.schedule(
  'reset-pg-stat-statements',
  '0 5 * * 1',
  $cron$SELECT pg_stat_statements_reset()$cron$
)
WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'reset-pg-stat-statements')

-- 4) id 14 - retencao de checkpoint_snapshots (30 dias)
SELECT cron.schedule(
  'cleanup-checkpoint-snapshots',
  '30 3 * * 0',
  $cron$DELETE FROM public.checkpoint_snapshots WHERE captured_at < NOW() - INTERVAL '30 days'$cron$
)
WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-checkpoint-snapshots')

-- 5) id 24 - vigia da sincronizacao XBZ (unico alerta de sync parada)
SELECT cron.schedule(
  'xbz-sync-watchdog-hourly',
  '15 * * * *',
  $cron$select public.xbz_sync_watchdog()$cron$
)
WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'xbz-sync-watchdog-hourly')
