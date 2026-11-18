CREATE OR REPLACE FUNCTION public.check_rate_limit(_identifier text, _endpoint text, _max_requests integer DEFAULT 60, _window_seconds integer DEFAULT 60)
 RETURNS TABLE(allowed boolean, remaining integer, retry_after_seconds integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
