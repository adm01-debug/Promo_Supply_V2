
CREATE OR REPLACE FUNCTION public.resolve_alert(_alert_id uuid, _note text DEFAULT NULL)
RETURNS public.system_alerts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.system_alerts;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'auth required';
  END IF;

  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin role required';
  END IF;

  UPDATE public.system_alerts
     SET resolved_at = now(),
         resolved_by = auth.uid(),
         metadata = COALESCE(metadata, '{}'::jsonb)
                    || jsonb_build_object(
                         'resolution_note', _note,
                         'resolved_by_email',
                           (SELECT email FROM auth.users WHERE id = auth.uid())
                       )
   WHERE id = _alert_id
     AND resolved_at IS NULL
  RETURNING * INTO _row;

  IF _row.id IS NULL THEN
    RAISE EXCEPTION 'alert not found or already resolved';
  END IF;

  INSERT INTO public.audit_logs (
    action, entity_type, entity_id, user_id, tenant_id, metadata
  ) VALUES (
    'alert_resolved', 'system_alert', _alert_id, auth.uid(), _row.tenant_id,
    jsonb_build_object('note', _note, 'alert_type', _row.alert_type, 'severity', _row.severity)
  );

  RETURN _row;
EXCEPTION
  WHEN undefined_table THEN
    RETURN _row;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_alert(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_alert(uuid, text) TO authenticated;
