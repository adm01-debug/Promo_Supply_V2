CREATE OR REPLACE FUNCTION public.clear_login_lockout(_email text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.account_lockouts
  SET failed_attempts = 0,
      locked_until = NULL,
      updated_at = now()
  WHERE email = _email;
END;
$function$
