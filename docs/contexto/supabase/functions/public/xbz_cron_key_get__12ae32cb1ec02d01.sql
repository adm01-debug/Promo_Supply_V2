CREATE OR REPLACE FUNCTION public.xbz_cron_key_get()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'vault'
AS $function$
DECLARE
  v_key text;
BEGIN
  SELECT decrypted_secret INTO v_key
  FROM vault.decrypted_secrets
  WHERE name = 'xbz_cron_key'
  LIMIT 1;
  RETURN v_key;
END;
$function$
