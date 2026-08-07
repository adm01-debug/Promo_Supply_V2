-- 1. Criar o tenant legacy se não existir
INSERT INTO public.tenants (id, slug, name, status)
VALUES ('00000000-0000-0000-0000-000000000000', 'legacy', 'Legacy Organization', 'active')
ON CONFLICT (slug) DO UPDATE SET name = 'Legacy Organization';

-- 2. Garantir que todos os usuários existentes pertençam ao tenant legacy
INSERT INTO public.user_tenants (user_id, tenant_id, role, is_default)
SELECT id, '00000000-0000-0000-0000-000000000000', 'admin', true
FROM auth.users
ON CONFLICT (user_id, tenant_id) DO NOTHING;

-- 3. Lista de tabelas de domínio que precisam de tenant_id
-- (Ajustado com base no conhecimento do esquema)
DO $$ 
DECLARE
    t text;
    tables_to_update text[] := ARRAY[
        'solicitacoes', 'pedidos', 'pedido_itens', 'cotacoes', 'pagamentos', 
        'fornecedores', 'categorias', 'contratos', 'contracts', 'cost_centers', 
        'fiscal_documents', 'notifications', 'audit_logs', 'active_sessions'
    ];
BEGIN
    FOREACH t IN ARRAY tables_to_update LOOP
        -- Verificar se a tabela existe
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
            -- Adicionar coluna tenant_id se não existir
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t AND column_name = 'tenant_id') THEN
                EXECUTE format('ALTER TABLE public.%I ADD COLUMN tenant_id UUID REFERENCES public.tenants(id)', t);
            END IF;

            -- Preencher com tenant legacy se estiver nulo
            EXECUTE format('UPDATE public.%I SET tenant_id = ''00000000-0000-0000-0000-000000000000'' WHERE tenant_id IS NULL', t);

            -- Tornar obrigatório
            EXECUTE format('ALTER TABLE public.%I ALTER COLUMN tenant_id SET NOT NULL', t);
            
            -- Criar índice para performance de filtro
            EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(tenant_id)', 'idx_' || t || '_tenant', t);
            
            -- Aplicar RLS Isolation (Garante que só vê dados do tenant atual)
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'tenant_isolation_' || t, t);
            EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (tenant_id = public.current_tenant_id()) WITH CHECK (tenant_id = public.current_tenant_id())', 'tenant_isolation_' || t, t);
        END IF;
    END LOOP;
END $$;
