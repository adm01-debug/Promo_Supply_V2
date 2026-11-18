CREATE OR REPLACE FUNCTION public.sanitize_session_token()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only store first 8 chars + hash indicator for identification, not full token
  IF NEW.session_token IS NOT NULL AND length(NEW.session_token) > 12 THEN
    NEW.session_token = left(NEW.session_token, 8) || '...redacted';
  END IF;
  RETURN NEW;
END;
$function$
