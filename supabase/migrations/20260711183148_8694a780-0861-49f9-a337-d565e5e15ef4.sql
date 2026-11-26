CREATE OR REPLACE FUNCTION public.cleanup_old_webhook_events()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE deleted integer;
BEGIN
  DELETE FROM public.webhook_events
   WHERE received_at < now() - INTERVAL '90 days';
  GET DIAGNOSTICS deleted = ROW_COUNT;
  RETURN deleted;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_webhook_events() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_old_webhook_events() TO service_role;

CREATE OR REPLACE FUNCTION public.cleanup_old_integration_outbox()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE deleted integer := 0; tmp integer;
BEGIN
  DELETE FROM public.integration_outbox
   WHERE status = 'delivered' AND delivered_at < now() - INTERVAL '30 days';
  GET DIAGNOSTICS tmp = ROW_COUNT; deleted := deleted + tmp;
  DELETE FROM public.integration_outbox
   WHERE status = 'dead' AND created_at < now() - INTERVAL '180 days';
  GET DIAGNOSTICS tmp = ROW_COUNT; deleted := deleted + tmp;
  RETURN deleted;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_integration_outbox() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_old_integration_outbox() TO service_role;

CREATE OR REPLACE FUNCTION public.alert_on_outbox_dead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'dead' AND (OLD.status IS DISTINCT FROM 'dead') THEN
    INSERT INTO public.system_alerts (alert_type, severity, message, metadata)
    VALUES (
      'outbox_dead_letter',
      'HIGH',
      format('Integration outbox message %s failed permanently after %s retries (target=%s)',
             NEW.id, NEW.retries, NEW.target),
      jsonb_build_object(
        'outbox_id', NEW.id,
        'target', NEW.target,
        'endpoint', NEW.endpoint,
        'retries', NEW.retries,
        'last_error', NEW.last_error
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_alert_on_outbox_dead ON public.integration_outbox;
CREATE TRIGGER trg_alert_on_outbox_dead
AFTER UPDATE ON public.integration_outbox
FOR EACH ROW EXECUTE FUNCTION public.alert_on_outbox_dead();

DO $$ BEGIN PERFORM cron.unschedule('cleanup-webhook-events-daily'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM cron.unschedule('cleanup-integration-outbox-daily'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule('cleanup-webhook-events-daily', '15 3 * * *', $$SELECT public.cleanup_old_webhook_events();$$);
SELECT cron.schedule('cleanup-integration-outbox-daily', '30 3 * * *', $$SELECT public.cleanup_old_integration_outbox();$$);