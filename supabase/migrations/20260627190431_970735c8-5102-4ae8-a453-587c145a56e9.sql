
-- Phase 3: Performance indexes on hot filter/order columns.
-- Safe: IF NOT EXISTS, no data changes. Tradeoff: tiny insert overhead, large read win.

-- Fornecedores: listagem por org, ordenada por razão social, filtrada por status
CREATE INDEX IF NOT EXISTS idx_fornecedores_org_status_razao
  ON public.fornecedores (organization_id, status, razao_social);
CREATE INDEX IF NOT EXISTS idx_fornecedores_razao_social
  ON public.fornecedores (razao_social);

-- Solicitações: filtros por org + status + created_at desc
CREATE INDEX IF NOT EXISTS idx_solicitacoes_org_status_created
  ON public.solicitacoes (organization_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_solicitante
  ON public.solicitacoes (solicitante_id);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_aprovador
  ON public.solicitacoes (aprovador_id);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_cost_center
  ON public.solicitacoes (cost_center_id);

-- Pedidos: filtros típicos por org/fornecedor/status e ordenação por created_at
CREATE INDEX IF NOT EXISTS idx_pedidos_org_status_created
  ON public.pedidos (organization_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pedidos_fornecedor_created
  ON public.pedidos (fornecedor_id, created_at DESC);

-- Cotações por fornecedor
CREATE INDEX IF NOT EXISTS idx_cotacoes_fornecedor_created
  ON public.cotacoes (fornecedor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cotacoes_org_status
  ON public.cotacoes (organization_id, status);

-- Pagamentos: filtros por org + status + due date
CREATE INDEX IF NOT EXISTS idx_pagamentos_org_status_due
  ON public.pagamentos (organization_id, status, data_vencimento);

-- Notifications inbox
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id, read) WHERE read = false;

-- Audit logs por org/data
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_created
  ON public.audit_logs (organization_id, created_at DESC);

-- Telemetry logs por created_at (paginação)
CREATE INDEX IF NOT EXISTS idx_telemetry_logs_created
  ON public.telemetry_logs (created_at DESC);

-- Approval workflows
CREATE INDEX IF NOT EXISTS idx_approval_workflows_org_status
  ON public.approval_workflows (organization_id, status);

-- Produtos: filtros por org + categoria + ordenação por nome
CREATE INDEX IF NOT EXISTS idx_produtos_org_ativo_nome
  ON public.produtos (organization_id, ativo, nome);
CREATE INDEX IF NOT EXISTS idx_produtos_categoria
  ON public.produtos (categoria_id);

-- Categorias por org+ativo+nome (usado em selects)
CREATE INDEX IF NOT EXISTS idx_categorias_org_ativo_nome
  ON public.categorias (organization_id, ativo, nome);

-- Contracts por supplier
CREATE INDEX IF NOT EXISTS idx_contracts_supplier_created
  ON public.contracts (supplier_id, created_at DESC);

ANALYZE public.fornecedores;
ANALYZE public.solicitacoes;
ANALYZE public.pedidos;
ANALYZE public.cotacoes;
ANALYZE public.pagamentos;
ANALYZE public.notifications;
ANALYZE public.produtos;
ANALYZE public.categorias;
