
-- 1) webhook_events for idempotency
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processed' CHECK (status IN ('processing','processed','failed')),
  response_payload JSONB,
  error_message TEXT,
  request_headers JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_source_created ON public.webhook_events (source, created_at DESC);

GRANT SELECT ON public.webhook_events TO authenticated;
GRANT ALL ON public.webhook_events TO service_role;

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view webhook events" ON public.webhook_events;
CREATE POLICY "Admins can view webhook events" ON public.webhook_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- No INSERT/UPDATE/DELETE policies -> only service_role (bypass RLS) may write.

-- Trigger updated_at
DROP TRIGGER IF EXISTS trg_webhook_events_updated_at ON public.webhook_events;
CREATE TRIGGER trg_webhook_events_updated_at
  BEFORE UPDATE ON public.webhook_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) rate_limit_logs: add retry_after for uniform windowing
ALTER TABLE public.rate_limit_logs
  ADD COLUMN IF NOT EXISTS retry_after TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_ident_endpoint_window
  ON public.rate_limit_logs (ip_address, endpoint, window_start DESC);

-- 3) Uniform rate limit helper
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _identifier TEXT,
  _endpoint   TEXT,
  _max_requests INT DEFAULT 60,
  _window_seconds INT DEFAULT 60
)
RETURNS TABLE(allowed BOOLEAN, remaining INT, retry_after_seconds INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
  v_window_start TIMESTAMPTZ := now() - make_interval(secs => _window_seconds);
  v_oldest TIMESTAMPTZ;
BEGIN
  SELECT COUNT(*), MIN(created_at)
    INTO v_count, v_oldest
    FROM public.rate_limit_logs
    WHERE ip_address = _identifier
      AND endpoint = _endpoint
      AND created_at >= v_window_start;

  IF v_count >= _max_requests THEN
    INSERT INTO public.rate_limit_logs (ip_address, endpoint, request_count, blocked, retry_after)
    VALUES (_identifier, _endpoint, v_count, true,
            COALESCE(v_oldest, now()) + make_interval(secs => _window_seconds));
    RETURN QUERY SELECT false, 0,
      GREATEST(1, EXTRACT(EPOCH FROM (COALESCE(v_oldest, now()) + make_interval(secs => _window_seconds) - now()))::INT);
    RETURN;
  END IF;

  INSERT INTO public.rate_limit_logs (ip_address, endpoint, request_count, blocked)
  VALUES (_identifier, _endpoint, 1, false);

  RETURN QUERY SELECT true, _max_requests - v_count - 1, 0;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_rate_limit(TEXT, TEXT, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, TEXT, INT, INT) TO service_role, authenticated;
