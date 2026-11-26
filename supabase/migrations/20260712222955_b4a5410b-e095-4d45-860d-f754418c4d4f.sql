
ALTER TABLE public.telemetry_logs_legacy_20260712 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telemetry_logs_202605 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telemetry_logs_202606 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telemetry_logs_202607 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telemetry_logs_202608 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telemetry_logs_202609 ENABLE ROW LEVEL SECURITY;

-- Restrict legacy backup to admins/service_role only
REVOKE ALL ON public.telemetry_logs_legacy_20260712 FROM anon, authenticated;
CREATE POLICY "admins_read_legacy_telemetry"
  ON public.telemetry_logs_legacy_20260712 FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Update helper to enable RLS automatically on future partitions
CREATE OR REPLACE FUNCTION public.ensure_telemetry_logs_partition(_month date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;
