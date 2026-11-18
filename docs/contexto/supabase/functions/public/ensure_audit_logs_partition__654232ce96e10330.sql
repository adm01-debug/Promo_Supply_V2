CREATE OR REPLACE FUNCTION public.ensure_audit_logs_partition(_month date)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  start_ts  timestamptz := date_trunc('month', _month);
  end_ts    timestamptz := (date_trunc('month', _month) + interval '1 month');
  part_name text        := 'audit_logs_' || to_char(start_ts, 'YYYYMM');
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = part_name
  ) THEN
    EXECUTE format(
      'CREATE TABLE public.%I PARTITION OF public.audit_logs FOR VALUES FROM (%L) TO (%L)',
      part_name, start_ts, end_ts
    );
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', part_name);
  END IF;
END;
$function$
