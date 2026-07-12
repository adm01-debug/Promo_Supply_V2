
CREATE OR REPLACE FUNCTION public.scan_replication_slots()
RETURNS TABLE (
  slot_name         text,
  slot_type         text,
  is_active         boolean,
  wal_lag_bytes     bigint,
  xmin_age          bigint,
  severity          text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_dedup_hours int := 2;
  v_rec         record;
  v_severity    text;
  v_lag         bigint;
  v_xmin_age    bigint;
  v_current_lsn pg_lsn;
BEGIN
  SELECT pg_current_wal_lsn() INTO v_current_lsn;

  FOR v_rec IN
    SELECT
      s.slot_name,
      s.slot_type,
      s.active,
      s.restart_lsn,
      s.confirmed_flush_lsn,
      s.xmin,
      s.catalog_xmin,
      s.database
    FROM pg_replication_slots s
  LOOP
    v_lag := CASE
      WHEN v_rec.restart_lsn IS NULL THEN NULL
      ELSE pg_wal_lsn_diff(v_current_lsn, v_rec.restart_lsn)::bigint
    END;

    v_xmin_age := CASE
      WHEN v_rec.xmin IS NULL AND v_rec.catalog_xmin IS NULL THEN NULL
      ELSE age(COALESCE(v_rec.xmin, v_rec.catalog_xmin))::bigint
    END;

    v_severity := CASE
      WHEN NOT v_rec.active AND COALESCE(v_lag, 0) > 10737418240 THEN 'CRITICAL'  -- >10GB
      WHEN NOT v_rec.active AND COALESCE(v_lag, 0) > 1073741824  THEN 'HIGH'      -- >1GB
      WHEN COALESCE(v_lag, 0)      > 21474836480                  THEN 'CRITICAL' -- >20GB ativo
      WHEN COALESCE(v_lag, 0)      >  5368709120                  THEN 'HIGH'     -- >5GB  ativo
      WHEN COALESCE(v_xmin_age, 0) > 500000000                    THEN 'HIGH'     -- xmin trava vacuum
      WHEN NOT v_rec.active                                       THEN 'MEDIUM'
      WHEN COALESCE(v_lag, 0)      > 1073741824                   THEN 'MEDIUM'
      ELSE NULL
    END;

    slot_name := v_rec.slot_name; slot_type := v_rec.slot_type;
    is_active := v_rec.active;    wal_lag_bytes := v_lag;
    xmin_age := v_xmin_age;       severity := v_severity;
    RETURN NEXT;

    CONTINUE WHEN v_severity IS NULL OR v_severity NOT IN ('HIGH','CRITICAL');

    IF NOT EXISTS (
      SELECT 1 FROM public.system_alerts
      WHERE alert_type = 'replication_slot'
        AND (metadata->>'slot_name') = v_rec.slot_name
        AND created_at > now() - (v_dedup_hours || ' hours')::interval
    ) THEN
      INSERT INTO public.system_alerts (alert_type, severity, title, description, metadata)
      VALUES (
        'replication_slot',
        v_severity,
        format('[%s] Replication slot %s: %s de WAL retido%s',
               v_severity, v_rec.slot_name,
               pg_size_pretty(COALESCE(v_lag, 0)),
               CASE WHEN NOT v_rec.active THEN ' (INATIVO)' ELSE '' END),
        format('Slot %s (%s, db=%s, active=%s) está retendo %s de WAL e xmin_age=%s. Slots inativos causam disco cheio e bloqueiam VACUUM/wraparound protection.',
               v_rec.slot_name, v_rec.slot_type, v_rec.database,
               v_rec.active, pg_size_pretty(COALESCE(v_lag, 0)),
               COALESCE(v_xmin_age::text, 'n/a')),
        jsonb_build_object(
          'slot_name',      v_rec.slot_name,
          'slot_type',      v_rec.slot_type,
          'database',       v_rec.database,
          'is_active',      v_rec.active,
          'wal_lag_bytes',  v_lag,
          'wal_lag_pretty', pg_size_pretty(COALESCE(v_lag, 0)),
          'xmin_age',       v_xmin_age,
          'fix_sql',
            'SELECT pg_drop_replication_slot(''' || v_rec.slot_name ||
            '''); -- ATENÇÃO: só execute se o slot é comprovadamente órfão',
          'diagnostic_sql',
            'SELECT * FROM pg_replication_slots WHERE slot_name = ''' ||
            v_rec.slot_name || ''';'
        )
      );
    END IF;
  END LOOP;

  RETURN;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.scan_replication_slots() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.scan_replication_slots() TO service_role;

COMMENT ON FUNCTION public.scan_replication_slots() IS
  'Onda 19: Scanner de replication slots (lag WAL + xmin age + inativos).';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'scan-replication-slots-30m') THEN
      PERFORM cron.unschedule('scan-replication-slots-30m');
    END IF;
    PERFORM cron.schedule(
      'scan-replication-slots-30m',
      '*/30 * * * *',
      $cron$ SELECT public.scan_replication_slots(); $cron$
    );
  END IF;
END $$;
