CREATE OR REPLACE FUNCTION public.scan_cache_hit_ratio()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  v_hits bigint; v_reads bigint; v_pct numeric; v_sev text;
  v_type text := 'db_cache_hit_low';
BEGIN
  SELECT sum(heap_blks_hit), sum(heap_blks_read)
    INTO v_hits, v_reads FROM pg_statio_user_tables;
  IF (v_hits + v_reads) < 100000 THEN
    RETURN jsonb_build_object('status','insufficient_samples');
  END IF;
  v_pct := ROUND(v_hits::numeric / NULLIF(v_hits+v_reads,0) * 100, 3);

  IF v_pct >= 99 THEN RETURN jsonb_build_object('status','ok','pct',v_pct); END IF;
  v_sev := CASE WHEN v_pct < 90 THEN 'CRITICAL' WHEN v_pct < 95 THEN 'HIGH' ELSE 'MEDIUM' END;

  IF EXISTS (SELECT 1 FROM public.system_alerts
              WHERE alert_type = v_type AND resolved_at IS NULL
                AND created_at > now() - interval '30 minutes') THEN
    RETURN jsonb_build_object('status','deduped','pct',v_pct);
  END IF;

  INSERT INTO public.system_alerts (alert_type, severity, message, metadata)
  VALUES (v_type, v_sev,
    format('Cache hit ratio em %s%%', v_pct),
    jsonb_build_object('pct', v_pct, 'hits', v_hits, 'reads', v_reads,
      'diagnostic_sql','SELECT relname, heap_blks_hit, heap_blks_read FROM pg_statio_user_tables ORDER BY heap_blks_read DESC LIMIT 20;',
      'hint','Considere aumentar shared_buffers ou revisar queries que fazem full scan.'));
  RETURN jsonb_build_object('status','alerted','severity',v_sev,'pct',v_pct);
END; $function$
