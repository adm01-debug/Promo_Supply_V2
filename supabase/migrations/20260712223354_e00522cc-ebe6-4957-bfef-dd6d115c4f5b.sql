
-- =========================================================
-- Onda 70 · R-08: Retenção de audit_logs (12 meses) via DETACH + ARCHIVE
-- =========================================================

-- 1) Schema de arquivamento (isolado do PostgREST/Data API)
CREATE SCHEMA IF NOT EXISTS archive;
REVOKE ALL ON SCHEMA archive FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA archive TO service_role;

-- 2) Função de arquivamento
CREATE OR REPLACE FUNCTION public.archive_audit_logs_older_than(_months int DEFAULT 12)
RETURNS TABLE(archived_partition text, moved_rows bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, archive, pg_temp
AS $$
DECLARE
  cutoff       timestamptz := date_trunc('month', now()) - make_interval(months => _months);
  r            record;
  part_ident   text;
  arch_ident   text;
  rowcount     bigint;
  total_parts  int := 0;
  started_at   timestamptz := clock_timestamp();
BEGIN
  FOR r IN
    SELECT
      c.relname                                        AS part_name,
      pg_get_expr(c.relpartbound, c.oid)               AS bound_expr
    FROM pg_inherits i
    JOIN pg_class parent ON parent.oid = i.inhparent
    JOIN pg_class c      ON c.oid      = i.inhrelid
    JOIN pg_namespace n  ON n.oid      = parent.relnamespace
    WHERE n.nspname = 'public' AND parent.relname = 'audit_logs'
  LOOP
    -- Extrai limite superior "TO ('YYYY-MM-DD ...')" e compara com cutoff
    DECLARE
      upper_bound_ts timestamptz;
      upper_txt      text;
    BEGIN
      upper_txt := substring(r.bound_expr FROM 'TO \(''([^'']+)''\)');
      IF upper_txt IS NULL THEN CONTINUE; END IF;
      upper_bound_ts := upper_txt::timestamptz;
      IF upper_bound_ts > cutoff THEN CONTINUE; END IF;
    END;

    part_ident := format('public.%I', r.part_name);
    arch_ident := format('archive.%I', r.part_name);

    -- DETACH (não bloqueia leitura no parent) e move para archive
    EXECUTE format('ALTER TABLE public.audit_logs DETACH PARTITION %s', part_ident);
    EXECUTE format('ALTER TABLE %s SET SCHEMA archive', part_ident);
    EXECUTE format('SELECT count(*) FROM %s', arch_ident) INTO rowcount;

    -- Restringe acesso no schema archive
    EXECUTE format('REVOKE ALL ON TABLE %s FROM PUBLIC, anon, authenticated', arch_ident);
    EXECUTE format('GRANT ALL ON TABLE %s TO service_role', arch_ident);

    total_parts    := total_parts + 1;
    archived_partition := r.part_name;
    moved_rows         := rowcount;
    RETURN NEXT;
  END LOOP;

  INSERT INTO public.health_scan_runs (scan_name, status, duration_ms, findings)
  VALUES (
    'archive_audit_logs',
    'ok',
    EXTRACT(EPOCH FROM clock_timestamp() - started_at) * 1000,
    jsonb_build_object('partitions_archived', total_parts, 'cutoff', cutoff)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.archive_audit_logs_older_than(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.archive_audit_logs_older_than(int) TO service_role;

-- 3) Cron mensal — dia 2 às 03:30 UTC
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'archive-audit-logs-old-partitions') THEN
    PERFORM cron.unschedule('archive-audit-logs-old-partitions');
  END IF;
END $$;

SELECT cron.schedule(
  'archive-audit-logs-old-partitions',
  '30 3 2 * *',
  $$SELECT public.archive_audit_logs_older_than(12);$$
);
