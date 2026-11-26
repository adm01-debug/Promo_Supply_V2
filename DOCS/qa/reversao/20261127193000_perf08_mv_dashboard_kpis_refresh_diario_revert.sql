-- Reversao da migration 20261127193000_perf08_mv_dashboard_kpis_refresh_diario.sql
-- (etapa 222 do plano). Volta o refresh da MV de KPIs para 15 em 15 minutos.
--
-- Aplicar com um timestamp novo em supabase/migrations/ (o canal
-- aplicar-migration-prod.yml so aceita arquivos dentro de supabase/migrations/).
--
-- Contexto: a frequencia de 15 min foi decidida em
-- 20260712222620_110cc02b-1d32-42e6-a778-96d41f60eeb2.sql:73-77 e mantida por
-- 20261113180000_corrige_crons_lgpd_e_mv_kpis.sql (que recriou o indice unico
-- da MV, sem o qual REFRESH ... CONCURRENTLY falhava: 6064 falhas, 0 sucessos).

SET LOCAL lock_timeout = '10s';

SELECT cron.unschedule('refresh-mv-dashboard-kpis')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'refresh-mv-dashboard-kpis');

SELECT cron.schedule(
  'refresh-mv-dashboard-kpis',
  '*/15 * * * *',
  $$SELECT public.refresh_mv_dashboard_kpis();$$
);