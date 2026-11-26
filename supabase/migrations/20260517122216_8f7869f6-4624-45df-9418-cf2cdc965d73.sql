-- Tabela de Estoque (Saldos Atuais)
CREATE TABLE IF NOT EXISTS public.estoque (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
    localizacao TEXT NOT NULL DEFAULT 'Geral', -- Ex: Almoxarifado, Depósito A, etc
    quantidade_atual NUMERIC(15,3) NOT NULL DEFAULT 0,
    estoque_minimo NUMERIC(15,3),
    estoque_maximo NUMERIC(15,3),
    ponto_pedido NUMERIC(15,3),
    ultimo_inventario TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(organization_id, produto_id, localizacao)
);

-- Habilitar RLS
ALTER TABLE public.estoque ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para estoque
CREATE POLICY "Usuários podem ver o estoque de sua organização"
    ON public.estoque FOR SELECT
    USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Usuários podem gerenciar o estoque de sua organização"
    ON public.estoque FOR ALL
    USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Tabela de Movimentações de Estoque (Histórico)
CREATE TABLE IF NOT EXISTS public.estoque_movimentacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    estoque_id UUID NOT NULL REFERENCES public.estoque(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida', 'ajuste', 'transferencia', 'reserva')),
    quantidade NUMERIC(15,3) NOT NULL,
    motivo TEXT,
    referencia_tipo TEXT, -- Ex: 'pedido_compra', 'ordem_servico'
    referencia_id UUID,
    usuario_id UUID REFERENCES auth.users(id),
    data_movimentacao TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.estoque_movimentacoes ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para movimentações
CREATE POLICY "Usuários podem ver movimentações de sua organização"
    ON public.estoque_movimentacoes FOR SELECT
    USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Usuários podem inserir movimentações de sua organização"
    ON public.estoque_movimentacoes FOR INSERT
    WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Trigger para atualizar quantidade_atual no estoque após movimentação
CREATE OR REPLACE FUNCTION public.update_estoque_saldo()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        IF (NEW.tipo IN ('entrada', 'ajuste') AND NEW.quantidade > 0) OR (NEW.tipo = 'saida' AND NEW.quantidade < 0) THEN
             UPDATE public.estoque 
             SET quantidade_atual = quantidade_atual + NEW.quantidade,
                 updated_at = now()
             WHERE id = NEW.estoque_id;
        ELSIF (NEW.tipo = 'saida' AND NEW.quantidade > 0) THEN
             UPDATE public.estoque 
             SET quantidade_atual = quantidade_atual - NEW.quantidade,
                 updated_at = now()
             WHERE id = NEW.estoque_id;
        ELSE
             UPDATE public.estoque 
             SET quantidade_atual = quantidade_atual + NEW.quantidade,
                 updated_at = now()
             WHERE id = NEW.estoque_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_estoque_saldo
AFTER INSERT ON public.estoque_movimentacoes
FOR EACH ROW EXECUTE FUNCTION public.update_estoque_saldo();

-- Trigger para updated_at na tabela estoque
CREATE TRIGGER trigger_set_estoque_timestamp
BEFORE UPDATE ON public.estoque
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_estoque_produto ON public.estoque(produto_id);
CREATE INDEX idx_estoque_org ON public.estoque(organization_id);
CREATE INDEX idx_movimentacoes_estoque ON public.estoque_movimentacoes(estoque_id);
CREATE INDEX idx_movimentacoes_org ON public.estoque_movimentacoes(organization_id);
