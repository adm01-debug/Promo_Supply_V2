-- ============================================================
-- OBS-01: colunas de dispatch em system_alerts
-- ============================================================
ALTER TABLE public.system_alerts
  ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dispatch_status TEXT,
  ADD COLUMN IF NOT EXISTS dispatch_error TEXT;

CREATE INDEX IF NOT EXISTS idx_system_alerts_pending_dispatch
  ON public.system_alerts (severity, dispatched_at)
  WHERE dispatched_at IS NULL AND severity IN ('HIGH', 'CRITICAL');

-- ============================================================
-- INT-06: integration_outbox (padrão outbox transacional)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.integration_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  target TEXT NOT NULL,               -- 'bitrix' | 'inter' | 'whatsapp' | 'erp' | ...
  endpoint TEXT NOT NULL,             -- URL destino
  payload JSONB NOT NULL,
  headers JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','retrying','delivered','dead')),
  retries INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  last_error TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.integration_outbox TO authenticated;
GRANT ALL ON public.integration_outbox TO service_role;

ALTER TABLE public.integration_outbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY "outbox_admin_read"
  ON public.integration_outbox FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "outbox_authenticated_enqueue"
  ON public.integration_outbox FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "outbox_service_role_all"
  ON public.integration_outbox FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_outbox_worker
  ON public.integration_outbox (status, next_attempt_at)
  WHERE status IN ('pending','retrying');

CREATE INDEX IF NOT EXISTS idx_outbox_tenant
  ON public.integration_outbox (tenant_id, created_at DESC);

CREATE TRIGGER trg_outbox_updated_at
  BEFORE UPDATE ON public.integration_outbox
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- M-03: rotinas de retenção para logs (pragmatic — full partitioning é backlog)
-- ============================================================
CREATE OR REPLACE FUNCTION public.cleanup_old_security_logs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM public.security_logs
     WHERE created_at < NOW() - INTERVAL '180 days'
       AND severity NOT IN ('critical','high')
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_deleted FROM deleted;
  RETURN v_deleted;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cleanup_old_security_logs() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_old_security_logs() TO service_role;

CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  -- Retém 365 dias; audit crítico é backup separado (retenção legal 5 anos).
  WITH deleted AS (
    DELETE FROM public.audit_logs
     WHERE created_at < NOW() - INTERVAL '365 days'
       AND action_type NOT IN ('delete','role_change','permission_grant','permission_revoke')
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_deleted FROM deleted;
  RETURN v_deleted;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cleanup_old_audit_logs() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_old_audit_logs() TO service_role;