-- ============================================
-- MIGRATION: PERF-08 (parte 2/2) -- para de recalcular 96x/dia uma MV sem leitor
-- Data: 2026-11-27 -- etapa 222 do plano (docs/qa/04-PLANO.md)
--
-- PROBLEMA MEDIDO (o que esta migration resolve)
--   O job pg_cron 'refresh-mv-dashboard-kpis' roda public.refresh_mv_dashboard_kpis()
--   a cada 15 minutos (96x/dia) desde 20260712222620_110cc02b e 20261113180000.
--   Cada execucao custa ~180 ms de CPU no banco (649 chamadas / 116.875 ms no
--   pg_stat_statements, conforme o plano) e grava 1 linha em health_scan_runs
--   -- ou seja ~96 linhas/dia / ~35 mil linhas/ano numa tabela de saude que
--   ninguem le filtrada. O dado produzido nao tem leitor: nao existe nenhuma
--   referencia a mv_dashboard_kpis / get_dashboard_kpis em src/ nem em
--   supabase/functions/ (so no types.ts gerado).
--
-- POR QUE NAO "ligar o painel na MV" (caminho sugerido no plano)
--   A MV nao e equivalente ao painel executivo, e usa-la mudaria os numeros:
--     1) escopo: a MV agrupa por pedidos.tenant_id e get_dashboard_kpis filtra
--        por tenant_in_my_group(tenant_id); o painel filtra por
--        pedidos.organization_id (useExecutiveDashboardData.ts:120). As duas
--        colunas coexistem na tabela e nao sao a mesma coisa num tenant com
--        mais de uma organizacao.
--     2) data: a MV agrupa por date_trunc('day', created_at); o painel agrupa
--        por data_emissao (com fallback created_at). A propria RPC oficial do
--        dashboard (get_compras_dashboard_metrics, 20261112222833) agrupa por
--        data_emissao -- logo data_emissao e' a data canonica do pedido.
--     3) frescor: o painel executivo e' tempo real (staleTime 30s); a MV e'
--        batch. Trocar a fonte faria a tendencia mensal ficar ate 1 ciclo atras.
--   Alem disso o ganho seria zero: o painel continua precisando das linhas cruas
--   de pedidos para cycle time, pedidos atrasados, maverick spend, top
--   fornecedores e performance por comprador.
--
-- O QUE ESTA MIGRATION FAZ
--   Mantem a MV, a funcao refresh_mv_dashboard_kpis() e a funcao publica
--   get_dashboard_kpis(date, date) exatamente como estao (com os GRANTs para
--   authenticated) -- nada de funcionalidade exposta e' removido -- e troca a
--   frequencia do refresh de 15 minutos para 1x/dia, fora do horario comercial.
--   Custo cai ~96x (de ~180 ms a cada 15 min para ~180 ms por dia) e a tabela
--   health_scan_runs deixa de receber ~35 mil linhas/ano de ruido.
--
-- COMO REVERTER
--   -- docs/qa/reversao/20261127193000_perf08_mv_dashboard_kpis_refresh_diario_revert.sql
--   (volta o cron para '*/15 * * * *')
--
-- Idempotente: unschedule so quando o job existe; schedule recria com o mesmo
-- jobname (o pg_cron aceita o mesmo nome porque o anterior foi removido).
-- ============================================

-- Aborta se o lock do cron.job estiver preso, em vez de enfileirar escrita
SET LOCAL lock_timeout = '10s';

-- (1) remove o disparo de 15 em 15 minutos
SELECT cron.unschedule('refresh-mv-dashboard-kpis')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'refresh-mv-dashboard-kpis');

-- (2) recria o mesmo job, agora 1x/dia as 04:20 UTC (01:20 BRT)
SELECT cron.schedule(
  'refresh-mv-dashboard-kpis',
  '20 4 * * *',
  $$SELECT public.refresh_mv_dashboard_kpis();$$
);