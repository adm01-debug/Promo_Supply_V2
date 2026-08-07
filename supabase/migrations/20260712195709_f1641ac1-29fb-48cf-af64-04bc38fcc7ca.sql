
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
      s.alert_type AS a_type,
      s.severity   AS a_sev,
      count(*)     AS cnt,
      ROUND(EXTRACT(EPOCH FROM (now() - min(s.created_at))) / 3600, 1) AS oldest_h
    FROM public.system_alerts s
    WHERE s.resolved_at IS NULL
      AND s.severity IN ('HIGH','CRITICAL','EMERGENCY')
      AND s.created_at < now() - interval '24 hours'
      AND s.alert_type <> 'stale_alerts'
    GROUP BY s.alert_type, s.severity
  LOOP
    alert_type   := v_rec.a_type;
    severity     := v_rec.a_sev;
    stale_count  := v_rec.cnt;
    oldest_hours := v_rec.oldest_h;
    RETURN NEXT;

    IF NOT EXISTS (
      SELECT 1 FROM public.system_alerts sa
      WHERE sa.alert_type = 'stale_alerts'
        AND (sa.metadata->>'source_alert_type') = v_rec.a_type
        AND (sa.metadata->>'source_severity')   = v_rec.a_sev
        AND sa.created_at > now() - (v_dedup_hours || ' hours')::interval
    ) THEN
      INSERT INTO public.system_alerts (alert_type, severity, title, description, metadata)
      VALUES (
        'stale_alerts',
        'HIGH',
        format('[HIGH] %s alerta(s) %s/%s aberto(s) há >24h', v_rec.cnt, v_rec.a_type, v_rec.a_sev),
        format('Há %s alertas do tipo %s (%s) sem resolução, o mais antigo com %s horas.',
               v_rec.cnt, v_rec.a_type, v_rec.a_sev, v_rec.oldest_h),
        jsonb_build_object(
          'source_alert_type', v_rec.a_type,
          'source_severity',   v_rec.a_sev,
          'stale_count',       v_rec.cnt,
          'oldest_hours',      v_rec.oldest_h
        )
      );
    END IF;
  END LOOP;

  RETURN;
END;
$$;
