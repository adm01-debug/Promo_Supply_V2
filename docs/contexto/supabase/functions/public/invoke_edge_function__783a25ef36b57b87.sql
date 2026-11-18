CREATE OR REPLACE FUNCTION public._invoke_edge_function(_name text)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_req_id BIGINT;
  v_url TEXT := 'https://lmypcdfsrgfftzhxawao.supabase.co/functions/v1/' || _name;
  v_key TEXT;
BEGIN
  SELECT decrypted_secret INTO v_key
  FROM vault.decrypted_secrets
  WHERE name = 'edge_invoke_service_key'
  LIMIT 1;

  IF v_key IS NULL OR v_key = '' THEN
    RAISE WARNING 'edge_invoke_service_key ausente no Vault; edge % nao chamada', _name;
    RETURN NULL;
  END IF;

  SELECT net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key,
      'x-request-id', gen_random_uuid()::text,
      'x-cron-invocation', 'true'
    ),
    body := jsonb_build_object('cron', true, 'invoked_at', now()),
    timeout_milliseconds := 30000
  ) INTO v_req_id;
  RETURN v_req_id;
END;
$function$
