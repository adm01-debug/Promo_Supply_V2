
-- 1. FIX: colunas usadas pelos scanners
ALTER TABLE public.system_alerts
  ADD COLUMN IF NOT EXISTS title       text,
  ADD COLUMN IF NOT EXISTS description text;

-- 2. Overview de saúde do sistema
CREATE OR REPLACE VIEW public.v_system_health_overview
WITH (security_invoker = true)
AS
SELECT
  alert_type,
  severity,
  count(*)                                                     AS total_open,
  count(*) FILTER (WHERE created_at > now() - interval '24h')  AS last_24h,
  count(*) FILTER (WHERE created_at > now() - interval '1h')   AS last_1h,
  min(created_at)                                              AS oldest_open,
  max(created_at)                                              AS most_recent
FROM public.system_alerts
WHERE resolved_at IS NULL
GROUP BY alert_type, severity
ORDER BY
  CASE severity
    WHEN 'EMERGENCY' THEN 1
    WHEN 'CRITICAL'  THEN 2
    WHEN 'HIGH'      THEN 3
    WHEN 'MEDIUM'    THEN 4
    WHEN 'INFO'      THEN 5
    ELSE 6
  END,
  total_open DESC;

COMMENT ON VIEW public.v_system_health_overview IS
  'Onda 27: Visão consolidada dos alertas abertos, agrupados por tipo/severidade.';

-- 3. Meta-scanner de alertas estagnados
CREATE OR REPLACE FUNCTION public.scan_stale_alerts()
RETURNS TABLE (
  alert_type   text,
  severity     text,
  stale_count  bigint,
  oldest_hours numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_rec record;
  v_dedup_hours int := 24;
BEGIN
  FOR v_rec IN
    SELECT
      s.alert_type,
      s.severity,
      count(*) AS cnt,
      ROUND(EXTRACT(EPOCH FROM (now() - min(s.created_at))) / 3600, 1) AS oldest_h
    FROM public.system_alerts s
    WHERE s.resolved_at IS NULL
      AND s.severity IN ('HIGH','CRITICAL','EMERGENCY')
      AND s.created_at < now() - interval '24 hours'
      AND s.alert_type <> 'stale_alerts'  -- evita recursão
    GROUP BY s.alert_type, s.severity
  LOOP
    alert_type   := v_rec.alert_type;
    severity     := v_rec.severity;
    stale_count  := v_rec.cnt;
    oldest_hours := v_rec.oldest_h;
    RETURN NEXT;

    IF NOT EXISTS (
      SELECT 1 FROM public.system_alerts
      WHERE alert_type = 'stale_alerts'
        AND (metadata->>'source_alert_type') = v_rec.alert_type
        AND (metadata->>'source_severity')   = v_rec.severity
        AND created_at > now() - (v_dedup_hours || ' hours')::interval
    ) THEN
      INSERT INTO public.system_alerts (alert_type, severity, title, description, message, metadata)
      VALUES (
        'stale_alerts',
        'HIGH',
        format('[HIGH] %s alerta(s) %s/%s aberto(s) há >24h', v_rec.cnt, v_rec.alert_type, v_rec.severity),
        format('Há %s alertas do tipo %s (%s) sem resolução, o mais antigo com %s horas. Investigar operacionalmente.',
               v_rec.cnt, v_rec.alert_type, v_rec.severity, v_rec.oldest_h),
        format('Stale: %s×%s/%s (>%sh)', v_rec.cnt, v_rec.alert_type, v_rec.severity, v_rec.oldest_h),
        jsonb_build_object(
          'source_alert_type', v_rec.alert_type,
          'source_severity',   v_rec.severity,
          'stale_count',       v_rec.cnt,
          'oldest_hours',      v_rec.oldest_h,
          'diagnostic_sql',
            format('SELECT id, created_at, message, metadata FROM public.system_alerts '
                   'WHERE alert_type = %L AND severity = %L AND resolved_at IS NULL '
                   'ORDER BY created_at ASC LIMIT 20;', v_rec.alert_type, v_rec.severity)
        )
      );
    END IF;
  END LOOP;

  RETURN;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.scan_stale_alerts() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.scan_stale_alerts() TO service_role;

GRANT SELECT ON public.v_system_health_overview TO authenticated;
GRANT SELECT ON public.v_system_health_overview TO service_role;

COMMENT ON FUNCTION public.scan_stale_alerts() IS
  'Onda 27: Meta-scanner que detecta alertas HIGH/CRITICAL/EMERGENCY não resolvidos há mais de 24h.';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'scan-stale-alerts-daily') THEN
      PERFORM cron.unschedule('scan-stale-alerts-daily');
    END IF;
    PERFORM cron.schedule(
      'scan-stale-alerts-daily',
      '30 7 * * *',
      $cron$ SELECT public.scan_stale_alerts(); $cron$
    );
  END IF;
END $$;
