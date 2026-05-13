-- Tabela de Configuração de Catálogos PunchOut
CREATE TABLE public.punchout_catalogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  fornecedor_id UUID NOT NULL REFERENCES public.fornecedores(id) ON DELETE CASCADE,
  protocol TEXT NOT NULL CHECK (protocol IN ('cxml','oci')),
  setup_url TEXT NOT NULL,
  identity TEXT NOT NULL,
  shared_secret_encrypted TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_test_at TIMESTAMPTZ,
  last_test_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de Sessões e Carrinhos PunchOut
CREATE TABLE public.punchout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  catalog_id UUID NOT NULL REFERENCES public.punchout_catalogs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  buyer_cookie TEXT NOT NULL UNIQUE, -- Identificador único enviado ao fornecedor
  return_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'opened' CHECK (status IN ('opened', 'completed', 'cancelled', 'error')),
  raw_request_xml TEXT,
  raw_response_xml TEXT,
  cart_payload JSONB,
  created_solicitacao_id UUID REFERENCES public.solicitacoes(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);

-- Índices para performance
CREATE INDEX idx_punchout_catalogs_tenant ON public.punchout_catalogs(tenant_id);
CREATE INDEX idx_punchout_sessions_cookie ON public.punchout_sessions(buyer_cookie);
CREATE INDEX idx_punchout_sessions_tenant ON public.punchout_sessions(tenant_id);

-- Habilitar RLS
ALTER TABLE public.punchout_catalogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.punchout_sessions ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
CREATE POLICY "tenant isolation punchout_catalogs"
  ON public.punchout_catalogs FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "tenant isolation punchout_sessions"
  ON public.punchout_sessions FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

-- Triggers para updated_at
CREATE TRIGGER update_punchout_catalogs_updated_at
BEFORE UPDATE ON public.punchout_catalogs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
