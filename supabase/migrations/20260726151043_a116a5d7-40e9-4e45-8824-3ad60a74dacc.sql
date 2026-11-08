
CREATE OR REPLACE FUNCTION public.xbz_sync_watchdog()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'cron'
AS $$
DECLARE
  v_last_success timestamptz;
  v_last_failure timestamptz;
  v_open_alert uuid;
  v_stale boolean;
BEGIN
  SELECT max(d.end_time) INTO v_last_success
  FROM cron.job_run_details d
  JOIN cron.job j ON j.jobid = d.jobid
  WHERE j.jobname = 'xbz-sync-pedidos-30min'
    AND d.status = 'succeeded';

  SELECT max(d.end_time) INTO v_last_failure
  FROM cron.job_run_details d
  JOIN cron.job j ON j.jobid = d.jobid
  WHERE j.jobname = 'xbz-sync-pedidos-30min'
    AND d.status <> 'succeeded';

  v_stale := v_last_success IS NULL OR v_last_success < now() - interval '2 hours';

  SELECT id INTO v_open_alert
  FROM public.system_alerts
  WHERE alert_type = 'xbz_sync_stalled'
    AND resolved_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_stale THEN
    IF v_open_alert IS NULL THEN
      INSERT INTO public.system_alerts (alert_type, severity, title, message, metadata)
      VALUES (
        'xbz_sync_stalled',
        'high',
        'Sincronização XBZ parada',
        'A rotina automática de sincronização de pedidos XBZ não conclui com sucesso há mais de 2 horas.',
        jsonb_build_object(
          'job', 'xbz-sync-pedidos-30min',
          'last_success', v_last_success,
          'last_failure', v_last_failure,
          'checked_at', now()
        )
      );
    END IF;
  ELSIF v_open_alert IS NOT NULL THEN
    UPDATE public.system_alerts
    SET resolved_at = now(),
        metadata = coalesce(metadata, '{}'::jsonb)
          || jsonb_build_object('auto_resolved_at', now(), 'last_success', v_last_success)
    WHERE id = v_open_alert;
  END IF;

  RETURN jsonb_build_object(
    'stale', v_stale,
    'last_success', v_last_success,
    'last_failure', v_last_failure
  );
END;
$$;

REVOKE ALL ON FUNCTION public.xbz_sync_watchdog() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.xbz_sync_watchdog() TO service_role;
