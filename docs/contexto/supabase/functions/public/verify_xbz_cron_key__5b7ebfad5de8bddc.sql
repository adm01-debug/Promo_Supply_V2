CREATE OR REPLACE FUNCTION public.verify_xbz_cron_key(_key text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'vault'
AS $function$
DECLARE
  v_key text;
BEGIN
  IF _key IS NULL OR length(_key) < 16 THEN
    RETURN false;
  END IF;
  SELECT decrypted_secret INTO v_key
  FROM vault.decrypted_secrets
  WHERE name = 'xbz_cron_key'
  LIMIT 1;
  IF v_key IS NULL THEN
    RETURN false;
  END IF;
  -- comparação de digest evita vazamento por tamanho/prefixo
  RETURN extensions.digest(v_key, 'sha256') = extensions.digest(_key, 'sha256');
END;
$function$
