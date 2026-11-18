CREATE OR REPLACE FUNCTION public.log_security_event(_user_id uuid, _event_type text, _event_description text, _ip_address text DEFAULT NULL::text, _user_agent text DEFAULT NULL::text, _metadata jsonb DEFAULT '{}'::jsonb, _severity text DEFAULT 'info'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    _id UUID;
BEGIN
    INSERT INTO public.security_logs (user_id, event_type, event_description, ip_address, user_agent, metadata, severity)
    VALUES (_user_id, _event_type, _event_description, _ip_address, _user_agent, _metadata, _severity)
    RETURNING id INTO _id;
    
    RETURN _id;
END;
$function$
