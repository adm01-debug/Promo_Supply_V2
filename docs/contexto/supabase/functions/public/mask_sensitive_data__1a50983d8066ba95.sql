CREATE OR REPLACE FUNCTION public.mask_sensitive_data(data jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  sensitive_keys TEXT[] := ARRAY['password', 'token', 'secret', 'key', 'cvv', 'card_number', 'mfa_code', 'session_id'];
  key TEXT;
BEGIN
  IF data IS NULL THEN
    RETURN NULL;
  END IF;

  FOR key IN SELECT * FROM unnest(sensitive_keys)
  LOOP
    IF data ? key THEN
      data := data || jsonb_build_object(key, '********');
    END IF;
  END LOOP;
  
  RETURN data;
END;
$function$
