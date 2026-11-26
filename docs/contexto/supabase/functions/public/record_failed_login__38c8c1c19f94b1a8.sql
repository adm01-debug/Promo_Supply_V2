CREATE OR REPLACE FUNCTION public.record_failed_login(_email text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_email text := lower(btrim(coalesce(_email, '')));
  lockout_record RECORD;
  new_failed_attempts INTEGER;
  new_lockout_count INTEGER;
  lockout_duration INTEGER;
  lockout_until TIMESTAMP WITH TIME ZONE;
BEGIN
  IF v_email = '' OR position('@' in v_email) < 2 THEN
    RAISE EXCEPTION 'e-mail invalido' USING ERRCODE = '22023';
  END IF;

  -- Get or create lockout record
  SELECT * INTO lockout_record
  FROM public.account_lockouts
  WHERE email = v_email;

  IF NOT FOUND THEN
    INSERT INTO public.account_lockouts (email, failed_attempts, last_failed_attempt)
    VALUES (v_email, 1, now())
    RETURNING * INTO lockout_record;

    RETURN jsonb_build_object('locked', false, 'attempts', 1);
  END IF;

  -- Reset attempts if last failure was more than 15 minutes ago
  IF lockout_record.last_failed_attempt < now() - INTERVAL '15 minutes' THEN
    new_failed_attempts := 1;
  ELSE
    new_failed_attempts := lockout_record.failed_attempts + 1;
  END IF;

  -- Check if should lock (5 failed attempts)
  IF new_failed_attempts >= 5 THEN
    new_lockout_count := lockout_record.lockout_count + 1;
    -- Exponential backoff: 1min, 2min, 4min, 8min, 16min, max 30min
    lockout_duration := LEAST(POWER(2, new_lockout_count - 1)::INTEGER, 30);
    lockout_until := now() + (lockout_duration || ' minutes')::INTERVAL;

    UPDATE public.account_lockouts
    SET failed_attempts = 0,
        lockout_count = new_lockout_count,
        locked_until = lockout_until,
        last_failed_attempt = now(),
        updated_at = now()
    WHERE email = v_email;

    RETURN jsonb_build_object(
      'locked', true,
      'lockout_minutes', lockout_duration,
      'locked_until', lockout_until,
      'lockout_count', new_lockout_count
    );
  ELSE
    UPDATE public.account_lockouts
    SET failed_attempts = new_failed_attempts,
        last_failed_attempt = now(),
        updated_at = now()
    WHERE email = v_email;

    RETURN jsonb_build_object(
      'locked', false,
      'attempts', new_failed_attempts,
      'remaining_attempts', 5 - new_failed_attempts
    );
  END IF;
END;
$function$
