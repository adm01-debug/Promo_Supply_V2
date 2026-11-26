-- Certificar que o tipo app_role existe (fallback se não existir)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'coordinator', 'buyer', 'finance', 'viewer');
    END IF;
END $$;

-- Tabela principal de Tenants (se não existir)
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  cnpj TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de Membership (se não existir)
CREATE TABLE IF NOT EXISTS public.user_tenants (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'viewer',
  is_default BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, tenant_id)
);

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON public.tenants(slug);
CREATE INDEX IF NOT EXISTS idx_user_tenants_user ON public.user_tenants(user_id);

-- Garante apenas um default por usuário
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_tenants_one_default
  ON public.user_tenants(user_id) WHERE is_default = true;

-- Função para resolver tenant atual (Enterprise standard)
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS UUID
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_tenant UUID;
BEGIN
  -- 1. Tenta pegar de claim custom no JWT (futuro SSO)
  v_tenant := nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id', '')::uuid;
  IF v_tenant IS NOT NULL THEN
    RETURN v_tenant;
  END IF;
  
  -- 2. Fallback: tenant default do usuário
  SELECT tenant_id INTO v_tenant
  FROM public.user_tenants
  WHERE user_id = auth.uid() AND is_default = true
  LIMIT 1;
  
  RETURN v_tenant;
END;
$$;

-- Função auxiliar para checar pertencimento
CREATE OR REPLACE FUNCTION public.user_belongs_to_tenant(_user_id UUID, _tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_tenants
    WHERE user_id = _user_id AND tenant_id = _tenant_id
  );
$$;

-- Habilitar RLS
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tenants ENABLE ROW LEVEL SECURITY;

-- Políticas
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "tenants visible to members" ON public.tenants;
    CREATE POLICY "tenants visible to members"
      ON public.tenants FOR SELECT TO authenticated
      USING (public.user_belongs_to_tenant(auth.uid(), id));

    DROP POLICY IF EXISTS "user_tenants own rows" ON public.user_tenants;
    CREATE POLICY "user_tenants own rows"
      ON public.user_tenants FOR SELECT TO authenticated
      USING (user_id = auth.uid());
END $$;

-- Trigger para updated_at (padrão do projeto)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_tenants_updated_at ON public.tenants;
CREATE TRIGGER tr_tenants_updated_at
BEFORE UPDATE ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
