-- Adiciona organization_id na tabela pedidos se não existir
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pedidos' AND column_name='organization_id') THEN
    ALTER TABLE public.pedidos ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
    -- Preenche com tenant_id para registros existentes
    UPDATE public.pedidos SET organization_id = tenant_id WHERE organization_id IS NULL;
  END IF;
END $$;

-- Adiciona organization_id na tabela solicitacoes se não existir
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='solicitacoes' AND column_name='organization_id') THEN
    ALTER TABLE public.solicitacoes ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
    -- Preenche com tenant_id para registros existentes
    UPDATE public.solicitacoes SET organization_id = tenant_id WHERE organization_id IS NULL;
  END IF;
END $$;

-- Cria índices para performance
CREATE INDEX IF NOT EXISTS idx_pedidos_organization_id ON public.pedidos(organization_id);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_organization_id ON public.solicitacoes(organization_id);
