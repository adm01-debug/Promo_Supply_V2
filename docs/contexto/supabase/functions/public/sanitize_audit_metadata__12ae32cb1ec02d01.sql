CREATE OR REPLACE FUNCTION public.sanitize_audit_metadata()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Remove sensitive fields from metadata
  IF NEW.metadata IS NOT NULL THEN
    NEW.metadata = NEW.metadata - 'session_token' - 'mfa_code' - 'backup_codes' - 'password' - 'secret' - 'token' - 'api_key';
  END IF;
  IF NEW.old_values IS NOT NULL THEN
    NEW.old_values = NEW.old_values - 'session_token' - 'mfa_code' - 'backup_codes' - 'password' - 'secret' - 'token' - 'api_key';
  END IF;
  IF NEW.new_values IS NOT NULL THEN
    NEW.new_values = NEW.new_values - 'session_token' - 'mfa_code' - 'backup_codes' - 'password' - 'secret' - 'token' - 'api_key';
  END IF;
  RETURN NEW;
END;
$function$
