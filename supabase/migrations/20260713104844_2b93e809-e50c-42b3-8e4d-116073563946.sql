
-- Onda 78: Monitor de taxa de rollback de transações
CREATE OR REPLACE FUNCTION public.scan_rollback_rate()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_commit bigint;
  v_rollback bigint;
  v_pct numeric;
  v_severity text;
  v_alert_type text := 'db_rollback_rate_high';
BEGIN
  SELECT xact_commit, xact_rollback
    INTO v_commit, v_rollback
  FROM pg_stat_database
  WHERE datname = current_database();

  v_pct := ROUND(v_rollback::numeric / NULLIF(v_commit + v_rollback, 0) * 100, 3);

  -- Thresholds: <1% saudável · 1-3% MEDIUM · 3-10% HIGH · >10% CRITICAL
  IF v_pct IS NULL OR v_pct < 1 THEN
    RETURN jsonb_build_object('status','ok','rollback_pct', v_pct);
  ELSIF v_pct < 3 THEN
    v_severity := 'MEDIUM';
  ELSIF v_pct < 10 THEN
    v_severity := 'HIGH';
  ELSE
    v_severity := 'CRITICAL';
  END IF;

  -- Dedupe 1h por tipo
  IF EXISTS (
    SELECT 1 FROM public.system_alerts
    WHERE alert_type = v_alert_type
      AND resolved_at IS NULL
      AND created_at > now() - interval '1 hour'
  ) THEN
    RETURN jsonb_build_object('status','deduped','rollback_pct', v_pct);
  END IF;

  INSERT INTO public.system_alerts (alert_type, severity, message, metadata)
  VALUES (
    v_alert_type,
    v_severity,
    format('Taxa de rollback %s%% (%s rollbacks / %s commits)', v_pct, v_rollback, v_commit),
    jsonb_build_object(
      'rollback_pct', v_pct,
      'xact_commit', v_commit,
      'xact_rollback', v_rollback,
      'diagnostic_sql', 'SELECT datname, xact_commit, xact_rollback FROM pg_stat_database WHERE datname = current_database();',
      'hint', 'Rollbacks altos indicam violações de constraint, deadlocks, ou aborts intencionais na aplicação. Investigar edge functions e triggers.'
    )
  );

  RETURN jsonb_build_object('status','alerted','severity', v_severity, 'rollback_pct', v_pct);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.scan_rollback_rate() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.scan_rollback_rate() TO service_role;

-- Agendar a cada 15min
SELECT cron.schedule(
  'scan-rollback-rate-15m',
  '*/15 * * * *',
  $$ SELECT public.scan_rollback_rate(); $$
);
