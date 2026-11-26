-- ============================================================================
-- MIGRATION: funcoes de lockout/login normalizam o e-mail, derivam o IP do
--            request e deixam de ser executaveis por PUBLIC
-- Etapa 140 do docs/qa/04-PLANO.md (FN-06, parte 1 de 2)
--
-- Estado medido no banco de producao em 26/11/2026 (run 45885874707, oraculo
-- temporario que leu pg_proc): as tres funcoes abaixo tinham `=X/postgres` na
-- ACL, ou seja EXECUTE para PUBLIC -- e anon herda por PUBLIC, de modo que a
-- chave publica sozinha chama-las pelo PostgREST:
--
--   record_failed_login(text)                      anon=true  acl com =X
--   is_account_locked(text)                        anon=true  acl com =X
--   log_login_attempt(text,text,text,boolean,text)  anon=true  acl com =X
--
-- Tres defeitos, todos reproduziveis:
--
-- 1) `record_failed_login` e `is_account_locked` comparavam `email = _email`
--    com o texto CRU. A coluna e' normalizada pelo gatilho trg_normalize_email
--    (lower+btrim) e tem UNIQUE. Logo, errar a senha digitando o e-mail com
--    maiuscula nao incrementava nada: o SELECT nao achava a linha e o INSERT
--    estourava unique_violation. O bloqueio simplesmente nao valia para
--    e-mail com maiuscula e o usuario via "null tentativa(s) restante(s)".
-- 2) `log_login_attempt` gravava em login_attempts e decidia o auto-bloqueio de
--    IP com o `_ip_address` que o CHAMADOR mandasse. O front manda string
--    vazia hoje (Auth.tsx), entao o auto-bloqueio por IP nunca disparava; e
--    qualquer anonimo podia gravar o IP que quisesse em blocked_ips.
-- 3) EXECUTE para PUBLIC: o acesso nao era declarado, era herdado. Quem le a
--    ACL nao ve anon e supoe que esteja fechado.
--
-- Correcao: (a) normalizar o e-mail dentro das tres funcoes, do mesmo jeito que
-- a coluna -- a limpeza ja faz isso desde a etapa 057; (b) derivar o IP e o
-- user-agent dos headers do request (x-forwarded-for, depois x-real-ip) e so
-- usar o parametro como fallback; (c) trocar o PUBLIC por GRANT explicito a
-- anon, authenticated e service_role -- a tela de login precisa das tres ANTES
-- de haver sessao, entao revogar de anon quebraria o login.
--
-- O que NAO muda: o limite de 5 tentativas, o backoff exponencial de ate 30
-- minutos, o auto-bloqueio de IP em blocked_ips e a guarda de chamador de
-- clear_login_lockout (etapa 057). O bloqueio inviolavel no servidor (Auth Hook
-- do GoTrue) continua sendo a parte 2 do SEC-08.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) record_failed_login: e-mail normalizado
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_failed_login(_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := lower(btrim(coalesce(_email, '')));
  lockout_record RECORD;
  new_failed_attempts INTEGER;
  new_lockout_count INTEGER;
  lockout_duration INTEGER;
  lockout_until TIMESTAMP WITH TIME ZONE;
BEGIN
  IF v_email = '' OR position('@' in v_email) < 2 THEN
    RAISE EXCEPTION 'e-mail invalido' USING ERRCODE = '22023';
  END IF;

  -- Get or create lockout record
  SELECT * INTO lockout_record
  FROM public.account_lockouts
  WHERE email = v_email;

  IF NOT FOUND THEN
    INSERT INTO public.account_lockouts (email, failed_attempts, last_failed_attempt)
    VALUES (v_email, 1, now())
    RETURNING * INTO lockout_record;

    RETURN jsonb_build_object('locked', false, 'attempts', 1);
  END IF;

  -- Reset attempts if last failure was more than 15 minutes ago
  IF lockout_record.last_failed_attempt < now() - INTERVAL '15 minutes' THEN
    new_failed_attempts := 1;
  ELSE
    new_failed_attempts := lockout_record.failed_attempts + 1;
  END IF;

  -- Check if should lock (5 failed attempts)
  IF new_failed_attempts >= 5 THEN
    new_lockout_count := lockout_record.lockout_count + 1;
    -- Exponential backoff: 1min, 2min, 4min, 8min, 16min, max 30min
    lockout_duration := LEAST(POWER(2, new_lockout_count - 1)::INTEGER, 30);
    lockout_until := now() + (lockout_duration || ' minutes')::INTERVAL;

    UPDATE public.account_lockouts
    SET failed_attempts = 0,
        lockout_count = new_lockout_count,
        locked_until = lockout_until,
        last_failed_attempt = now(),
        updated_at = now()
    WHERE email = v_email;

    RETURN jsonb_build_object(
      'locked', true,
      'lockout_minutes', lockout_duration,
      'locked_until', lockout_until,
      'lockout_count', new_lockout_count
    );
  ELSE
    UPDATE public.account_lockouts
    SET failed_attempts = new_failed_attempts,
        last_failed_attempt = now(),
        updated_at = now()
    WHERE email = v_email;

    RETURN jsonb_build_object(
      'locked', false,
      'attempts', new_failed_attempts,
      'remaining_attempts', 5 - new_failed_attempts
    );
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2) is_account_locked: e-mail normalizado (le sem escrever; continua em anon
--    porque a tela de login consulta antes de existir sessao)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_account_locked(_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := lower(btrim(coalesce(_email, '')));
  lockout_record RECORD;
  remaining_seconds INTEGER;
BEGIN
  IF v_email = '' THEN
    RETURN jsonb_build_object('locked', false, 'remaining_seconds', 0);
  END IF;

  SELECT * INTO lockout_record
  FROM public.account_lockouts
  WHERE email = v_email;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('locked', false, 'remaining_seconds', 0);
  END IF;

  IF lockout_record.locked_until IS NOT NULL AND lockout_record.locked_until > now() THEN
    remaining_seconds := EXTRACT(EPOCH FROM (lockout_record.locked_until - now()))::INTEGER;
    RETURN jsonb_build_object(
      'locked', true,
      'remaining_seconds', remaining_seconds,
      'locked_until', lockout_record.locked_until
    );
  END IF;

  RETURN jsonb_build_object('locked', false, 'remaining_seconds', 0);
END;
$$;

-- ---------------------------------------------------------------------------
-- 3) log_login_attempt: e-mail normalizado e IP/UA vindos do request
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_login_attempt(
    _email TEXT,
    _ip_address TEXT,
    _user_agent TEXT,
    _success BOOLEAN,
    _failure_reason TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_email   TEXT := lower(btrim(coalesce(_email, '')));
    v_ip      TEXT;
    v_ua      TEXT;
    v_headers JSONB;
    _id UUID;
BEGIN
    -- Header do PostgREST: quem fala HTTP com a API nao escolhe o proprio IP.
    -- O cast e' defensivo porque current_setting pode nao existir fora do
    -- PostgREST (job, psql, teste) e jsonb invalido abortaria o login.
    BEGIN
        v_headers := nullif(current_setting('request.headers', true), '')::jsonb;
    EXCEPTION WHEN others THEN
        v_headers := NULL;
    END;

    -- x-forwarded-for pode vir como lista ("origem, proxy1, proxy2").
    v_ip := nullif(btrim(split_part(coalesce(v_headers ->> 'x-forwarded-for', ''), ',', 1)), '');
    v_ip := coalesce(v_ip, nullif(btrim(coalesce(v_headers ->> 'x-real-ip', '')), ''));
    -- Fallback: o parametro, e por ultimo a string vazia que o front ja mandava.
    v_ip := coalesce(v_ip, nullif(btrim(coalesce(_ip_address, '')), ''), '');

    v_ua := coalesce(nullif(btrim(coalesce(v_headers ->> 'user-agent', '')), ''),
                     nullif(btrim(coalesce(_user_agent, '')), ''),
                     '');

    INSERT INTO public.login_attempts (email, ip_address, user_agent, success, failure_reason)
    VALUES (v_email, v_ip, v_ua, _success, _failure_reason)
    RETURNING id INTO _id;

    -- Auto-bloquear IP após 5 tentativas falhas em 15 minutos
    IF NOT _success AND v_ip <> '' THEN
        DECLARE
            _failed_count INTEGER;
        BEGIN
            SELECT COUNT(*) INTO _failed_count
            FROM public.login_attempts
            WHERE ip_address = v_ip
            AND success = false
            AND created_at > now() - INTERVAL '15 minutes';

            IF _failed_count >= 5 AND NOT is_ip_whitelisted(v_ip) THEN
                INSERT INTO public.blocked_ips (ip_address, reason, expires_at, attempts_count)
                VALUES (v_ip, 'Auto-blocked: Too many failed login attempts', now() + INTERVAL '1 hour', _failed_count)
                ON CONFLICT (ip_address) DO UPDATE
                SET attempts_count = blocked_ips.attempts_count + 1,
                    expires_at = now() + INTERVAL '1 hour';
            END IF;
        END;
    END IF;

    RETURN _id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4) PUBLIC -> grants explicitos
