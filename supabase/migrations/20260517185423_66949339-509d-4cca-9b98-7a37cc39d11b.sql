-- Create table to link products with multiple suppliers
CREATE TABLE public.produto_fornecedores (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL,
    organization_id UUID,
    produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
    fornecedor_id UUID NOT NULL REFERENCES public.fornecedores(id) ON DELETE CASCADE,
    preco_custo NUMERIC(15, 2),
    lead_time_estimado INTEGER, -- em dias
    codigo_no_fornecedor TEXT,
    preferencial BOOLEAN DEFAULT false,
    ultima_cotacao_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(produto_id, fornecedor_id)
);

-- Enable RLS
ALTER TABLE public.produto_fornecedores ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view product suppliers within tenant"
    ON public.produto_fornecedores FOR SELECT
    USING (auth.uid() IN (SELECT id FROM profiles WHERE tenant_id = produto_fornecedores.tenant_id));

CREATE POLICY "Users can manage product suppliers within tenant"
    ON public.produto_fornecedores FOR ALL
    USING (auth.uid() IN (SELECT id FROM profiles WHERE tenant_id = produto_fornecedores.tenant_id));

-- Trigger for updated_at
CREATE TRIGGER update_produto_fornecedores_updated_at
    BEFORE UPDATE ON public.produto_fornecedores
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
