CREATE OR REPLACE FUNCTION public.is_account_locked(_email text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  lockout_record RECORD;
  remaining_seconds INTEGER;
BEGIN
  SELECT * INTO lockout_record
  FROM public.account_lockouts
  WHERE email = _email;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('locked', false, 'remaining_seconds', 0);
  END IF;
  
  IF lockout_record.locked_until IS NOT NULL AND lockout_record.locked_until > now() THEN
    remaining_seconds := EXTRACT(EPOCH FROM (lockout_record.locked_until - now()))::INTEGER;
    RETURN jsonb_build_object(
      'locked', true, 
      'remaining_seconds', remaining_seconds,
      'locked_until', lockout_record.locked_until
    );
  END IF;
  
  RETURN jsonb_build_object('locked', false, 'remaining_seconds', 0);
END;
$function$
