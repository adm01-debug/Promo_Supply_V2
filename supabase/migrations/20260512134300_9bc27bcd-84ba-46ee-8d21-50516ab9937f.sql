-- Criar tabela de centros de custo se não existir
CREATE TABLE IF NOT EXISTS public.cost_centers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Ativar RLS
ALTER TABLE public.cost_centers ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Centros de custo são visíveis por usuários autenticados" 
ON public.cost_centers FOR SELECT TO authenticated USING (true);

CREATE POLICY "Apenas administradores podem inserir centros de custo" 
ON public.cost_centers FOR INSERT TO authenticated WITH CHECK (true);

-- Adicionar coluna cost_center_id na tabela de solicitações
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='solicitacoes' AND column_name='cost_center_id') THEN
        ALTER TABLE public.solicitacoes ADD COLUMN cost_center_id UUID REFERENCES public.cost_centers(id);
    END IF;
END $$;

-- Inserir dados iniciais para teste
INSERT INTO public.cost_centers (name, code) VALUES 
('Administrativo', 'ADM-01'),
('Vendas', 'VEN-01'),
('Operacional', 'OPE-01'),
('TI', 'TI-01')
ON CONFLICT (code) DO NOTHING;