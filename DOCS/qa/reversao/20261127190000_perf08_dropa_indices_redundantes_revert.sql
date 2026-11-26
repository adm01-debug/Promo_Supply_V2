-- ============================================================================
-- REVERSAO da migration 20261127190000_perf08_dropa_indices_redundantes.sql
--
-- Este arquivo NAO e' aplicado automaticamente e NAO fica em
-- supabase/migrations/ de proposito: a paridade semanal compara todo .sql
-- daquela pasta com o banco de producao e um arquivo nao aplicado apareceria
-- como divergencia. Para usar, copie para supabase/migrations/ com timestamp
-- novo e rode o workflow aplicar-migration-prod.yml com confirmacao=APLICAR.
--
-- Os 24 indices voltam com o nome e a lista de colunas originais (btree, nao
-- unicos, sem WHERE). Nenhum deles tinha CONCURRENTLY, entao a recriacao roda
-- em transacao unica como o resto.
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_approval_steps_workflow_id ON public.approval_steps (workflow_id);
CREATE INDEX IF NOT EXISTS idx_approval_workflows_org ON public.approval_workflows (organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON public.audit_logs (entity_type);
CREATE INDEX IF NOT EXISTS idx_categorias_org ON public.categorias (organization_id);
CREATE INDEX IF NOT EXISTS idx_cotacoes_fornecedor ON public.cotacoes (fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_cotacoes_solicitacao ON public.cotacoes (solicitacao_id);
CREATE INDEX IF NOT EXISTS idx_cotacoes_status ON public.cotacoes (status);
CREATE INDEX IF NOT EXISTS idx_fornecedores_org ON public.fornecedores (organization_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_org ON public.pagamentos (organization_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_status ON public.pagamentos (status);
CREATE INDEX IF NOT EXISTS idx_pagamentos_vencimento ON public.pagamentos (data_vencimento);
CREATE INDEX IF NOT EXISTS idx_pedidos_fornecedor ON public.pedidos (fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_organization_id ON public.pedidos (organization_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_status ON public.pedidos (status);
CREATE INDEX IF NOT EXISTS idx_produtos_org ON public.produtos (organization_id);
CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_ip ON public.rate_limit_logs (ip_address);
CREATE INDEX IF NOT EXISTS idx_saved_filters_user_id ON public.saved_filters (user_id);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_organization_id ON public.solicitacoes (organization_id);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_status ON public.solicitacoes (status);
CREATE INDEX IF NOT EXISTS idx_workflow_approvals_instance_id ON public.workflow_approvals (instance_id);
CREATE INDEX IF NOT EXISTS idx_workflow_edges_source_node_id ON public.workflow_edges (source_node_id);
CREATE INDEX IF NOT EXISTS idx_workflow_logs_instance_id ON public.workflow_logs (instance_id);
CREATE INDEX IF NOT EXISTS idx_xbz_pedidos_tenant ON public.xbz_pedidos (tenant_id);
CREATE INDEX IF NOT EXISTS idx_xbz_produtos_tenant ON public.xbz_produtos (tenant_id);
