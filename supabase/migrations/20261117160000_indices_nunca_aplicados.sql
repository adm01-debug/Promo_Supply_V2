-- Indices que existiam nas migrations do repo mas nunca foram criados em producao.
-- Verificados um a um contra pg_indexes por (tabela, colunas), nao por nome.
-- Descartados por obsolescencia:
--   idx_solicitacoes_vendedor  -> coluna "vendedor" nao existe mais; ja coberto por
--                                 idx_solicitacoes_solicitante (solicitante_id).
--   idx_fornecedores_categoria -> coluna "categoria" nao existe mais (hoje: segmento, tipo).
CREATE INDEX IF NOT EXISTS idx_approval_steps_workflow_status_prazo ON public.approval_steps (workflow_id, status, prazo_limite);
CREATE INDEX IF NOT EXISTS idx_repurchase_suggestions_fornecedor_id ON public.repurchase_suggestions(fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_repurchase_suggestions_produto_id ON public.repurchase_suggestions(produto_id);
CREATE INDEX IF NOT EXISTS idx_repurchase_suggestions_tenant_status ON public.repurchase_suggestions(tenant_id, status, proxima_compra_estimada);
CREATE INDEX IF NOT EXISTS idx_repurchase_suggestions_ultimo_pedido_id ON public.repurchase_suggestions(ultimo_pedido_id);
CREATE INDEX IF NOT EXISTS idx_spot_custom_default ON public.spot_customization_options(product_reference) WHERE is_default;
CREATE INDEX IF NOT EXISTS idx_spot_custom_product_ref ON public.spot_customization_options(product_reference);
CREATE INDEX IF NOT EXISTS idx_spot_estoque_product_ref ON public.spot_estoque(product_reference);
CREATE INDEX IF NOT EXISTS idx_spot_produtos_catalogs ON public.spot_produtos USING GIN(catalogs);
CREATE INDEX IF NOT EXISTS idx_spot_produtos_name ON public.spot_produtos USING GIN (to_tsvector('portuguese', name));
CREATE INDEX IF NOT EXISTS idx_spot_produtos_type_legacy ON public.spot_produtos(type_code_legacy);
CREATE INDEX IF NOT EXISTS idx_spot_produtos_type_new ON public.spot_produtos(type_code_new);
CREATE INDEX IF NOT EXISTS idx_spot_skus_product_ref ON public.spot_skus(product_reference);
CREATE INDEX IF NOT EXISTS idx_spot_sync_log_endpoint_day ON public.spot_api_sync_log(endpoint, called_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_approvals_instance_node_approver ON public.workflow_approvals (instance_id, node_id, approver_id);
CREATE INDEX IF NOT EXISTS idx_workflow_edges_source_target ON public.workflow_edges (source_node_id, target_node_id);
CREATE INDEX IF NOT EXISTS idx_workflow_logs_instance_node ON public.workflow_logs (instance_id, node_id);
CREATE INDEX IF NOT EXISTS idx_xbz_carrinho_log_tenant ON public.xbz_carrinho_log (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_xbz_pedidos_emissao ON public.xbz_pedidos (tenant_id, data_emissao DESC);
CREATE INDEX IF NOT EXISTS idx_xbz_pedidos_pagamento ON public.xbz_pedidos (tenant_id, id_lote_debito_status);
CREATE INDEX IF NOT EXISTS idx_xbz_produtos_last_synced ON public.xbz_produtos (tenant_id, last_synced_at DESC);
CREATE INDEX IF NOT EXISTS idx_xbz_produtos_nome_lower ON public.xbz_produtos (tenant_id, lower(nome));
CREATE INDEX IF NOT EXISTS idx_xbz_produtos_sku ON public.xbz_produtos (tenant_id, sku);
CREATE INDEX IF NOT EXISTS idx_xbz_status_history_pedido ON public.xbz_pedido_status_history (tenant_id, pedido_numero, detectado_em DESC);
