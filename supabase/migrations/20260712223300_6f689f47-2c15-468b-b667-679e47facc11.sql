
-- =========================================================
-- Onda 69 · R-04: Particionar public.audit_logs por mês
-- =========================================================

-- 1) Backup íntegro (tabela vazia hoje, mas preservamos por segurança)
CREATE TABLE IF NOT EXISTS public.audit_logs_legacy_20260712
  (LIKE public.audit_logs INCLUDING ALL);
INSERT INTO public.audit_logs_legacy_20260712
SELECT * FROM public.audit_logs;

ALTER TABLE public.audit_logs_legacy_20260712 ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.audit_logs_legacy_20260712 TO authenticated;
GRANT ALL   ON public.audit_logs_legacy_20260712 TO service_role;

DROP POLICY IF EXISTS "audit_logs_legacy_admin_read" ON public.audit_logs_legacy_20260712;
CREATE POLICY "audit_logs_legacy_admin_read"
  ON public.audit_logs_legacy_20260712
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 2) Drop policies + tabela original (vazia)
DROP POLICY IF EXISTS "Admins can view all audit logs"         ON public.audit_logs;
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "authenticated_insert_audit_logs"        ON public.audit_logs;
DROP POLICY IF EXISTS "tenant_isolation_audit_logs"            ON public.audit_logs;

DROP TABLE public.audit_logs CASCADE;

-- 3) Recria como PARTICIONADA por RANGE(created_at)
CREATE TABLE public.audit_logs (
  id                  uuid                     NOT NULL DEFAULT gen_random_uuid(),
  user_id             uuid                     REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email          text,
  user_name           text,
  action_type         public.audit_action_type NOT NULL,
  entity_type         public.audit_entity_type NOT NULL,
  entity_id           text,
  entity_description  text,
  old_values          jsonb,
  new_values          jsonb,
  metadata            jsonb DEFAULT '{}'::jsonb,
  ip_address          text,
  user_agent          text,
  created_at          timestamptz              NOT NULL DEFAULT now(),
  organization_id     uuid REFERENCES public.organizations(id),
  tenant_id           uuid                     NOT NULL REFERENCES public.tenants(id),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- 4) GRANTs
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL            ON public.audit_logs TO service_role;

-- 5) RLS + policies (mesmas regras do original consolidado)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_audit_logs"
  ON public.audit_logs
  FOR ALL TO authenticated
  USING (tenant_in_my_group(tenant_id))
  WITH CHECK (tenant_in_my_group(tenant_id));

CREATE POLICY "Admins can view all audit logs"
  ON public.audit_logs
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "authenticated_insert_audit_logs"
  ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (tenant_in_my_group(tenant_id) AND auth.uid() IS NOT NULL);

-- 6) Índices no parent (propagados para as partições)
CREATE INDEX idx_audit_logs_created_at     ON public.audit_logs (created_at DESC);
CREATE INDEX idx_audit_logs_user_id        ON public.audit_logs (user_id);
CREATE INDEX idx_audit_logs_tenant         ON public.audit_logs (tenant_id);
CREATE INDEX idx_audit_logs_action_type    ON public.audit_logs (action_type);
CREATE INDEX idx_audit_logs_entity_type    ON public.audit_logs (entity_type);
CREATE INDEX idx_audit_logs_entity_id      ON public.audit_logs (entity_id);
CREATE INDEX idx_audit_logs_entity_type_id ON public.audit_logs (entity_type, entity_id);
CREATE INDEX idx_audit_logs_org_created    ON public.audit_logs (organization_id, created_at DESC);

-- 7) Função para criar partições futuras
CREATE OR REPLACE FUNCTION public.ensure_audit_logs_partition(_month date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  start_ts  timestamptz := date_trunc('month', _month);
  end_ts    timestamptz := (date_trunc('month', _month) + interval '1 month');
  part_name text        := 'audit_logs_' || to_char(start_ts, 'YYYYMM');
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = part_name
  ) THEN
    EXECUTE format(
      'CREATE TABLE public.%I PARTITION OF public.audit_logs FOR VALUES FROM (%L) TO (%L)',
      part_name, start_ts, end_ts
    );
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', part_name);
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_audit_logs_partition(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_audit_logs_partition(date) TO service_role;

-- 8) Cria partições mai/2026 → set/2026
SELECT public.ensure_audit_logs_partition(d::date)
FROM generate_series(
  date_trunc('month', now()::date - interval '2 months'),
  date_trunc('month', now()::date + interval '2 months'),
  interval '1 month'
) d;

-- 9) Cron mensal (dia 25, 04:00 UTC) — garante próxima partição
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ensure-audit-logs-next-partition') THEN
    PERFORM cron.unschedule('ensure-audit-logs-next-partition');
  END IF;
END $$;

SELECT cron.schedule(
  'ensure-audit-logs-next-partition',
  '0 4 25 * *',
  $$SELECT public.ensure_audit_logs_partition((date_trunc('month', now()) + interval '1 month')::date);$$
);
