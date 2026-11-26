-- ============================================================================
-- REVERSAO da migration 20261127193000_perf08_mv_dashboard_kpis_refresh_diario.sql
-- (etapa 222). Volta o refresh da MV de KPIs para 15 em 15 minutos.
--
-- Aplicar com um timestamp novo dentro de supabase/migrations/: o canal
-- aplicar-migration-prod.yml so aceita arquivos daquele diretorio.
--
-- O job pg_cron id 19 pertence ao usuario postgres; o canal psql connecta como
-- ci_snapshot, entao este arquivo usa o mesmo guard de dono da migration
-- (aviso 'exige conexao como postgres' -> reaplicacao pelo Management API).
--
-- Contexto: '*/15 * * * *' foi decidido em
-- 20260712222620_110cc02b-1d32-42e6-a778-96d41f60eeb2.sql:73-77.
-- ============================================================================

SET LOCAL lock_timeout = '10s';

DO $$
DECLARE
  v_id       bigint;
  v_dono     text;
  v_schedule text := '*/15 * * * *';
BEGIN
  SELECT jobid, username INTO v_id, v_dono
    FROM cron.job WHERE jobname = 'refresh-mv-dashboard-kpis';

  IF v_id IS NULL THEN
    PERFORM cron.schedule(
      'refresh-mv-dashboard-kpis',
      v_schedule,
      'SELECT public.refresh_mv_dashboard_kpis();'
    );
    RETURN;
  END IF;

  IF v_dono IS DISTINCT FROM current_user THEN
    RAISE EXCEPTION
      'alterar o job % (dono %) exige conexao como postgres',
      'refresh-mv-dashboard-kpis', v_dono;
  END IF;

  PERFORM cron.alter_job(v_id, v_schedule, NULL, NULL, NULL, NULL);
END $$;