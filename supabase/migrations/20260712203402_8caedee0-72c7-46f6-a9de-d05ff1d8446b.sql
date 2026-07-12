
-- Tabela de assinaturas de alertas
CREATE TABLE public.alert_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_type text,
  min_severity text NOT NULL DEFAULT 'HIGH'
    CHECK (min_severity IN ('EMERGENCY','CRITICAL','HIGH','MEDIUM','LOW','INFO')),
  channel text NOT NULL DEFAULT 'inapp'
    CHECK (channel IN ('inapp','email','slack')),
  enabled boolean NOT NULL DEFAULT true,
  snoozed_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, alert_type, channel)
);

CREATE INDEX idx_alert_subs_user ON public.alert_subscriptions(user_id);
CREATE INDEX idx_alert_subs_type ON public.alert_subscriptions(alert_type) WHERE alert_type IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.alert_subscriptions TO authenticated;
GRANT ALL ON public.alert_subscriptions TO service_role;

ALTER TABLE public.alert_subscriptions ENABLE ROW LEVEL SECURITY;

-- Só admins podem gerenciar (a feature é do dashboard admin)
CREATE POLICY "Admins manage own alert subscriptions"
  ON public.alert_subscriptions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = user_id AND public.has_role(auth.uid(), 'admin'));

-- Trigger updated_at (usa função existente update_updated_at_column se disponível)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column' AND pronamespace = 'public'::regnamespace) THEN
    EXECUTE 'CREATE TRIGGER trg_alert_subs_updated
             BEFORE UPDATE ON public.alert_subscriptions
             FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()';
  END IF;
END $$;

-- Função helper: dado (alert_type, severity), retorna assinantes ativos e não snoozed
CREATE OR REPLACE FUNCTION public.alert_subscribers_for(
  _alert_type text,
  _severity text
)
RETURNS TABLE (
  subscription_id uuid,
  user_id uuid,
  channel text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH sev_rank AS (
    SELECT * FROM (VALUES
      ('EMERGENCY', 6),
      ('CRITICAL', 5),
      ('HIGH', 4),
      ('MEDIUM', 3),
      ('LOW', 2),
      ('INFO', 1)
    ) AS t(sev, rank)
  ),
  target AS (
    SELECT rank FROM sev_rank WHERE sev = _severity
  )
  SELECT s.id, s.user_id, s.channel
  FROM public.alert_subscriptions s
  JOIN sev_rank sr ON sr.sev = s.min_severity
  CROSS JOIN target t
  WHERE s.enabled = true
    AND (s.snoozed_until IS NULL OR s.snoozed_until < now())
    AND (s.alert_type IS NULL OR s.alert_type = _alert_type)
    AND sr.rank <= t.rank;
$$;

REVOKE EXECUTE ON FUNCTION public.alert_subscribers_for(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.alert_subscribers_for(text, text) TO service_role;
