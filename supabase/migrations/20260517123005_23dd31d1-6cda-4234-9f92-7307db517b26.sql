-- Criar tipo enum para classificação de produtos
DO $$ BEGIN
    CREATE TYPE tipo_produto_enum AS ENUM ('importado', 'fabricado', 'personalizado');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Adicionar colunas na tabela de produtos
ALTER TABLE public.produtos 
ADD COLUMN IF NOT EXISTS tipo_produto tipo_produto_enum DEFAULT 'fabricado',
ADD COLUMN IF NOT EXISTS lead_time_dias INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS localizacao_coleta TEXT;

-- Adicionar colunas na tabela de itens do pedido para controle de produção/personalização
DO $$ BEGIN
    CREATE TYPE status_producao_enum AS ENUM ('pendente', 'primeira_peca', 'em_producao', 'personalizando', 'concluido');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE public.pedido_itens
ADD COLUMN IF NOT EXISTS status_producao status_producao_enum DEFAULT 'pendente',
ADD COLUMN IF NOT EXISTS data_previsao_producao TIMESTAMP WITH TIME ZONE;

-- Atualizar metadados para busca e filtros
COMMENT ON COLUMN public.produtos.tipo_produto IS 'Classificação Promobrink: importado (pronta entrega), fabricado (liso), personalizado (direto)';
COMMENT ON COLUMN public.pedido_itens.status_producao IS 'Status de acompanhamento do time de compras para produção/personalização';