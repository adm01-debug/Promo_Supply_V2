CREATE OR REPLACE FUNCTION public._invoke_xbz_sync()
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
  v_url TEXT := 'https://lmypcdfsrgfftzhxawao.supabase.co/functions/v1/xbz-sync-pedidos';
BEGIN
  SELECT decrypted_secret INTO v_key
  FROM vault.decrypted_secrets WHERE name = 'xbz_cron_key' LIMIT 1;

  IF v_key IS NULL OR v_key = '' THEN
    RAISE WARNING 'xbz_cron_key ausente no Vault; sync XBZ nao executado';
    RETURN NULL;
  END IF;

  SELECT decrypted_secret INTO v_auth
  FROM vault.decrypted_secrets WHERE name = 'edge_invoke_service_key' LIMIT 1;

  v_headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'x-request-id', gen_random_uuid()::text,
    'x-cron-invocation', 'true',
    'x-cron-key', v_key
  );
  -- Gateway com verify_jwt exige um JWT do projeto; a edge autentica pelo x-cron-key.
  IF v_auth IS NOT NULL AND v_auth <> '' THEN
    v_headers := v_headers || jsonb_build_object('Authorization', 'Bearer ' || v_auth);
  END IF;

  SELECT net.http_post(
    url := v_url,
    headers := v_headers,
    body := jsonb_build_object('cron', true, 'invoked_at', now()),
    timeout_milliseconds := 60000
  ) INTO v_req_id;

  RETURN v_req_id;
END;
$function$
