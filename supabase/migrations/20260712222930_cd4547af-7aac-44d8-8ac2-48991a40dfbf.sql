
BEGIN;

ALTER TABLE public.telemetry_logs RENAME TO telemetry_logs_legacy_20260712;
DROP TRIGGER IF EXISTS trigger_check_telemetry_alerts ON public.telemetry_logs_legacy_20260712;

-- Rename legacy indexes so we can reuse the same names on the new partitioned table
ALTER INDEX public.telemetry_logs_pkey RENAME TO telemetry_logs_legacy_pkey;
ALTER INDEX public.idx_telemetry_logs_created_at RENAME TO idx_telemetry_logs_legacy_created_at;
ALTER INDEX public.idx_telemetry_logs_level RENAME TO idx_telemetry_logs_legacy_level;
ALTER INDEX public.idx_telemetry_logs_user_id RENAME TO idx_telemetry_logs_legacy_user_id;
ALTER INDEX public.brin_telemetry_logs_created RENAME TO brin_telemetry_logs_legacy_created;

CREATE TABLE public.telemetry_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  level public.log_level NOT NULL,
  message TEXT NOT NULL,
  context JSONB,
  request_id UUID,
  user_id UUID,
  user_agent TEXT,
  url TEXT,
  client_ip TEXT,
  tenant_id UUID,
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

GRANT SELECT, INSERT ON public.telemetry_logs TO authenticated;
GRANT ALL ON public.telemetry_logs TO service_role;

ALTER TABLE public.telemetry_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view telemetry logs"
  ON public.telemetry_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role::text = 'admin'
  ));

CREATE POLICY "authenticated_insert_telemetry_logs"
  ON public.telemetry_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_telemetry_logs_created_at ON public.telemetry_logs (created_at DESC);
CREATE INDEX idx_telemetry_logs_level ON public.telemetry_logs (level);
CREATE INDEX idx_telemetry_logs_user_id ON public.telemetry_logs (user_id);
CREATE INDEX brin_telemetry_logs_created ON public.telemetry_logs USING BRIN (created_at);

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
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ensure_telemetry_logs_partition(date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_telemetry_logs_partition(date) TO service_role;

SELECT public.ensure_telemetry_logs_partition('2026-05-01');
SELECT public.ensure_telemetry_logs_partition('2026-06-01');
SELECT public.ensure_telemetry_logs_partition('2026-07-01');
SELECT public.ensure_telemetry_logs_partition('2026-08-01');
SELECT public.ensure_telemetry_logs_partition('2026-09-01');

INSERT INTO public.telemetry_logs (id, created_at, level, message, context, request_id, user_id, user_agent, url, client_ip, tenant_id)
SELECT id, created_at, level, message, context, request_id, user_id, user_agent, url, client_ip, tenant_id
FROM public.telemetry_logs_legacy_20260712;

CREATE TRIGGER trigger_check_telemetry_alerts
  AFTER INSERT ON public.telemetry_logs
  FOR EACH ROW EXECUTE FUNCTION public.check_telemetry_alerts();

SELECT cron.schedule(
  'ensure-telemetry-logs-next-partition',
  '0 4 25 * *',
  $$SELECT public.ensure_telemetry_logs_partition((date_trunc('month', now()) + interval '1 month')::date);$$
);

COMMIT;
