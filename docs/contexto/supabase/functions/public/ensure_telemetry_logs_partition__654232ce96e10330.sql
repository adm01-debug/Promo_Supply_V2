CREATE OR REPLACE FUNCTION public.ensure_telemetry_logs_partition(_month date)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  start_date date := date_trunc('month', _month)::date;
  end_date   date := (date_trunc('month', _month) + interval '1 month')::date;
  part_name  text := format('telemetry_logs_%s', to_char(start_date, 'YYYYMM'));
BEGIN
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS public.%I PARTITION OF public.telemetry_logs FOR VALUES FROM (%L) TO (%L);',
    part_name, start_date, end_date
  );
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', part_name);
END;
$function$
