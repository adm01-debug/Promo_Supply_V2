CREATE OR REPLACE FUNCTION public.scan_sequence_exhaustion(_threshold_pct numeric DEFAULT 0.75)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
  r RECORD;
  v_alert_type text;
  v_exists boolean;
  v_count integer := 0;
  v_last bigint;
  v_max bigint;
  v_used numeric;
  v_severity text;
BEGIN
  FOR r IN
    SELECT s.schemaname, s.sequencename, s.data_type, s.max_value,
           format('%I.%I', s.schemaname, s.sequencename) AS fqn
      FROM pg_sequences s
     WHERE s.schemaname = 'public'
  LOOP
    BEGIN
      EXECUTE format('SELECT last_value FROM %s', r.fqn) INTO v_last;
    EXCEPTION WHEN OTHERS THEN
      CONTINUE;
    END;

    v_max := r.max_value;
    IF v_max IS NULL OR v_max <= 0 THEN CONTINUE; END IF;

    v_used := v_last::numeric / v_max::numeric;
    IF v_used < _threshold_pct THEN CONTINUE; END IF;

    v_severity := CASE WHEN v_used >= 0.90 THEN 'HIGH' ELSE 'MEDIUM' END;
    v_alert_type := 'sequence_exhaustion.' || r.sequencename;

    SELECT EXISTS(
      SELECT 1 FROM public.system_alerts
       WHERE alert_type = v_alert_type
         AND created_at > now() - interval '24 hours'
    ) INTO v_exists;

    IF NOT v_exists THEN
      INSERT INTO public.system_alerts (alert_type, severity, message, metadata)
      VALUES (
        v_alert_type,
        v_severity,
        format('Sequence %s.%s em %.1f%% (%s / %s, tipo %s)',
               r.schemaname, r.sequencename, v_used * 100,
               v_last, v_max, r.data_type),
        jsonb_build_object(
          'schema', r.schemaname,
          'sequence', r.sequencename,
          'data_type', r.data_type,
          'last_value', v_last,
          'max_value', v_max,
          'used_pct', v_used,
          'suggested_action',
            CASE
              WHEN r.data_type = 'integer' THEN format('ALTER SEQUENCE %s AS bigint;', r.fqn)
              ELSE format('-- revisar consumo/rotinas que gravam em %s', r.fqn)
            END
        )
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;
  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.scan_sequence_exhaustion(numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.scan_sequence_exhaustion(numeric) TO service_role;