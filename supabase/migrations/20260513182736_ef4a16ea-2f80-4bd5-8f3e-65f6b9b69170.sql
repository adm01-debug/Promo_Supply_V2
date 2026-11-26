-- 1. Tabelas de Configuração de ERP
CREATE TABLE public.erp_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  erp_type TEXT NOT NULL CHECK (erp_type IN ('sap_s4','totvs_protheus','totvs_datasul','oracle_ebs','custom')),
  base_url TEXT NOT NULL,
  auth_type TEXT NOT NULL CHECK (auth_type IN ('basic','oauth2','apikey','token')),
  credentials_encrypted TEXT NOT NULL, -- Armazenado via pgcrypto ou serviço de vault
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Mapeamento de Campos (Field Mapping)
CREATE TABLE public.erp_field_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES public.erp_connections(id) ON DELETE CASCADE,
  entity TEXT NOT NULL CHECK (entity IN ('fornecedor','pedido','pagamento','nota_fiscal','solicitacao')),
  source_field TEXT NOT NULL, -- Campo no Promo Supply
  target_field TEXT NOT NULL, -- Campo no ERP (ex: EKKO-EBELN para SAP)
  transform_fn TEXT,          -- Função de transformação (ex: 'trim', 'format_cnpj')
  is_required BOOLEAN DEFAULT false,
  UNIQUE (connection_id, entity, source_field)
);

-- 3. Log de Sincronização
CREATE TABLE public.erp_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES public.erp_connections(id) ON DELETE CASCADE,
  entity TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound','outbound')),
  record_id UUID,        -- ID do registro interno
  external_id TEXT,      -- ID do registro no ERP
  status TEXT NOT NULL CHECK (status IN ('success','error','retry','pending')),
  error_message TEXT,
  request_payload JSONB,
  response_payload JSONB,
  duration_ms INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Habilitar RLS
ALTER TABLE public.erp_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_field_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_sync_log ENABLE ROW LEVEL SECURITY;

-- 5. Políticas de Segurança (Tenant Isolation)
CREATE POLICY "ERP connections are tenant-isolated"
ON public.erp_connections
FOR ALL
TO authenticated
USING (tenant_id = public.current_tenant_id())
WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "ERP field mappings are visible to tenant admins"
ON public.erp_field_mappings
FOR ALL
TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.erp_connections c 
    WHERE c.id = connection_id AND c.tenant_id = public.current_tenant_id()
));

CREATE POLICY "ERP sync logs are tenant-isolated"
ON public.erp_sync_log
FOR ALL
TO authenticated
USING (tenant_id = public.current_tenant_id())
WITH CHECK (tenant_id = public.current_tenant_id());

-- 6. Índices de Performance
CREATE INDEX idx_erp_sync_status_date ON public.erp_sync_log(connection_id, status, created_at DESC);
CREATE INDEX idx_erp_sync_external_id ON public.erp_sync_log(external_id);
CREATE INDEX idx_erp_connections_tenant ON public.erp_connections(tenant_id);

-- 7. Trigger para updated_at em erp_connections
CREATE TRIGGER update_erp_connections_updated_at
BEFORE UPDATE ON public.erp_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
