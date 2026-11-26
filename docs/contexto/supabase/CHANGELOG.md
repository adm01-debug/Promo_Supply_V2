# CHANGELOG do snapshot Supabase

Diff semântico gerado a cada coleta em que algo mudou.

## 2026-11-26 23:30 UTC

- **colunas** alterado (1): `public.contracts.supplier_id`
- **constraints** adicionado (1): `public.contracts.contracts_supplier_id_fkey`
- **edge functions** alterado (41): `ai-demand-prediction`, `ai-negotiation`, `ai-supplier-risk`, `ai-supplier-suggestion`, `alert-dispatcher`, `check-approval-escalations`, `check-cotacao-followup`, `check-expiry-alerts`, `check-sla-alerts`, `dependency-health`, `erp-credential-encrypt`, `erp-sync`, `escalate-solicitacao`, `external-db-bridge`, `fiscal-orchestrator`, `generate-contract-pdf`, `guided-buying-ai`, `health-dashboard`, `maintain-partitions`, `migrate-storage-paths`, `process-invoice-idp`, `process-outbox`, `process-solicitacao-neural`, `punchout-encrypt`, `punchout-receive`, `punchout-setup`, `receive-os-sync`, `run-audit`, `scim-v2`, `send-push-notification`, `spot-api`, `spot-proxy`, `system-simulation`, `telemetry`, `webauthn-authenticate`, `webauthn-register`, `weekly-report`, `weekly-summary-report`, `workflow-engine`, `xbz-proxy` … (+1)
- **functions** adicionado (2): `public.aprovador_pode_decidir_etapa(p_workflow_id uuid, p_etapa integer, p_status text, p_aprovador_id uuid, p_aprovador_efetivo_id uuid, p_uid uuid)`, `public.validar_decisao_approval_step()`
- **functions** alterado (12): `public.apply_penalty_escalation()`, `public.auto_approve_low_value_solicitacao()`, `public.auto_block_low_score_supplier()`, `public.auto_calculate_delivery_penalty()`, `public.check_workflow_sod(p_instance_id uuid, p_approver_id uuid, p_entity_id uuid)`, `public.clear_login_lockout(_email text)`, `public.fill_tenant_id_from_profile()`, `public.has_role(_user_id uuid, _role app_role)`, `public.is_account_locked(_email text)`, `public.is_ip_whitelisted(_ip_address text)`, `public.log_login_attempt(_email text, _ip_address text, _user_agent text, _success boolean, _failure_reason text)`, `public.record_failed_login(_email text)`
- **grants** adicionado (1): `public.supplier_compliance_summary:anon`
- **indexes** adicionado (1): `public.idx_contracts_supplier_id`
- **lints** adicionado (1): `policy_auth_fn_not_wrapped:public.approval_steps.approval_steps_aprovador_decide_etapa`
- **lints** removido (1): `policy_auth_fn_not_wrapped:public.approval_steps.Approvers can update their steps`
- **policies (RLS)** adicionado (1): `public.approval_steps.approval_steps_aprovador_decide_etapa`
- **policies (RLS)** removido (1): `public.approval_steps.Approvers can update their steps`
- **triggers** adicionado (1): `public.approval_steps.trg_approval_steps_decisao`
- **views** alterado (1): `public.supplier_compliance_summary`

## 2026-11-26 20:29 UTC

- **colunas** adicionado (1): `public.system_alerts.dispatch_lease_until`
- **edge functions** alterado (2): `alert-dispatcher`, `process-outbox`
- **functions** adicionado (1): `public.claim_alerts_batch(p_batch_size integer)`
- **functions** alterado (3): `public.is_account_locked(_email text)`, `public.log_login_attempt(_email text, _ip_address text, _user_agent text, _success boolean, _failure_reason text)`, `public.record_failed_login(_email text)`
- **indexes** adicionado (1): `public.idx_system_alerts_fila_dispatch`

## 2026-11-26 19:16 UTC

