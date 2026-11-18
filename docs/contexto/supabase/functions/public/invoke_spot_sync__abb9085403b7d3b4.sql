CREATE OR REPLACE FUNCTION public._invoke_spot_sync(_action text)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_req_id BIGINT;
  v_key TEXT;
  v_auth TEXT;
  v_headers JSONB;
  v_url TEXT := 'https://lmypcdfsrgfftzhxawao.supabase.co/functions/v1/spot-api';
BEGIN
  SELECT decrypted_secret INTO v_key
  FROM vault.decrypted_secrets WHERE name = 'spot_cron_key' LIMIT 1;

  IF v_key IS NULL OR v_key = '' THEN
    RAISE WARNING 'spot_cron_key ausente no Vault; spot-api % nao chamada', _action;
    RETURN NULL;
  END IF;

  SELECT decrypted_secret INTO v_auth
  FROM vault.decrypted_secrets WHERE name = 'edge_invoke_service_key' LIMIT 1;

  v_headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'x-request-id', gen_random_uuid()::text,
    'x-spot-cron-key', v_key
  );
  IF v_auth IS NOT NULL AND v_auth <> '' THEN
    v_headers := v_headers || jsonb_build_object('Authorization', 'Bearer ' || v_auth);
  END IF;

  SELECT net.http_post(
    url := v_url,
    headers := v_headers,
    body := jsonb_build_object('action', _action),
    timeout_milliseconds := 60000
  ) INTO v_req_id;

  RETURN v_req_id;
END;
$function$
