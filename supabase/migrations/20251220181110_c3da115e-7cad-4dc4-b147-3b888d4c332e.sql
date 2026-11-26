-- =====================================================
-- TABELAS CORE DO SISTEMA DE COMPRAS
-- =====================================================

-- 1. CATEGORIAS
CREATE TABLE public.categorias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  cor TEXT DEFAULT '#6366f1',
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view categories"
ON public.categorias FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage categories"
ON public.categorias FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. PRODUTOS
CREATE TABLE public.produtos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  descricao TEXT,
  unidade TEXT NOT NULL DEFAULT 'un',
  categoria_id UUID REFERENCES public.categorias(id),
  preco_medio NUMERIC(12,2) DEFAULT 0,
  estoque_minimo INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view products"
ON public.produtos FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Buyers and above can manage products"
ON public.produtos FOR ALL
USING (auth.uid() IS NOT NULL);

-- 3. FORNECEDORES
CREATE TABLE public.fornecedores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  cnpj TEXT UNIQUE,
  email TEXT,
  telefone TEXT,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  website TEXT,
  tipo TEXT NOT NULL DEFAULT 'nacional' CHECK (tipo IN ('nacional', 'internacional', 'local')),
  segmento TEXT,
  avaliacao NUMERIC(3,2) DEFAULT 0 CHECK (avaliacao >= 0 AND avaliacao <= 5),
  prazo_medio_entrega INTEGER DEFAULT 7,
  condicoes_pagamento TEXT,
  integrado_api BOOLEAN DEFAULT false,
  api_endpoint TEXT,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'bloqueado', 'pendente')),
  observacoes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view suppliers"
ON public.fornecedores FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Buyers can manage suppliers"
ON public.fornecedores FOR ALL
USING (auth.uid() IS NOT NULL);

-- 4. SOLICITAÇÕES DE COMPRA
CREATE TABLE public.solicitacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero TEXT NOT NULL UNIQUE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT NOT NULL DEFAULT 'material' CHECK (tipo IN ('material', 'servico', 'equipamento', 'urgente', 'contrato')),
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_cotacao', 'aprovada', 'rejeitada', 'em_andamento', 'concluida', 'cancelada')),
  prioridade TEXT NOT NULL DEFAULT 'media' CHECK (prioridade IN ('baixa', 'media', 'alta', 'urgente')),
  valor_estimado NUMERIC(12,2),
  valor_aprovado NUMERIC(12,2),
  quantidade INTEGER NOT NULL DEFAULT 1,
  unidade TEXT DEFAULT 'un',
  
  -- Datas
  data_necessidade DATE,
  data_aprovacao TIMESTAMP WITH TIME ZONE,
  data_conclusao TIMESTAMP WITH TIME ZONE,
  
  -- Relacionamentos
  solicitante_id UUID REFERENCES auth.users(id),
  aprovador_id UUID REFERENCES auth.users(id),
  fornecedor_id UUID REFERENCES public.fornecedores(id),
  categoria_id UUID REFERENCES public.categorias(id),
  
  -- Departamento
  departamento TEXT,
  centro_custo TEXT,
  
  -- Metadados
  justificativa TEXT,
  observacoes TEXT,
  anexos JSONB DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.solicitacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own requests"
ON public.solicitacoes FOR SELECT
USING (auth.uid() = solicitante_id OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role));

CREATE POLICY "Users can create requests"
ON public.solicitacoes FOR INSERT
WITH CHECK (auth.uid() = solicitante_id);

CREATE POLICY "Users can update their own pending requests"
ON public.solicitacoes FOR UPDATE
USING (
  (auth.uid() = solicitante_id AND status = 'pendente') 
  OR has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'coordinator'::app_role)
);

CREATE POLICY "Only admins can delete requests"
ON public.solicitacoes FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- 5. COTAÇÕES
CREATE TABLE public.cotacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero TEXT NOT NULL UNIQUE,
  solicitacao_id UUID REFERENCES public.solicitacoes(id) ON DELETE CASCADE,
  fornecedor_id UUID REFERENCES public.fornecedores(id),
  
  -- Valores
  valor_unitario NUMERIC(12,2) NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1,
  valor_total NUMERIC(12,2) NOT NULL,
  valor_frete NUMERIC(12,2) DEFAULT 0,
  desconto_percentual NUMERIC(5,2) DEFAULT 0,
  
  -- Condições
  prazo_entrega INTEGER NOT NULL DEFAULT 7,
  validade_proposta DATE,
  condicao_pagamento TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'analisando', 'aprovada', 'rejeitada', 'expirada')),
  selecionada BOOLEAN DEFAULT false,
  
  -- Score
  score_preco NUMERIC(5,2) DEFAULT 0,
  score_prazo NUMERIC(5,2) DEFAULT 0,
  score_qualidade NUMERIC(5,2) DEFAULT 0,
  score_total NUMERIC(5,2) DEFAULT 0,
  
  -- Metadados
  observacoes TEXT,
  anexos JSONB DEFAULT '[]'::jsonb,
  
  avaliador_id UUID REFERENCES auth.users(id),
  data_avaliacao TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cotacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view quotations"
ON public.cotacoes FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Buyers can manage quotations"
ON public.cotacoes FOR ALL
USING (auth.uid() IS NOT NULL);

