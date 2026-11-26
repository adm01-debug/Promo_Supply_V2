-- ============================================================================
-- ROLLBACK da migration 20261128201000_lockout_rpc_publica.sql (etapa 140)
--
-- Devolve o corpo ORIGINAL das tres funcoes -- e-mail comparado sem normalizar
-- e IP vindo do parametro -- para o caso de a mudanca causar regressao em
-- producao.
--
-- O que este rollback NAO faz de proposito: reconceder EXECUTE a PUBLIC. O
-- efeito pratico de reverter para PUBLIC e' identico (anon continua com
-- EXECUTE explicito), e reconceder a PUBLIC reabriria o acesso herdado que a
-- migration fechou. Os grants explicitos a anon/authenticated/service_role
-- ficam como estao.
--
-- Ordem: este rollback pode rodar a qualquer momento; nenhuma edge function
-- chama essas RPCs diretamente (so o front pela API REST).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.record_failed_login(_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lockout_record RECORD;
  new_failed_attempts INTEGER;
  new_lockout_count INTEGER;
  lockout_duration INTEGER;
  lockout_until TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT * INTO lockout_record
  FROM public.account_lockouts
  WHERE email = _email;

  IF NOT FOUND THEN
    INSERT INTO public.account_lockouts (email, failed_attempts, last_failed_attempt)
    VALUES (_email, 1, now())
    RETURNING * INTO lockout_record;

    RETURN jsonb_build_object('locked', false, 'attempts', 1);
  END IF;

  IF lockout_record.last_failed_attempt < now() - INTERVAL '15 minutes' THEN
    new_failed_attempts := 1;
  ELSE
    new_failed_attempts := lockout_record.failed_attempts + 1;
  END IF;

  IF new_failed_attempts >= 5 THEN
    new_lockout_count := lockout_record.lockout_count + 1;
    lockout_duration := LEAST(POWER(2, new_lockout_count - 1)::INTEGER, 30);
    lockout_until := now() + (lockout_duration || ' minutes')::INTERVAL;

    UPDATE public.account_lockouts
    SET failed_attempts = 0,
        lockout_count = new_lockout_count,
        locked_until = lockout_until,
        last_failed_attempt = now(),
        updated_at = now()
    WHERE email = _email;

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
    WHERE email = _email;

    RETURN jsonb_build_object(
      'locked', false,
      'attempts', new_failed_attempts,
      'remaining_attempts', 5 - new_failed_attempts
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_account_locked(_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lockout_record RECORD;
  remaining_seconds INTEGER;
BEGIN
  SELECT * INTO lockout_record
  FROM public.account_lockouts
  WHERE email = _email;

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
    _id UUID;
BEGIN
    INSERT INTO public.login_attempts (email, ip_address, user_agent, success, failure_reason)
    VALUES (_email, _ip_address, _user_agent, _success, _failure_reason)
    RETURNING id INTO _id;

    IF NOT _success THEN
        DECLARE
            _failed_count INTEGER;
        BEGIN
            SELECT COUNT(*) INTO _failed_count
            FROM public.login_attempts
            WHERE ip_address = _ip_address
            AND success = false
            AND created_at > now() - INTERVAL '15 minutes';

            IF _failed_count >= 5 AND NOT is_ip_whitelisted(_ip_address) THEN
                INSERT INTO public.blocked_ips (ip_address, reason, expires_at, attempts_count)
                VALUES (_ip_address, 'Auto-blocked: Too many failed login attempts', now() + INTERVAL '1 hour', _failed_count)
                ON CONFLICT (ip_address) DO UPDATE
                SET attempts_count = blocked_ips.attempts_count + 1,
                    expires_at = now() + INTERVAL '1 hour';
            END IF;
        END;
    END IF;

    RETURN _id;
END;
$$;