
-- Tabela principal de devoluções (RMA)
CREATE TABLE public.devolucoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero TEXT NOT NULL,
  pedido_id UUID REFERENCES public.pedidos(id) ON DELETE SET NULL,
  fornecedor_id UUID REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  solicitante_id UUID,
  status TEXT NOT NULL DEFAULT 'rascunho',
  tipo TEXT NOT NULL DEFAULT 'devolucao',
  motivo TEXT NOT NULL DEFAULT 'defeito',
  motivo_detalhe TEXT,
  valor_total NUMERIC NOT NULL DEFAULT 0,
  data_solicitacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  data_aprovacao TIMESTAMP WITH TIME ZONE,
  data_envio TIMESTAMP WITH TIME ZONE,
  data_recebimento_fornecedor TIMESTAMP WITH TIME ZONE,
  aprovador_id UUID,
  codigo_rastreamento TEXT,
  transportadora TEXT,
  nf_devolucao TEXT,
  resolucao TEXT DEFAULT 'credito',
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Itens da devolução
CREATE TABLE public.devolucao_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  devolucao_id UUID NOT NULL REFERENCES public.devolucoes(id) ON DELETE CASCADE,
  pedido_item_id UUID REFERENCES public.pedido_itens(id) ON DELETE SET NULL,
  descricao TEXT NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1,
  quantidade_aceita INTEGER,
  valor_unitario NUMERIC NOT NULL DEFAULT 0,
  valor_total NUMERIC NOT NULL DEFAULT 0,
  motivo TEXT NOT NULL DEFAULT 'defeito',
  estado_item TEXT DEFAULT 'pendente',
  fotos JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Créditos de fornecedor
CREATE TABLE public.creditos_fornecedor (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fornecedor_id UUID NOT NULL REFERENCES public.fornecedores(id) ON DELETE CASCADE,
  devolucao_id UUID REFERENCES public.devolucoes(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL DEFAULT 'credito_devolucao',
  valor NUMERIC NOT NULL DEFAULT 0,
  valor_utilizado NUMERIC NOT NULL DEFAULT 0,
  saldo NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ativo',
  descricao TEXT,
  data_emissao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  data_validade TIMESTAMP WITH TIME ZONE,
  utilizado_em_pagamento_id UUID REFERENCES public.pagamentos(id) ON DELETE SET NULL,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_devolucoes_pedido ON public.devolucoes(pedido_id);
CREATE INDEX idx_devolucoes_fornecedor ON public.devolucoes(fornecedor_id);
CREATE INDEX idx_devolucoes_status ON public.devolucoes(status);
CREATE INDEX idx_devolucao_itens_devolucao ON public.devolucao_itens(devolucao_id);
CREATE INDEX idx_creditos_fornecedor ON public.creditos_fornecedor(fornecedor_id);
CREATE INDEX idx_creditos_status ON public.creditos_fornecedor(status);

-- RLS
ALTER TABLE public.devolucoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devolucao_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creditos_fornecedor ENABLE ROW LEVEL SECURITY;

-- Policies devolucoes
CREATE POLICY "Buyers coordinators admins can manage returns"
  ON public.devolucoes FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role));

CREATE POLICY "Finance can view returns"
  ON public.devolucoes FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'finance'::app_role));

-- Policies devolucao_itens
CREATE POLICY "Buyers coordinators admins can manage return items"
  ON public.devolucao_itens FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role));

CREATE POLICY "Finance can view return items"
  ON public.devolucao_itens FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'finance'::app_role));

-- Policies creditos_fornecedor
CREATE POLICY "Admin coordinator finance can manage credits"
  ON public.creditos_fornecedor FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'finance'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'finance'::app_role));

CREATE POLICY "Buyers can view credits"
  ON public.creditos_fornecedor FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'buyer'::app_role));

-- Trigger updated_at
CREATE TRIGGER set_devolucoes_updated_at BEFORE UPDATE ON public.devolucoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_creditos_updated_at BEFORE UPDATE ON public.creditos_fornecedor
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.devolucoes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.creditos_fornecedor;