-- 6. PEDIDOS DE COMPRA
CREATE TABLE public.pedidos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero TEXT NOT NULL UNIQUE,
  solicitacao_id UUID REFERENCES public.solicitacoes(id),
  cotacao_id UUID REFERENCES public.cotacoes(id),
  fornecedor_id UUID REFERENCES public.fornecedores(id) NOT NULL,
  
  -- Valores
  valor_total NUMERIC(12,2) NOT NULL,
  valor_frete NUMERIC(12,2) DEFAULT 0,
  desconto NUMERIC(12,2) DEFAULT 0,
  
  -- Status e datas
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'enviado', 'em_transito', 'entregue', 'parcial', 'cancelado')),
  data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
  data_previsao DATE,
  data_entrega DATE,
  
  -- Rastreamento
  codigo_rastreamento TEXT,
  transportadora TEXT,
  
  -- Endereço entrega
  endereco_entrega TEXT,
  
  -- Condições
  condicao_pagamento TEXT,
  observacoes TEXT,
  
  -- Responsáveis
  comprador_id UUID REFERENCES auth.users(id),
  aprovador_id UUID REFERENCES auth.users(id),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view orders"
ON public.pedidos FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Buyers can manage orders"
ON public.pedidos FOR ALL
USING (auth.uid() IS NOT NULL);

-- 7. ITENS DO PEDIDO
CREATE TABLE public.pedido_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_id UUID REFERENCES public.pedidos(id) ON DELETE CASCADE,
  produto_id UUID REFERENCES public.produtos(id),
  descricao TEXT NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1,
  unidade TEXT DEFAULT 'un',
  valor_unitario NUMERIC(12,2) NOT NULL,
  valor_total NUMERIC(12,2) NOT NULL,
  quantidade_recebida INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pedido_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view order items"
ON public.pedido_itens FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Buyers can manage order items"
ON public.pedido_itens FOR ALL
USING (auth.uid() IS NOT NULL);

-- 8. PAGAMENTOS
CREATE TABLE public.pagamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero TEXT NOT NULL UNIQUE,
  pedido_id UUID REFERENCES public.pedidos(id),
  fornecedor_id UUID REFERENCES public.fornecedores(id) NOT NULL,
  
  -- Valores
  valor NUMERIC(12,2) NOT NULL,
  valor_pago NUMERIC(12,2) DEFAULT 0,
  
  -- Status e datas
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'agendado', 'pago', 'parcial', 'cancelado', 'atrasado')),
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  
  -- Forma de pagamento
  forma_pagamento TEXT CHECK (forma_pagamento IN ('boleto', 'pix', 'transferencia', 'cartao', 'cheque')),
  dados_bancarios JSONB,
  
  -- Notas fiscais
  numero_nf TEXT,
  chave_nf TEXT,
  
  -- Aprovação
  aprovador_id UUID REFERENCES auth.users(id),
  data_aprovacao TIMESTAMP WITH TIME ZONE,
  
  observacoes TEXT,
  comprovante_url TEXT,
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance can view all payments"
ON public.pagamentos FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Finance can manage payments"
ON public.pagamentos FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'finance'::app_role));

-- =====================================================
-- TRIGGERS PARA UPDATED_AT
-- =====================================================

CREATE TRIGGER update_categorias_updated_at
BEFORE UPDATE ON public.categorias
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_produtos_updated_at
BEFORE UPDATE ON public.produtos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fornecedores_updated_at
BEFORE UPDATE ON public.fornecedores
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_solicitacoes_updated_at
BEFORE UPDATE ON public.solicitacoes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cotacoes_updated_at
BEFORE UPDATE ON public.cotacoes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pedidos_updated_at
BEFORE UPDATE ON public.pedidos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pagamentos_updated_at
BEFORE UPDATE ON public.pagamentos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

CREATE INDEX idx_solicitacoes_status ON public.solicitacoes(status);
CREATE INDEX idx_solicitacoes_solicitante ON public.solicitacoes(solicitante_id);
CREATE INDEX idx_solicitacoes_data ON public.solicitacoes(created_at DESC);

CREATE INDEX idx_cotacoes_solicitacao ON public.cotacoes(solicitacao_id);
CREATE INDEX idx_cotacoes_fornecedor ON public.cotacoes(fornecedor_id);
CREATE INDEX idx_cotacoes_status ON public.cotacoes(status);

CREATE INDEX idx_pedidos_status ON public.pedidos(status);
CREATE INDEX idx_pedidos_fornecedor ON public.pedidos(fornecedor_id);
CREATE INDEX idx_pedidos_data ON public.pedidos(data_emissao DESC);

CREATE INDEX idx_pagamentos_status ON public.pagamentos(status);
CREATE INDEX idx_pagamentos_vencimento ON public.pagamentos(data_vencimento);
CREATE INDEX idx_pagamentos_fornecedor ON public.pagamentos(fornecedor_id);

CREATE INDEX idx_fornecedores_status ON public.fornecedores(status);
CREATE INDEX idx_fornecedores_tipo ON public.fornecedores(tipo);

-- =====================================================
-- FUNÇÃO PARA GERAR NÚMEROS SEQUENCIAIS
-- =====================================================

CREATE OR REPLACE FUNCTION public.generate_sequential_number(prefix TEXT, table_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num INTEGER;
  result TEXT;
BEGIN
  EXECUTE format('SELECT COALESCE(MAX(CAST(SUBSTRING(numero FROM %L) AS INTEGER)), 0) + 1 FROM public.%I', 
    prefix || '-(\d+)', table_name) INTO next_num;
  result := prefix || '-' || LPAD(next_num::TEXT, 6, '0');
  RETURN result;
END;
$$;

-- =====================================================
-- HABILITAR REALTIME
-- =====================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.solicitacoes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cotacoes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pedidos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pagamentos;