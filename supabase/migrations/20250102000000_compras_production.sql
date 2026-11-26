-- Migration: Sistema de Compras - Tabelas de Produção
-- Substitui dados mockados por estrutura real

-- Tabela de Solicitações de Compra
CREATE TABLE IF NOT EXISTS public.solicitacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_number TEXT NOT NULL,
  empresa TEXT NOT NULL,
  produto TEXT NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1,
  quantidade_real NUMERIC(10,2),
  tipo TEXT NOT NULL CHECK (tipo IN ('PE_LISO', 'FAB_LISO', 'FAB_PERSONALIZADO')),
  status TEXT NOT NULL DEFAULT 'AGUARDANDO_COTACAO' CHECK (status IN ('AGUARDANDO_COTACAO', 'EM_COTACAO', 'FORNECEDOR_SELECIONADO', 'PEDIDO_GERADO', 'AGUARDANDO_PAGAMENTO', 'PAGO', 'EM_TRANSITO', 'ENTREGUE')),
  vendedor TEXT NOT NULL,
  prazo_entrega DATE,
  fornecedor_selecionado TEXT,
  valor_unitario NUMERIC(10,2),
  valor_total NUMERIC(10,2),
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de Cotações
CREATE TABLE IF NOT EXISTS public.cotacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitacao_id UUID NOT NULL REFERENCES public.solicitacoes(id) ON DELETE CASCADE,
  fornecedor TEXT NOT NULL,
  valor_unitario NUMERIC(10,2) NOT NULL,
  valor_total NUMERIC(10,2) NOT NULL,
  prazo_entrega DATE NOT NULL,
  condicao_pagamento TEXT NOT NULL,
  observacoes TEXT,
  selecionada BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de Fornecedores
CREATE TABLE IF NOT EXISTS public.fornecedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cnpj TEXT UNIQUE,
  email TEXT,
  telefone TEXT,
  categoria TEXT,
  avaliacao NUMERIC(2,1) DEFAULT 0,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de Histórico de Compras
CREATE TABLE IF NOT EXISTS public.historico_compras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitacao_id UUID REFERENCES public.solicitacoes(id),
  acao TEXT NOT NULL,
  descricao TEXT,
  usuario TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_solicitacoes_status ON public.solicitacoes(status);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_vendedor ON public.solicitacoes(vendedor);
CREATE INDEX IF NOT EXISTS idx_cotacoes_solicitacao ON public.cotacoes(solicitacao_id);
CREATE INDEX IF NOT EXISTS idx_fornecedores_categoria ON public.fornecedores(categoria);

-- RLS
ALTER TABLE public.solicitacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cotacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_compras ENABLE ROW LEVEL SECURITY;

-- Policies (permitir acesso autenticado)
CREATE POLICY "Allow all for authenticated" ON public.solicitacoes FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON public.cotacoes FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON public.fornecedores FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON public.historico_compras FOR ALL USING (true);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER solicitacoes_updated_at
  BEFORE UPDATE ON public.solicitacoes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