- **colunas** alterado (43): `public.approval_delegations.tenant_id`, `public.approval_hierarchy.tenant_id`, `public.approval_history.tenant_id`, `public.approval_rules.tenant_id`, `public.approval_steps.tenant_id`, `public.approval_workflows.tenant_id`, `public.auction_bids.tenant_id`, `public.budget_transactions.tenant_id`, `public.category_strategies.tenant_id`, `public.contact_notes.tenant_id`, `public.contract_documents.tenant_id`, `public.contract_history.tenant_id`, `public.contract_items.tenant_id`, `public.contract_penalties.tenant_id`, `public.contracts.tenant_id`, `public.cost_centers.tenant_id`, `public.creditos_fornecedor.tenant_id`, `public.department_budgets.tenant_id`, `public.devolucao_itens.tenant_id`, `public.devolucoes.tenant_id`, `public.fornecedor_categorias.tenant_id`, `public.licitacao_lances.tenant_id`, `public.licitacao_propostas.tenant_id`, `public.licitacoes.tenant_id`, `public.order_contracts.tenant_id`, `public.payment_history.tenant_id`, `public.penalty_escalation_config.tenant_id`, `public.receiving_checklists.tenant_id`, `public.sourcing_awards.tenant_id`, `public.sourcing_event_criteria.tenant_id`, `public.sourcing_event_lots.tenant_id`, `public.sourcing_event_questions.tenant_id`, `public.sourcing_events.tenant_id`, `public.sourcing_invitations.tenant_id`, `public.sourcing_pipeline.tenant_id`, `public.sourcing_response_answers.tenant_id`, `public.sourcing_response_items.tenant_id`, `public.sourcing_responses.tenant_id`, `public.spend_forecasts.tenant_id`, `public.supplier_bonifications.tenant_id` … (+3)
- **edge functions** alterado (3): `check-approval-escalations`, `spot-api`, `spot-proxy`
- **functions** adicionado (1): `public.fill_tenant_id_from_supplier()`
- **functions** alterado (6): `public.auto_block_low_score_supplier()`, `public.auto_calculate_delivery_penalty()`, `public.clear_login_lockout(_email text)`, `public.fill_tenant_id_from_profile()`, `public.has_role(_user_id uuid, _role app_role)`, `public.tenant_in_my_group(_tenant_id uuid)`
- **policies (RLS)** adicionado (13): `public.audit_logs_202605.tenant_isolation_audit_logs_202605`, `public.audit_logs_202606.tenant_isolation_audit_logs_202606`, `public.audit_logs_202607.tenant_isolation_audit_logs_202607`, `public.audit_logs_202608.tenant_isolation_audit_logs_202608`, `public.audit_logs_202609.tenant_isolation_audit_logs_202609`, `public.audit_logs_legacy_20260712.tenant_isolation_audit_logs_legacy_20260712`, `public.telemetry_logs.tenant_isolation_telemetry_logs`, `public.telemetry_logs_202605.tenant_isolation_telemetry_logs_202605`, `public.telemetry_logs_202606.tenant_isolation_telemetry_logs_202606`, `public.telemetry_logs_202607.tenant_isolation_telemetry_logs_202607`, `public.telemetry_logs_202608.tenant_isolation_telemetry_logs_202608`, `public.telemetry_logs_202609.tenant_isolation_telemetry_logs_202609`, `public.telemetry_logs_legacy_20260712.tenant_isolation_telemetry_logs_legacy_20260712`
- **policies (RLS)** alterado (3): `public.organizations.Users can see their organizations`, `public.spend_forecasts.Tenant isolation for spend_forecasts`, `storage.objects.storage_produtos_leitura_publica`
- **storage buckets** alterado (1): `product-images`
- **triggers** adicionado (63): `public.active_sessions.a_fill_tenant_id`, `public.approval_hierarchy.a_fill_tenant_id`, `public.auction_bids.a_fill_tenant_id`, `public.audit_logs_202605.a_fill_tenant_id`, `public.audit_logs_202606.a_fill_tenant_id`, `public.audit_logs_202607.a_fill_tenant_id`, `public.audit_logs_202608.a_fill_tenant_id`, `public.audit_logs_202609.a_fill_tenant_id`, `public.audit_logs_legacy_20260712.a_fill_tenant_id`, `public.budget_transactions.a_fill_tenant_id`, `public.categorias.a_fill_tenant_id`, `public.category_strategies.a_fill_tenant_id`, `public.contract_penalties.a_fill_tenant_id`, `public.erp_connections.a_fill_tenant_id`, `public.erp_sync_log.a_fill_tenant_id`, `public.fiscal_events.a_fill_tenant_id`, `public.fornecedor_categorias.a_fill_tenant_id`, `public.integration_outbox.a_fill_tenant_id`, `public.notifications.a_fill_tenant_id`, `public.order_contracts.a_fill_tenant_id`, `public.profiles.a_fill_tenant_id`, `public.punchout_catalogs.a_fill_tenant_id`, `public.punchout_sessions.a_fill_tenant_id`, `public.receiving_checklists.a_fill_tenant_id`, `public.savings_tracker.a_fill_tenant_id`, `public.scim_provisioning_log.a_fill_tenant_id`, `public.sourcing_awards.a_fill_tenant_id`, `public.sourcing_event_questions.a_fill_tenant_id`, `public.sourcing_pipeline.a_fill_tenant_id`, `public.sourcing_projects.a_fill_tenant_id`, `public.sourcing_response_answers.a_fill_tenant_id`, `public.sourcing_response_items.a_fill_tenant_id`, `public.sourcing_responses.a_fill_tenant_id`, `public.spend_forecasts.a_fill_tenant_id`, `public.spot_pedidos.a_fill_tenant_id`, `public.supplier_documents.a_fill_tenant_id`, `public.supplier_qualification_scores.a_fill_tenant_id`, `public.supplier_qualification_scores.a_fill_tenant_id_supplier`, `public.system_alerts.a_fill_tenant_id`, `public.telemetry_logs.a_fill_tenant_id` … (+23)

## 2026-11-26 18:15 UTC

- **colunas** adicionado (1): `public.spot_pedidos.tenant_id`
- **constraints** adicionado (1): `public.spot_pedidos.spot_pedidos_tenant_id_fkey`
- **constraints** alterado (4): `public.cotacoes.cotacoes_solicitacao_id_fkey`, `public.creditos_fornecedor.creditos_fornecedor_fornecedor_id_fkey`, `public.payment_history.payment_history_pagamento_id_fkey`, `public.receiving_checklists.receiving_checklists_pedido_id_fkey`
- **edge functions** alterado (1): `run-audit`
- **functions** adicionado (1): `public.audit_rls_policies()`
- **functions** removido (2): `public.exec_sql(sql_query text)`, `public.execute_read_query(p_sql text)`
- **indexes** adicionado (3): `public.idx_spot_pedidos_tenant`, `public.uq_fiscal_documents_chave`, `public.uq_fiscal_documents_nf`
- **policies (RLS)** adicionado (1): `public.spot_pedidos.tenant_isolation_spot_pedidos`

## 2026-11-26 17:11 UTC

