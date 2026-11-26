# Relacionamentos (chaves estrangeiras)


| de | colunas | para | colunas | on delete | on update |
|---|---|---|---|---|---|
| public.active_sessions | tenant_id | public.tenants | id | NO ACTION | NO ACTION |
| public.active_sessions | user_id | auth.users | id | CASCADE | NO ACTION |
| public.alert_subscriptions | user_id | auth.users | id | CASCADE | NO ACTION |
| public.aliquotas_tributarias | organization_id | public.organizations | id | CASCADE | NO ACTION |
| public.allowed_countries | added_by | auth.users | id | NO ACTION | NO ACTION |
| public.approval_delegations | delegado_id | auth.users | id | NO ACTION | NO ACTION |
| public.approval_delegations | delegante_id | auth.users | id | NO ACTION | NO ACTION |
| public.approval_delegations | organization_id | public.organizations | id | NO ACTION | NO ACTION |
| public.approval_delegations | tenant_id | public.tenants | id | NO ACTION | NO ACTION |
| public.approval_hierarchy | cost_center_id | public.cost_centers | id | NO ACTION | NO ACTION |
| public.approval_hierarchy | superior_id | auth.users | id | NO ACTION | NO ACTION |
| public.approval_hierarchy | tenant_id | public.tenants | id | NO ACTION | NO ACTION |
| public.approval_hierarchy | user_id | auth.users | id | NO ACTION | NO ACTION |
| public.approval_history | solicitacao_id | public.solicitacoes | id | SET NULL | NO ACTION |
| public.approval_history | step_id | public.approval_steps | id | SET NULL | NO ACTION |
| public.approval_history | tenant_id | public.tenants | id | NO ACTION | NO ACTION |
| public.approval_history | usuario_id | auth.users | id | SET NULL | NO ACTION |
| public.approval_history | workflow_id | public.approval_workflows | id | SET NULL | NO ACTION |
| public.approval_rules | categoria_id | public.categorias | id | NO ACTION | NO ACTION |
| public.approval_rules | cost_center_id | public.cost_centers | id | NO ACTION | NO ACTION |
| public.approval_rules | escalacao_para | auth.users | id | NO ACTION | NO ACTION |
| public.approval_rules | organization_id | public.organizations | id | NO ACTION | NO ACTION |
| public.approval_rules | tenant_id | public.tenants | id | NO ACTION | NO ACTION |
| public.approval_steps | aprovador_efetivo_id | auth.users | id | NO ACTION | NO ACTION |
| public.approval_steps | aprovador_id | auth.users | id | NO ACTION | NO ACTION |
| public.approval_steps | delegacao_id | public.approval_delegations | id | NO ACTION | NO ACTION |
| public.approval_steps | organization_id | public.organizations | id | NO ACTION | NO ACTION |
| public.approval_steps | tenant_id | public.tenants | id | NO ACTION | NO ACTION |
| public.approval_steps | workflow_id | public.approval_workflows | id | CASCADE | NO ACTION |
| public.approval_workflows | categoria_id | public.categorias | id | NO ACTION | NO ACTION |
| public.approval_workflows | organization_id | public.organizations | id | NO ACTION | NO ACTION |
| public.approval_workflows | rule_id | public.approval_rules | id | NO ACTION | NO ACTION |
| public.approval_workflows | solicitacao_id | public.solicitacoes | id | CASCADE | NO ACTION |
| public.approval_workflows | tenant_id | public.tenants | id | NO ACTION | NO ACTION |
| public.auction_bids | event_id | public.sourcing_events | id | CASCADE | NO ACTION |
| public.auction_bids | fornecedor_id | public.fornecedores | id | NO ACTION | NO ACTION |
| public.auction_bids | invitation_id | public.sourcing_invitations | id | NO ACTION | NO ACTION |
| public.auction_bids | lot_id | public.sourcing_event_lots | id | NO ACTION | NO ACTION |
| public.auction_bids | tenant_id | public.tenants | id | NO ACTION | NO ACTION |
| public.audit_logs | organization_id | public.organizations | id | NO ACTION | NO ACTION |
| public.audit_logs | tenant_id | public.tenants | id | NO ACTION | NO ACTION |
| public.audit_logs | user_id | auth.users | id | SET NULL | NO ACTION |
| public.audit_logs_202605 | organization_id | public.organizations | id | NO ACTION | NO ACTION |
| public.audit_logs_202605 | tenant_id | public.tenants | id | NO ACTION | NO ACTION |
| public.audit_logs_202605 | user_id | auth.users | id | SET NULL | NO ACTION |
| public.audit_logs_202606 | organization_id | public.organizations | id | NO ACTION | NO ACTION |
| public.audit_logs_202606 | tenant_id | public.tenants | id | NO ACTION | NO ACTION |
| public.audit_logs_202606 | user_id | auth.users | id | SET NULL | NO ACTION |
| public.audit_logs_202607 | organization_id | public.organizations | id | NO ACTION | NO ACTION |
| public.audit_logs_202607 | tenant_id | public.tenants | id | NO ACTION | NO ACTION |
| public.audit_logs_202607 | user_id | auth.users | id | SET NULL | NO ACTION |
| public.audit_logs_202608 | organization_id | public.organizations | id | NO ACTION | NO ACTION |
| public.audit_logs_202608 | tenant_id | public.tenants | id | NO ACTION | NO ACTION |
| public.audit_logs_202608 | user_id | auth.users | id | SET NULL | NO ACTION |
| public.audit_logs_202609 | organization_id | public.organizations | id | NO ACTION | NO ACTION |
| public.audit_logs_202609 | tenant_id | public.tenants | id | NO ACTION | NO ACTION |
| public.audit_logs_202609 | user_id | auth.users | id | SET NULL | NO ACTION |
| public.blocked_countries | blocked_by | auth.users | id | NO ACTION | NO ACTION |
| public.blocked_ips | blocked_by | auth.users | id | NO ACTION | NO ACTION |
| public.budget_audit_logs | budget_id | public.department_budgets | id | CASCADE | NO ACTION |
| public.budget_audit_logs | user_id | auth.users | id | NO ACTION | NO ACTION |
| public.budget_transactions | cost_center_id | public.cost_centers | id | CASCADE | NO ACTION |
| public.budget_transactions | created_by | auth.users | id | NO ACTION | NO ACTION |
| public.budget_transactions | tenant_id | public.tenants | id | NO ACTION | NO ACTION |
| public.categorias | codigo_unspsc | public.unspsc_codes | code | NO ACTION | NO ACTION |
| public.categorias | organization_id | public.organizations | id | NO ACTION | NO ACTION |
| public.categorias | tenant_id | public.tenants | id | NO ACTION | NO ACTION |
| public.category_strategies | categoria_id | public.categorias | id | CASCADE | NO ACTION |
| public.category_strategies | organization_id | public.organizations | id | NO ACTION | NO ACTION |
| public.category_strategies | tenant_id | public.tenants | id | NO ACTION | NO ACTION |
| public.contact_notes | author_id | auth.users | id | NO ACTION | NO ACTION |
| public.contact_notes | fornecedor_id | public.fornecedores | id | CASCADE | NO ACTION |
| public.contact_notes | tenant_id | public.tenants | id | NO ACTION | NO ACTION |
| public.contract_documents | contract_id | public.contracts | id | CASCADE | NO ACTION |
| public.contract_documents | tenant_id | public.tenants | id | NO ACTION | NO ACTION |
| public.contract_history | contract_id | public.contracts | id | CASCADE | NO ACTION |
| public.contract_history | tenant_id | public.tenants | id | NO ACTION | NO ACTION |
| public.contract_items | contract_id | public.contracts | id | CASCADE | NO ACTION |
| public.contract_items | tenant_id | public.tenants | id | NO ACTION | NO ACTION |
| public.contract_penalties | contract_id | public.contracts | id | CASCADE | NO ACTION |
| public.contract_penalties | pagamento_id | public.pagamentos | id | NO ACTION | NO ACTION |
| public.contract_penalties | pedido_id | public.pedidos | id | NO ACTION | NO ACTION |
| public.contract_penalties | tenant_id | public.tenants | id | NO ACTION | NO ACTION |
| public.contracts | currency | public.currencies | code | NO ACTION | NO ACTION |
| public.contracts | organization_id | public.organizations | id | NO ACTION | NO ACTION |
| public.contracts | supplier_id | public.fornecedores | id | RESTRICT | NO ACTION |
| public.contracts | tenant_id | public.tenants | id | NO ACTION | NO ACTION |
| public.cost_centers | manager_id | public.profiles | id | SET NULL | NO ACTION |
| public.cost_centers | parent_id | public.cost_centers | id | SET NULL | NO ACTION |
| public.cost_centers | tenant_id | public.tenants | id | NO ACTION | NO ACTION |
| public.cotacoes | avaliador_id | auth.users | id | NO ACTION | NO ACTION |
| public.cotacoes | currency | public.currencies | code | NO ACTION | NO ACTION |
| public.cotacoes | fornecedor_id | public.fornecedores | id | NO ACTION | NO ACTION |
| public.cotacoes | organization_id | public.organizations | id | NO ACTION | NO ACTION |
| public.cotacoes | solicitacao_id | public.solicitacoes | id | RESTRICT | NO ACTION |
| public.cotacoes | tenant_id | public.tenants | id | NO ACTION | NO ACTION |
| public.creditos_fornecedor | devolucao_id | public.devolucoes | id | SET NULL | NO ACTION |
| public.creditos_fornecedor | fornecedor_id | public.fornecedores | id | RESTRICT | NO ACTION |
| public.creditos_fornecedor | tenant_id | public.tenants | id | NO ACTION | NO ACTION |
| public.creditos_fornecedor | utilizado_em_pagamento_id | public.pagamentos | id | SET NULL | NO ACTION |
| public.dashboard_filter_favorites | organization_id | public.organizations | id | NO ACTION | NO ACTION |
| public.dashboard_layouts | user_id | auth.users | id | CASCADE | NO ACTION |
| public.department_budgets | cost_center_id | public.cost_centers | id | NO ACTION | NO ACTION |
| public.department_budgets | organization_id | public.organizations | id | NO ACTION | NO ACTION |
| public.department_budgets | tenant_id | public.tenants | id | NO ACTION | NO ACTION |
| public.dependency_health | updated_by | auth.users | id | NO ACTION | NO ACTION |
| public.dependency_health_history | created_by | auth.users | id | SET NULL | NO ACTION |
| public.devolucao_itens | devolucao_id | public.devolucoes | id | CASCADE | NO ACTION |
| public.devolucao_itens | pedido_item_id | public.pedido_itens | id | SET NULL | NO ACTION |
| public.devolucao_itens | tenant_id | public.tenants | id | NO ACTION | NO ACTION |
| public.devolucoes | aprovador_id | auth.users | id | NO ACTION | NO ACTION |
| public.devolucoes | fornecedor_id | public.fornecedores | id | SET NULL | NO ACTION |
| public.devolucoes | pedido_id | public.pedidos | id | SET NULL | NO ACTION |
| public.devolucoes | solicitante_id | auth.users | id | NO ACTION | NO ACTION |
| public.devolucoes | tenant_id | public.tenants | id | NO ACTION | NO ACTION |
| public.entity_versions | changed_by | auth.users | id | NO ACTION | NO ACTION |
| public.erp_connections | tenant_id | public.tenants | id | CASCADE | NO ACTION |
| public.erp_field_mappings | connection_id | public.erp_connections | id | CASCADE | NO ACTION |
| public.erp_sync_log | connection_id | public.erp_connections | id | CASCADE | NO ACTION |
| public.erp_sync_log | tenant_id | public.tenants | id | CASCADE | NO ACTION |
| public.estoque | produto_id | public.produtos | id | CASCADE | NO ACTION |
| public.estoque_movimentacoes | estoque_id | public.estoque | id | CASCADE | NO ACTION |
| public.estoque_movimentacoes | usuario_id | auth.users | id | NO ACTION | NO ACTION |
| public.exchange_rates | base_currency | public.currencies | code | NO ACTION | NO ACTION |
| public.exchange_rates | quote_currency | public.currencies | code | NO ACTION | NO ACTION |
| public.financial_audit_logs | user_id | auth.users | id | NO ACTION | NO ACTION |
| public.fiscal_documents | fornecedor_id | public.fornecedores | id | NO ACTION | NO ACTION |
| public.fiscal_documents | organization_id | public.organizations | id | NO ACTION | NO ACTION |
| public.fiscal_documents | pedido_id | public.pedidos | id | NO ACTION | NO ACTION |
| public.fiscal_documents | tenant_id | public.tenants | id | NO ACTION | NO ACTION |
| public.fiscal_events | tenant_id | public.tenants | id | NO ACTION | NO ACTION |
| public.fornecedor_categorias | categoria_id | public.categorias | id | CASCADE | NO ACTION |
| public.fornecedor_categorias | fornecedor_id | public.fornecedores | id | CASCADE | NO ACTION |
| public.fornecedores | created_by | auth.users | id | NO ACTION | NO ACTION |
| public.fornecedores | organization_id | public.organizations | id | NO ACTION | NO ACTION |
| public.fornecedores | tenant_id | public.tenants | id | NO ACTION | NO ACTION |
| public.geo_settings | updated_by | auth.users | id | NO ACTION | NO ACTION |
| public.ip_whitelist | created_by | auth.users | id | NO ACTION | NO ACTION |
| public.licitacao_lances | fornecedor_id | public.fornecedores | id | CASCADE | NO ACTION |
| public.licitacao_lances | licitacao_id | public.licitacoes | id | CASCADE | NO ACTION |
| public.licitacao_lances | tenant_id | public.tenants | id | NO ACTION | NO ACTION |
| public.licitacao_propostas | fornecedor_id | public.fornecedores | id | NO ACTION | NO ACTION |
| public.licitacao_propostas | licitacao_id | public.licitacoes | id | CASCADE | NO ACTION |
| public.licitacao_propostas | tenant_id | public.tenants | id | NO ACTION | NO ACTION |
| public.licitacoes | fornecedor_vencedor_id | public.fornecedores | id | NO ACTION | NO ACTION |
| public.licitacoes | organization_id | public.organizations | id | NO ACTION | NO ACTION |
| public.licitacoes | responsavel_id | auth.users | id | NO ACTION | NO ACTION |
| public.licitacoes | tenant_id | public.tenants | id | NO ACTION | NO ACTION |
| public.mfa_settings | user_id | auth.users | id | CASCADE | NO ACTION |
| public.negotiation_analyses | cotacao_id | public.cotacoes | id | NO ACTION | NO ACTION |
| public.negotiation_analyses | solicitacao_id | public.solicitacoes | id | NO ACTION | NO ACTION |
| public.notifications | tenant_id | public.tenants | id | NO ACTION | NO ACTION |
| public.order_contracts | contract_id | public.contracts | id | CASCADE | NO ACTION |
| public.order_contracts | tenant_id | public.tenants | id | NO ACTION | NO ACTION |
| public.pagamentos | aprovador_id | auth.users | id | NO ACTION | NO ACTION |
| public.pagamentos | cost_center_id | public.cost_centers | id | NO ACTION | NO ACTION |
| public.pagamentos | created_by | auth.users | id | NO ACTION | NO ACTION |
| public.pagamentos | fornecedor_id | public.fornecedores | id | NO ACTION | NO ACTION |
| public.pagamentos | organization_id | public.organizations | id | NO ACTION | NO ACTION |
| public.pagamentos | pedido_id | public.pedidos | id | NO ACTION | NO ACTION |
| public.pagamentos | tenant_id | public.tenants | id | NO ACTION | NO ACTION |
| public.password_reset_requests | reviewed_by | auth.users | id | NO ACTION | NO ACTION |
| public.password_reset_requests | user_id | auth.users | id | CASCADE | NO ACTION |
| public.payment_history | pagamento_id | public.pagamentos | id | RESTRICT | NO ACTION |
| public.payment_history | tenant_id | public.tenants | id | NO ACTION | NO ACTION |
| public.pedido_itens | pedido_id | public.pedidos | id | CASCADE | NO ACTION |
| public.pedido_itens | produto_id | public.produtos | id | NO ACTION | NO ACTION |
| public.pedido_itens | tenant_id | public.tenants | id | NO ACTION | NO ACTION |
| public.pedido_itens | unspsc_code | public.unspsc_codes | code | NO ACTION | NO ACTION |
| public.pedidos | aprovador_id | auth.users | id | NO ACTION | NO ACTION |
| public.pedidos | comprador_id | auth.users | id | NO ACTION | NO ACTION |
| public.pedidos | cotacao_id | public.cotacoes | id | NO ACTION | NO ACTION |
| public.pedidos | currency | public.currencies | code | NO ACTION | NO ACTION |
| public.pedidos | fornecedor_id | public.fornecedores | id | NO ACTION | NO ACTION |
| public.pedidos | organization_id | public.organizations | id | NO ACTION | NO ACTION |
| public.pedidos | solicitacao_id | public.solicitacoes | id | NO ACTION | NO ACTION |
| public.pedidos | tenant_id | public.tenants | id | NO ACTION | NO ACTION |
| public.penalty_escalation_config | contract_id | public.contracts | id | CASCADE | NO ACTION |
| public.penalty_escalation_config | tenant_id | public.tenants | id | NO ACTION | NO ACTION |
| public.produto_fornecedores | fornecedor_id | public.fornecedores | id | CASCADE | NO ACTION |
| public.produto_fornecedores | produto_id | public.produtos | id | CASCADE | NO ACTION |
| public.produtos | categoria_id | public.categorias | id | NO ACTION | NO ACTION |
| public.produtos | fornecedor_preferencial_id | public.fornecedores | id | NO ACTION | NO ACTION |
| public.produtos | organization_id | public.organizations | id | NO ACTION | NO ACTION |
| public.produtos | tenant_id | public.tenants | id | NO ACTION | NO ACTION |
| public.profiles | current_organization_id | public.organizations | id | NO ACTION | NO ACTION |
| public.profiles | empresa_default_id | public.tenants | id | SET NULL | NO ACTION |
| public.profiles | tenant_id | public.tenants | id | NO ACTION | NO ACTION |
| public.profiles | user_id | auth.users | id | CASCADE | NO ACTION |
| public.punchout_catalogs | fornecedor_id | public.fornecedores | id | CASCADE | NO ACTION |
| public.punchout_catalogs | tenant_id | public.tenants | id | CASCADE | NO ACTION |
| public.punchout_sessions | catalog_id | public.punchout_catalogs | id | CASCADE | NO ACTION |
| public.punchout_sessions | created_solicitacao_id | public.solicitacoes | id | NO ACTION | NO ACTION |
| public.punchout_sessions | tenant_id | public.tenants | id | CASCADE | NO ACTION |
| public.punchout_sessions | user_id | auth.users | id | CASCADE | NO ACTION |
| public.qualification_history | fornecedor_id | public.fornecedores | id | CASCADE | NO ACTION |
| public.rate_limit_logs | user_id | auth.users | id | NO ACTION | NO ACTION |
| public.receiving_checklists | contract_id | public.contracts | id | NO ACTION | NO ACTION |
| public.receiving_checklists | fornecedor_id | public.fornecedores | id | NO ACTION | NO ACTION |
| public.receiving_checklists | inspector_id | auth.users | id | NO ACTION | NO ACTION |
| public.receiving_checklists | pedido_id | public.pedidos | id | RESTRICT | NO ACTION |
| public.receiving_checklists | tenant_id | public.tenants | id | NO ACTION | NO ACTION |
| public.repurchase_suggestions | fornecedor_id | public.fornecedores | id | NO ACTION | NO ACTION |
| public.repurchase_suggestions | produto_id | public.produtos | id | NO ACTION | NO ACTION |
| public.repurchase_suggestions | tenant_id | public.tenants | id | NO ACTION | NO ACTION |
| public.repurchase_suggestions | ultimo_pedido_id | public.pedidos | id | NO ACTION | NO ACTION |
| public.role_permissions | created_by | auth.users | id | NO ACTION | NO ACTION |
| public.role_permissions | permission_id | public.permissions | id | CASCADE | NO ACTION |
| public.saved_filters | user_id | auth.users | id | CASCADE | NO ACTION |
| public.savings_tracker | project_id | public.sourcing_projects | id | CASCADE | NO ACTION |
| public.savings_tracker | tenant_id | public.tenants | id | NO ACTION | NO ACTION |
| public.scim_provisioning_log | tenant_id | public.tenants | id | CASCADE | NO ACTION |
| public.secret_rotation_schedule | owner_user_id | auth.users | id | SET NULL | NO ACTION |
| public.security_logs | user_id | auth.users | id | NO ACTION | NO ACTION |
| public.solicitacoes | aprovador_id | auth.users | id | NO ACTION | NO ACTION |
| public.solicitacoes | categoria_id | public.categorias | id | NO ACTION | NO ACTION |
| public.solicitacoes | cost_center_id | public.cost_centers | id | NO ACTION | NO ACTION |
| public.solicitacoes | fornecedor_id | public.fornecedores | id | NO ACTION | NO ACTION |
| public.solicitacoes | organization_id | public.organizations | id | NO ACTION | NO ACTION |
| public.solicitacoes | produto_id | public.produtos | id | SET NULL | NO ACTION |
| public.solicitacoes | solicitante_id | auth.users | id | NO ACTION | NO ACTION |
| public.solicitacoes | tenant_id | public.tenants | id | NO ACTION | NO ACTION |
| public.sourcing_awards | approved_by | auth.users | id | NO ACTION | NO ACTION |
| public.sourcing_awards | event_id | public.sourcing_events | id | CASCADE | NO ACTION |
| public.sourcing_awards | fornecedor_id | public.fornecedores | id | NO ACTION | NO ACTION |
| public.sourcing_awards | lot_id | public.sourcing_event_lots | id | NO ACTION | NO ACTION |
| public.sourcing_awards | pedido_id | public.pedidos | id | NO ACTION | NO ACTION |
| public.sourcing_awards | tenant_id | public.tenants | id | NO ACTION | NO ACTION |
| public.sourcing_awards | winner_response_id | public.sourcing_responses | id | NO ACTION | NO ACTION |
| public.sourcing_event_criteria | event_id | public.sourcing_events | id | CASCADE | NO ACTION |
| public.sourcing_event_criteria | tenant_id | public.tenants | id | NO ACTION | NO ACTION |
| public.sourcing_event_lots | event_id | public.sourcing_events | id | CASCADE | NO ACTION |
| public.sourcing_event_lots | tenant_id | public.tenants | id | NO ACTION | NO ACTION |
| public.sourcing_event_questions | event_id | public.sourcing_events | id | CASCADE | NO ACTION |
| public.sourcing_event_questions | tenant_id | public.tenants | id | NO ACTION | NO ACTION |
| public.sourcing_events | category_id | public.categorias | id | NO ACTION | NO ACTION |
| public.sourcing_events | organization_id | public.organizations | id | NO ACTION | NO ACTION |
| public.sourcing_events | owner_id | auth.users | id | NO ACTION | NO ACTION |
| public.sourcing_events | tenant_id | public.tenants | id | NO ACTION | NO ACTION |
| public.sourcing_invitations | event_id | public.sourcing_events | id | CASCADE | NO ACTION |
| public.sourcing_invitations | fornecedor_id | public.fornecedores | id | NO ACTION | NO ACTION |
| public.sourcing_invitations | tenant_id | public.tenants | id | NO ACTION | NO ACTION |
| public.sourcing_pipeline | categoria_id | public.categorias | id | NO ACTION | NO ACTION |
| public.sourcing_pipeline | comprador_id | auth.users | id | NO ACTION | NO ACTION |
| public.sourcing_pipeline | organization_id | public.organizations | id | NO ACTION | NO ACTION |
| public.sourcing_pipeline | tenant_id | public.tenants | id | NO ACTION | NO ACTION |
| public.sourcing_projects | category_id | public.categorias | id | NO ACTION | NO ACTION |
| public.sourcing_projects | owner_id | auth.users | id | NO ACTION | NO ACTION |
| public.sourcing_projects | tenant_id | public.tenants | id | NO ACTION | NO ACTION |
| public.sourcing_response_answers | question_id | public.sourcing_event_questions | id | CASCADE | NO ACTION |
| public.sourcing_response_answers | response_id | public.sourcing_responses | id | CASCADE | NO ACTION |
| public.sourcing_response_answers | tenant_id | public.tenants | id | NO ACTION | NO ACTION |
| public.sourcing_response_items | lot_id | public.sourcing_event_lots | id | CASCADE | NO ACTION |
| public.sourcing_response_items | response_id | public.sourcing_responses | id | CASCADE | NO ACTION |
| public.sourcing_response_items | tenant_id | public.tenants | id | NO ACTION | NO ACTION |
| public.sourcing_responses | event_id | public.sourcing_events | id | CASCADE | NO ACTION |
| public.sourcing_responses | fornecedor_id | public.fornecedores | id | NO ACTION | NO ACTION |
| public.sourcing_responses | invitation_id | public.sourcing_invitations | id | NO ACTION | NO ACTION |
| public.sourcing_responses | tenant_id | public.tenants | id | NO ACTION | NO ACTION |
| public.spend_forecasts | categoria_id | public.categorias | id | NO ACTION | NO ACTION |
| public.spend_forecasts | organization_id | public.organizations | id | NO ACTION | NO ACTION |
| public.spend_forecasts | tenant_id | public.tenants | id | NO ACTION | NO ACTION |
| public.spot_pedidos | tenant_id | public.tenants | id | RESTRICT | NO ACTION |
| public.sso_configurations | tenant_id | public.tenants | id | CASCADE | NO ACTION |
| public.supplier_bonifications | contract_id | public.contracts | id | NO ACTION | NO ACTION |
| public.supplier_bonifications | fornecedor_id | public.fornecedores | id | NO ACTION | NO ACTION |
| public.supplier_bonifications | tenant_id | public.tenants | id | NO ACTION | NO ACTION |
| public.supplier_documents | fornecedor_id | public.fornecedores | id | CASCADE | NO ACTION |
| public.supplier_documents | requirement_id | public.qualification_requirements | id | CASCADE | NO ACTION |
| public.supplier_documents | tenant_id | public.tenants | id | NO ACTION | NO ACTION |
| public.supplier_qualification_scores | fornecedor_id | public.fornecedores | id | CASCADE | NO ACTION |
| public.supplier_qualification_scores | tenant_id | public.tenants | id | NO ACTION | NO ACTION |
| public.telemetry_logs_legacy_20260712 | user_id | auth.users | id | NO ACTION | NO ACTION |
| public.tenants | default_currency | public.currencies | code | NO ACTION | NO ACTION |
| public.tenants | organization_id | public.organizations | id | SET NULL | NO ACTION |
| public.unspsc_codes | parent_code | public.unspsc_codes | code | NO ACTION | NO ACTION |
| public.unspsc_codes | tenant_id | public.tenants | id | NO ACTION | NO ACTION |
| public.user_filter_preferences | user_id | auth.users | id | CASCADE | NO ACTION |
| public.user_organizations | organization_id | public.organizations | id | CASCADE | NO ACTION |
| public.user_organizations | user_id | auth.users | id | CASCADE | NO ACTION |
| public.user_roles | user_id | auth.users | id | CASCADE | NO ACTION |
| public.user_tenants | tenant_id | public.tenants | id | CASCADE | NO ACTION |
| public.user_tenants | user_id | auth.users | id | CASCADE | NO ACTION |
| public.user_tour_preferences | user_id | auth.users | id | CASCADE | NO ACTION |
| public.webauthn_challenges | user_id | auth.users | id | CASCADE | NO ACTION |
| public.webauthn_credentials | user_id | auth.users | id | CASCADE | NO ACTION |
| public.workflow_approvals | approver_id | auth.users | id | NO ACTION | NO ACTION |
| public.workflow_approvals | instance_id | public.workflow_instances | id | CASCADE | NO ACTION |
| public.workflow_approvals | node_id | public.workflow_nodes | id | NO ACTION | NO ACTION |
| public.workflow_approvals | tenant_id | public.tenants | id | NO ACTION | NO ACTION |
| public.workflow_audit_log | actor_id | auth.users | id | NO ACTION | NO ACTION |
| public.workflow_audit_log | instance_id | public.workflow_instances | id | SET NULL | NO ACTION |
| public.workflow_audit_log | task_id | public.workflow_tasks | id | SET NULL | NO ACTION |
| public.workflow_audit_log | tenant_id | public.tenants | id | CASCADE | NO ACTION |
| public.workflow_edges | source_node_id | public.workflow_nodes | id | CASCADE | NO ACTION |
| public.workflow_edges | target_node_id | public.workflow_nodes | id | CASCADE | NO ACTION |
| public.workflow_edges | template_id | public.workflow_templates | id | CASCADE | NO ACTION |
| public.workflow_edges | tenant_id | public.tenants | id | NO ACTION | NO ACTION |
| public.workflow_instances | current_node_id | public.workflow_nodes | id | NO ACTION | NO ACTION |
| public.workflow_instances | template_id | public.workflow_templates | id | NO ACTION | NO ACTION |
| public.workflow_instances | tenant_id | public.tenants | id | NO ACTION | NO ACTION |
| public.workflow_logs | instance_id | public.workflow_instances | id | CASCADE | NO ACTION |
| public.workflow_logs | node_id | public.workflow_nodes | id | NO ACTION | NO ACTION |
| public.workflow_logs | tenant_id | public.tenants | id | NO ACTION | NO ACTION |
| public.workflow_nodes | template_id | public.workflow_templates | id | CASCADE | NO ACTION |
| public.workflow_nodes | tenant_id | public.tenants | id | NO ACTION | NO ACTION |
| public.workflow_sod_rules | tenant_id | public.tenants | id | CASCADE | NO ACTION |
| public.workflow_tasks | assigned_to_user | auth.users | id | NO ACTION | NO ACTION |
| public.workflow_tasks | completed_by | auth.users | id | NO ACTION | NO ACTION |
| public.workflow_tasks | instance_id | public.workflow_instances | id | CASCADE | NO ACTION |
| public.workflow_tasks | tenant_id | public.tenants | id | CASCADE | NO ACTION |
| public.workflow_templates | tenant_id | public.tenants | id | NO ACTION | NO ACTION |


_Diagrama omitido: mais de 120 tabelas._
