-- 1. Limpeza de políticas permissivas em solicitações
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.solicitacoes;
DROP POLICY IF EXISTS "tenant_isolation" ON public.solicitacoes;

-- 2. Limpeza de políticas permissivas em cotacoes
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.cotacoes;
DROP POLICY IF EXISTS "tenant_isolation" ON public.cotacoes;

-- 3. Limpeza de políticas permissivas em fornecedores
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.fornecedores;
DROP POLICY IF EXISTS "Users can view their organization suppliers" ON public.fornecedores;
DROP POLICY IF EXISTS "Users can manage their organization suppliers" ON public.fornecedores;
DROP POLICY IF EXISTS "tenant_isolation" ON public.fornecedores;

-- 4. Limpeza de políticas permissivas em cost_centers
DROP POLICY IF EXISTS "Centros de custo são visíveis por usuários autenticados" ON public.cost_centers;

-- 5. Limpeza de políticas permissivas em audit_logs
DROP POLICY IF EXISTS "Authenticated users can create audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Allow anon to view audit logs (dev only)" ON public.audit_logs;
DROP POLICY IF EXISTS "Allow anon to insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Authenticated users can create audit logs" ON public.audit_logs;

-- 6. Limpeza de políticas permissivas em produtos
DROP POLICY IF EXISTS "Authenticated users can view produtos" ON public.produtos;
DROP POLICY IF EXISTS "Authenticated users can view products" ON public.produtos;
DROP POLICY IF EXISTS "tenant_isolation" ON public.produtos;

-- 7. Dados de referência: remover acesso público
DROP POLICY IF EXISTS "Currencies are viewable by everyone" ON public.currencies;
DROP POLICY IF EXISTS "Exchange rates are viewable by everyone" ON public.exchange_rates;
DROP POLICY IF EXISTS "unspsc_codes_read" ON public.unspsc_codes;

-- ==========================================
-- REIMPLEMENTAÇÃO COM SEGURANÇA MÁXIMA
-- ==========================================

-- Audit Logs: Apenas inserção vinculada ao tenant
CREATE POLICY "authenticated_insert_audit_logs" ON public.audit_logs
FOR INSERT TO authenticated
WITH CHECK (tenant_id = public.current_tenant_id());

-- Dados de Referência: Apenas Authenticated
CREATE POLICY "currencies_authenticated_read" ON public.currencies
FOR SELECT TO authenticated USING (true);

CREATE POLICY "exchange_rates_authenticated_read" ON public.exchange_rates
FOR SELECT TO authenticated USING (true);

CREATE POLICY "unspsc_codes_authenticated_read" ON public.unspsc_codes
FOR SELECT TO authenticated USING (true);

-- Garantir que as tabelas principais tenham a política de isolamento padrão caso não tenham
DO $$
DECLARE
    t_name TEXT;
    tables_to_isolate TEXT[] := ARRAY['solicitacoes', 'cotacoes', 'fornecedores', 'produtos', 'cost_centers'];
BEGIN
    FOREACH t_name IN ARRAY tables_to_isolate LOOP
        -- Tenta criar a política se ela não existir
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = t_name AND policyname = 'tenant_isolation_' || t_name
        ) THEN
            EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (tenant_id = public.current_tenant_id()) WITH CHECK (tenant_id = public.current_tenant_id())', 'tenant_isolation_' || t_name, t_name);
        END IF;
    END LOOP;
END $$;