- **colunas** adicionado (4): `public.audit_logs_ancora.atualizado_em`, `public.audit_logs_ancora.id`, `public.audit_logs_ancora.registro_hash`, `public.audit_logs_ancora.sequencia`
- **constraints** adicionado (12): `public.approval_delegations.approval_delegations_delegado_id_fkey`, `public.approval_delegations.approval_delegations_delegante_id_fkey`, `public.approval_history.approval_history_usuario_id_fkey`, `public.approval_rules.approval_rules_escalacao_para_fkey`, `public.approval_steps.approval_steps_aprovador_efetivo_id_fkey`, `public.approval_steps.approval_steps_aprovador_id_fkey`, `public.audit_logs_ancora.audit_logs_ancora_id_check`, `public.audit_logs_ancora.audit_logs_ancora_pkey`, `public.devolucoes.devolucoes_aprovador_id_fkey`, `public.devolucoes.devolucoes_solicitante_id_fkey`, `public.licitacoes.licitacoes_responsavel_id_fkey`, `public.receiving_checklists.receiving_checklists_inspector_id_fkey`
- **constraints** removido (10): `public.contracts.contracts_contract_number_key`, `public.cost_centers.cost_centers_code_key`, `public.cotacoes.cotacoes_numero_key`, `public.fornecedores.fornecedores_cnpj_key`, `public.fornecedores.fornecedores_codigo_key`, `public.licitacoes.licitacoes_numero_key`, `public.pagamentos.pagamentos_numero_key`, `public.pedidos.pedidos_numero_key`, `public.produtos.produtos_codigo_key`, `public.solicitacoes.solicitacoes_numero_key`
- **functions** alterado (7): `public.apply_lgpd_retention()`, `public.audit_log_conteudo_canonico(r audit_logs)`, `public.has_role(_user_id uuid, _role app_role)`, `public.maintain_monthly_partitions(p_parent_table text, p_ahead_months integer, p_retain_months integer)`, `public.tenant_in_my_group(_tenant_id uuid)`, `public.upsert_cron_heartbeat(p_job_name text, p_status text, p_error text)`, `public.verificar_integridade_audit_logs()`
- **grants** adicionado (1): `public.audit_logs_ancora:service_role`
- **grants** alterado (24): `public.audit_logs_202605:anon`, `public.audit_logs_202605:authenticated`, `public.audit_logs_202606:anon`, `public.audit_logs_202606:authenticated`, `public.audit_logs_202607:anon`, `public.audit_logs_202607:authenticated`, `public.audit_logs_202608:anon`, `public.audit_logs_202608:authenticated`, `public.audit_logs_202609:anon`, `public.audit_logs_202609:authenticated`, `public.audit_logs_legacy_20260712:anon`, `public.audit_logs_legacy_20260712:authenticated`, `public.telemetry_logs_202605:anon`, `public.telemetry_logs_202605:authenticated`, `public.telemetry_logs_202606:anon`, `public.telemetry_logs_202606:authenticated`, `public.telemetry_logs_202607:anon`, `public.telemetry_logs_202607:authenticated`, `public.telemetry_logs_202608:anon`, `public.telemetry_logs_202608:authenticated`, `public.telemetry_logs_202609:anon`, `public.telemetry_logs_202609:authenticated`, `public.telemetry_logs_legacy_20260712:anon`, `public.telemetry_logs_legacy_20260712:authenticated`
- **indexes** adicionado (11): `public.audit_logs_ancora_pkey`, `public.uq_contracts_tenant_contract_number`, `public.uq_cost_centers_tenant_code`, `public.uq_cotacoes_tenant_numero`, `public.uq_devolucoes_tenant_numero`, `public.uq_fornecedores_tenant_codigo`, `public.uq_licitacoes_tenant_numero`, `public.uq_pagamentos_tenant_numero`, `public.uq_pedidos_tenant_numero`, `public.uq_produtos_tenant_codigo`, `public.uq_solicitacoes_tenant_numero`
- **indexes** removido (10): `public.contracts_contract_number_key`, `public.cost_centers_code_key`, `public.cotacoes_numero_key`, `public.fornecedores_cnpj_key`, `public.fornecedores_codigo_key`, `public.licitacoes_numero_key`, `public.pagamentos_numero_key`, `public.pedidos_numero_key`, `public.produtos_codigo_key`, `public.solicitacoes_numero_key`
- **lints** adicionado (13): `fk_without_index:public.approval_delegations.approval_delegations_delegado_id_fkey`, `fk_without_index:public.approval_delegations.approval_delegations_delegante_id_fkey`, `fk_without_index:public.approval_history.approval_history_usuario_id_fkey`, `fk_without_index:public.approval_rules.approval_rules_escalacao_para_fkey`, `fk_without_index:public.approval_steps.approval_steps_aprovador_efetivo_id_fkey`, `fk_without_index:public.approval_steps.approval_steps_aprovador_id_fkey`, `fk_without_index:public.devolucoes.devolucoes_aprovador_id_fkey`, `fk_without_index:public.devolucoes.devolucoes_solicitante_id_fkey`, `fk_without_index:public.licitacoes.licitacoes_responsavel_id_fkey`, `fk_without_index:public.receiving_checklists.receiving_checklists_inspector_id_fkey`, `policy_auth_fn_not_wrapped:public.audit_logs_legacy_20260712.admin_read_partition`, `policy_auth_fn_not_wrapped:public.telemetry_logs_legacy_20260712.admin_read_partition`, `rls_no_policies:public.audit_logs_ancora`
- **policies (RLS)** adicionado (4): `public.audit_logs_legacy_20260712.admin_read_partition`, `public.audit_logs_legacy_20260712.service_role_all_partition`, `public.telemetry_logs_legacy_20260712.admin_read_partition`, `public.telemetry_logs_legacy_20260712.service_role_all_partition`
- **policies (RLS)** alterado (10): `public.audit_logs_202605.admin_read_partition`, `public.audit_logs_202606.admin_read_partition`, `public.audit_logs_202607.admin_read_partition`, `public.audit_logs_202608.admin_read_partition`, `public.audit_logs_202609.admin_read_partition`, `public.telemetry_logs_202605.admin_read_partition`, `public.telemetry_logs_202606.admin_read_partition`, `public.telemetry_logs_202607.admin_read_partition`, `public.telemetry_logs_202608.admin_read_partition`, `public.telemetry_logs_202609.admin_read_partition`
- **tabelas** adicionado (1): `public.audit_logs_ancora`

## 2026-11-26 16:26 UTC

- **functions** adicionado (1): `public.guard_pedido_exige_solicitacao_aprovada()`
- **functions** alterado (8): `public.auto_transition_solicitacao_on_pedido_created()`, `public.current_tenant_id()`, `public.get_user_grupo_id()`, `public.grant_tenant_access_on_insert()`, `public.handle_new_user()`, `public.has_role(_user_id uuid, _role app_role)`, `public.tenant_in_my_group(_tenant_id uuid)`, `public.update_estoque_saldo()`
- **lints** adicionado (1): `policy_auth_fn_not_wrapped:public.estoque_movimentacoes.estoque_movimentacoes_insert_papeis`
- **lints** removido (1): `policy_auth_fn_not_wrapped:public.estoque_movimentacoes.Movimentações: inserir na própria organização`
- **migrations** adicionado (2): `20261126121047_guard_pedido_exige_solicitacao_aprovada`, `20261126122905_handle_new_user_papel_viewer`
- **policies (RLS)** adicionado (1): `public.estoque_movimentacoes.estoque_movimentacoes_insert_papeis`
- **policies (RLS)** removido (1): `public.estoque_movimentacoes.Movimentações: inserir na própria organização`
- **triggers** adicionado (1): `public.pedidos.a1_guard_pedido_exige_solicitacao_aprovada`

