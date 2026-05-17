-- Criar tabela de mapeamento fornecedor-categoria
CREATE TABLE IF NOT EXISTS public.fornecedor_categorias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fornecedor_id UUID NOT NULL REFERENCES public.fornecedores(id) ON DELETE CASCADE,
    categoria_id UUID NOT NULL REFERENCES public.categorias(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
    UNIQUE(fornecedor_id, categoria_id)
);

-- Habilitar RLS
ALTER TABLE public.fornecedor_categorias ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Acesso total fornecedor_categorias" ON public.fornecedor_categorias
    FOR ALL USING (true);

-- Inserir alguns dados de exemplo baseados no que vimos
-- XBZ Brindes (e7d75e42-17c3-4c86-a72b-352f9cc7587c) atende Canetas (0a3a6b34-d62a-4524-b9da-8109c23ca04a)
INSERT INTO public.fornecedor_categorias (fornecedor_id, categoria_id)
VALUES ('e7d75e42-17c3-4c86-a72b-352f9cc7587c', '0a3a6b34-d62a-4524-b9da-8109c23ca04a')
ON CONFLICT DO NOTHING;

-- Stricker (ebd534d9-c83a-4a32-811f-fed635972d20) atende Mochilas (d10e00ef-7904-4fbe-8ac6-932917291708)
INSERT INTO public.fornecedor_categorias (fornecedor_id, categoria_id)
VALUES ('ebd534d9-c83a-4a32-811f-fed635972d20', 'd10e00ef-7904-4fbe-8ac6-932917291708')
ON CONFLICT DO NOTHING;