--
-- anon PRECISA das tres: a tela de login consulta is_account_locked antes da
-- sessao, registra a falha com record_failed_login e registra a tentativa com
-- log_login_attempt. O ganho aqui e' de auditoria e de nao herdar acesso por
-- PUBLIC (que e' o que o Supabase concede por default a funcao nova).
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.record_failed_login(text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.record_failed_login(text) TO anon, authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.is_account_locked(text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.is_account_locked(text) TO anon, authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.log_login_attempt(text, text, text, boolean, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.log_login_attempt(text, text, text, boolean, text)
  TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Prova: a ACL deixou de ter a entrada de PUBLIC e manteve anon; e o
-- comportamento real -- e-mail com maiuscula cai na MESMA linha (era o bug do
-- unique_violation) e o IP gravado vem do header, nao do parametro.
-- As linhas criadas pela prova sao apagadas no fim.
-- ---------------------------------------------------------------------------
DO $prova$
DECLARE
  v_oid        oid;
  v_acl        text;
  v_email      text := 'prova-lockout-etapa140@exemplo.com';
  v_linhas     integer;
  v_attempts   integer;
  v_ret        jsonb;
  v_id         uuid;
  v_ip         text;
BEGIN
  FOREACH v_acl IN ARRAY ARRAY['record_failed_login(text)',
                                'is_account_locked(text)',
                                'log_login_attempt(text, text, text, boolean, text)'] LOOP
    v_oid := ('public.' || v_acl)::regprocedure;
    IF NOT has_function_privilege('anon', v_oid, 'EXECUTE') THEN
      RAISE EXCEPTION 'anon perdeu EXECUTE em % -- a tela de login quebra', v_acl;
    END IF;
    IF NOT has_function_privilege('authenticated', v_oid, 'EXECUTE') THEN
      RAISE EXCEPTION 'authenticated perdeu EXECUTE em %', v_acl;
    END IF;
    -- Entrada de PUBLIC em proacl e' a que tem grantee = 0 (oid de PUBLIC);
    -- procurar a substring '=X/' daria falso positivo em 'anon=X/...'.
    IF EXISTS (
      SELECT 1
        FROM pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
       WHERE p.oid = v_oid AND a.grantee = 0 AND a.privilege_type = 'EXECUTE'
    ) THEN
      RAISE EXCEPTION 'a ACL de % ainda concede EXECUTE a PUBLIC', v_acl;
    END IF;
  END LOOP;

  DELETE FROM public.account_lockouts WHERE email = v_email;

  -- E-mail digitado com maiuscula e espaco: tem de cair na mesma linha.
  v_ret := public.record_failed_login('  Prova-Lockout-Etapa140@Exemplo.COM ');
  IF (v_ret ->> 'attempts')::int <> 1 THEN
    RAISE EXCEPTION 'primeira falha nao contou 1 tentativa: %', v_ret;
  END IF;

  v_ret := public.record_failed_login('prova-lockout-etapa140@exemplo.com');
  IF (v_ret ->> 'attempts')::int <> 2 THEN
    RAISE EXCEPTION 'segunda falha nao incrementou o contador: %', v_ret;
  END IF;

  SELECT count(*), max(failed_attempts) INTO v_linhas, v_attempts
  FROM public.account_lockouts WHERE email = v_email;
  IF v_linhas <> 1 OR v_attempts <> 2 THEN
    RAISE EXCEPTION 'normalizacao nao juntou as tentativas: linhas=% attempts=%', v_linhas, v_attempts;
  END IF;

  IF (public.is_account_locked('Prova-Lockout-Etapa140@Exemplo.COM') ->> 'locked')::boolean THEN
    RAISE EXCEPTION 'is_account_locked marcou bloqueio com 2 tentativas';
  END IF;

  -- Header simulado (faixa de documentacao RFC 5737, nao roteavel): o IP do
  -- parametro tem de perder para o do request.
  PERFORM set_config('request.headers',
    json_build_object('x-forwarded-for', '203.0.113.10, 10.0.0.1')::text, true);
  v_id := public.log_login_attempt(v_email, '198.51.100.7', 'ua-do-parametro', false, 'prova');
  SELECT ip_address INTO v_ip FROM public.login_attempts WHERE id = v_id;
  IF v_ip IS DISTINCT FROM '203.0.113.10' THEN
    RAISE EXCEPTION 'log_login_attempt gravou IP % em vez do IP do request', v_ip;
  END IF;

  -- Sem header, o parametro continua valendo (compatibilidade com job/teste).
  PERFORM set_config('request.headers', '', true);
  v_id := public.log_login_attempt(v_email, '192.0.2.9', 'ua', false, 'prova');
  SELECT ip_address INTO v_ip FROM public.login_attempts WHERE id = v_id;
  IF v_ip IS DISTINCT FROM '192.0.2.9' THEN
    RAISE EXCEPTION 'fallback do parametro quebrou: gravou %', v_ip;
  END IF;

  DELETE FROM public.login_attempts WHERE email = v_email;
  DELETE FROM public.account_lockouts WHERE email = v_email;

  RAISE NOTICE 'etapa 140 provada: ACL sem PUBLIC, anon mantido, e-mail normalizado e IP do request';
END
$prova$;