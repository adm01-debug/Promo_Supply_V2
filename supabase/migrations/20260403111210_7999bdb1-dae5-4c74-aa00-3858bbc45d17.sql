
CREATE TRIGGER trg_sanitize_audit_metadata
  BEFORE INSERT ON public.audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.sanitize_audit_metadata();

CREATE TRIGGER trg_sanitize_session_token
  BEFORE INSERT ON public.active_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.sanitize_session_token();
