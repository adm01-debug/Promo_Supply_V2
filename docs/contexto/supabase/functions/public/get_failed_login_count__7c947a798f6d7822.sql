CREATE OR REPLACE FUNCTION public.get_failed_login_count(_email text, _minutes integer DEFAULT 15)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT COUNT(*)::INTEGER
    FROM public.login_attempts
    WHERE email = _email
    AND success = false
    AND created_at > now() - (_minutes || ' minutes')::INTERVAL
$function$