## 2026-11-26 15:17 UTC

- **edge functions** alterado (32): `ai-demand-prediction`, `ai-negotiation`, `ai-supplier-risk`, `ai-supplier-suggestion`, `check-approval-escalations`, `check-cotacao-followup`, `check-expiry-alerts`, `check-sla-alerts`, `dependency-health`, `erp-sync`, `escalate-solicitacao`, `external-db-bridge`, `fiscal-orchestrator`, `generate-contract-pdf`, `guided-buying-ai`, `maintain-partitions`, `process-invoice-idp`, `process-solicitacao-neural`, `punchout-receive`, `receive-os-sync`, `scim-v2`, `send-push-notification`, `spot-api`, `spot-proxy`, `system-simulation`, `telemetry`, `webauthn-authenticate`, `weekly-report`, `weekly-summary-report`, `workflow-engine`, `xbz-proxy`, `xbz-sync-pedidos`
- **functions** alterado (11): `public.admin_scan_runs_sla_status()`, `public.auto_transition_solicitacao_on_cotacao_approval()`, `public.cleanup_health_scan_runs()`, `public.get_compras_dashboard_metrics(p_organization_id uuid, p_period text, p_category_id uuid, p_supplier_id uuid)`, `public.get_dashboard_kpis(_from date, _to date)`, `public.refresh_mv_dashboard_kpis()`, `public.resolve_stale_system_error_alerts()`, `public.tenant_in_my_group(_tenant_id uuid)`, `public.trg_cotacao_approved_transition()`, `public.trigger_recalculate_qualification_score()`, `public.validate_solicitacao_status_transition()`
- **migrations** adicionado (3): `20261126115421_fix_cotacao_nao_aprova_solicitacao`, `20261126150000_remove_trigger_duplicado_solicitacoes_e_qualificacao`, `20261126151000_admin_scan_runs_sla_catalogo_real`
- **triggers** removido (2): `public.solicitacoes.trg_validate_solicitacao_status`, `public.supplier_documents.trg_recalculate_qualification_score`

## 2026-11-26 13:27 UTC

- **cron jobs** adicionado (1): `125:spot-api-sync-stock`
- **cron jobs** removido (1): `122:spot-api-sync-stock`
- **edge functions** alterado (7): `alert-dispatcher`, `dependency-health`, `punchout-receive`, `receive-os-sync`, `scim-v2`, `webauthn-authenticate`, `xbz-sync-pedidos`
- **functions** alterado (3): `public._invoke_spot_sync(_action text)`, `public.cleanup_old_query_telemetry()`, `public.cleanup_old_spot_sync_log()`
- **migrations** adicionado (3): `20261127170000_reduz_frequencia_cron_spot_stock`, `20261127180000_perf05_indices_system_alerts_e_spot_sync_log`, `20261127190000_perf08_dropa_indices_redundantes`

## 2026-11-26 12:18 UTC

- **edge functions** alterado (38): `ai-demand-prediction`, `ai-negotiation`, `ai-supplier-risk`, `ai-supplier-suggestion`, `alert-dispatcher`, `check-approval-escalations`, `check-cotacao-followup`, `check-expiry-alerts`, `check-sla-alerts`, `dependency-health`, `erp-credential-encrypt`, `erp-sync`, `escalate-solicitacao`, `external-db-bridge`, `fiscal-orchestrator`, `generate-contract-pdf`, `guided-buying-ai`, `maintain-partitions`, `migrate-storage-paths`, `process-invoice-idp`, `process-solicitacao-neural`, `punchout-encrypt`, `punchout-receive`, `punchout-setup`, `receive-os-sync`, `run-audit`, `scim-v2`, `send-push-notification`, `spot-proxy`, `system-simulation`, `telemetry`, `webauthn-authenticate`, `webauthn-register`, `weekly-report`, `weekly-summary-report`, `workflow-engine`, `xbz-proxy`, `xbz-sync-pedidos`

## 2026-11-26 11:12 UTC

- **edge functions** alterado (2): `alert-dispatcher`, `spot-api`

## 2026-11-26 10:13 UTC

- **edge functions** alterado (6): `check-approval-escalations`, `check-cotacao-followup`, `punchout-receive`, `scim-v2`, `send-push-notification`, `spot-api`

## 2026-11-26 09:14 UTC

- **cron jobs** adicionado (1): `124:cleanup-spot-api-sync-log`
- **cron jobs** alterado (1): `19:refresh-mv-dashboard-kpis`
- **functions** adicionado (1): `public.cleanup_old_spot_sync_log()`
- **indexes** adicionado (2): `public.idx_spot_sync_log_created`, `public.idx_system_alerts_created_desc`
- **indexes** removido (22): `public.idx_approval_steps_workflow_id`, `public.idx_approval_workflows_org`, `public.idx_audit_logs_entity_type`, `public.idx_categorias_org`, `public.idx_cotacoes_fornecedor`, `public.idx_cotacoes_solicitacao`, `public.idx_cotacoes_status`, `public.idx_fornecedores_org`, `public.idx_pagamentos_org`, `public.idx_pagamentos_status`, `public.idx_pagamentos_vencimento`, `public.idx_pedidos_fornecedor`, `public.idx_pedidos_organization_id`, `public.idx_pedidos_status`, `public.idx_produtos_org`, `public.idx_rate_limit_logs_ip`, `public.idx_saved_filters_user_id`, `public.idx_solicitacoes_organization_id`, `public.idx_solicitacoes_status`, `public.idx_workflow_approvals_instance_id`, `public.idx_workflow_edges_source_node_id`, `public.idx_workflow_logs_instance_id`
- **indexes** alterado (1): `public.idx_system_alerts_pending_dispatch`

## 2026-11-26 08:17 UTC

- **functions** alterado (1): `public.get_dashboard_kpis(_from date, _to date)`

## 2026-11-26 07:14 UTC

- **edge functions** alterado (4): `alert-dispatcher`, `check-cotacao-followup`, `scim-v2`, `send-push-notification`

## 2026-11-26 06:21 UTC

- **functions** alterado (2): `public.cleanup_health_scan_runs()`, `public.xbz_sync_watchdog()`
- **migrations** adicionado (1): `20261127160000_versiona_jobs_manutencao_e_watchdog_xbz`

