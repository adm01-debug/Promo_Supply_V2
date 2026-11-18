CREATE OR REPLACE FUNCTION public.scan_connection_saturation()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  v_max int; v_used int; v_pct numeric; v_sev text;
  v_type text := 'db_connection_saturation';
BEGIN
  SELECT setting::int INTO v_max FROM pg_settings WHERE name='max_connections';
  SELECT count(*) INTO v_used FROM pg_stat_activity WHERE datname = current_database();
  v_pct := ROUND(v_used::numeric / NULLIF(v_max,0) * 100, 2);

  IF v_pct < 70 THEN RETURN jsonb_build_object('status','ok','pct',v_pct); END IF;
  v_sev := CASE WHEN v_pct >= 95 THEN 'CRITICAL' WHEN v_pct >= 85 THEN 'HIGH' ELSE 'MEDIUM' END;

  IF EXISTS (SELECT 1 FROM public.system_alerts
              WHERE alert_type = v_type AND resolved_at IS NULL
                AND created_at > now() - interval '30 minutes') THEN
    RETURN jsonb_build_object('status','deduped','pct',v_pct);
  END IF;

  INSERT INTO public.system_alerts (alert_type, severity, message, metadata)
  VALUES (v_type, v_sev,
    format('Conexões em %s%% (%s/%s)', v_pct, v_used, v_max),
    jsonb_build_object('pct', v_pct, 'used', v_used, 'max', v_max,
      'diagnostic_sql','SELECT pid, usename, state, query_start, query FROM pg_stat_activity WHERE datname=current_database() ORDER BY query_start;',
      'hint','Verifique pool exhaustion, leaks em edge functions ou sessões idle-in-transaction.'));
  RETURN jsonb_build_object('status','alerted','severity',v_sev,'pct',v_pct);
END; $function$
