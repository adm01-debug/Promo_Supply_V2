-- Gap 6 — SSO SAML/OIDC + SCIM

-- Tabela de configurações de SSO
CREATE TABLE public.sso_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  protocol TEXT NOT NULL CHECK (protocol IN ('saml', 'oidc')),
  idp_metadata_url TEXT,
  email_domains TEXT[] NOT NULL,
  scim_token_hash TEXT, -- Armazenar hash do token para validação (ex: bcrypt)
  scim_token_last4 CHAR(4),
  default_role public.app_role NOT NULL DEFAULT 'viewer',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, protocol)
);

-- Indexar por domínios de email para resolução rápida durante o login
CREATE INDEX idx_sso_email_domains ON public.sso_configurations USING GIN (email_domains);

-- Tabela de log de provisionamento SCIM
CREATE TABLE public.scim_provisioning_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  operation TEXT NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'PATCH'
  target_email TEXT,
  status TEXT NOT NULL, -- 'success', 'error'
  payload JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.sso_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scim_provisioning_log ENABLE ROW LEVEL SECURITY;

-- Políticas de isolamento por tenant
CREATE POLICY "SSO configurations isolated by tenant"
  ON public.sso_configurations FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "SCIM logs isolated by tenant"
  ON public.scim_provisioning_log FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

-- Gatilho para updated_at
CREATE TRIGGER update_sso_configurations_updated_at
BEFORE UPDATE ON public.sso_configurations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
