CREATE OR REPLACE FUNCTION public.scan_security_definer_drift()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_added int := 0;
  v_removed int := 0;
  v_added_list text[];
  v_removed_list text[];
  v_started timestamptz := clock_timestamp();
BEGIN
  -- Novas funções SECURITY DEFINER não aprovadas
  WITH current_sd AS (
    SELECT n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  ),
  added AS (
    SELECT sig FROM current_sd
    WHERE sig NOT IN (SELECT function_signature FROM public.security_definer_baseline)
  )
  SELECT count(*), array_agg(sig) INTO v_added, v_added_list FROM added;

  -- Funções removidas do schema mas ainda no baseline
  WITH current_sd AS (
    SELECT n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  ),
  removed AS (
    SELECT function_signature AS sig FROM public.security_definer_baseline
    WHERE function_signature NOT IN (SELECT sig FROM current_sd)
  )
  SELECT count(*), array_agg(sig) INTO v_removed, v_removed_list FROM removed;

  -- Alerta se houver drift
  IF v_added > 0 OR v_removed > 0 THEN
    INSERT INTO public.system_alerts (
      alert_type, severity, title, message, metadata
    ) VALUES (
      'security_definer_drift',
      CASE WHEN v_added > 0 THEN 'high' ELSE 'medium' END,
      'Drift detectado no inventário SECURITY DEFINER',
      format('Adições: %s | Remoções: %s. Revisão trimestral obrigatória.', v_added, v_removed),
      jsonb_build_object(
        'added', COALESCE(v_added_list, '{}'::text[]),
        'removed', COALESCE(v_removed_list, '{}'::text[])
      )
    );
  END IF;

  INSERT INTO public.health_scan_runs(scan_name, status, duration_ms, details)
  VALUES (
    'security_definer_drift',
    'success',
    EXTRACT(MILLISECONDS FROM clock_timestamp() - v_started)::int,
    jsonb_build_object('added', v_added, 'removed', v_removed)
  );

  RETURN jsonb_build_object('added', v_added, 'removed', v_removed);
END;
$function$
