
ALTER TABLE public.alert_subscriptions
  ADD COLUMN IF NOT EXISTS webhook_url text,
  ADD COLUMN IF NOT EXISTS webhook_secret text;

DROP FUNCTION IF EXISTS public.alert_subscribers_for(text, text);

CREATE FUNCTION public.alert_subscribers_for(_alert_type text, _severity text)
RETURNS TABLE(
  subscription_id uuid,
  user_id uuid,
  channel text,
  slack_webhook_url text,
  email text,
  webhook_url text,
  webhook_secret text
)
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
  SELECT
    s.id,
    s.user_id,
    s.channel,
    s.slack_webhook_url,
    COALESCE(s.email, u.email::text) AS email,
    s.webhook_url,
    s.webhook_secret
  FROM public.alert_subscriptions s
  JOIN sev_rank sr ON sr.sev = s.min_severity
  CROSS JOIN target t
  LEFT JOIN auth.users u ON u.id = s.user_id
  WHERE s.enabled = true
    AND (s.snoozed_until IS NULL OR s.snoozed_until < now())
    AND (s.alert_type IS NULL OR s.alert_type = _alert_type)
    AND sr.rank <= t.rank;
$function$;

REVOKE EXECUTE ON FUNCTION public.alert_subscribers_for(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.alert_subscribers_for(text, text) TO service_role;
