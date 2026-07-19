-- F-052: Cron job health monitoring via heartbeat table.
-- Each cron worker records its last run result here, enabling the health
-- dashboard to detect missed runs and surface failures as system alerts.

BEGIN;

CREATE TABLE IF NOT EXISTS public.cron_heartbeats (
  job_name        TEXT PRIMARY KEY,
  last_run_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_status     TEXT NOT NULL DEFAULT 'unknown' CHECK (last_status IN ('success', 'error', 'unknown')),
  last_error      TEXT,
  run_count       BIGINT NOT NULL DEFAULT 0,
  success_count   BIGINT NOT NULL DEFAULT 0,
  error_count     BIGINT NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cron_heartbeats ENABLE ROW LEVEL SECURITY;

-- Only service_role can write; authenticated admins can read
CREATE POLICY "Service role manages cron heartbeats"
  ON public.cron_heartbeats FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read cron heartbeats"
  ON public.cron_heartbeats FOR SELECT TO authenticated USING (true);

-- Seed expected jobs so the health dashboard shows them as 'unknown' even before first run
INSERT INTO public.cron_heartbeats (job_name, last_status) VALUES
  ('alert-dispatcher',           'unknown'),
  ('check-approval-escalations', 'unknown'),
  ('check-cotacao-followup',     'unknown'),
  ('check-expiry-alerts',        'unknown'),
  ('check-sla-alerts',           'unknown'),
  ('process-outbox',             'unknown'),
  ('weekly-report',              'unknown'),
  ('weekly-summary-report',      'unknown')
ON CONFLICT (job_name) DO NOTHING;

-- Function callable by service role to upsert heartbeat
CREATE OR REPLACE FUNCTION public.upsert_cron_heartbeat(
  p_job_name    TEXT,
  p_status      TEXT,
  p_error       TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.cron_heartbeats (
    job_name, last_run_at, last_status, last_error,
    run_count, success_count, error_count, updated_at
  ) VALUES (
    p_job_name, now(), p_status, p_error,
    1,
    CASE WHEN p_status = 'success' THEN 1 ELSE 0 END,
    CASE WHEN p_status = 'error'   THEN 1 ELSE 0 END,
    now()
  )
  ON CONFLICT (job_name) DO UPDATE SET
    last_run_at   = now(),
    last_status   = p_status,
    last_error    = p_error,
    run_count     = cron_heartbeats.run_count + 1,
    success_count = cron_heartbeats.success_count + CASE WHEN p_status = 'success' THEN 1 ELSE 0 END,
    error_count   = cron_heartbeats.error_count   + CASE WHEN p_status = 'error'   THEN 1 ELSE 0 END,
    updated_at    = now();
END;
$$;

COMMENT ON TABLE public.cron_heartbeats IS
  'Health monitoring for scheduled cron edge functions. Each job upserts a row after each run.';

COMMIT;
