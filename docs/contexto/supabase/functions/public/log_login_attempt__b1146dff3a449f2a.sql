CREATE OR REPLACE FUNCTION public.log_login_attempt(_email text, _ip_address text, _user_agent text, _success boolean, _failure_reason text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
