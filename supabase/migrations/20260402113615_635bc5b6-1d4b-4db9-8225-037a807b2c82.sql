-- Storage policies for 'documentos' bucket - ownership scoping
CREATE POLICY "Users can upload documents" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documentos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view own documents" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'documentos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Admins can view all documents" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'documentos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can delete own documents" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'documentos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Storage policies for 'comprovantes' bucket - ownership scoping
CREATE POLICY "Users can upload comprovantes" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'comprovantes' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view own comprovantes" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'comprovantes' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Admins can view all comprovantes" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'comprovantes' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Finance can view all comprovantes" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'comprovantes' AND public.has_role(auth.uid(), 'finance'));

CREATE POLICY "Users can delete own comprovantes" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'comprovantes' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Sanitize sensitive data in audit_logs: remove session tokens and MFA codes
-- Create a function to sanitize metadata before insert
CREATE OR REPLACE FUNCTION public.sanitize_audit_metadata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;

CREATE TRIGGER sanitize_audit_metadata_trigger
  BEFORE INSERT ON public.audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.sanitize_audit_metadata();

-- Sanitize active_sessions: don't store full session tokens
CREATE OR REPLACE FUNCTION public.sanitize_session_token()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only store first 8 chars + hash indicator for identification, not full token
  IF NEW.session_token IS NOT NULL AND length(NEW.session_token) > 12 THEN
    NEW.session_token = left(NEW.session_token, 8) || '...redacted';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sanitize_session_token_trigger
  BEFORE INSERT OR UPDATE ON public.active_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.sanitize_session_token();