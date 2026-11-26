
DROP FUNCTION IF EXISTS public.scan_unused_indexes();

CREATE OR REPLACE FUNCTION public.scan_unused_indexes()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_lock_key BIGINT := hashtext('scan_unused_indexes')::bigint;
  v_rec RECORD;
  v_severity TEXT;
  v_alerts INT := 0;
  v_scanned INT := 0;
BEGIN
  IF NOT pg_try_advisory_xact_lock(v_lock_key) THEN
    RETURN jsonb_build_object('skipped', true, 'reason', 'already_running');
  END IF;

  FOR v_rec IN
    SELECT
      s.schemaname,
      s.relname AS table_name,
      s.indexrelname AS index_name,
      pg_relation_size(s.indexrelid) AS index_bytes,
      s.idx_scan
    FROM pg_stat_user_indexes s
    JOIN pg_index i ON i.indexrelid = s.indexrelid
    WHERE s.schemaname = 'public'
      AND s.idx_scan = 0
      AND NOT i.indisprimary
      AND NOT i.indisunique
      AND pg_relation_size(s.indexrelid) > 1024 * 1024
      AND COALESCE(
        (SELECT stats_reset FROM pg_stat_database WHERE datname = current_database()),
        now() - interval '30 days'
      ) < now() - interval '14 days'
  LOOP
    v_scanned := v_scanned + 1;

    IF v_rec.index_bytes >= 1024^3 THEN
      v_severity := 'critical';
    ELSIF v_rec.index_bytes >= 100 * 1024^2 THEN
      v_severity := 'high';
    ELSIF v_rec.index_bytes >= 10 * 1024^2 THEN
      v_severity := 'medium';
    ELSE
      v_severity := 'low';
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.system_alerts
      WHERE alert_type = 'unused_index'
        AND metadata->>'index' = v_rec.schemaname || '.' || v_rec.index_name
        AND created_at > now() - interval '7 days'
        AND (resolved_at IS NULL OR resolved_at > now() - interval '7 days')
    ) THEN
      CONTINUE;
    END IF;

    INSERT INTO public.system_alerts(alert_type, severity, title, message, metadata)
    VALUES (
      'unused_index',
      v_severity,
      format('Índice não utilizado: %I.%I (%s)',
        v_rec.table_name, v_rec.index_name, pg_size_pretty(v_rec.index_bytes)),
      format('Índice %I na tabela %I não recebeu scans desde o último reset de estatísticas. Ocupa %s. Avaliar remoção para liberar espaço e reduzir custo de writes.',
        v_rec.index_name, v_rec.table_name, pg_size_pretty(v_rec.index_bytes)),
      jsonb_build_object(
        'index', v_rec.schemaname || '.' || v_rec.index_name,
        'table', v_rec.schemaname || '.' || v_rec.table_name,
        'size_bytes', v_rec.index_bytes,
        'size_pretty', pg_size_pretty(v_rec.index_bytes),
        'idx_scan', v_rec.idx_scan,
        'fix_sql', format('DROP INDEX CONCURRENTLY IF EXISTS %I.%I;', v_rec.schemaname, v_rec.index_name),
        'verify_sql', format('SELECT idx_scan, pg_size_pretty(pg_relation_size(indexrelid)) FROM pg_stat_user_indexes WHERE indexrelname = %L;', v_rec.index_name),
        'warning', 'Confirmar com tráfego real antes de dropar. Índices podem servir queries raras (relatórios mensais, jobs noturnos).'
      )
    );
    v_alerts := v_alerts + 1;
  END LOOP;

  RETURN jsonb_build_object('scanned', v_scanned, 'alerts_created', v_alerts, 'ran_at', now());
END;
$$;

REVOKE ALL ON FUNCTION public.scan_unused_indexes() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.scan_unused_indexes() TO service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'scan_unused_indexes_weekly') THEN
    PERFORM cron.unschedule('scan_unused_indexes_weekly');
  END IF;
  PERFORM cron.schedule(
    'scan_unused_indexes_weekly',
    '23 4 * * 1',
    $cron$ SELECT public.scan_unused_indexes(); $cron$
  );
END $$;
