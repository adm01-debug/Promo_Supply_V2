-- 148 (FN-08): o cartao de saude dos scanners listava 7 nomes que nenhuma rotina
-- ativa grava em health_scan_runs.scan_name. Como o painel compara o catalogo
-- (VALUES fixo) com as execucoes por FULL OUTER JOIN e marca `critical` todo
-- nome sem execucao, o resultado era um cartao permanentemente vermelho:
--
--   archive_audit_logs / archive_telemetry_logs -> funcoes marcadas
--     "INATIVA POR DECISAO" no proprio banco e sem chamador
--   cleanup_health_scan_runs (job 1 faz DELETE em SQL cru, nao chama a funcao),
--     secret_rotation_check, ensure_partitions, slack_watchdog e security_scan ->
--     citados apenas dentro desta funcao e de simulate_scan_sla_loop
--
-- O catalogo passa a listar o que o sistema realmente executa e grava:
--   lgpd_retention            1440 min (1 dia) - job de retencao LGPD, 1x/dia
--   refresh_mv_dashboard_kpis   45 min        - materialized view dos KPIs, 15 min
--
-- Nome que aparecer em health_scan_runs sem estar aqui continua listado (o FULL
-- OUTER JOIN nao esconde nada) e sai com sla_minutes nulo, portanto `ok` -- nunca
-- um falso `critical`. Para vigiar um scanner novo, basta uma linha nesta lista.
--
-- Nao mexe em simulate_scan_sla_loop nem nas funcoes archive_*/ensure_*.

CREATE OR REPLACE FUNCTION public.admin_scan_runs_sla_status()
RETURNS TABLE (
  scan_name        text,
  last_run_at      timestamptz,
  age_minutes      integer,
  sla_minutes      integer,
  last_status      text,
  health           text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  WITH sla(scan_name, sla_minutes) AS (
    VALUES
      ('lgpd_retention',            1440),  -- 1 dia (retencao LGPD, 1x/dia)
      ('refresh_mv_dashboard_kpis',   45)   -- 45 min (roda a cada 15 min)
  ),
  latest AS (
    SELECT DISTINCT ON (h.scan_name)
      h.scan_name,
      COALESCE(h.finished_at, h.started_at) AS last_run_at,
      COALESCE(h.status, CASE WHEN h.failed_count > 0 THEN 'failed' ELSE 'ok' END) AS last_status
    FROM public.health_scan_runs h
    WHERE h.scan_name IS NOT NULL
    ORDER BY h.scan_name, COALESCE(h.finished_at, h.started_at) DESC
  )
  SELECT
    COALESCE(l.scan_name, sla.scan_name)                                            AS scan_name,
    l.last_run_at                                                                   AS last_run_at,
    CASE
      WHEN l.last_run_at IS NULL THEN NULL
      ELSE EXTRACT(EPOCH FROM (now() - l.last_run_at))::int / 60
    END                                                                             AS age_minutes,
    sla.sla_minutes                                                                 AS sla_minutes,
    l.last_status                                                                   AS last_status,
    CASE
      WHEN l.last_run_at IS NULL                                                   THEN 'critical'
      WHEN l.last_status IN ('failed','error')                                     THEN 'critical'
      WHEN EXTRACT(EPOCH FROM (now() - l.last_run_at))/60 > sla.sla_minutes * 2    THEN 'critical'
      WHEN EXTRACT(EPOCH FROM (now() - l.last_run_at))/60 > sla.sla_minutes        THEN 'late'
      ELSE 'ok'
    END                                                                             AS health
  FROM sla
  FULL OUTER JOIN latest l USING (scan_name);
$function$;

REVOKE EXECUTE ON FUNCTION public.admin_scan_runs_sla_status() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.admin_scan_runs_sla_status() TO authenticated, service_role;

COMMENT ON FUNCTION public.admin_scan_runs_sla_status() IS
  'Onda 72 (R-12) + etapa 148 (FN-08): SLA por scan_name gravado de fato em health_scan_runs. Catalogo reduzido a lgpd_retention e refresh_mv_dashboard_kpis; nome fora do catalogo sai com sla_minutes nulo e health ok (nunca critical por ausencia de cadastro).';