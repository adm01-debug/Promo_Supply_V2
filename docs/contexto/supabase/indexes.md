# Índices

Uso e tamanho em `stats.md`.

| tabela | índice | método | colunas | único | válido | predicado |
|---|---|---|---|---|---|---|
| public.account_lockouts | account_lockouts_email_key | btree | email | sim | sim |  |
| public.account_lockouts | account_lockouts_pkey | btree | id | sim | sim |  |
| public.account_lockouts | idx_account_lockouts_email_lower | btree |  | não | sim |  |
| public.account_lockouts | idx_account_lockouts_locked_until | btree | locked_until | não | sim | `(locked_until IS NOT NULL)` |
| public.active_sessions | active_sessions_pkey | btree | id | sim | sim |  |
| public.active_sessions | active_sessions_session_token_key | btree | session_token | sim | sim |  |
| public.active_sessions | idx_active_sessions_tenant | btree | tenant_id | não | sim |  |
| public.active_sessions | idx_active_sessions_user | btree | user_id | não | sim |  |
| public.alert_subscriptions | alert_subscriptions_pkey | btree | id | sim | sim |  |
| public.alert_subscriptions | alert_subscriptions_user_id_alert_type_channel_key | btree | user_id, alert_type, channel | sim | sim |  |
| public.alert_subscriptions | idx_alert_subs_type | btree | alert_type | não | sim | `(alert_type IS NOT NULL)` |
| public.alert_subscriptions | idx_alert_subs_user | btree | user_id | não | sim |  |
| public.aliquotas_tributarias | aliquotas_tributarias_pkey | btree | id | sim | sim |  |
| public.aliquotas_tributarias | idx_aliquotas_lookup | btree | organization_id, regime, uf_destino, ncm | não | sim |  |
| public.allowed_countries | allowed_countries_country_code_key | btree | country_code | sim | sim |  |
| public.allowed_countries | allowed_countries_pkey | btree | id | sim | sim |  |
| public.allowed_countries | idx_allowed_countries_added_by | btree | added_by | não | sim |  |
| public.approval_delegations | approval_delegations_no_overlap | gist | delegante_id, tenant_id | não | sim | `(ativo = true)` |
| public.approval_delegations | approval_delegations_pkey | btree | id | sim | sim |  |
| public.approval_delegations | idx_approval_delegations_org | btree | organization_id | não | sim |  |
| public.approval_delegations | idx_approval_delegations_tenant_id | btree | tenant_id | não | sim |  |
| public.approval_hierarchy | approval_hierarchy_pkey | btree | id | sim | sim |  |
| public.approval_hierarchy | approval_hierarchy_user_id_cost_center_id_key | btree | user_id, cost_center_id | sim | sim |  |
| public.approval_hierarchy | idx_approval_hierarchy_cost_center_id | btree | cost_center_id | não | sim |  |
| public.approval_hierarchy | idx_approval_hierarchy_superior_id | btree | superior_id | não | sim |  |
| public.approval_hierarchy | idx_approval_hierarchy_tenant_id | btree | tenant_id | não | sim |  |
| public.approval_history | approval_history_pkey | btree | id | sim | sim |  |
| public.approval_history | idx_approval_history_solicitacao_id | btree | solicitacao_id | não | sim |  |
| public.approval_history | idx_approval_history_step_id | btree | step_id | não | sim |  |
| public.approval_history | idx_approval_history_tenant_id | btree | tenant_id | não | sim |  |
| public.approval_history | idx_approval_history_workflow_id | btree | workflow_id | não | sim |  |
| public.approval_rules | approval_rules_pkey | btree | id | sim | sim |  |
| public.approval_rules | idx_approval_rules_categoria_id | btree | categoria_id | não | sim |  |
| public.approval_rules | idx_approval_rules_cost_center | btree | cost_center_id | não | sim |  |
| public.approval_rules | idx_approval_rules_org | btree | organization_id | não | sim |  |
| public.approval_rules | idx_approval_rules_tenant_id | btree | tenant_id | não | sim |  |
| public.approval_steps | approval_steps_pkey | btree | id | sim | sim |  |
| public.approval_steps | idx_approval_steps_delegacao_id | btree | delegacao_id | não | sim |  |
| public.approval_steps | idx_approval_steps_organization_id | btree | organization_id | não | sim |  |
| public.approval_steps | idx_approval_steps_tenant_id | btree | tenant_id | não | sim |  |
| public.approval_steps | idx_approval_steps_workflow_status_prazo | btree | workflow_id, status, prazo_limite | não | sim |  |
| public.approval_workflows | approval_workflows_pkey | btree | id | sim | sim |  |
| public.approval_workflows | idx_approval_workflows_categoria_id | btree | categoria_id | não | sim |  |
| public.approval_workflows | idx_approval_workflows_org_status | btree | organization_id, status | não | sim |  |
| public.approval_workflows | idx_approval_workflows_rule_id | btree | rule_id | não | sim |  |
| public.approval_workflows | idx_approval_workflows_solicitacao_id | btree | solicitacao_id | não | sim |  |
| public.approval_workflows | idx_approval_workflows_tenant_id | btree | tenant_id | não | sim |  |
| public.auction_bids | auction_bids_pkey | btree | id | sim | sim |  |
| public.auction_bids | idx_auction_bids_event_id | btree | event_id | não | sim |  |
| public.auction_bids | idx_auction_bids_fornecedor_id | btree | fornecedor_id | não | sim |  |
| public.auction_bids | idx_auction_bids_invitation_id | btree | invitation_id | não | sim |  |
| public.auction_bids | idx_auction_bids_lot_id | btree | lot_id | não | sim |  |
| public.auction_bids | idx_auction_bids_tenant_id | btree | tenant_id | não | sim |  |
| public.audit_logs | audit_logs_pkey | btree | id, created_at | sim | sim |  |
| public.audit_logs | audit_logs_sequencia_uidx | btree | sequencia | sim | sim |  |
| public.audit_logs | idx_audit_logs_action_type | btree | action_type | não | sim |  |
| public.audit_logs | idx_audit_logs_created_at | btree | created_at | não | sim |  |
| public.audit_logs | idx_audit_logs_entity_id | btree | entity_id | não | sim |  |
| public.audit_logs | idx_audit_logs_entity_type_id | btree | entity_type, entity_id | não | sim |  |
| public.audit_logs | idx_audit_logs_org_created | btree | organization_id, created_at | não | sim |  |
| public.audit_logs | idx_audit_logs_tenant | btree | tenant_id | não | sim |  |
| public.audit_logs | idx_audit_logs_user_id | btree | user_id | não | sim |  |
| public.audit_logs_202605 | audit_logs_202605_action_type_idx | btree | action_type | não | sim |  |
| public.audit_logs_202605 | audit_logs_202605_created_at_idx | btree | created_at | não | sim |  |
| public.audit_logs_202605 | audit_logs_202605_entity_id_idx | btree | entity_id | não | sim |  |
| public.audit_logs_202605 | audit_logs_202605_entity_type_entity_id_idx | btree | entity_type, entity_id | não | sim |  |
| public.audit_logs_202605 | audit_logs_202605_entity_type_idx | btree | entity_type | não | sim |  |
| public.audit_logs_202605 | audit_logs_202605_organization_id_created_at_idx | btree | organization_id, created_at | não | sim |  |
| public.audit_logs_202605 | audit_logs_202605_pkey | btree | id, created_at | sim | sim |  |
| public.audit_logs_202605 | audit_logs_202605_tenant_id_idx | btree | tenant_id | não | sim |  |
| public.audit_logs_202605 | audit_logs_202605_user_id_idx | btree | user_id | não | sim |  |
| public.audit_logs_202606 | audit_logs_202606_action_type_idx | btree | action_type | não | sim |  |
| public.audit_logs_202606 | audit_logs_202606_created_at_idx | btree | created_at | não | sim |  |
| public.audit_logs_202606 | audit_logs_202606_entity_id_idx | btree | entity_id | não | sim |  |
| public.audit_logs_202606 | audit_logs_202606_entity_type_entity_id_idx | btree | entity_type, entity_id | não | sim |  |
| public.audit_logs_202606 | audit_logs_202606_entity_type_idx | btree | entity_type | não | sim |  |
| public.audit_logs_202606 | audit_logs_202606_organization_id_created_at_idx | btree | organization_id, created_at | não | sim |  |
| public.audit_logs_202606 | audit_logs_202606_pkey | btree | id, created_at | sim | sim |  |
| public.audit_logs_202606 | audit_logs_202606_tenant_id_idx | btree | tenant_id | não | sim |  |
| public.audit_logs_202606 | audit_logs_202606_user_id_idx | btree | user_id | não | sim |  |
| public.audit_logs_202607 | audit_logs_202607_action_type_idx | btree | action_type | não | sim |  |
| public.audit_logs_202607 | audit_logs_202607_created_at_idx | btree | created_at | não | sim |  |
| public.audit_logs_202607 | audit_logs_202607_entity_id_idx | btree | entity_id | não | sim |  |
| public.audit_logs_202607 | audit_logs_202607_entity_type_entity_id_idx | btree | entity_type, entity_id | não | sim |  |
| public.audit_logs_202607 | audit_logs_202607_entity_type_idx | btree | entity_type | não | sim |  |
| public.audit_logs_202607 | audit_logs_202607_organization_id_created_at_idx | btree | organization_id, created_at | não | sim |  |
| public.audit_logs_202607 | audit_logs_202607_pkey | btree | id, created_at | sim | sim |  |
| public.audit_logs_202607 | audit_logs_202607_tenant_id_idx | btree | tenant_id | não | sim |  |
| public.audit_logs_202607 | audit_logs_202607_user_id_idx | btree | user_id | não | sim |  |
| public.audit_logs_202608 | audit_logs_202608_action_type_idx | btree | action_type | não | sim |  |
| public.audit_logs_202608 | audit_logs_202608_created_at_idx | btree | created_at | não | sim |  |
| public.audit_logs_202608 | audit_logs_202608_entity_id_idx | btree | entity_id | não | sim |  |
| public.audit_logs_202608 | audit_logs_202608_entity_type_entity_id_idx | btree | entity_type, entity_id | não | sim |  |
| public.audit_logs_202608 | audit_logs_202608_entity_type_idx | btree | entity_type | não | sim |  |
| public.audit_logs_202608 | audit_logs_202608_organization_id_created_at_idx | btree | organization_id, created_at | não | sim |  |
| public.audit_logs_202608 | audit_logs_202608_pkey | btree | id, created_at | sim | sim |  |
| public.audit_logs_202608 | audit_logs_202608_tenant_id_idx | btree | tenant_id | não | sim |  |
| public.audit_logs_202608 | audit_logs_202608_user_id_idx | btree | user_id | não | sim |  |
| public.audit_logs_202609 | audit_logs_202609_action_type_idx | btree | action_type | não | sim |  |
| public.audit_logs_202609 | audit_logs_202609_created_at_idx | btree | created_at | não | sim |  |
| public.audit_logs_202609 | audit_logs_202609_entity_id_idx | btree | entity_id | não | sim |  |
| public.audit_logs_202609 | audit_logs_202609_entity_type_entity_id_idx | btree | entity_type, entity_id | não | sim |  |
| public.audit_logs_202609 | audit_logs_202609_entity_type_idx | btree | entity_type | não | sim |  |
| public.audit_logs_202609 | audit_logs_202609_organization_id_created_at_idx | btree | organization_id, created_at | não | sim |  |
| public.audit_logs_202609 | audit_logs_202609_pkey | btree | id, created_at | sim | sim |  |
| public.audit_logs_202609 | audit_logs_202609_tenant_id_idx | btree | tenant_id | não | sim |  |
| public.audit_logs_202609 | audit_logs_202609_user_id_idx | btree | user_id | não | sim |  |
| public.audit_logs_ancora | audit_logs_ancora_pkey | btree | id | sim | sim |  |
| public.audit_logs_legacy_20260712 | audit_logs_legacy_20260712_action_type_idx | btree | action_type | não | sim |  |
| public.audit_logs_legacy_20260712 | audit_logs_legacy_20260712_created_at_idx | btree | created_at | não | sim |  |
| public.audit_logs_legacy_20260712 | audit_logs_legacy_20260712_entity_id_idx | btree | entity_id | não | sim |  |
| public.audit_logs_legacy_20260712 | audit_logs_legacy_20260712_entity_type_entity_id_idx | btree | entity_type, entity_id | não | sim |  |
| public.audit_logs_legacy_20260712 | audit_logs_legacy_20260712_entity_type_idx | btree | entity_type | não | sim |  |
| public.audit_logs_legacy_20260712 | audit_logs_legacy_20260712_organization_id_created_at_idx | btree | organization_id, created_at | não | sim |  |
| public.audit_logs_legacy_20260712 | audit_logs_legacy_20260712_pkey | btree | id | sim | sim |  |
| public.audit_logs_legacy_20260712 | audit_logs_legacy_20260712_tenant_id_idx | btree | tenant_id | não | sim |  |
| public.audit_logs_legacy_20260712 | audit_logs_legacy_20260712_user_id_idx | btree | user_id | não | sim |  |
| public.blocked_countries | blocked_countries_country_code_key | btree | country_code | sim | sim |  |
| public.blocked_countries | blocked_countries_pkey | btree | id | sim | sim |  |
| public.blocked_countries | idx_blocked_countries_blocked_by | btree | blocked_by | não | sim |  |
| public.blocked_ips | blocked_ips_ip_address_key | btree | ip_address | sim | sim |  |
| public.blocked_ips | blocked_ips_pkey | btree | id | sim | sim |  |
| public.blocked_ips | idx_blocked_ips_blocked_by | btree | blocked_by | não | sim |  |
| public.budget_audit_logs | budget_audit_logs_pkey | btree | id | sim | sim |  |
| public.budget_audit_logs | idx_budget_audit_logs_budget_id | btree | budget_id | não | sim |  |
| public.budget_audit_logs | idx_budget_audit_logs_user_id | btree | user_id | não | sim |  |
| public.budget_transactions | budget_transactions_pkey | btree | id | sim | sim |  |
| public.budget_transactions | idx_budget_transactions_cost_center_id | btree | cost_center_id | não | sim |  |
| public.budget_transactions | idx_budget_transactions_created_by | btree | created_by | não | sim |  |
| public.budget_transactions | idx_budget_transactions_tenant_id | btree | tenant_id | não | sim |  |
| public.categorias | categorias_pkey | btree | id | sim | sim |  |
| public.categorias | idx_categorias_codigo_unspsc | btree | codigo_unspsc | não | sim |  |
| public.categorias | idx_categorias_org_ativo_nome | btree | organization_id, ativo, nome | não | sim |  |
| public.categorias | idx_categorias_tenant | btree | tenant_id | não | sim |  |
| public.category_strategies | category_strategies_pkey | btree | id | sim | sim |  |
| public.category_strategies | idx_category_strategies_categoria_id | btree | categoria_id | não | sim |  |
| public.category_strategies | idx_category_strategies_organization_id | btree | organization_id | não | sim |  |
| public.category_strategies | idx_category_strategies_tenant_id | btree | tenant_id | não | sim |  |
| public.checkpoint_snapshots | checkpoint_snapshots_pkey | btree | id | sim | sim |  |
| public.checkpoint_snapshots | idx_checkpoint_snapshots_captured_at | btree | captured_at | não | sim |  |
| public.contact_notes | contact_notes_pkey | btree | id | sim | sim |  |
| public.contact_notes | idx_contact_notes_author_id | btree | author_id | não | sim |  |
| public.contact_notes | idx_contact_notes_contact_id | btree | contact_id | não | sim |  |
| public.contact_notes | idx_contact_notes_fornecedor_id | btree | fornecedor_id | não | sim |  |
| public.contact_notes | idx_contact_notes_tenant_id | btree | tenant_id | não | sim |  |
| public.contract_documents | contract_documents_pkey | btree | id | sim | sim |  |
| public.contract_documents | idx_contract_documents_contract_id | btree | contract_id | não | sim |  |
| public.contract_documents | idx_contract_documents_tenant_id | btree | tenant_id | não | sim |  |
| public.contract_history | contract_history_pkey | btree | id | sim | sim |  |
| public.contract_history | idx_contract_history_contract_id | btree | contract_id | não | sim |  |
| public.contract_history | idx_contract_history_tenant_id | btree | tenant_id | não | sim |  |
| public.contract_items | contract_items_pkey | btree | id | sim | sim |  |
| public.contract_items | idx_contract_items_contract_id | btree | contract_id | não | sim |  |
| public.contract_items | idx_contract_items_tenant_id | btree | tenant_id | não | sim |  |
| public.contract_penalties | contract_penalties_pkey | btree | id | sim | sim |  |
| public.contract_penalties | idx_contract_penalties_contract_id | btree | contract_id | não | sim |  |
| public.contract_penalties | idx_contract_penalties_pagamento_id | btree | pagamento_id | não | sim |  |
| public.contract_penalties | idx_contract_penalties_pedido_id | btree | pedido_id | não | sim |  |
| public.contract_penalties | idx_contract_penalties_tenant_id | btree | tenant_id | não | sim |  |
| public.contracts | contracts_pkey | btree | id | sim | sim |  |
| public.contracts | idx_contracts_currency | btree | currency | não | sim |  |
| public.contracts | idx_contracts_organization_id | btree | organization_id | não | sim |  |
| public.contracts | idx_contracts_supplier_created | btree | supplier_id, created_at | não | sim |  |
| public.contracts | idx_contracts_tenant_id | btree | tenant_id | não | sim |  |
| public.contracts | uq_contracts_tenant_contract_number | btree | tenant_id, contract_number | sim | sim |  |
| public.cost_centers | cost_centers_pkey | btree | id | sim | sim |  |
| public.cost_centers | idx_cost_centers_manager | btree | manager_id | não | sim |  |
| public.cost_centers | idx_cost_centers_parent | btree | parent_id | não | sim |  |
| public.cost_centers | idx_cost_centers_tenant_id | btree | tenant_id | não | sim |  |
| public.cost_centers | uq_cost_centers_tenant_code | btree | tenant_id, code | sim | sim |  |
| public.cotacoes | cotacoes_pkey | btree | id | sim | sim |  |
| public.cotacoes | idx_cotacoes_avaliador_id | btree | avaliador_id | não | sim |  |
| public.cotacoes | idx_cotacoes_currency | btree | currency | não | sim |  |
| public.cotacoes | idx_cotacoes_dashboard | btree | status, created_at | não | sim |  |
| public.cotacoes | idx_cotacoes_follow_up_status | btree | follow_up_status | não | sim |  |
| public.cotacoes | idx_cotacoes_fornecedor_created | btree | fornecedor_id, created_at | não | sim |  |
| public.cotacoes | idx_cotacoes_org_status | btree | organization_id, status | não | sim |  |
| public.cotacoes | idx_cotacoes_solicitacao_fornecedor | btree | solicitacao_id, fornecedor_id | não | sim |  |
| public.cotacoes | idx_cotacoes_tenant | btree | tenant_id | não | sim |  |
| public.cotacoes | uq_cotacoes_tenant_numero | btree | tenant_id, numero | sim | sim |  |
| public.creditos_fornecedor | creditos_fornecedor_pkey | btree | id | sim | sim |  |
| public.creditos_fornecedor | idx_creditos_fornecedor | btree | fornecedor_id | não | sim |  |
| public.creditos_fornecedor | idx_creditos_fornecedor_devolucao_id | btree | devolucao_id | não | sim |  |
| public.creditos_fornecedor | idx_creditos_fornecedor_tenant_id | btree | tenant_id | não | sim |  |
| public.creditos_fornecedor | idx_creditos_fornecedor_utilizado_em_pagamento_id | btree | utilizado_em_pagamento_id | não | sim |  |
| public.creditos_fornecedor | idx_creditos_status | btree | status | não | sim |  |
| public.cron_heartbeats | cron_heartbeats_pkey | btree | job_name | sim | sim |  |
| public.cron_watchdog_seen | cron_watchdog_seen_pkey | btree | jobid | sim | sim |  |
| public.currencies | currencies_pkey | btree | code | sim | sim |  |
| public.dashboard_filter_favorites | dashboard_filter_favorites_pkey | btree | id | sim | sim |  |
| public.dashboard_filter_favorites | idx_dashboard_filters_org | btree | organization_id | não | sim |  |
| public.dashboard_layouts | dashboard_layouts_pkey | btree | id | sim | sim |  |
| public.dashboard_layouts | dashboard_layouts_user_id_dashboard_id_key | btree | user_id, dashboard_id | sim | sim |  |
| public.deadlock_snapshots | deadlock_snapshots_pkey | btree | id | sim | sim |  |
| public.deadlock_snapshots | idx_deadlock_snapshots_captured_at_brin | brin | captured_at | não | sim |  |
| public.department_budgets | department_budgets_pkey | btree | id | sim | sim |  |
| public.department_budgets | idx_department_budgets_cost_center | btree | cost_center_id | não | sim |  |
| public.department_budgets | idx_department_budgets_tenant_id | btree | tenant_id | não | sim |  |
| public.department_budgets | idx_dept_budgets_org | btree | organization_id | não | sim |  |
| public.department_budgets | idx_unique_budget_period | btree | cost_center_id, ano | sim | sim |  |
| public.dependency_health | dependency_health_pkey | btree | id | sim | sim |  |
| public.dependency_health | idx_dependency_health_updated_by | btree | updated_by | não | sim |  |
| public.dependency_health_history | dependency_health_history_generated_at_idx | btree | generated_at | não | sim |  |
| public.dependency_health_history | dependency_health_history_pkey | btree | id | sim | sim |  |
| public.dependency_health_history | idx_dependency_health_history_created_by | btree | created_by | não | sim |  |
| public.devolucao_itens | devolucao_itens_pkey | btree | id | sim | sim |  |
| public.devolucao_itens | idx_devolucao_itens_devolucao | btree | devolucao_id | não | sim |  |
| public.devolucao_itens | idx_devolucao_itens_pedido_item_id | btree | pedido_item_id | não | sim |  |
| public.devolucao_itens | idx_devolucao_itens_tenant_id | btree | tenant_id | não | sim |  |
| public.devolucoes | devolucoes_pkey | btree | id | sim | sim |  |
| public.devolucoes | idx_devolucoes_fornecedor | btree | fornecedor_id | não | sim |  |
| public.devolucoes | idx_devolucoes_pedido | btree | pedido_id | não | sim |  |
| public.devolucoes | idx_devolucoes_status | btree | status | não | sim |  |
| public.devolucoes | idx_devolucoes_tenant_id | btree | tenant_id | não | sim |  |
| public.devolucoes | uq_devolucoes_tenant_numero | btree | tenant_id, numero | sim | sim |  |
| public.entity_versions | entity_versions_pkey | btree | id | sim | sim |  |
| public.entity_versions | idx_versions_date | btree | changed_at | não | sim |  |
| public.entity_versions | idx_versions_entity | btree | entity_type, entity_id | não | sim |  |
| public.entity_versions | unique_entity_version | btree | entity_type, entity_id, version_number | sim | sim |  |
| public.erp_connections | erp_connections_pkey | btree | id | sim | sim |  |
| public.erp_connections | idx_erp_connections_tenant | btree | tenant_id | não | sim |  |
| public.erp_field_mappings | erp_field_mappings_connection_id_entity_source_field_key | btree | connection_id, entity, source_field | sim | sim |  |
| public.erp_field_mappings | erp_field_mappings_pkey | btree | id | sim | sim |  |
| public.erp_sync_log | erp_sync_log_pkey | btree | id | sim | sim |  |
| public.erp_sync_log | idx_erp_sync_external_id | btree | external_id | não | sim |  |
| public.erp_sync_log | idx_erp_sync_log_tenant_id | btree | tenant_id | não | sim |  |
| public.erp_sync_log | idx_erp_sync_status_date | btree | connection_id, status, created_at | não | sim |  |
| public.estoque | estoque_organization_id_produto_id_localizacao_key | btree | organization_id, produto_id, localizacao | sim | sim |  |
| public.estoque | estoque_pkey | btree | id | sim | sim |  |
| public.estoque | idx_estoque_org | btree | organization_id | não | sim |  |
| public.estoque | idx_estoque_produto | btree | produto_id | não | sim |  |
| public.estoque_movimentacoes | estoque_movimentacoes_pkey | btree | id | sim | sim |  |
| public.estoque_movimentacoes | idx_estoque_movimentacoes_usuario_id | btree | usuario_id | não | sim |  |
| public.estoque_movimentacoes | idx_movimentacoes_estoque | btree | estoque_id | não | sim |  |
| public.estoque_movimentacoes | idx_movimentacoes_org | btree | organization_id | não | sim |  |
| public.exchange_rates | exchange_rates_base_currency_quote_currency_rate_date_sourc_key | btree | base_currency, quote_currency, rate_date, source | sim | sim |  |
| public.exchange_rates | exchange_rates_pkey | btree | id | sim | sim |  |
| public.exchange_rates | idx_exchange_rates_quote_currency | btree | quote_currency | não | sim |  |
| public.exchange_rates | idx_fx_lookup | btree | base_currency, quote_currency, rate_date | não | sim |  |
| public.financial_audit_logs | financial_audit_logs_pkey | btree | id | sim | sim |  |
| public.financial_audit_logs | idx_financial_audit_logs_user_id | btree | user_id | não | sim |  |
| public.fiscal_documents | fiscal_documents_pkey | btree | id | sim | sim |  |
| public.fiscal_documents | idx_fiscal_documents_fornecedor_id | btree | fornecedor_id | não | sim |  |
| public.fiscal_documents | idx_fiscal_documents_organization_id | btree | organization_id | não | sim |  |
| public.fiscal_documents | idx_fiscal_documents_pedido_id | btree | pedido_id | não | sim |  |
| public.fiscal_documents | idx_fiscal_documents_tenant | btree | tenant_id | não | sim |  |
| public.fiscal_events | fiscal_events_pkey | btree | id | sim | sim |  |
| public.fiscal_events | idx_fiscal_events_document | btree | document_id | não | sim |  |
| public.fiscal_events | idx_fiscal_events_status | btree | status | não | sim |  |
| public.fiscal_events | idx_fiscal_events_tenant | btree | tenant_id | não | sim |  |
| public.fornecedor_categorias | fornecedor_categorias_fornecedor_id_categoria_id_key | btree | fornecedor_id, categoria_id | sim | sim |  |
| public.fornecedor_categorias | fornecedor_categorias_pkey | btree | id | sim | sim |  |
| public.fornecedor_categorias | idx_fornecedor_categorias_categoria_id | btree | categoria_id | não | sim |  |
| public.fornecedores | fornecedores_pkey | btree | id | sim | sim |  |
| public.fornecedores | idx_fornecedores_created_by | btree | created_by | não | sim |  |
| public.fornecedores | idx_fornecedores_email_lower | btree |  | não | sim | `(email IS NOT NULL)` |
| public.fornecedores | idx_fornecedores_org_status_razao | btree | organization_id, status, razao_social | não | sim |  |
| public.fornecedores | idx_fornecedores_razao_lower | btree |  | não | sim | `(status = 'ativo'::text)` |
| public.fornecedores | idx_fornecedores_razao_social | btree | razao_social | não | sim |  |
| public.fornecedores | idx_fornecedores_status | btree | status | não | sim |  |
| public.fornecedores | idx_fornecedores_telefone | btree | telefone | não | sim | `(telefone IS NOT NULL)` |
| public.fornecedores | idx_fornecedores_tenant | btree | tenant_id | não | sim |  |
| public.fornecedores | idx_fornecedores_tipo | btree | tipo | não | sim |  |
| public.fornecedores | uq_fornecedores_tenant_cnpj | btree | tenant_id, cnpj | sim | sim | `(cnpj IS NOT NULL)` |
| public.fornecedores | uq_fornecedores_tenant_codigo | btree | tenant_id, codigo | sim | sim |  |
| public.geo_access_logs | brin_geo_access_logs_created | brin | created_at | não | sim |  |
| public.geo_access_logs | geo_access_logs_pkey | btree | id | sim | sim |  |
| public.geo_access_logs | idx_geo_logs_country | btree | country_code | não | sim |  |
| public.geo_access_logs | idx_geo_logs_created | btree | created_at | não | sim |  |
| public.geo_settings | geo_settings_pkey | btree | id | sim | sim |  |
| public.geo_settings | idx_geo_settings_updated_by | btree | updated_by | não | sim |  |
| public.health_scan_runs | health_scan_runs_pkey | btree | id | sim | sim |  |
| public.health_scan_runs | idx_health_scan_runs_scan_name_started | btree | scan_name, started_at | não | sim | `(scan_name IS NOT NULL)` |
| public.health_scan_runs | idx_health_scan_runs_started_at | btree | started_at | não | sim |  |
| public.integration_outbox | idx_outbox_tenant | btree | tenant_id, created_at | não | sim |  |
| public.integration_outbox | idx_outbox_worker | btree | status, next_attempt_at | não | sim | `(status = ANY (ARRAY['pending'::text, 'retrying'::text]))` |
| public.integration_outbox | integration_outbox_pkey | btree | id | sim | sim |  |
| public.ip_whitelist | idx_ip_whitelist_created_by | btree | created_by | não | sim |  |
| public.ip_whitelist | ip_whitelist_ip_address_key | btree | ip_address | sim | sim |  |
| public.ip_whitelist | ip_whitelist_pkey | btree | id | sim | sim |  |
| public.licitacao_lances | idx_licitacao_lances_fornecedor_id | btree | fornecedor_id | não | sim |  |
| public.licitacao_lances | idx_licitacao_lances_licitacao_id | btree | licitacao_id | não | sim |  |
| public.licitacao_lances | idx_licitacao_lances_tenant_id | btree | tenant_id | não | sim |  |
| public.licitacao_lances | licitacao_lances_pkey | btree | id | sim | sim |  |
| public.licitacao_propostas | idx_licitacao_propostas_fornecedor_id | btree | fornecedor_id | não | sim |  |
| public.licitacao_propostas | idx_licitacao_propostas_licitacao | btree | licitacao_id | não | sim |  |
| public.licitacao_propostas | idx_licitacao_propostas_tenant_id | btree | tenant_id | não | sim |  |
| public.licitacao_propostas | licitacao_propostas_licitacao_id_fornecedor_id_key | btree | licitacao_id, fornecedor_id | sim | sim |  |
| public.licitacao_propostas | licitacao_propostas_pkey | btree | id | sim | sim |  |
| public.licitacoes | idx_licitacoes_fornecedor_vencedor_id | btree | fornecedor_vencedor_id | não | sim |  |
| public.licitacoes | idx_licitacoes_modalidade | btree | modalidade | não | sim |  |
| public.licitacoes | idx_licitacoes_organization_id | btree | organization_id | não | sim |  |
| public.licitacoes | idx_licitacoes_status | btree | status | não | sim |  |
| public.licitacoes | idx_licitacoes_tenant_id | btree | tenant_id | não | sim |  |
| public.licitacoes | licitacoes_pkey | btree | id | sim | sim |  |
| public.licitacoes | uq_licitacoes_tenant_numero | btree | tenant_id, numero | sim | sim |  |
| public.login_attempts | brin_login_attempts_created | brin | created_at | não | sim |  |
| public.login_attempts | idx_login_attempts_created | btree | created_at | não | sim |  |
| public.login_attempts | idx_login_attempts_email | btree | email | não | sim |  |
| public.login_attempts | idx_login_attempts_email_lower | btree |  | não | sim |  |
| public.login_attempts | idx_login_attempts_ip | btree | ip_address | não | sim |  |
| public.login_attempts | login_attempts_pkey | btree | id | sim | sim |  |
| public.mfa_settings | mfa_settings_pkey | btree | id | sim | sim |  |
| public.mfa_settings | mfa_settings_user_id_key | btree | user_id | sim | sim |  |
| public.mv_dashboard_kpis | idx_mv_dashboard_kpis_pk | btree | tenant_id, dia | sim | sim |  |
| public.negotiation_analyses | idx_negotiation_analyses_cotacao_id | btree | cotacao_id | não | sim |  |
| public.negotiation_analyses | idx_negotiation_analyses_solicitacao_id | btree | solicitacao_id | não | sim |  |
| public.negotiation_analyses | negotiation_analyses_pkey | btree | id | sim | sim |  |
| public.notification_preferences | notification_preferences_pkey | btree | id | sim | sim |  |
| public.notification_preferences | notification_preferences_user_id_key | btree | user_id | sim | sim |  |
| public.notifications | idx_notifications_pending_email | btree | created_at | não | sim | `(sent_email = false)` |
| public.notifications | idx_notifications_pending_push | btree | created_at | não | sim | `(sent_push = false)` |
| public.notifications | idx_notifications_tenant | btree | tenant_id | não | sim |  |
| public.notifications | idx_notifications_tenant_created | btree | tenant_id, created_at | não | sim |  |
| public.notifications | idx_notifications_user_created | btree | user_id, created_at | não | sim |  |
| public.notifications | idx_notifications_user_unread_created | btree | user_id, created_at | não | sim | `(read = false)` |
| public.notifications | notifications_pkey | btree | id | sim | sim |  |
| public.order_contracts | idx_order_contracts_contract_id | btree | contract_id | não | sim |  |
| public.order_contracts | idx_order_contracts_tenant_id | btree | tenant_id | não | sim |  |
| public.order_contracts | order_contracts_order_id_contract_id_key | btree | order_id, contract_id | sim | sim |  |
| public.order_contracts | order_contracts_pkey | btree | id | sim | sim |  |
| public.organizations | organizations_pkey | btree | id | sim | sim |  |
| public.organizations | organizations_slug_key | btree | slug | sim | sim |  |
| public.pagamentos | idx_pagamentos_aprovador_id | btree | aprovador_id | não | sim |  |
| public.pagamentos | idx_pagamentos_cost_center_id | btree | cost_center_id | não | sim |  |
| public.pagamentos | idx_pagamentos_created_by | btree | created_by | não | sim |  |
| public.pagamentos | idx_pagamentos_dashboard | btree | status, created_at | não | sim |  |
| public.pagamentos | idx_pagamentos_fornecedor | btree | fornecedor_id | não | sim |  |
| public.pagamentos | idx_pagamentos_org_status_due | btree | organization_id, status, data_vencimento | não | sim |  |
| public.pagamentos | idx_pagamentos_pedido_id | btree | pedido_id | não | sim |  |
| public.pagamentos | idx_pagamentos_tenant | btree | tenant_id | não | sim |  |
| public.pagamentos | idx_pagamentos_vencimento_status | btree | data_vencimento, status | não | sim |  |
| public.pagamentos | pagamentos_pkey | btree | id | sim | sim |  |
| public.pagamentos | uq_pagamentos_tenant_numero | btree | tenant_id, numero | sim | sim |  |
| public.password_reset_requests | idx_password_reset_requests_email | btree | email | não | sim |  |
| public.password_reset_requests | idx_password_reset_requests_email_lower | btree |  | não | sim |  |
| public.password_reset_requests | idx_password_reset_requests_reviewed_by | btree | reviewed_by | não | sim |  |
| public.password_reset_requests | idx_password_reset_requests_status | btree | status | não | sim |  |
| public.password_reset_requests | idx_password_reset_requests_token | btree | reset_token | não | sim | `(reset_token IS NOT NULL)` |
| public.password_reset_requests | idx_password_reset_requests_user_id | btree | user_id | não | sim |  |
| public.password_reset_requests | password_reset_requests_pkey | btree | id | sim | sim |  |
| public.password_reset_requests | password_reset_requests_reset_token_key | btree | reset_token | sim | sim |  |
| public.payment_history | idx_payment_history_pagamento | btree | pagamento_id | não | sim |  |
| public.payment_history | idx_payment_history_tenant_id | btree | tenant_id | não | sim |  |
| public.payment_history | payment_history_pkey | btree | id | sim | sim |  |
| public.pedido_itens | idx_pedido_itens_pedido_id | btree | pedido_id | não | sim |  |
| public.pedido_itens | idx_pedido_itens_pim_product_id | btree | pim_product_id | não | sim |  |
| public.pedido_itens | idx_pedido_itens_produto_id | btree | produto_id | não | sim |  |
| public.pedido_itens | idx_pedido_itens_tenant | btree | tenant_id | não | sim |  |
| public.pedido_itens | idx_pedido_itens_unspsc | btree | unspsc_code | não | sim |  |
| public.pedido_itens | pedido_itens_pkey | btree | id | sim | sim |  |
| public.pedidos | idx_pedidos_aprovador_id | btree | aprovador_id | não | sim |  |
| public.pedidos | idx_pedidos_comprador_id | btree | comprador_id | não | sim |  |
| public.pedidos | idx_pedidos_cotacao_id | btree | cotacao_id | não | sim |  |
| public.pedidos | idx_pedidos_currency | btree | currency | não | sim |  |
| public.pedidos | idx_pedidos_dashboard | btree | status, data_emissao | não | sim |  |
| public.pedidos | idx_pedidos_data | btree | data_emissao | não | sim |  |
| public.pedidos | idx_pedidos_fornecedor_created | btree | fornecedor_id, created_at | não | sim |  |
| public.pedidos | idx_pedidos_org_status_created | btree | organization_id, status, created_at | não | sim |  |
| public.pedidos | idx_pedidos_solicitacao_id | btree | solicitacao_id | não | sim |  |
| public.pedidos | idx_pedidos_tenant | btree | tenant_id | não | sim |  |
| public.pedidos | idx_pedidos_tenant_status | btree | tenant_id, status | não | sim |  |
| public.pedidos | pedidos_pkey | btree | id | sim | sim |  |
| public.pedidos | uq_pedidos_tenant_numero | btree | tenant_id, numero | sim | sim |  |
| public.penalty_escalation_config | idx_penalty_escalation_config_contract_id | btree | contract_id | não | sim |  |
| public.penalty_escalation_config | idx_penalty_escalation_config_tenant_id | btree | tenant_id | não | sim |  |
| public.penalty_escalation_config | penalty_escalation_config_pkey | btree | id | sim | sim |  |
| public.permissions | permissions_module_action_key | btree | module, action | sim | sim |  |
| public.permissions | permissions_name_key | btree | name | sim | sim |  |
| public.permissions | permissions_pkey | btree | id | sim | sim |  |
| public.produto_fornecedores | idx_produto_fornecedores_fornecedor_id | btree | fornecedor_id | não | sim |  |
| public.produto_fornecedores | produto_fornecedores_pkey | btree | id | sim | sim |  |
| public.produto_fornecedores | produto_fornecedores_produto_id_fornecedor_id_key | btree | produto_id, fornecedor_id | sim | sim |  |
| public.produtos | idx_produtos_categoria | btree | categoria_id | não | sim |  |
| public.produtos | idx_produtos_cnae | btree | codigo_cnae | não | sim |  |
| public.produtos | idx_produtos_fornecedor_preferencial_id | btree | fornecedor_preferencial_id | não | sim |  |
| public.produtos | idx_produtos_org_ativo_nome | btree | organization_id, ativo, nome | não | sim |  |
| public.produtos | idx_produtos_tenant | btree | tenant_id | não | sim |  |
| public.produtos | idx_produtos_unspsc | btree | codigo_unspsc | não | sim |  |
| public.produtos | produtos_pkey | btree | id | sim | sim |  |
| public.produtos | uq_produtos_tenant_codigo | btree | tenant_id, codigo | sim | sim |  |
| public.profiles | idx_profiles_current_organization_id | btree | current_organization_id | não | sim |  |
| public.profiles | idx_profiles_email_lower | btree |  | não | sim |  |
| public.profiles | idx_profiles_empresa_default_id | btree | empresa_default_id | não | sim |  |
| public.profiles | idx_profiles_phone | btree | phone | não | sim | `(phone IS NOT NULL)` |
| public.profiles | idx_profiles_tenant_id | btree | tenant_id | não | sim |  |
| public.profiles | profiles_pkey | btree | id | sim | sim |  |
| public.profiles | profiles_user_id_key | btree | user_id | sim | sim |  |
| public.punchout_catalogs | idx_punchout_catalogs_fornecedor_id | btree | fornecedor_id | não | sim |  |
| public.punchout_catalogs | idx_punchout_catalogs_tenant | btree | tenant_id | não | sim |  |
| public.punchout_catalogs | punchout_catalogs_pkey | btree | id | sim | sim |  |
| public.punchout_sessions | idx_punchout_sessions_catalog_id | btree | catalog_id | não | sim |  |
| public.punchout_sessions | idx_punchout_sessions_created_solicitacao_id | btree | created_solicitacao_id | não | sim |  |
| public.punchout_sessions | idx_punchout_sessions_tenant | btree | tenant_id | não | sim |  |
| public.punchout_sessions | idx_punchout_sessions_user_id | btree | user_id | não | sim |  |
| public.punchout_sessions | punchout_sessions_buyer_cookie_key | btree | buyer_cookie | sim | sim |  |
| public.punchout_sessions | punchout_sessions_pkey | btree | id | sim | sim |  |
| public.push_subscriptions | push_subscriptions_pkey | btree | id | sim | sim |  |
| public.push_subscriptions | push_subscriptions_user_id_endpoint_key | btree | user_id, endpoint | sim | sim |  |
| public.qualification_history | idx_qualification_history_fornecedor_id | btree | fornecedor_id | não | sim |  |
| public.qualification_history | qualification_history_pkey | btree | id | sim | sim |  |
| public.qualification_requirements | qualification_requirements_pkey | btree | id | sim | sim |  |
| public.query_telemetry | brin_query_telemetry_created_at | brin | created_at | não | sim |  |
| public.query_telemetry | idx_query_telemetry_created_at | btree | created_at | não | sim |  |
| public.query_telemetry | idx_query_telemetry_severity | btree | severity | não | sim |  |
| public.query_telemetry | idx_query_telemetry_table | btree | table_name | não | sim |  |
| public.query_telemetry | query_telemetry_pkey | btree | id | sim | sim |  |
| public.rate_limit_logs | brin_rate_limit_logs_created | brin | created_at | não | sim |  |
| public.rate_limit_logs | idx_rate_limit_logs_created | btree | created_at | não | sim |  |
| public.rate_limit_logs | idx_rate_limit_logs_ident_endpoint_window | btree | ip_address, endpoint, window_start | não | sim |  |
| public.rate_limit_logs | idx_rate_limit_logs_user_id | btree | user_id | não | sim |  |
| public.rate_limit_logs | rate_limit_logs_pkey | btree | id | sim | sim |  |
| public.receiving_checklists | idx_receiving_checklists_contract_id | btree | contract_id | não | sim |  |
| public.receiving_checklists | idx_receiving_checklists_fornecedor_id | btree | fornecedor_id | não | sim |  |
| public.receiving_checklists | idx_receiving_checklists_pedido_id | btree | pedido_id | não | sim |  |
| public.receiving_checklists | idx_receiving_checklists_tenant_id | btree | tenant_id | não | sim |  |
| public.receiving_checklists | receiving_checklists_pkey | btree | id | sim | sim |  |
| public.repurchase_suggestions | idx_repurchase_suggestions_fornecedor_id | btree | fornecedor_id | não | sim |  |
| public.repurchase_suggestions | idx_repurchase_suggestions_produto_id | btree | produto_id | não | sim |  |
| public.repurchase_suggestions | idx_repurchase_suggestions_tenant_status | btree | tenant_id, status, proxima_compra_estimada | não | sim |  |
| public.repurchase_suggestions | idx_repurchase_suggestions_ultimo_pedido_id | btree | ultimo_pedido_id | não | sim |  |
| public.repurchase_suggestions | repurchase_suggestions_pkey | btree | id | sim | sim |  |
| public.role_permissions | idx_role_permissions_created_by | btree | created_by | não | sim |  |
| public.role_permissions | idx_role_permissions_permission_id | btree | permission_id | não | sim |  |
| public.role_permissions | role_permissions_pkey | btree | id | sim | sim |  |
| public.role_permissions | role_permissions_role_permission_id_key | btree | role, permission_id | sim | sim |  |
| public.saved_filters | idx_saved_filters_default | btree | user_id, entity_type, is_default | não | sim | `(is_default = true)` |
| public.saved_filters | idx_saved_filters_entity_type | btree | entity_type | não | sim |  |
| public.saved_filters | idx_saved_filters_user_entity | btree | user_id, entity_type | não | sim |  |
| public.saved_filters | saved_filters_pkey | btree | id | sim | sim |  |
| public.saved_filters | unique_filter_name_per_user_entity | btree | user_id, entity_type, name | sim | sim |  |
| public.savings_tracker | idx_savings_tracker_project_id | btree | project_id | não | sim |  |
| public.savings_tracker | idx_savings_tracker_tenant_id | btree | tenant_id | não | sim |  |
| public.savings_tracker | savings_tracker_pkey | btree | id | sim | sim |  |
| public.scim_provisioning_log | idx_scim_provisioning_log_tenant_id | btree | tenant_id | não | sim |  |
| public.scim_provisioning_log | scim_provisioning_log_pkey | btree | id | sim | sim |  |
| public.secret_rotation_schedule | idx_secret_rotation_next_due | btree | next_due_at | não | sim |  |
| public.secret_rotation_schedule | idx_secret_rotation_schedule_owner_user_id | btree | owner_user_id | não | sim |  |
| public.secret_rotation_schedule | secret_rotation_schedule_pkey | btree | id | sim | sim |  |
| public.secret_rotation_schedule | secret_rotation_schedule_secret_name_key | btree | secret_name | sim | sim |  |
| public.security_definer_baseline | security_definer_baseline_function_signature_key | btree | function_signature | sim | sim |  |
| public.security_definer_baseline | security_definer_baseline_pkey | btree | id | sim | sim |  |
| public.security_logs | idx_security_logs_created | btree | created_at | não | sim |  |
| public.security_logs | idx_security_logs_event | btree | event_type | não | sim |  |
| public.security_logs | idx_security_logs_user | btree | user_id | não | sim |  |
| public.security_logs | security_logs_pkey | btree | id | sim | sim |  |
| public.solicitacoes | idx_solicitacoes_aprovador | btree | aprovador_id | não | sim |  |
| public.solicitacoes | idx_solicitacoes_categoria_id | btree | categoria_id | não | sim |  |
| public.solicitacoes | idx_solicitacoes_cost_center | btree | cost_center_id | não | sim |  |
| public.solicitacoes | idx_solicitacoes_dashboard | btree | status, created_at | não | sim |  |
| public.solicitacoes | idx_solicitacoes_data | btree | created_at | não | sim |  |
| public.solicitacoes | idx_solicitacoes_external_ref | btree | external_ref | sim | sim | `(external_ref IS NOT NULL)` |
| public.solicitacoes | idx_solicitacoes_fornecedor_id | btree | fornecedor_id | não | sim |  |
| public.solicitacoes | idx_solicitacoes_org_status_created | btree | organization_id, status, created_at | não | sim |  |
| public.solicitacoes | idx_solicitacoes_pim_product_id | btree | pim_product_id | não | sim |  |
| public.solicitacoes | idx_solicitacoes_produto_id | btree | produto_id | não | sim |  |
| public.solicitacoes | idx_solicitacoes_solicitante | btree | solicitante_id | não | sim |  |
| public.solicitacoes | idx_solicitacoes_tenant | btree | tenant_id | não | sim |  |
| public.solicitacoes | idx_solicitacoes_tenant_priority | btree | tenant_id, prioridade | não | sim |  |
| public.solicitacoes | solicitacoes_pkey | btree | id | sim | sim |  |
| public.solicitacoes | uq_solicitacoes_tenant_numero | btree | tenant_id, numero | sim | sim |  |
| public.sourcing_awards | idx_sourcing_awards_approved_by | btree | approved_by | não | sim |  |
| public.sourcing_awards | idx_sourcing_awards_event_id | btree | event_id | não | sim |  |
| public.sourcing_awards | idx_sourcing_awards_fornecedor_id | btree | fornecedor_id | não | sim |  |
| public.sourcing_awards | idx_sourcing_awards_lot_id | btree | lot_id | não | sim |  |
| public.sourcing_awards | idx_sourcing_awards_pedido_id | btree | pedido_id | não | sim |  |
| public.sourcing_awards | idx_sourcing_awards_tenant_id | btree | tenant_id | não | sim |  |
| public.sourcing_awards | idx_sourcing_awards_winner_response_id | btree | winner_response_id | não | sim |  |
| public.sourcing_awards | sourcing_awards_pkey | btree | id | sim | sim |  |
| public.sourcing_event_criteria | idx_sourcing_event_criteria_event_id | btree | event_id | não | sim |  |
| public.sourcing_event_criteria | idx_sourcing_event_criteria_tenant_id | btree | tenant_id | não | sim |  |
| public.sourcing_event_criteria | sourcing_event_criteria_pkey | btree | id | sim | sim |  |
| public.sourcing_event_lots | idx_sourcing_event_lots_event_id | btree | event_id | não | sim |  |
| public.sourcing_event_lots | idx_sourcing_event_lots_tenant_id | btree | tenant_id | não | sim |  |
| public.sourcing_event_lots | sourcing_event_lots_pkey | btree | id | sim | sim |  |
| public.sourcing_event_questions | idx_sourcing_event_questions_event_id | btree | event_id | não | sim |  |
| public.sourcing_event_questions | idx_sourcing_event_questions_tenant_id | btree | tenant_id | não | sim |  |
| public.sourcing_event_questions | sourcing_event_questions_pkey | btree | id | sim | sim |  |
| public.sourcing_events | idx_sourcing_events_category_id | btree | category_id | não | sim |  |
| public.sourcing_events | idx_sourcing_events_organization_id | btree | organization_id | não | sim |  |
| public.sourcing_events | idx_sourcing_events_owner_id | btree | owner_id | não | sim |  |
| public.sourcing_events | idx_sourcing_events_tenant_id | btree | tenant_id | não | sim |  |
| public.sourcing_events | sourcing_events_numero_key | btree | numero | sim | sim |  |
| public.sourcing_events | sourcing_events_pkey | btree | id | sim | sim |  |
| public.sourcing_invitations | idx_sourcing_invitations_fornecedor_id | btree | fornecedor_id | não | sim |  |
| public.sourcing_invitations | idx_sourcing_invitations_tenant_id | btree | tenant_id | não | sim |  |
| public.sourcing_invitations | sourcing_invitations_event_id_fornecedor_id_key | btree | event_id, fornecedor_id | sim | sim |  |
| public.sourcing_invitations | sourcing_invitations_pkey | btree | id | sim | sim |  |
| public.sourcing_invitations | sourcing_invitations_token_key | btree | token | sim | sim |  |
| public.sourcing_pipeline | idx_pipeline_status | btree | status | não | sim |  |
| public.sourcing_pipeline | idx_sourcing_pipeline_categoria_id | btree | categoria_id | não | sim |  |
| public.sourcing_pipeline | idx_sourcing_pipeline_comprador_id | btree | comprador_id | não | sim |  |
| public.sourcing_pipeline | idx_sourcing_pipeline_organization_id | btree | organization_id | não | sim |  |
| public.sourcing_pipeline | idx_sourcing_pipeline_tenant_id | btree | tenant_id | não | sim |  |
| public.sourcing_pipeline | sourcing_pipeline_pkey | btree | id | sim | sim |  |
| public.sourcing_projects | idx_sourcing_projects_category_id | btree | category_id | não | sim |  |
| public.sourcing_projects | idx_sourcing_projects_owner_id | btree | owner_id | não | sim |  |
| public.sourcing_projects | idx_sourcing_projects_tenant_id | btree | tenant_id | não | sim |  |
| public.sourcing_projects | sourcing_projects_pkey | btree | id | sim | sim |  |
| public.sourcing_response_answers | idx_sourcing_response_answers_question_id | btree | question_id | não | sim |  |
| public.sourcing_response_answers | idx_sourcing_response_answers_tenant_id | btree | tenant_id | não | sim |  |
| public.sourcing_response_answers | sourcing_response_answers_pkey | btree | id | sim | sim |  |
| public.sourcing_response_answers | sourcing_response_answers_response_id_question_id_key | btree | response_id, question_id | sim | sim |  |
| public.sourcing_response_items | idx_sourcing_response_items_lot_id | btree | lot_id | não | sim |  |
| public.sourcing_response_items | idx_sourcing_response_items_tenant_id | btree | tenant_id | não | sim |  |
| public.sourcing_response_items | sourcing_response_items_pkey | btree | id | sim | sim |  |
| public.sourcing_response_items | sourcing_response_items_response_id_lot_id_key | btree | response_id, lot_id | sim | sim |  |
| public.sourcing_responses | idx_sourcing_responses_fornecedor_id | btree | fornecedor_id | não | sim |  |
| public.sourcing_responses | idx_sourcing_responses_invitation_id | btree | invitation_id | não | sim |  |
| public.sourcing_responses | idx_sourcing_responses_tenant_id | btree | tenant_id | não | sim |  |
| public.sourcing_responses | sourcing_responses_event_id_fornecedor_id_key | btree | event_id, fornecedor_id | sim | sim |  |
| public.sourcing_responses | sourcing_responses_pkey | btree | id | sim | sim |  |
| public.spend_forecasts | idx_forecast_date | btree | forecast_date | não | sim |  |
| public.spend_forecasts | idx_spend_forecasts_categoria_id | btree | categoria_id | não | sim |  |
| public.spend_forecasts | idx_spend_forecasts_organization_id | btree | organization_id | não | sim |  |
| public.spend_forecasts | idx_spend_forecasts_tenant_id | btree | tenant_id | não | sim |  |
| public.spend_forecasts | spend_forecasts_pkey | btree | id | sim | sim |  |
| public.spot_api_sync_log | idx_spot_sync_log_created | btree | created_at | não | sim |  |
| public.spot_api_sync_log | idx_spot_sync_log_endpoint_day | btree | endpoint, called_at | não | sim |  |
| public.spot_api_sync_log | spot_api_sync_log_pkey | btree | id | sim | sim |  |
| public.spot_customization_options | idx_spot_custom_default | btree | product_reference | não | sim | `is_default` |
| public.spot_customization_options | idx_spot_custom_product_ref | btree | product_reference | não | sim |  |
| public.spot_customization_options | spot_customization_options_pkey | btree | id | sim | sim |  |
| public.spot_customization_options | spot_customization_options_service_code_key | btree | service_code | sim | sim |  |
| public.spot_estoque | idx_spot_estoque_product_ref | btree | product_reference | não | sim |  |
| public.spot_estoque | spot_estoque_pkey | btree | id | sim | sim |  |
| public.spot_estoque | spot_estoque_sku_key | btree | sku | sim | sim |  |
| public.spot_pedidos | idx_spot_pedidos_internal_ref | btree | internal_reference | sim | sim | `(internal_reference IS NOT NULL)` |
| public.spot_pedidos | spot_pedidos_pkey | btree | id | sim | sim |  |
| public.spot_pedidos | spot_pedidos_spot_order_id_key | btree | spot_order_id | sim | sim |  |
| public.spot_produtos | idx_spot_produtos_catalogs | gin | catalogs | não | sim |  |
| public.spot_produtos | idx_spot_produtos_name | gin |  | não | sim |  |
| public.spot_produtos | idx_spot_produtos_type_legacy | btree | type_code_legacy | não | sim |  |
| public.spot_produtos | idx_spot_produtos_type_new | btree | type_code_new | não | sim |  |
| public.spot_produtos | spot_produtos_pkey | btree | id | sim | sim |  |
| public.spot_produtos | spot_produtos_reference_key | btree | reference | sim | sim |  |
| public.spot_sessions | spot_sessions_pkey | btree | id | sim | sim |  |
| public.spot_skus | idx_spot_skus_product_ref | btree | product_reference | não | sim |  |
| public.spot_skus | spot_skus_pkey | btree | id | sim | sim |  |
| public.spot_skus | spot_skus_sku_key | btree | sku | sim | sim |  |
| public.sso_configurations | idx_sso_email_domains | gin | email_domains | não | sim |  |
| public.sso_configurations | sso_configurations_pkey | btree | id | sim | sim |  |
| public.sso_configurations | sso_configurations_tenant_id_protocol_key | btree | tenant_id, protocol | sim | sim |  |
| public.supplier_bonifications | idx_supplier_bonifications_contract_id | btree | contract_id | não | sim |  |
| public.supplier_bonifications | idx_supplier_bonifications_fornecedor_id | btree | fornecedor_id | não | sim |  |
| public.supplier_bonifications | idx_supplier_bonifications_tenant_id | btree | tenant_id | não | sim |  |
| public.supplier_bonifications | supplier_bonifications_pkey | btree | id | sim | sim |  |
| public.supplier_documents | idx_supplier_documents_requirement_id | btree | requirement_id | não | sim |  |
| public.supplier_documents | idx_supplier_documents_tenant_id | btree | tenant_id | não | sim |  |
| public.supplier_documents | supplier_documents_fornecedor_id_requirement_id_key | btree | fornecedor_id, requirement_id | sim | sim |  |
| public.supplier_documents | supplier_documents_pkey | btree | id | sim | sim |  |
| public.supplier_qualification_scores | idx_supplier_qualification_scores_tenant_id | btree | tenant_id | não | sim |  |
| public.supplier_qualification_scores | supplier_qualification_scores_fornecedor_id_key | btree | fornecedor_id | sim | sim |  |
| public.supplier_qualification_scores | supplier_qualification_scores_pkey | btree | id | sim | sim |  |
| public.system_alerts | idx_system_alerts_created_desc | btree | created_at | não | sim |  |
| public.system_alerts | idx_system_alerts_pending_dispatch | btree | created_at | não | sim | `((dispatched_at IS NULL) AND (severity = ANY (ARRAY['HIGH'::text, 'CRITICAL'::text, 'EMERGENCY'::text, 'high'::text, 'critical'::text, 'emergency'::text])))` |
| public.system_alerts | idx_system_alerts_type_created | btree | alert_type, created_at | não | sim |  |
| public.system_alerts | system_alerts_pkey | btree | id | sim | sim |  |
| public.system_alerts | uq_system_alerts_open_scan_sla | btree | alert_type | sim | sim | `((resolved_at IS NULL) AND (alert_type = ANY (ARRAY['scan_sla_late'::text, 'scan_sla_critical'::text])) AND (metadata ? 'scan_name'::text))` |
| public.table_size_snapshots | brin_table_size_snapshots_captured | brin | captured_at | não | sim |  |
| public.table_size_snapshots | idx_table_size_snapshots_captured | btree | schema_name, table_name, captured_at | não | sim |  |
| public.table_size_snapshots | table_size_snapshots_pkey | btree | id | sim | sim |  |
| public.telemetry_logs | brin_telemetry_logs_created | brin | created_at | não | sim |  |
| public.telemetry_logs | idx_telemetry_logs_created_at | btree | created_at | não | sim |  |
| public.telemetry_logs | idx_telemetry_logs_level | btree | level | não | sim |  |
| public.telemetry_logs | idx_telemetry_logs_user_id | btree | user_id | não | sim |  |
| public.telemetry_logs | telemetry_logs_pkey | btree | id, created_at | sim | sim |  |
| public.telemetry_logs_202605 | telemetry_logs_202605_created_at_idx | btree | created_at | não | sim |  |
| public.telemetry_logs_202605 | telemetry_logs_202605_created_at_idx1 | brin | created_at | não | sim |  |
| public.telemetry_logs_202605 | telemetry_logs_202605_level_idx | btree | level | não | sim |  |
| public.telemetry_logs_202605 | telemetry_logs_202605_pkey | btree | id, created_at | sim | sim |  |
| public.telemetry_logs_202605 | telemetry_logs_202605_user_id_idx | btree | user_id | não | sim |  |
| public.telemetry_logs_202606 | telemetry_logs_202606_created_at_idx | btree | created_at | não | sim |  |
| public.telemetry_logs_202606 | telemetry_logs_202606_created_at_idx1 | brin | created_at | não | sim |  |
| public.telemetry_logs_202606 | telemetry_logs_202606_level_idx | btree | level | não | sim |  |
| public.telemetry_logs_202606 | telemetry_logs_202606_pkey | btree | id, created_at | sim | sim |  |
| public.telemetry_logs_202606 | telemetry_logs_202606_user_id_idx | btree | user_id | não | sim |  |
| public.telemetry_logs_202607 | telemetry_logs_202607_created_at_idx | btree | created_at | não | sim |  |
| public.telemetry_logs_202607 | telemetry_logs_202607_created_at_idx1 | brin | created_at | não | sim |  |
| public.telemetry_logs_202607 | telemetry_logs_202607_level_idx | btree | level | não | sim |  |
| public.telemetry_logs_202607 | telemetry_logs_202607_pkey | btree | id, created_at | sim | sim |  |
| public.telemetry_logs_202607 | telemetry_logs_202607_user_id_idx | btree | user_id | não | sim |  |
| public.telemetry_logs_202608 | telemetry_logs_202608_created_at_idx | btree | created_at | não | sim |  |
| public.telemetry_logs_202608 | telemetry_logs_202608_created_at_idx1 | brin | created_at | não | sim |  |
| public.telemetry_logs_202608 | telemetry_logs_202608_level_idx | btree | level | não | sim |  |
| public.telemetry_logs_202608 | telemetry_logs_202608_pkey | btree | id, created_at | sim | sim |  |
| public.telemetry_logs_202608 | telemetry_logs_202608_user_id_idx | btree | user_id | não | sim |  |
| public.telemetry_logs_202609 | telemetry_logs_202609_created_at_idx | btree | created_at | não | sim |  |
| public.telemetry_logs_202609 | telemetry_logs_202609_created_at_idx1 | brin | created_at | não | sim |  |
| public.telemetry_logs_202609 | telemetry_logs_202609_level_idx | btree | level | não | sim |  |
| public.telemetry_logs_202609 | telemetry_logs_202609_pkey | btree | id, created_at | sim | sim |  |
| public.telemetry_logs_202609 | telemetry_logs_202609_user_id_idx | btree | user_id | não | sim |  |
| public.telemetry_logs_legacy_20260712 | brin_telemetry_logs_legacy_created | brin | created_at | não | sim |  |
| public.telemetry_logs_legacy_20260712 | idx_telemetry_logs_legacy_created_at | btree | created_at | não | sim |  |
| public.telemetry_logs_legacy_20260712 | idx_telemetry_logs_legacy_level | btree | level | não | sim |  |
| public.telemetry_logs_legacy_20260712 | idx_telemetry_logs_legacy_user_id | btree | user_id | não | sim |  |
| public.telemetry_logs_legacy_20260712 | telemetry_logs_legacy_20260712_pkey | btree | id | sim | sim |  |
| public.temp_file_snapshots | idx_temp_file_snapshots_captured_at | btree | captured_at | não | sim |  |
| public.temp_file_snapshots | temp_file_snapshots_pkey | btree | id | sim | sim |  |
| public.tenants | idx_tenants_default_currency | btree | default_currency | não | sim |  |
| public.tenants | idx_tenants_organization_id | btree | organization_id | não | sim |  |
| public.tenants | idx_tenants_regime | btree | regime_tributario | não | sim |  |
| public.tenants | idx_tenants_status | btree | status | não | sim | `(status = 'active'::tenant_status)` |
| public.tenants | tenants_pkey | btree | id | sim | sim |  |
| public.tenants | tenants_slug_key | btree | slug | sim | sim |  |
| public.tenants | uq_tenants_cnpj | btree | cnpj | sim | sim | `(cnpj IS NOT NULL)` |
| public.unspsc_codes | idx_unspsc_codes_parent_code | btree | parent_code | não | sim |  |
| public.unspsc_codes | idx_unspsc_codes_tenant_id | btree | tenant_id | não | sim |  |
| public.unspsc_codes | unspsc_codes_pkey | btree | code | sim | sim |  |
| public.user_filter_preferences | user_filter_preferences_pkey | btree | id | sim | sim |  |
| public.user_filter_preferences | user_filter_preferences_user_id_scope_key | btree | user_id, scope | sim | sim |  |
| public.user_organizations | idx_user_organizations_organization_id | btree | organization_id | não | sim |  |
| public.user_organizations | user_organizations_pkey | btree | id | sim | sim |  |
| public.user_organizations | user_organizations_user_id_organization_id_key | btree | user_id, organization_id | sim | sim |  |
| public.user_roles | user_roles_pkey | btree | id | sim | sim |  |
| public.user_roles | user_roles_user_id_role_key | btree | user_id, role | sim | sim |  |
| public.user_tenants | idx_user_tenants_one_default | btree | user_id | sim | sim | `(is_default = true)` |
| public.user_tenants | idx_user_tenants_tenant_id | btree | tenant_id | não | sim |  |
| public.user_tenants | idx_user_tenants_user | btree | user_id | não | sim |  |
| public.user_tenants | user_tenants_pkey | btree | user_id, tenant_id | sim | sim |  |
| public.user_tour_preferences | user_tour_preferences_pkey | btree | id | sim | sim |  |
| public.user_tour_preferences | user_tour_preferences_user_id_tour_key_key | btree | user_id, tour_key | sim | sim |  |
| public.wal_rate_snapshots | idx_wal_rate_snapshots_captured_at | btree | captured_at | não | sim |  |
| public.wal_rate_snapshots | wal_rate_snapshots_pkey | btree | id | sim | sim |  |
| public.webauthn_challenges | idx_webauthn_challenges_user_id | btree | user_id | não | sim |  |
| public.webauthn_challenges | webauthn_challenges_pkey | btree | id | sim | sim |  |
| public.webauthn_credentials | idx_webauthn_credentials_user_id | btree | user_id | não | sim |  |
| public.webauthn_credentials | webauthn_credentials_credential_id_key | btree | credential_id | sim | sim |  |
| public.webauthn_credentials | webauthn_credentials_pkey | btree | id | sim | sim |  |
| public.webhook_events | idx_webhook_events_source_created | btree | source, created_at | não | sim |  |
| public.webhook_events | webhook_events_pkey | btree | id | sim | sim |  |
| public.webhook_events | webhook_events_source_idempotency_key_key | btree | source, idempotency_key | sim | sim |  |
| public.workflow_approvals | idx_workflow_approvals_approver_id | btree | approver_id | não | sim |  |
| public.workflow_approvals | idx_workflow_approvals_instance_node_approver | btree | instance_id, node_id, approver_id | não | sim |  |
| public.workflow_approvals | idx_workflow_approvals_node_id | btree | node_id | não | sim |  |
| public.workflow_approvals | idx_workflow_approvals_tenant_id | btree | tenant_id | não | sim |  |
| public.workflow_approvals | workflow_approvals_pkey | btree | id | sim | sim |  |
| public.workflow_audit_log | idx_workflow_audit_log_actor_id | btree | actor_id | não | sim |  |
| public.workflow_audit_log | idx_workflow_audit_log_instance_id | btree | instance_id | não | sim |  |
| public.workflow_audit_log | idx_workflow_audit_log_task_id | btree | task_id | não | sim |  |
| public.workflow_audit_log | idx_workflow_audit_log_tenant_id | btree | tenant_id | não | sim |  |
| public.workflow_audit_log | workflow_audit_log_pkey | btree | id | sim | sim |  |
| public.workflow_edges | idx_workflow_edges_source_target | btree | source_node_id, target_node_id | não | sim |  |
| public.workflow_edges | idx_workflow_edges_target_node_id | btree | target_node_id | não | sim |  |
| public.workflow_edges | idx_workflow_edges_template_id | btree | template_id | não | sim |  |
| public.workflow_edges | idx_workflow_edges_tenant_id | btree | tenant_id | não | sim |  |
| public.workflow_edges | workflow_edges_pkey | btree | id | sim | sim |  |
| public.workflow_instances | idx_workflow_instances_current_node_id | btree | current_node_id | não | sim |  |
| public.workflow_instances | idx_workflow_instances_entity | btree | entity_type, entity_id | não | sim |  |
| public.workflow_instances | idx_workflow_instances_template_id | btree | template_id | não | sim |  |
| public.workflow_instances | idx_workflow_instances_tenant_id | btree | tenant_id | não | sim |  |
| public.workflow_instances | workflow_instances_pkey | btree | id | sim | sim |  |
| public.workflow_logs | idx_workflow_logs_instance_node | btree | instance_id, node_id | não | sim |  |
| public.workflow_logs | idx_workflow_logs_node_id | btree | node_id | não | sim |  |
| public.workflow_logs | idx_workflow_logs_tenant_id | btree | tenant_id | não | sim |  |
| public.workflow_logs | workflow_logs_pkey | btree | id | sim | sim |  |
| public.workflow_nodes | idx_workflow_nodes_template_id | btree | template_id | não | sim |  |
| public.workflow_nodes | idx_workflow_nodes_tenant_id | btree | tenant_id | não | sim |  |
| public.workflow_nodes | workflow_nodes_pkey | btree | id | sim | sim |  |
| public.workflow_sod_rules | idx_workflow_sod_rules_tenant_id | btree | tenant_id | não | sim |  |
| public.workflow_sod_rules | workflow_sod_rules_pkey | btree | id | sim | sim |  |
| public.workflow_tasks | idx_workflow_tasks_assigned_user | btree | assigned_to_user | não | sim | `(status = 'pending'::text)` |
| public.workflow_tasks | idx_workflow_tasks_completed_by | btree | completed_by | não | sim |  |
| public.workflow_tasks | idx_workflow_tasks_instance | btree | instance_id | não | sim |  |
| public.workflow_tasks | idx_workflow_tasks_tenant_id | btree | tenant_id | não | sim |  |
| public.workflow_tasks | workflow_tasks_pkey | btree | id | sim | sim |  |
| public.workflow_templates | idx_workflow_templates_tenant_id | btree | tenant_id | não | sim |  |
| public.workflow_templates | workflow_templates_pkey | btree | id | sim | sim |  |
| public.xbz_carrinho_log | idx_xbz_carrinho_log_tenant | btree | tenant_id, created_at | não | sim |  |
| public.xbz_carrinho_log | xbz_carrinho_log_pkey | btree | id | sim | sim |  |
| public.xbz_cores | xbz_cores_pkey | btree | id | sim | sim |  |
| public.xbz_credentials | xbz_credentials_pkey | btree | id | sim | sim |  |
| public.xbz_credentials | xbz_credentials_tenant_id_key | btree | tenant_id | sim | sim |  |
| public.xbz_pedido_status_history | idx_xbz_status_history_pedido | btree | tenant_id, pedido_numero, detectado_em | não | sim |  |
| public.xbz_pedido_status_history | xbz_pedido_status_history_pkey | btree | id | sim | sim |  |
| public.xbz_pedidos | idx_xbz_pedidos_emissao | btree | tenant_id, data_emissao | não | sim |  |
| public.xbz_pedidos | idx_xbz_pedidos_pagamento | btree | tenant_id, id_lote_debito_status | não | sim |  |
| public.xbz_pedidos | xbz_pedidos_pkey | btree | id | sim | sim |  |
| public.xbz_pedidos | xbz_pedidos_tenant_id_pedido_numero_key | btree | tenant_id, pedido_numero | sim | sim |  |
| public.xbz_produto_fiscal | xbz_produto_fiscal_pkey | btree | id | sim | sim |  |
| public.xbz_produto_fiscal | xbz_produto_fiscal_tenant_id_produto_id_key | btree | tenant_id, produto_id | sim | sim |  |
| public.xbz_produtos | idx_xbz_produtos_last_synced | btree | tenant_id, last_synced_at | não | sim |  |
| public.xbz_produtos | idx_xbz_produtos_nome_lower | btree | tenant_id | não | sim |  |
| public.xbz_produtos | idx_xbz_produtos_sku | btree | tenant_id, sku | não | sim |  |
| public.xbz_produtos | xbz_produtos_pkey | btree | id | sim | sim |  |
| public.xbz_produtos | xbz_produtos_tenant_id_produto_id_key | btree | tenant_id, produto_id | sim | sim |  |
