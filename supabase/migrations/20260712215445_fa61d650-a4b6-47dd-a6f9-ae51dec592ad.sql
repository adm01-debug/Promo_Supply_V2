
-- =====================================================
-- ONDA 51: HIGIENE DE TRIGGERS E POLICIES DUPLICADAS
-- =====================================================

-- === TRIGGERS DUPLICADOS ===
DROP TRIGGER IF EXISTS sanitize_session_token_trigger ON public.active_sessions;
DROP TRIGGER IF EXISTS sanitize_audit_metadata_trigger ON public.audit_logs;
DROP TRIGGER IF EXISTS update_contracts_updated_at ON public.contracts;
DROP TRIGGER IF EXISTS tr_update_cotacao_scores ON public.cotacoes;
DROP TRIGGER IF EXISTS auto_transition_sol_on_cotacao ON public.cotacoes;
DROP TRIGGER IF EXISTS update_cotacoes_updated_at ON public.cotacoes;
DROP TRIGGER IF EXISTS update_dashboard_filter_favorites_updated_at ON public.dashboard_filter_favorites;
DROP TRIGGER IF EXISTS update_fornecedores_updated_at ON public.fornecedores;
DROP TRIGGER IF EXISTS update_pagamentos_updated_at ON public.pagamentos;
DROP TRIGGER IF EXISTS update_saldo_on_pagamento_change ON public.pagamentos;
DROP TRIGGER IF EXISTS validate_pagamento_status ON public.pagamentos;
DROP TRIGGER IF EXISTS auto_create_pagamento_on_delivery ON public.pedidos;
DROP TRIGGER IF EXISTS auto_transition_sol_on_pedido_delivery ON public.pedidos;
DROP TRIGGER IF EXISTS auto_update_supplier_score_on_delivery ON public.pedidos;

-- === POLICIES DUPLICADAS ===

-- dashboard_filter_favorites: consolidar 10 → 4
DROP POLICY IF EXISTS "Users can create their own dashboard filters" ON public.dashboard_filter_favorites;
DROP POLICY IF EXISTS "Users can delete their own dashboard filters" ON public.dashboard_filter_favorites;
DROP POLICY IF EXISTS "Users can update their own dashboard filters" ON public.dashboard_filter_favorites;
DROP POLICY IF EXISTS "Users can view their own dashboard filters" ON public.dashboard_filter_favorites;
DROP POLICY IF EXISTS "Users can manage their organization dashboard filters" ON public.dashboard_filter_favorites;
DROP POLICY IF EXISTS "Users can view their organization dashboard filters" ON public.dashboard_filter_favorites;
-- Mantidas: as 4 policies "filter favorites" (create/view/update/delete their own)

-- contracts: policy legada sem escopo
DROP POLICY IF EXISTS "tenant_isolation" ON public.contracts;

-- password_reset_requests: dois updates de admin idênticos
DROP POLICY IF EXISTS "Admins can update reset requests" ON public.password_reset_requests;

-- audit_logs: policy genérica coberta por tenant_isolation_audit_logs
DROP POLICY IF EXISTS "Users can view audit logs for their organization" ON public.audit_logs;
