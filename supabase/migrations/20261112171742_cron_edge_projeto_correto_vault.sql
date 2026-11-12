-- Chamadas de edge feitas pelo banco (pg_cron + pg_net) apontavam para outro projeto
-- Supabase (trwgmplubeqxrxpncdgf), com credencial literal no SQL. Esta migration:
--   * recria _invoke_edge_function e _invoke_xbz_sync com a URL do projeto oficial
--     (lmypcdfsrgfftzhxawao) e credenciais lidas do Vault por nome;
--   * cria _invoke_spot_sync e recria os jobs spot-api-sync-* sem chave literal;
--   * fail-closed: segredo ausente no Vault => RAISE WARNING e nenhuma chamada HTTP;
--   * EXECUTE dessas funções internas só para postgres/service_role.
--
-- Segredos esperados no Vault (vault.create_secret(<valor>, <nome>)):
--   edge_invoke_service_key : chave service_role deste projeto (passa no verify_jwt do
--                             gateway; process-outbox também exige que seja igual ao
--                             CRON_SECRET da edge, se esse estiver definido)
--   xbz_cron_key            : chave validada por verify_xbz_cron_key na xbz-sync-pedidos
--   spot_cron_key           : mesmo valor do secret SPOT_CRON_KEY da edge spot-api

-- 1) process-outbox (job outbox-worker-1min)
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
$function$;

-- 2) xbz-sync-pedidos (job xbz-sync-pedidos-30min)
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
$function$;

-- 3) spot-api (jobs spot-api-sync-*)
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
$function$;

REVOKE ALL ON FUNCTION public._invoke_edge_function(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._invoke_xbz_sync() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._invoke_spot_sync(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._invoke_edge_function(text) TO service_role;
GRANT EXECUTE ON FUNCTION public._invoke_xbz_sync() TO service_role;
GRANT EXECUTE ON FUNCTION public._invoke_spot_sync(text) TO service_role;

-- 4) Jobs Spot: mesmo nome e horário, sem URL/chave literal no comando.
DO $do$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('spot-api-sync-catalog',       '10 3 * * *',   'syncCatalog'),
      ('spot-api-sync-customization', '40 3 * * 1',   'syncCustomization'),
      ('spot-api-sync-stock',         '*/15 * * * *', 'syncStock')
    ) AS t(jobname, schedule, action)
  LOOP
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = r.jobname) THEN
      PERFORM cron.unschedule(r.jobname);
    END IF;
    PERFORM cron.schedule(
      r.jobname,
      r.schedule,
      format('SELECT public._invoke_spot_sync(%L);', r.action)
    );
  END LOOP;
END;
$do$;
