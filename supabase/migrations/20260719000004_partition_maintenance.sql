-- F-033: Partition maintenance for time-partitioned tables.
-- Creates a function that:
--   1. Provisions monthly partitions N months ahead (so inserts never fail)
--   2. Detaches + drops partitions older than a configurable retention period
-- Call via pg_cron or Edge Function cron. Safe to run multiple times (idempotent).

BEGIN;

CREATE OR REPLACE FUNCTION public.maintain_monthly_partitions(
  p_parent_table  TEXT,             -- e.g. 'audit_logs' or 'telemetry_logs'
  p_ahead_months  INT  DEFAULT 3,   -- provision this many future months
  p_retain_months INT  DEFAULT 24   -- keep this many months; drop older ones
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start         DATE;
  v_end           DATE;
  v_part_name     TEXT;
  v_cutoff        DATE;
  v_partition     RECORD;
  v_created       INT := 0;
  v_dropped       INT := 0;
  v_result        JSONB;
BEGIN
  -- ── 1. Create future partitions ──────────────────────────────────────────
  FOR i IN 0..p_ahead_months - 1 LOOP
    v_start := date_trunc('month', now() + (i || ' months')::INTERVAL)::DATE;
    v_end   := (v_start + INTERVAL '1 month')::DATE;
    v_part_name := p_parent_table || '_' || to_char(v_start, 'YYYY_MM');

    IF NOT EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = v_part_name
    ) THEN
      EXECUTE format(
        'CREATE TABLE IF NOT EXISTS public.%I PARTITION OF public.%I FOR VALUES FROM (%L) TO (%L)',
        v_part_name, p_parent_table, v_start::TEXT, v_end::TEXT
      );
      -- Enable RLS on the new partition (inherits policies, but must be explicitly enabled)
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_part_name);
      v_created := v_created + 1;
    END IF;
  END LOOP;

  -- ── 2. Drop partitions older than retention window ────────────────────────
  v_cutoff := date_trunc('month', now() - (p_retain_months || ' months')::INTERVAL)::DATE;

  FOR v_partition IN
    SELECT c.relname AS part_name,
           pg_get_expr(c.relpartbound, c.oid) AS part_bound
    FROM   pg_class c
    JOIN   pg_namespace n ON n.oid = c.relnamespace
    JOIN   pg_inherits i  ON i.inhrelid = c.oid
    JOIN   pg_class pp    ON pp.oid = i.inhparent
    JOIN   pg_namespace pn ON pn.oid = pp.relnamespace
    WHERE  pn.nspname = 'public' AND pp.relname = p_parent_table
      AND  n.nspname  = 'public'
      AND  c.relkind  = 'r'
  LOOP
    -- Parse the start date from the partition bound expression
    DECLARE
      v_bound_start DATE;
    BEGIN
      SELECT (regexp_match(v_partition.part_bound, 'FROM \(''([^'']+)''\)'))[1]::DATE
      INTO v_bound_start;

      IF v_bound_start IS NOT NULL AND v_bound_start < v_cutoff THEN
        -- Log before dropping
        RAISE LOG 'partition_maintenance: dropping %.% (bound_start=%, cutoff=%)',
          p_parent_table, v_partition.part_name, v_bound_start, v_cutoff;
        EXECUTE format('DROP TABLE IF EXISTS public.%I', v_partition.part_name);
        v_dropped := v_dropped + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Skip unparseable bounds (non-date partitions, etc.)
      NULL;
    END;
  END LOOP;

  v_result := jsonb_build_object(
    'table',   p_parent_table,
    'created', v_created,
    'dropped', v_dropped,
    'cutoff',  v_cutoff::TEXT,
    'run_at',  now()::TEXT
  );

  -- Insert a maintenance audit row in system_alerts if anything was dropped
  IF v_dropped > 0 THEN
    INSERT INTO public.system_alerts (severity, source, message, metadata)
    VALUES (
      'LOW',
      'partition_maintenance',
      format('Dropped %s old partition(s) from %I (older than %s months)', v_dropped, p_parent_table, p_retain_months),
      v_result
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.maintain_monthly_partitions IS
  'F-033: Idempotent monthly partition management. Creates future partitions and drops partitions older than the retention window. Call via pg_cron or Edge Function cron.';

-- ── Immediate bootstrap: provision partitions for the next 3 months ─────────
-- Run only for tables that actually exist and are partitioned.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'audit_logs' AND relkind = 'p') THEN
    PERFORM public.maintain_monthly_partitions('audit_logs', 3, 24);
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'telemetry_logs' AND relkind = 'p') THEN
    PERFORM public.maintain_monthly_partitions('telemetry_logs', 3, 12);
  END IF;
END $$;

COMMIT;
