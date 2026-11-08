-- 1. Licitacoes e Propostas
DROP POLICY IF EXISTS "Authenticated users can view licitacoes" ON public.licitacoes;
DROP POLICY IF EXISTS "tenant_isolation_licitacoes" ON public.licitacoes;
CREATE POLICY "tenant_isolation_licitacoes" ON public.licitacoes
FOR ALL TO authenticated
USING (tenant_id = public.current_tenant_id())
WITH CHECK (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS "Authenticated users can view propostas" ON public.licitacao_propostas;
DROP POLICY IF EXISTS "tenant_isolation_licitacao_propostas" ON public.licitacao_propostas;
CREATE POLICY "tenant_isolation_licitacao_propostas" ON public.licitacao_propostas
FOR ALL TO authenticated
USING (tenant_id = public.current_tenant_id())
WITH CHECK (tenant_id = public.current_tenant_id());

-- 2. Categorias de Fornecedores
DROP POLICY IF EXISTS "Acesso total fornecedor_categorias" ON public.fornecedor_categorias;
DROP POLICY IF EXISTS "tenant_isolation_fornecedor_categorias" ON public.fornecedor_categorias;
CREATE POLICY "tenant_isolation_fornecedor_categorias" ON public.fornecedor_categorias
FOR ALL TO authenticated
USING (tenant_id = public.current_tenant_id())
WITH CHECK (tenant_id = public.current_tenant_id());

-- 3. Telemetry Logs
DROP POLICY IF EXISTS "Authenticated users can insert telemetry logs" ON public.telemetry_logs;
DROP POLICY IF EXISTS "authenticated_insert_telemetry_logs" ON public.telemetry_logs;
CREATE POLICY "authenticated_insert_telemetry_logs" ON public.telemetry_logs
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 4. Budget Audit Logs
DROP POLICY IF EXISTS "Apenas admin e gestores podem ver logs de auditoria" ON public.budget_audit_logs;
DROP POLICY IF EXISTS "admin_view_budget_audit_logs" ON public.budget_audit_logs;
CREATE POLICY "admin_view_budget_audit_logs" ON public.budget_audit_logs
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 5. Dependency Health
DROP POLICY IF EXISTS "dependency_health_read_auth" ON public.dependency_health;
DROP POLICY IF EXISTS "authenticated_read_dependency_health" ON public.dependency_health;
CREATE POLICY "authenticated_read_dependency_health" ON public.dependency_health
FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "dependency_health_history_read_auth" ON public.dependency_health_history;
DROP POLICY IF EXISTS "authenticated_read_dependency_health_history" ON public.dependency_health_history;
CREATE POLICY "authenticated_read_dependency_health_history" ON public.dependency_health_history
FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);
