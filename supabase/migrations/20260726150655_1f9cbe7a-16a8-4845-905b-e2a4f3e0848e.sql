
-- Chave de cron para a integração XBZ, guardada no Vault do banco.
CREATE OR REPLACE FUNCTION public.xbz_cron_key_get()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'vault'
AS $$
DECLARE
  v_key text;
BEGIN
  SELECT decrypted_secret INTO v_key
  FROM vault.decrypted_secrets
  WHERE name = 'xbz_cron_key'
  LIMIT 1;
  RETURN v_key;
END;
$$;

REVOKE ALL ON FUNCTION public.xbz_cron_key_get() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.xbz_cron_key_get() TO service_role;

-- Verificação usada pela edge function (não devolve a chave, apenas booleano).
CREATE OR REPLACE FUNCTION public.verify_xbz_cron_key(_key text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'vault'
AS $$
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
$$;

REVOKE ALL ON FUNCTION public.verify_xbz_cron_key(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_xbz_cron_key(text) TO service_role;

-- Invocador dedicado: envia a chave de cron no header.
CREATE OR REPLACE FUNCTION public._invoke_xbz_sync()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_req_id BIGINT;
  v_key TEXT := public.xbz_cron_key_get();
  v_url TEXT := 'https://trwgmplubeqxrxpncdgf.supabase.co/functions/v1/xbz-sync-pedidos';
BEGIN
  IF v_key IS NULL THEN
    RAISE WARNING 'xbz_cron_key ausente no Vault; sync XBZ nao executado';
    RETURN NULL;
  END IF;

  SELECT net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-request-id', gen_random_uuid()::text,
      'x-cron-invocation', 'true',
      'x-cron-key', v_key
    ),
    body := jsonb_build_object('cron', true, 'invoked_at', now()),
    timeout_milliseconds := 60000
  ) INTO v_req_id;

  RETURN v_req_id;
END;
$$;

REVOKE ALL ON FUNCTION public._invoke_xbz_sync() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._invoke_xbz_sync() TO service_role;
