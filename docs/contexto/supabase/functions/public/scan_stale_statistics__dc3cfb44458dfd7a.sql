CREATE OR REPLACE FUNCTION public.scan_stale_statistics(stale_days integer DEFAULT 7, min_mod_pct numeric DEFAULT 20)
 RETURNS TABLE(alert_id uuid, severity text, table_name text, reason text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  r record;
  v_severity text;
  v_reason text;
  v_alert_id uuid;
  v_reltuples bigint;
  v_mod_pct numeric;
  v_days_since numeric;
BEGIN
  FOR r IN
    SELECT
      s.relname,
      s.n_mod_since_analyze,
      s.last_analyze,
      s.last_autoanalyze,
      GREATEST(COALESCE(s.last_analyze, 'epoch'::timestamptz),
               COALESCE(s.last_autoanalyze, 'epoch'::timestamptz)) AS effective_analyze,
      c.reltuples::bigint AS reltuples
    FROM pg_stat_user_tables s
    JOIN pg_class c ON c.oid = s.relid
    WHERE s.schemaname = 'public'
  LOOP
    v_reltuples := GREATEST(r.reltuples, 0);
    v_mod_pct := CASE WHEN v_reltuples > 0
                      THEN (r.n_mod_since_analyze::numeric / v_reltuples) * 100
                      ELSE 0 END;
    v_days_since := EXTRACT(EPOCH FROM (now() - r.effective_analyze)) / 86400;

    v_reason := NULL;
    IF r.last_analyze IS NULL AND r.last_autoanalyze IS NULL AND v_reltuples > 1000 THEN
      v_reason := format('Nunca analisada (%s rows)', v_reltuples);
    ELSIF v_days_since > stale_days AND v_reltuples > 1000 THEN
      v_reason := format('Última análise há %.1f dias', v_days_since);
    ELSIF v_mod_pct > min_mod_pct AND v_reltuples > 10000 THEN
      v_reason := format('%.1f%% de linhas modificadas desde último ANALYZE', v_mod_pct);
    END IF;

    IF v_reason IS NULL THEN CONTINUE; END IF;

    -- Dedupe: pula se já existe alerta similar nas últimas 24h
    IF EXISTS (
      SELECT 1 FROM public.system_alerts
      WHERE alert_type = 'stale_statistics'
        AND metadata->>'table' = r.relname
        AND created_at > now() - interval '24 hours'
    ) THEN CONTINUE; END IF;

    IF v_reltuples > 1000000 AND v_days_since > 14 THEN
      v_severity := 'HIGH';
    ELSE
      v_severity := 'MEDIUM';
    END IF;

    INSERT INTO public.system_alerts (alert_type, severity, message, metadata)
    VALUES (
      'stale_statistics',
      v_severity,
      format('Estatísticas desatualizadas em public.%s: %s', r.relname, v_reason),
      jsonb_build_object(
        'table', r.relname,
        'reltuples', v_reltuples,
        'n_mod_since_analyze', r.n_mod_since_analyze,
        'mod_pct', round(v_mod_pct, 2),
        'days_since_analyze', round(v_days_since, 2),
        'fix_sql', format('ANALYZE public.%I;', r.relname)
      )
    )
    RETURNING id INTO v_alert_id;

    alert_id := v_alert_id;
    severity := v_severity;
    table_name := r.relname;
    reason := v_reason;
    RETURN NEXT;
  END LOOP;
END;
$function$
