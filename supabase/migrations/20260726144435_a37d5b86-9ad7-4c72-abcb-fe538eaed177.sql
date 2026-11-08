-- ============ XBZ INTEGRATION SCHEMA ============

-- 1. Credenciais por tenant (valores cifrados AES-GCM na edge function)
CREATE TABLE public.xbz_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  label TEXT,
  portal_user_enc TEXT,
  portal_password_enc TEXT,
  cnpj TEXT,
  api_token_enc TEXT,
  pessoa_id INTEGER,
  razao_social TEXT,
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  last_login_ok BOOLEAN,
  last_error TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (tenant_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.xbz_credentials TO authenticated;
GRANT ALL ON public.xbz_credentials TO service_role;
ALTER TABLE public.xbz_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "xbz_credentials_admin_manage" ON public.xbz_credentials
  FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id) AND public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.tenant_in_my_group(tenant_id) AND public.has_role(auth.uid(), 'admin'::app_role));

-- 2. Pedidos espelhados do portal (consultaPedidos - 76 campos)
CREATE TABLE public.xbz_pedidos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  pedido_numero TEXT NOT NULL,
  ordem_de_compra TEXT,
  pessoa_id INTEGER,
  pessoa_razao_social TEXT,
  data_emissao TIMESTAMPTZ,
  id_status INTEGER,
  status_logistico TEXT,
  id_lote_debito_status INTEGER,
  lote_debito_status_cliente TEXT,
  pago BOOLEAN NOT NULL DEFAULT false,
  data_pagamento TIMESTAMPTZ,
  data_status_lote_debito TIMESTAMPTZ,
  lote_debito_status1_data TIMESTAMPTZ,
  lote_debito_status2_data TIMESTAMPTZ,
  lote_debito_status3_data TIMESTAMPTZ,
  valor_produtos NUMERIC(14,2),
  valor_impostos_taxas NUMERIC(14,2),
  valor_total NUMERIC(14,2),
  quantidade INTEGER,
  produto_codigo_xbz TEXT,
  produto_nome TEXT,
  nota_fiscal TEXT,
  entrega_tipo_nome TEXT,
  transportadora_nome TEXT,
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, pedido_numero)
);

GRANT SELECT ON public.xbz_pedidos TO authenticated;
GRANT ALL ON public.xbz_pedidos TO service_role;
ALTER TABLE public.xbz_pedidos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "xbz_pedidos_group_read" ON public.xbz_pedidos
  FOR SELECT TO authenticated
  USING (public.tenant_in_my_group(tenant_id));

CREATE INDEX idx_xbz_pedidos_tenant ON public.xbz_pedidos (tenant_id);
CREATE INDEX idx_xbz_pedidos_pagamento ON public.xbz_pedidos (tenant_id, id_lote_debito_status);
CREATE INDEX idx_xbz_pedidos_emissao ON public.xbz_pedidos (tenant_id, data_emissao DESC);

-- 3. Histórico de transições de status
CREATE TABLE public.xbz_pedido_status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  pedido_numero TEXT NOT NULL,
  campo TEXT NOT NULL,
  valor_anterior TEXT,
  valor_novo TEXT,
  detectado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.xbz_pedido_status_history TO authenticated;
GRANT ALL ON public.xbz_pedido_status_history TO service_role;
ALTER TABLE public.xbz_pedido_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "xbz_status_history_group_read" ON public.xbz_pedido_status_history
  FOR SELECT TO authenticated
  USING (public.tenant_in_my_group(tenant_id));

CREATE INDEX idx_xbz_status_history_pedido ON public.xbz_pedido_status_history (tenant_id, pedido_numero, detectado_em DESC);

-- 4. Cache do catálogo (consultaEstoque)
CREATE TABLE public.xbz_produtos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  produto_id INTEGER NOT NULL,
  sku TEXT,
  codigo_composto TEXT,
  codigo_amigavel TEXT,
  nome TEXT,
  cor_id INTEGER,
  cor_nome TEXT,
  preco NUMERIC(14,4),
  preco_ipi NUMERIC(14,4),
  quantidade_disponivel INTEGER,
  disponivel TEXT,
  venda_minima INTEGER,
  multiplos INTEGER,
  imagem_url TEXT,
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, produto_id)
);

GRANT SELECT ON public.xbz_produtos TO authenticated;
GRANT ALL ON public.xbz_produtos TO service_role;
ALTER TABLE public.xbz_produtos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "xbz_produtos_group_read" ON public.xbz_produtos
  FOR SELECT TO authenticated
  USING (public.tenant_in_my_group(tenant_id));

CREATE INDEX idx_xbz_produtos_tenant ON public.xbz_produtos (tenant_id);
CREATE INDEX idx_xbz_produtos_sku ON public.xbz_produtos (tenant_id, sku);

-- 5. Cache fiscal por produto (getSt)
CREATE TABLE public.xbz_produto_fiscal (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  produto_id INTEGER NOT NULL,
  sku TEXT,
  ncm TEXT,
  preco_venda NUMERIC(14,4),
  preco_base_calculo NUMERIC(14,4),
  percentual_ipi NUMERIC(8,4),
  valor_ipi NUMERIC(14,4),
  valor_st NUMERIC(14,4),
  valor_mva NUMERIC(8,4),
  notas_calculo TEXT,
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, produto_id)
);

GRANT SELECT ON public.xbz_produto_fiscal TO authenticated;
GRANT ALL ON public.xbz_produto_fiscal TO service_role;
ALTER TABLE public.xbz_produto_fiscal ENABLE ROW LEVEL SECURITY;

CREATE POLICY "xbz_produto_fiscal_group_read" ON public.xbz_produto_fiscal
  FOR SELECT TO authenticated
  USING (public.tenant_in_my_group(tenant_id));

-- 6. Cores (referência global, sem tenant)
CREATE TABLE public.xbz_cores (
  id INTEGER NOT NULL PRIMARY KEY,
  nome TEXT NOT NULL,
  sigla TEXT,
  descricao TEXT,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.xbz_cores TO authenticated;
GRANT ALL ON public.xbz_cores TO service_role;
ALTER TABLE public.xbz_cores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "xbz_cores_read_authenticated" ON public.xbz_cores
  FOR SELECT TO authenticated USING (true);

-- 7. Auditoria de operações de escrita no carrinho
CREATE TABLE public.xbz_carrinho_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  user_id UUID,
  action TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  response_status INTEGER,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.xbz_carrinho_log TO authenticated;
GRANT ALL ON public.xbz_carrinho_log TO service_role;
ALTER TABLE public.xbz_carrinho_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "xbz_carrinho_log_group_read" ON public.xbz_carrinho_log
  FOR SELECT TO authenticated
  USING (public.tenant_in_my_group(tenant_id));

CREATE INDEX idx_xbz_carrinho_log_tenant ON public.xbz_carrinho_log (tenant_id, created_at DESC);

-- Triggers de updated_at
CREATE TRIGGER trg_xbz_credentials_updated BEFORE UPDATE ON public.xbz_credentials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_xbz_pedidos_updated BEFORE UPDATE ON public.xbz_pedidos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_xbz_produtos_updated BEFORE UPDATE ON public.xbz_produtos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_xbz_produto_fiscal_updated BEFORE UPDATE ON public.xbz_produto_fiscal
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_xbz_cores_updated BEFORE UPDATE ON public.xbz_cores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();