## 2026-11-26 05:13 UTC

- **edge functions** alterado (1): `process-outbox`
- **functions** alterado (2): `public._invoke_edge_function(_name text)`, `public.claim_outbox_batch(p_batch_size integer)`
- **migrations** adicionado (1): `20261127150000_outbox_claim_atomico_e_frequencia`

## 2026-11-26 04:51 UTC

- **cron jobs** alterado (1): `18:outbox-worker-1min`
- **functions** adicionado (1): `public.claim_outbox_batch(p_batch_size integer)`
- **functions** alterado (2): `public.cron_watchdog()`, `public.resolve_stale_system_error_alerts()`
- **migrations** adicionado (1): `20261127140000_cron_watchdog_falha_por_janela_de_tempo`

## 2026-11-26 04:39 UTC

- **functions** alterado (4): `public.apply_lgpd_retention()`, `public.cleanup_old_integration_outbox()`, `public.cleanup_old_system_alerts()`, `public.cron_watchdog()`
- **migrations** adicionado (1): `20261127130000_retencao_system_alerts_fonte_unica`

## 2026-11-26 04:24 UTC

- **cron jobs** alterado (1): `2:cleanup-system-alerts`
- **functions** alterado (1): `public.cleanup_old_system_alerts()`

## 2026-11-26 04:15 UTC

- **config: auth_config** adicionado (1): `auth_config`
- **config: network_restrictions** adicionado (1): `network_restrictions`
- **config: pooler_config** adicionado (1): `pooler_config`
- **config: postgres_config** adicionado (1): `postgres_config`
- **config: postgrest_config** adicionado (1): `postgrest_config`
- **config: storage_config** adicionado (1): `storage_config`
- **edge functions** adicionado (41): `ai-demand-prediction`, `ai-negotiation`, `ai-supplier-risk`, `ai-supplier-suggestion`, `alert-dispatcher`, `check-approval-escalations`, `check-cotacao-followup`, `check-expiry-alerts`, `check-sla-alerts`, `dependency-health`, `erp-credential-encrypt`, `erp-sync`, `escalate-solicitacao`, `external-db-bridge`, `fiscal-orchestrator`, `generate-contract-pdf`, `guided-buying-ai`, `health-dashboard`, `maintain-partitions`, `migrate-storage-paths`, `process-invoice-idp`, `process-outbox`, `process-solicitacao-neural`, `punchout-encrypt`, `punchout-receive`, `punchout-setup`, `receive-os-sync`, `run-audit`, `scim-v2`, `send-push-notification`, `spot-api`, `spot-proxy`, `system-simulation`, `telemetry`, `webauthn-authenticate`, `webauthn-register`, `weekly-report`, `weekly-summary-report`, `workflow-engine`, `xbz-proxy` … (+1)

## 2026-11-26 03:17 UTC

- **functions** alterado (1): `public.resolve_alert(_alert_id uuid, _note text)`

## 2026-11-26 02:22 UTC

