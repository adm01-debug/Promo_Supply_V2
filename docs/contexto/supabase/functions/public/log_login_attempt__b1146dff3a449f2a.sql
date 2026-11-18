CREATE OR REPLACE FUNCTION public.log_login_attempt(_email text, _ip_address text, _user_agent text, _success boolean, _failure_reason text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    _id UUID;
BEGIN
    INSERT INTO public.login_attempts (email, ip_address, user_agent, success, failure_reason)
    VALUES (_email, _ip_address, _user_agent, _success, _failure_reason)
    RETURNING id INTO _id;
    
    -- Auto-bloquear IP após 5 tentativas falhas em 15 minutos
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
$function$
