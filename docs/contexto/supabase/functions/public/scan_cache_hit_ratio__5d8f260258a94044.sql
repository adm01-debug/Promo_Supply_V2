CREATE OR REPLACE FUNCTION public.scan_cache_hit_ratio(min_ratio numeric DEFAULT 0.95, min_reads bigint DEFAULT 10000)
 RETURNS TABLE(alert_id uuid, severity text, table_name text, heap_ratio numeric, idx_ratio numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  r record;
  v_severity text;
  v_alert_id uuid;
  v_heap_ratio numeric;
  v_idx_ratio numeric;
  v_min_ratio numeric;
BEGIN
  FOR r IN
    SELECT
      relname,
      heap_blks_read,
      heap_blks_hit,
      COALESCE(idx_blks_read, 0) AS idx_blks_read,
      COALESCE(idx_blks_hit, 0)  AS idx_blks_hit
    FROM pg_statio_user_tables
    WHERE schemaname = 'public'
      AND (heap_blks_read + heap_blks_hit) >= min_reads
  LOOP
    v_heap_ratio := CASE WHEN (r.heap_blks_read + r.heap_blks_hit) > 0
                         THEN r.heap_blks_hit::numeric / (r.heap_blks_read + r.heap_blks_hit)
                         ELSE 1 END;
    v_idx_ratio := CASE WHEN (r.idx_blks_read + r.idx_blks_hit) > 0
                        THEN r.idx_blks_hit::numeric / (r.idx_blks_read + r.idx_blks_hit)
                        ELSE 1 END;
    v_min_ratio := LEAST(v_heap_ratio, v_idx_ratio);

    IF v_min_ratio >= min_ratio THEN CONTINUE; END IF;

    IF EXISTS (
      SELECT 1 FROM public.system_alerts
      WHERE alert_type = 'low_cache_hit_ratio'
        AND metadata->>'table' = r.relname
        AND created_at > now() - interval '24 hours'
    ) THEN CONTINUE; END IF;

    IF v_min_ratio < 0.90 THEN v_severity := 'HIGH'; ELSE v_severity := 'MEDIUM'; END IF;

    INSERT INTO public.system_alerts (alert_type, severity, message, metadata)
    VALUES (
      'low_cache_hit_ratio',
      v_severity,
      format('Cache hit ratio baixo em public.%s (heap=%.3f, idx=%.3f)',
             r.relname, v_heap_ratio, v_idx_ratio),
      jsonb_build_object(
        'table', r.relname,
        'heap_hit_ratio', round(v_heap_ratio, 4),
        'idx_hit_ratio', round(v_idx_ratio, 4),
        'heap_blks_read', r.heap_blks_read,
        'heap_blks_hit', r.heap_blks_hit,
        'idx_blks_read', r.idx_blks_read,
        'idx_blks_hit', r.idx_blks_hit,
        'suggestion', 'Considere aumentar shared_buffers (compute) ou revisar índices oversized/redundantes'
      )
    )
    RETURNING id INTO v_alert_id;

    alert_id := v_alert_id;
    severity := v_severity;
    table_name := r.relname;
    heap_ratio := round(v_heap_ratio, 4);
    idx_ratio := round(v_idx_ratio, 4);
    RETURN NEXT;
  END LOOP;
END;
$function$