- **realtime** removido (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_22`

## 2026-11-26 00:37 UTC

- **realtime** adicionado (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_29`

## 2026-11-25 23:25 UTC

- **colunas** adicionado (1): `public.pagamentos.data_agendamento`
- **migrations** adicionado (1): `20261127120000_pagamentos_data_agendamento`

## 2026-11-25 20:13 UTC

- **functions** alterado (3): `public.has_role(_user_id uuid, _role app_role)`, `public.tenant_in_my_group(_tenant_id uuid)`, `public.update_licitacao_best_bid()`
- **lints** adicionado (30): `policy_auth_fn_not_wrapped:public.approval_hierarchy.approval_hierarchy_escrita_gestao`, `policy_auth_fn_not_wrapped:public.auction_bids.auction_bids_escrita_ordem`, `policy_auth_fn_not_wrapped:public.erp_sync_log.erp_sync_log_escrita_gestao`, `policy_auth_fn_not_wrapped:public.fiscal_events.fiscal_events_escrita_ordem`, `policy_auth_fn_not_wrapped:public.fornecedor_categorias.fornecedor_categorias_escrita_gestao`, `policy_auth_fn_not_wrapped:public.licitacao_lances.licitacao_lances_escrita_ordem`, `policy_auth_fn_not_wrapped:public.punchout_sessions.punchout_sessions_escrita_ordem`, `policy_auth_fn_not_wrapped:public.savings_tracker.savings_tracker_escrita_gestao`, `policy_auth_fn_not_wrapped:public.scim_provisioning_log.scim_provisioning_log_escrita_admin`, `policy_auth_fn_not_wrapped:public.sourcing_awards.sourcing_awards_escrita_ordem`, `policy_auth_fn_not_wrapped:public.sourcing_event_criteria.sourcing_event_criteria_escrita_ordem`, `policy_auth_fn_not_wrapped:public.sourcing_event_lots.sourcing_event_lots_escrita_ordem`, `policy_auth_fn_not_wrapped:public.sourcing_event_questions.sourcing_event_questions_escrita_ordem`, `policy_auth_fn_not_wrapped:public.sourcing_events.sourcing_events_escrita_ordem`, `policy_auth_fn_not_wrapped:public.sourcing_invitations.sourcing_invitations_escrita_ordem`, `policy_auth_fn_not_wrapped:public.sourcing_pipeline.sourcing_pipeline_escrita_gestao`, `policy_auth_fn_not_wrapped:public.sourcing_projects.sourcing_projects_escrita_gestao`, `policy_auth_fn_not_wrapped:public.sourcing_response_answers.sourcing_response_answers_escrita_ordem`, `policy_auth_fn_not_wrapped:public.sourcing_response_items.sourcing_response_items_escrita_ordem`, `policy_auth_fn_not_wrapped:public.sourcing_responses.sourcing_responses_escrita_ordem`, `policy_auth_fn_not_wrapped:public.sso_configurations.sso_configurations_escrita_admin`, `policy_auth_fn_not_wrapped:public.workflow_approvals.workflow_approvals_escrita_gestao`, `policy_auth_fn_not_wrapped:public.workflow_audit_log.workflow_audit_log_escrita_gestao`, `policy_auth_fn_not_wrapped:public.workflow_edges.workflow_edges_escrita_gestao`, `policy_auth_fn_not_wrapped:public.workflow_instances.workflow_instances_escrita_gestao`, `policy_auth_fn_not_wrapped:public.workflow_logs.workflow_logs_escrita_gestao`, `policy_auth_fn_not_wrapped:public.workflow_nodes.workflow_nodes_escrita_gestao`, `policy_auth_fn_not_wrapped:public.workflow_sod_rules.workflow_sod_rules_escrita_gestao`, `policy_auth_fn_not_wrapped:public.workflow_tasks.workflow_tasks_escrita_gestao`, `policy_auth_fn_not_wrapped:public.workflow_templates.workflow_templates_escrita_gestao`
- **migrations** adicionado (1): `20261126153000_rls_fase2_30_tabelas_por_papel`
- **policies (RLS)** adicionado (71): `public.approval_hierarchy.approval_hierarchy_escrita_gestao`, `public.approval_hierarchy.approval_hierarchy_select_grupo`, `public.auction_bids.auction_bids_escrita_ordem`, `public.auction_bids.auction_bids_select_grupo`, `public.erp_sync_log.erp_sync_log_escrita_gestao`, `public.erp_sync_log.erp_sync_log_select_grupo`, `public.erp_sync_log.tenant_isolation_erp_sync_log`, `public.fiscal_events.fiscal_events_escrita_ordem`, `public.fiscal_events.fiscal_events_select_grupo`, `public.fiscal_events.tenant_isolation_fiscal_events`, `public.fornecedor_categorias.fornecedor_categorias_escrita_gestao`, `public.fornecedor_categorias.fornecedor_categorias_select_grupo`, `public.licitacao_lances.licitacao_lances_escrita_ordem`, `public.licitacao_lances.licitacao_lances_select_grupo`, `public.punchout_sessions.punchout_sessions_escrita_ordem`, `public.punchout_sessions.punchout_sessions_select_grupo`, `public.punchout_sessions.tenant_isolation_punchout_sessions`, `public.savings_tracker.savings_tracker_escrita_gestao`, `public.savings_tracker.savings_tracker_select_grupo`, `public.scim_provisioning_log.scim_provisioning_log_escrita_admin`, `public.scim_provisioning_log.scim_provisioning_log_select_grupo`, `public.scim_provisioning_log.tenant_isolation_scim_provisioning_log`, `public.sourcing_awards.sourcing_awards_escrita_ordem`, `public.sourcing_awards.sourcing_awards_select_grupo`, `public.sourcing_event_criteria.sourcing_event_criteria_escrita_ordem`, `public.sourcing_event_criteria.sourcing_event_criteria_select_grupo`, `public.sourcing_event_lots.sourcing_event_lots_escrita_ordem`, `public.sourcing_event_lots.sourcing_event_lots_select_grupo`, `public.sourcing_event_questions.sourcing_event_questions_escrita_ordem`, `public.sourcing_event_questions.sourcing_event_questions_select_grupo`, `public.sourcing_events.sourcing_events_escrita_ordem`, `public.sourcing_events.sourcing_events_select_grupo`, `public.sourcing_invitations.sourcing_invitations_escrita_ordem`, `public.sourcing_invitations.sourcing_invitations_select_grupo`, `public.sourcing_pipeline.sourcing_pipeline_escrita_gestao`, `public.sourcing_pipeline.sourcing_pipeline_select_grupo`, `public.sourcing_projects.sourcing_projects_escrita_gestao`, `public.sourcing_projects.sourcing_projects_select_grupo`, `public.sourcing_response_answers.sourcing_response_answers_escrita_ordem`, `public.sourcing_response_answers.sourcing_response_answers_select_grupo` … (+31)
- **policies (RLS)** removido (11): `public.erp_sync_log.ERP sync logs are tenant-isolated`, `public.fiscal_events.fiscal_events tenant isolation`, `public.punchout_sessions.tenant isolation punchout_sessions`, `public.scim_provisioning_log.SCIM logs isolated by tenant`, `public.sso_configurations.SSO configurations isolated by tenant`, `public.workflow_approvals.Tenant isolation for workflow_approvals`, `public.workflow_edges.Tenant isolation for workflow_edges`, `public.workflow_instances.Tenant isolation for workflow_instances`, `public.workflow_logs.Tenant isolation for workflow_logs`, `public.workflow_nodes.Tenant isolation for workflow_nodes`, `public.workflow_templates.Tenant isolation for workflow_templates`
- **policies (RLS)** alterado (19): `public.approval_hierarchy.tenant_isolation_approval_hierarchy`, `public.auction_bids.tenant_isolation_auction_bids`, `public.fornecedor_categorias.tenant_isolation_fornecedor_categorias`, `public.licitacao_lances.tenant_isolation_licitacao_lances`, `public.savings_tracker.tenant_isolation_savings_tracker`, `public.sourcing_awards.tenant_isolation_sourcing_awards`, `public.sourcing_event_criteria.tenant_isolation_sourcing_event_criteria`, `public.sourcing_event_lots.tenant_isolation_sourcing_event_lots`, `public.sourcing_event_questions.tenant_isolation_sourcing_event_questions`, `public.sourcing_events.tenant_isolation_sourcing_events`, `public.sourcing_invitations.tenant_isolation_sourcing_invitations`, `public.sourcing_pipeline.tenant_isolation_sourcing_pipeline`, `public.sourcing_projects.tenant_isolation_sourcing_projects`, `public.sourcing_response_answers.tenant_isolation_sourcing_response_answers`, `public.sourcing_response_items.tenant_isolation_sourcing_response_items`, `public.sourcing_responses.tenant_isolation_sourcing_responses`, `public.workflow_audit_log.tenant_isolation_workflow_audit_log`, `public.workflow_sod_rules.tenant_isolation_workflow_sod_rules`, `public.workflow_tasks.tenant_isolation_workflow_tasks`

## 2026-11-25 19:10 UTC

- **functions** alterado (2): `public.current_tenant_id()`, `public.user_belongs_to_tenant(_user_id uuid, _tenant_id uuid)`
- **migrations** adicionado (2): `20261113180001_storage_policies_por_bucket`, `20261126140000_rls_fase2_notifications_e_category_strategies`

## 2026-11-25 12:20 UTC

- **realtime** adicionado (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_28`
- **realtime** removido (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_21`

## 2026-11-25 11:13 UTC

- **functions** alterado (3): `public.get_my_organization()`, `public.has_role(_user_id uuid, _role app_role)`, `public.tenant_in_my_group(_tenant_id uuid)`
- **lints** adicionado (4): `policy_auth_fn_not_wrapped:public.category_strategies.category_strategies_escrita_admin_coord`, `policy_auth_fn_not_wrapped:public.category_strategies.tenant_isolation`, `policy_auth_fn_not_wrapped:public.notifications.Users can delete their own notifications`, `policy_auth_fn_not_wrapped:public.notifications.tenant_isolation_notifications`
- **migrations** adicionado (322): `20250102000000_compras_production`, `20251216162747_c7d5b816-cc67-4a20-8eac-aeda17c1db98`, `20251216163227_7109e99a-58a4-48de-8bce-f05daa6d8de3`, `20251216163235_f88e3e2e-dbcc-4c94-825f-ba624bdf9699`, `20251216175601_09bef357-a53c-430f-a804-87ffa2032908`, `20251220142204_16a9bb4a-ce42-4aaf-9de3-10f0ad0e2343`, `20251220145628_690ef073-d843-45ed-95d3-7b3158d2a0e9`, `20251220181110_c3da115e-7cad-4dc4-b147-3b888d4c332e`, `20251231120356_3ae6d121-b315-421d-a18c-f2155c8f692f`, `20251231124623_0e87b288-4dd1-4c9f-a749-9521063fc8e9`, `20251231124632_ea8bac6c-d56e-4396-8c99-c1eb772c63c6`, `20251231131007_37368865-d1b2-49cf-b292-2d7eefd5842f`, `20251231131344_91120ebc-5790-48f7-8136-586a54120751`, `20251231132431_1b93121d-151b-4729-a7b4-31449aa836e9`, `20260107172217_de06dea9-cebf-4340-afb0-58240cc1305f`, `20260108121914_c65220f2-3087-4c98-8977-516da335701e`, `20260108121940_53728049-5423-4b02-bbf0-c7933111258a`, `20260108200215_37789714-fc43-4f82-bf80-ec23f5221216`, `20260111025047_ef19eb03-bc15-4917-87a8-f230df328ef2`, `20260305235141_fb0a94fe-0f86-4435-b5ef-211b31315d40`, `20260305235259_6352128a-66c0-4236-b4ef-0533ffe26b4a`, `20260306002711_53c14912-5d65-4bbb-bc3e-d9bca734770b`, `20260314200210_522a5d31-0ebd-4623-a88a-386d4b76b4df`, `20260314200709_bea0cf6c-6af4-4936-a667-9edc8d986d7b`, `20260314201406_4a72b2f1-149a-4a09-a5f5-1f29b5ac9eb4`, `20260314201641_3ab6905f-02a0-4547-8557-94be6328f16e`, `20260315143051_bc8cf5e2-b51a-4c11-8f01-e3a59649063e`, `20260315150226_a87f820e-b073-45d2-8637-5fbb0dc5fbb9`, `20260315150651_927a71bc-ebad-480f-b1c4-efe83c949cc4`, `20260315151013_dfff8719-f695-4626-98f6-1380350d5d9a`, `20260315151408_8ffa629b-ebf8-41cd-a770-8b0d78746e04`, `20260315151901_0b81998e-797d-4956-96dd-95829ea06c24`, `20260315164635_39bb111c-4995-4b60-ab28-3f83a84b78e2`, `20260315173730_7339fd92-4c67-404b-8051-3157db7a50bc`, `20260315223230_eeba531f-0b98-4764-b2a4-213d214e6494`, `20260315223242_169684f3-beec-4caa-9566-70e5fadf7676`, `20260317185335_36f3a1e4-58fc-4edd-9d74-2716b579b366`, `20260317192813_fdf8b9ee-e383-42f2-9b2c-ed0b62e83734`, `20260317200943_0aa56f87-1df6-402d-8e21-1621b37baeb0`, `20260317201619_b1fdf364-9772-43d4-a769-7e51c33cc5eb` … (+282)
- **policies (RLS)** adicionado (3): `public.category_strategies.category_strategies_escrita_admin_coord`, `public.notifications.Users can delete their own notifications`, `public.notifications.notificacoes_thread_followup_cotacao`
- **policies (RLS)** alterado (2): `public.category_strategies.tenant_isolation`, `public.notifications.tenant_isolation_notifications`

## 2026-11-24 22:11 UTC

- **functions** alterado (1): `public._invoke_edge_function(_name text)`

## 2026-11-24 21:12 UTC

- **functions** alterado (4): `public.get_cost_center_performance_report()`, `public.get_cost_center_performance_report(p_organization_id uuid)`, `public.get_user_grupo_id()`, `public.tenant_in_my_group(_tenant_id uuid)`

## 2026-11-24 17:12 UTC

- **functions** alterado (4): `public.tenant_in_my_group(_tenant_id uuid)`, `public.validate_cotacao_status_transition()`, `public.validate_pagamento_status_transition()`, `public.validate_pedido_status_transition()`
- **triggers** removido (1): `public.pedidos.trg_validate_pedido_status`

## 2026-11-24 16:14 UTC

- **functions** alterado (2): `public.find_approval_rule(p_valor numeric, p_categoria_id uuid)`, `public.tenant_in_my_group(_tenant_id uuid)`

## 2026-11-24 15:12 UTC

- **functions** adicionado (1): `public.assign_numero_solicitacao()`
- **functions** alterado (1): `public.generate_sequential_number(prefix text, table_name text)`
- **triggers** adicionado (1): `public.solicitacoes.trg_assign_numero_solicitacao`

## 2026-11-24 04:19 UTC

- **realtime** adicionado (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_27`
- **realtime** removido (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_20`

## 2026-11-24 00:29 UTC

- **colunas** adicionado (1): `public.solicitacoes.external_ref`
- **functions** alterado (1): `public.validate_pagamento_status_transition()`
- **indexes** adicionado (1): `public.idx_solicitacoes_external_ref`

## 2026-11-23 22:12 UTC

- **functions** alterado (1): `public.generate_sequential_number(prefix text, table_name text)`

## 2026-11-23 20:12 UTC

- **functions** adicionado (1): `public.get_my_permissions()`
- **functions** alterado (3): `public.generate_sequential_number(prefix text, table_name text)`, `public.get_compras_sla_metrics(p_organization_id uuid, p_period text, p_category_id uuid, p_supplier_id uuid)`, `public.get_user_grupo_id()`

## 2026-11-23 12:31 UTC

- **realtime** adicionado (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_26`
- **realtime** removido (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_19`

## 2026-11-22 19:10 UTC

- **functions** adicionado (1): `public.get_compras_sla_metrics(p_organization_id uuid, p_period text, p_category_id uuid, p_supplier_id uuid)`
- **functions** alterado (1): `public.get_user_grupo_id()`

## 2026-11-22 14:11 UTC

- **realtime** removido (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_18`

## 2026-11-22 13:11 UTC

- **functions** alterado (2): `public.cron_watchdog()`, `public.resolve_stale_system_error_alerts()`
- **indexes** adicionado (1): `public.idx_solicitacoes_pim_product_id`

## 2026-11-22 12:16 UTC

- **colunas** adicionado (3): `public.cron_watchdog_seen.first_seen`, `public.cron_watchdog_seen.jobid`, `public.cron_watchdog_seen.jobname`
- **constraints** adicionado (1): `public.cron_watchdog_seen.cron_watchdog_seen_pkey`
- **cron jobs** adicionado (1): `123:cron-watchdog-15min`
- **functions** adicionado (1): `public.resolve_stale_system_error_alerts()`
- **functions** alterado (4): `public._invoke_xbz_sync()`, `public.check_telemetry_alerts()`, `public.cron_watchdog()`, `public.xbz_sync_watchdog()`
- **grants** adicionado (1): `public.cron_watchdog_seen:service_role`
- **indexes** adicionado (1): `public.cron_watchdog_seen_pkey`
- **lints** adicionado (1): `rls_no_policies:public.cron_watchdog_seen`
- **realtime** adicionado (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_25`
- **tabelas** adicionado (1): `public.cron_watchdog_seen`

## 2026-11-21 23:10 UTC

- **cron jobs** adicionado (2): `121:spot-api-sync-orders-30min`, `122:spot-api-sync-stock`
- **cron jobs** removido (1): `33:spot-api-sync-stock`
- **functions** alterado (1): `public._invoke_spot_sync(_action text)`

## 2026-11-21 19:09 UTC

- **colunas** adicionado (9): `public.estoque.pim_product_id`, `public.pedido_itens.codigo_fornecedor`, `public.pedido_itens.ipi_rate`, `public.pedido_itens.ncm`, `public.pedido_itens.pim_product_id`, `public.pedido_itens.pim_variant_id`, `public.repurchase_suggestions.pim_product_id`, `public.solicitacoes.pim_product_id`, `public.solicitacoes.pim_variant_id`
- **functions** alterado (1): `public._invoke_edge_function(_name text)`
- **indexes** adicionado (1): `public.idx_pedido_itens_pim_product_id`

## 2026-11-21 17:41 UTC

- **cron jobs** adicionado (8): `113:alert-dispatcher-1min`, `114:approval-escalation-check`, `115:contract-expiry-check`, `116:cotacao-followup-check`, `117:expiry-alerts-check`, `118:sla-alerts-check`, `119:weekly-procurement-report`, `120:weekly-summary-report-job`
- **functions** alterado (1): `public._invoke_edge_function(_name text)`

## 2026-11-21 16:12 UTC

- **functions** alterado (2): `public._invoke_edge_function(_name text)`, `public.cron_watchdog()`

## 2026-11-21 14:11 UTC

- **realtime** removido (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_17`

## 2026-11-21 12:17 UTC

- **cron jobs** adicionado (1): `112:xbz-sync-pedidos-30min`
- **cron jobs** removido (1): `23:xbz-sync-pedidos-30min`
- **functions** alterado (1): `public._invoke_xbz_sync()`
- **realtime** adicionado (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_24`

## 2026-11-20 22:11 UTC

- **functions** alterado (1): `public.has_role(_user_id uuid, _role app_role)`

## 2026-11-20 18:15 UTC

- **migrations** adicionado (10): `20261117150000_religa_cadastro_de_usuarios`, `20261117160000_indices_nunca_aplicados`, `20261117162000_auditoria_preserva_autoria`, `20261117170000_corrige_alertas_sistema_e_agenda_scan_particoes`, `20261117180000_popula_etapas_dos_templates_de_workflow`, `20261117190000_remove_cleanup_old_audit_logs_quebrado`, `20261117200000_telemetria_retencao_unica_90_dias`, `20261117210000_audit_logs_append_only_hash_encadeado`, `20261117220000_audit_logs_hash_defaults`, `20261117230000_retencao_fonte_unica`

## 2026-11-20 17:10 UTC

- **functions** adicionado (1): `public.auto_transition_solicitacao_on_workflow_approved()`
- **migrations** adicionado (1): `20261120120000_fio2_workflow_approved_promove_solicitacao`
- **triggers** adicionado (1): `public.approval_workflows.trg_workflow_approved_promotes_solicitacao`

## 2026-11-20 04:14 UTC

- **realtime** removido (2): `supabase_realtime_messages_publication:realtime.messages_2026_11_15`, `supabase_realtime_messages_publication:realtime.messages_2026_11_16`

## 2026-11-20 00:45 UTC

- **realtime** adicionado (2): `supabase_realtime_messages_publication:realtime.messages_2026_11_22`, `supabase_realtime_messages_publication:realtime.messages_2026_11_23`

## 2026-11-19 12:17 UTC

- **lints** adicionado (1): `policy_auth_fn_not_wrapped:public.entity_versions.Authenticated can insert versions`
- **lints** removido (1): `policy_auth_fn_not_wrapped:public.entity_versions.Users can insert versions`
- **migrations** adicionado (1): `20261119000000_entity_versions_politicas_authenticated`
- **policies (RLS)** adicionado (2): `public.entity_versions.Authenticated can insert versions`, `public.entity_versions.Authenticated can view versions`
- **policies (RLS)** removido (2): `public.entity_versions.Users can insert versions`, `public.entity_versions.Users can view versions`

## 2026-11-18 19:10 UTC

- Snapshot inicial.

