
ALTER TABLE public.alert_subscriptions
  ADD COLUMN IF NOT EXISTS slack_webhook_url text;

DROP FUNCTION IF EXISTS public.alert_subscribers_for(text, text);

CREATE FUNCTION public.alert_subscribers_for(_alert_type text, _severity text)
RETURNS TABLE(subscription_id uuid, user_id uuid, channel text, slack_webhook_url text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH sev_rank AS (
    SELECT * FROM (VALUES
      ('EMERGENCY', 6),('CRITICAL', 5),('HIGH', 4),
      ('MEDIUM', 3),('LOW', 2),('INFO', 1)
    ) AS t(sev, rank)
  ),
  target AS (SELECT rank FROM sev_rank WHERE sev = _severity)
  SELECT s.id, s.user_id, s.channel, s.slack_webhook_url
  FROM public.alert_subscriptions s
  JOIN sev_rank sr ON sr.sev = s.min_severity
  CROSS JOIN target t
  WHERE s.enabled = true
    AND (s.snoozed_until IS NULL OR s.snoozed_until < now())
    AND (s.alert_type IS NULL OR s.alert_type = _alert_type)
    AND sr.rank <= t.rank;
$function$;

REVOKE EXECUTE ON FUNCTION public.alert_subscribers_for(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.alert_subscribers_for(text, text) TO service_role;
