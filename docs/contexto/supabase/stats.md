# Métricas (voláteis — mudam sem alteração de schema)

Valores aproximados de propósito, para não gerar commits a cada coleta. Fora de `snapshot.json`; o bruto está em `stats.json`.

## Banco

| métrica | valor |
|---|---|
| tamanho | 72.7 MB |
| schema public | 41.6 MB |


## Tabelas (ordenadas por tamanho)

| tabela | linhas (~) | total | heap | índices | linhas mortas (~) | seq scans (~) | idx scans (~) | último autovacuum |
|---|---|---|---|---|---|---|---|---|
| public.spot_skus | ~3.8k | 14.1 MB | 13.3 MB | 640.0 KB | 0 | ~30 | ~41.6k | 2026-11-26 |
| public.spot_produtos | ~1.3k | 8.0 MB | 1.0 MB | 736.0 KB | 0 | ~30 | ~14.1k | 2026-11-26 |
| public.telemetry_logs | ~2.1k | 1.8 MB | 688.0 KB | 1.1 MB | 0 | ~220 | ~880 | 2026-11-24 |
| public.spot_estoque | ~3.8k | 1.4 MB | 760.0 KB | 616.0 KB | 0 | ~50 | ~2.8M | 2026-11-26 |
| public.system_alerts | ~470 | 944.0 KB | 312.0 KB | 592.0 KB | ~40 | ~14.1k | ~30.9k | 2026-11-25 |
| public.login_attempts | ~2.1k | 816.0 KB | 416.0 KB | 360.0 KB | 2 | ~120 | ~120 | 2026-11-23 |
| public.solicitacoes | ~290 | 752.0 KB | 376.0 KB | 336.0 KB | ~70 | ~10.8k | ~20.1k | 2026-11-13 |
| public.health_scan_runs | ~680 | 656.0 KB | 152.0 KB | 464.0 KB | ~100 | ~200 | ~3.5k | 2026-11-25 |
| public.telemetry_logs_202605 | ~560 | 520.0 KB | 320.0 KB | 168.0 KB | 0 | ~20 | ~560 |  |
| public.telemetry_logs_legacy_20260712 | ~570 | 496.0 KB | 312.0 KB | 152.0 KB | 0 | ~20 | ~570 |  |
| public.webhook_events | ~280 | 352.0 KB | 200.0 KB | 120.0 KB | 3 | ~40 | ~630 |  |
| public.spot_api_sync_log | ~950 | 328.0 KB | 112.0 KB | 184.0 KB | 2 | ~1.2k | ~1.5k |  |
| public.pedidos | ~30 | 264.0 KB | 16.0 KB | 208.0 KB | ~40 | ~6k | ~11.8k | 2026-11-13 |
| public.fornecedores | ~10 | 248.0 KB | 16.0 KB | 192.0 KB | ~20 | ~14.6k | ~1.4k | 2026-11-13 |
| public.cotacoes | ~60 | 240.0 KB | 40.0 KB | 160.0 KB | ~60 | ~4.1k | ~7.8k | 2026-11-21 |
| public.audit_logs | ~30 | 232.0 KB | 48.0 KB | 144.0 KB | ~30 | ~120 | ~530 | 2026-11-17 |
| public.notifications | ~60 | 224.0 KB | 80.0 KB | 112.0 KB | ~60 | ~290 | ~4.5k |  |
| public.pagamentos | 3 | 224.0 KB | 8.0 KB | 176.0 KB | ~50 | ~3.1k | ~6.6k | 2026-11-13 |
| public.produtos | ~10 | 184.0 KB | 16.0 KB | 128.0 KB | ~20 | ~170 | ~380 | 2026-11-12 |
| public.telemetry_logs_202607 | ~50 | 184.0 KB | 40.0 KB | 112.0 KB | 0 | ~20 | ~50 |  |
| public.fiscal_documents | ~20 | 168.0 KB | 16.0 KB | 112.0 KB | 0 | ~170 | 8 | 2026-11-12 |
| public.licitacoes | 7 | 168.0 KB | 16.0 KB | 112.0 KB | 0 | ~140 | ~290 | 2026-11-13 |
| public.contracts | 5 | 152.0 KB | 24.0 KB | 96.0 KB | ~50 | ~240 | ~320 |  |
| public.profiles | ~10 | 152.0 KB | 8.0 KB | 104.0 KB | ~30 | ~358k | ~73.5k | 2026-11-13 |
| public.tenants | 1 | 152.0 KB | 8.0 KB | 104.0 KB | ~20 | ~317k | ~88.2k | 2026-11-13 |
| public.pedido_itens | 7 | 144.0 KB | 8.0 KB | 96.0 KB | ~10 | ~110 | ~180 | 2026-11-13 |
| public.department_budgets | ~30 | 136.0 KB | 16.0 KB | 80.0 KB | ~20 | ~790 | ~2k | 2026-11-13 |
| public.licitacao_propostas | ~10 | 136.0 KB | 16.0 KB | 80.0 KB | ~20 | ~100 | 7 | 2026-11-12 |
| public.approval_workflows | 0 | 128.0 KB | 8.0 KB | 96.0 KB | ~20 | ~240 | ~10.3k | 2026-11-13 |
| public.cost_centers | 7 | 128.0 KB | 8.0 KB | 80.0 KB | ~10 | ~1.9k | ~170 | 2026-11-13 |
| public.query_telemetry | ~20 | 128.0 KB | 8.0 KB | 112.0 KB | ~40 | ~220 | ~210 |  |
| public.rate_limit_logs | 0 | 128.0 KB | 8.0 KB | 112.0 KB | ~20 | ~2.7k | ~250 |  |
| public.sourcing_invitations | 0 | 128.0 KB | 16.0 KB | 80.0 KB | ~20 | ~20 | 2 |  |
| public.supplier_documents | ~110 | 128.0 KB | 24.0 KB | 64.0 KB | 5 | ~220 | ~6.7k | 2026-11-12 |
| public.active_sessions | ~10 | 120.0 KB | 16.0 KB | 64.0 KB | ~50 | ~460 | ~120 | 2026-11-26 |
| public.deadlock_snapshots | 0 | 120.0 KB | 8.0 KB | 88.0 KB | 6 | ~180 | ~880 | 2026-08-02 |
| public.estoque | ~20 | 120.0 KB | 16.0 KB | 64.0 KB | ~30 | ~100 | ~200 | 2026-11-12 |
| public.account_lockouts | 4 | 112.0 KB | 8.0 KB | 64.0 KB | ~30 | ~4.5k | 1 | 2026-11-12 |
| public.approval_steps | 0 | 112.0 KB | 8.0 KB | 80.0 KB | ~40 | ~1.2k | ~13.6k | 2026-11-13 |
| public.budget_audit_logs | ~30 | 112.0 KB | 24.0 KB | 48.0 KB | 0 | ~40 | ~140 | 2026-11-13 |
| public.categorias | 9 | 112.0 KB | 8.0 KB | 64.0 KB | ~10 | ~8.8k | ~220 | 2026-11-12 |
| public.creditos_fornecedor | 0 | 112.0 KB | 8.0 KB | 96.0 KB | ~20 | ~60 | ~80 |  |
| public.devolucoes | 3 | 112.0 KB | 8.0 KB | 96.0 KB | 9 | ~80 | ~140 |  |
| public.estoque_movimentacoes | ~70 | 112.0 KB | 16.0 KB | 64.0 KB | 0 | ~240 | 6 |  |
| public.punchout_sessions | 0 | 112.0 KB | 8.0 KB | 96.0 KB | 3 | ~30 | ~50 |  |
| public.security_definer_baseline | ~120 | 112.0 KB | 32.0 KB | 48.0 KB | 0 | ~20 | ~120 |  |
| public.sourcing_events | 0 | 112.0 KB | 8.0 KB | 96.0 KB | 0 | ~40 | ~70 |  |
| public.sourcing_pipeline | 0 | 112.0 KB | 8.0 KB | 96.0 KB | 4 | ~50 | 7 |  |
| public.supplier_qualification_scores | ~10 | 104.0 KB | 16.0 KB | 48.0 KB | ~10 | ~60 | ~2.3k | 2026-11-12 |
| public.user_tenants | ~10 | 104.0 KB | 8.0 KB | 64.0 KB | ~10 | ~162.4k | ~50 | 2026-11-13 |
| public.approval_history | 0 | 96.0 KB | 8.0 KB | 80.0 KB | ~10 | ~60 | ~160 |  |
| public.approval_rules | 0 | 96.0 KB | 8.0 KB | 80.0 KB | ~30 | ~90 | ~24.3k |  |
| public.contact_notes | 0 | 96.0 KB | 8.0 KB | 80.0 KB | 5 | ~1.9k | ~40 |  |
| public.contract_penalties | 0 | 96.0 KB | 8.0 KB | 80.0 KB | 6 | ~40 | ~140 |  |
| public.workflow_edges | 0 | 96.0 KB | 8.0 KB | 80.0 KB | 0 | ~30 | ~20 |  |
| public.workflow_instances | 0 | 96.0 KB | 8.0 KB | 80.0 KB | 3 | ~20 | 6 |  |
| public.spot_customization_options | 0 | 88.0 KB | 0 B | 64.0 KB | 0 | ~20 | ~210 | 2026-11-23 |
| public.telemetry_logs_202606 | 0 | 88.0 KB | 0 B | 80.0 KB | 0 | ~20 | 1 |  |
| public.telemetry_logs_202608 | 0 | 88.0 KB | 0 B | 80.0 KB | 0 | ~20 | 0 |  |
| public.telemetry_logs_202609 | 0 | 88.0 KB | 0 B | 80.0 KB | 0 | ~20 | 1 |  |
| public.audit_logs_202605 | 0 | 80.0 KB | 0 B | 72.0 KB | 0 | ~30 | 8 |  |
| public.audit_logs_202606 | 0 | 80.0 KB | 0 B | 72.0 KB | 0 | ~30 | 8 |  |
| public.audit_logs_202607 | 0 | 80.0 KB | 0 B | 72.0 KB | 0 | ~30 | 8 |  |
| public.audit_logs_202608 | 0 | 80.0 KB | 0 B | 72.0 KB | 0 | ~30 | 9 |  |
| public.audit_logs_202609 | 0 | 80.0 KB | 0 B | 72.0 KB | 0 | ~30 | 7 |  |
| public.audit_logs_legacy_20260712 | 0 | 80.0 KB | 0 B | 72.0 KB | 0 | ~30 | 0 |  |
| public.category_strategies | 0 | 80.0 KB | 8.0 KB | 64.0 KB | 4 | ~70 | ~20 |  |
| public.devolucao_itens | 0 | 80.0 KB | 8.0 KB | 64.0 KB | 4 | ~30 | 2 |  |
| public.financial_audit_logs | 0 | 80.0 KB | 16.0 KB | 32.0 KB | ~10 | ~130 | 6 | 2026-11-13 |
| public.fiscal_events | 0 | 80.0 KB | 8.0 KB | 64.0 KB | 2 | ~20 | 3 |  |
| public.geo_access_logs | 0 | 80.0 KB | 0 B | 72.0 KB | 0 | ~30 | ~200 |  |
| public.organizations | 1 | 80.0 KB | 8.0 KB | 32.0 KB | 6 | ~6.4k | 1 | 2026-11-13 |
| public.security_logs | 0 | 80.0 KB | 8.0 KB | 64.0 KB | 3 | ~40 | ~110 |  |
| public.sourcing_projects | 0 | 80.0 KB | 8.0 KB | 64.0 KB | 0 | ~20 | ~10 |  |
| public.spot_sessions | ~180 | 80.0 KB | 32.0 KB | 16.0 KB | 5 | ~1.6k | 1 |  |
| public.supplier_bonifications | 0 | 80.0 KB | 8.0 KB | 64.0 KB | 3 | ~40 | ~80 |  |
| public.temp_file_snapshots | ~140 | 80.0 KB | 16.0 KB | 32.0 KB | 0 | ~10 | ~150 |  |
| public.workflow_logs | 0 | 80.0 KB | 8.0 KB | 64.0 KB | 1 | ~20 | 8 |  |
| public.approval_delegations | 0 | 72.0 KB | 8.0 KB | 56.0 KB | 5 | ~50 | ~17.5k |  |
| public.licitacao_lances | 0 | 72.0 KB | 8.0 KB | 64.0 KB | 0 | ~20 | ~40 |  |
| public.password_reset_requests | 0 | 72.0 KB | 0 B | 64.0 KB | 0 | ~30 | ~10 |  |
| public.role_permissions | ~90 | 72.0 KB | 8.0 KB | 64.0 KB | 0 | ~460 | ~540 |  |
| public.sourcing_awards | 0 | 72.0 KB | 0 B | 64.0 KB | 0 | ~30 | ~40 |  |
| public.spot_pedidos | 0 | 72.0 KB | 8.0 KB | 56.0 KB | 1 | ~40 | 4 |  |
| public.sso_configurations | 0 | 72.0 KB | 8.0 KB | 56.0 KB | 0 | ~20 | 6 |  |
| public.table_size_snapshots | 0 | 72.0 KB | 0 B | 64.0 KB | 0 | ~10 | 1 |  |
| public.blocked_ips | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 6 | ~20 | ~10 |  |
| public.contract_documents | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 7 | ~80 | ~20 |  |
| public.contract_history | 0 | 64.0 KB | 8.0 KB | 48.0 KB | ~20 | ~40 | ~30 |  |
| public.contract_items | 0 | 64.0 KB | 8.0 KB | 48.0 KB | ~30 | ~70 | ~40 |  |
| public.cron_heartbeats | 9 | 64.0 KB | 8.0 KB | 16.0 KB | ~10 | ~20 | ~16.2k | 2026-11-26 |
| public.payment_history | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 5 | ~50 | ~40 |  |
| public.penalty_escalation_config | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 7 | ~40 | ~30 |  |
| public.permissions | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | ~30 | ~630 |  |
| public.produto_fornecedores | 0 | 64.0 KB | 8.0 KB | 48.0 KB | ~30 | ~230 | ~70 |  |
| public.punchout_catalogs | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 1 | ~40 | 5 |  |
| public.savings_tracker | 5 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | ~50 | 1 |  |
| public.sourcing_event_criteria | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | ~20 | 1 |  |
| public.sourcing_event_lots | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | ~40 | 2 |  |
| public.unspsc_codes | ~20 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | ~40 | ~20 |  |
| public.workflow_nodes | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 4 | ~30 | ~180 |  |
| public.auction_bids | 0 | 56.0 KB | 0 B | 48.0 KB | 0 | ~20 | 7 |  |
| public.fornecedor_categorias | 2 | 56.0 KB | 8.0 KB | 48.0 KB | 2 | ~40 | 2 |  |
| public.wal_rate_snapshots | 0 | 56.0 KB | 0 B | 32.0 KB | 0 | ~60 | ~330 | 2026-08-30 |
| public.checkpoint_snapshots | 0 | 48.0 KB | 0 B | 32.0 KB | 0 | ~30 | ~310 | 2026-08-30 |
| public.qualification_history | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | ~20 | 1 |  |
| public.receiving_checklists | 0 | 48.0 KB | 0 B | 40.0 KB | 0 | ~40 | ~110 |  |
| public.repurchase_suggestions | 0 | 48.0 KB | 0 B | 40.0 KB | 0 | ~110 | 8 |  |
| public.saved_filters | 0 | 48.0 KB | 0 B | 40.0 KB | 0 | 7 | 6 |  |
| public.sourcing_responses | 0 | 48.0 KB | 0 B | 40.0 KB | 0 | ~20 | 2 |  |
| public.spend_forecasts | 0 | 48.0 KB | 0 B | 40.0 KB | 0 | ~30 | 1 |  |
| public.user_filter_preferences | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 1 | 9 | ~390 |  |
| public.user_tour_preferences | 1 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | ~50 | 2 |  |
| public.workflow_approvals | 0 | 48.0 KB | 0 B | 40.0 KB | 0 | ~2k | 9 |  |
| public.workflow_audit_log | 0 | 48.0 KB | 0 B | 40.0 KB | 0 | ~20 | 8 |  |
| public.workflow_sod_rules | 2 | 48.0 KB | 8.0 KB | 32.0 KB | 5 | ~60 | 2 |  |
| public.workflow_tasks | 0 | 48.0 KB | 0 B | 40.0 KB | 0 | ~30 | 9 |  |
| public.workflow_templates | 3 | 48.0 KB | 8.0 KB | 32.0 KB | ~10 | ~140 | 3 |  |
| public.xbz_produtos | 0 | 48.0 KB | 0 B | 40.0 KB | 0 | ~20 | 0 |  |
| public.alert_subscriptions | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~20 | ~90 |  |
| public.approval_hierarchy | 0 | 40.0 KB | 0 B | 40.0 KB | 0 | ~20 | ~20 |  |
| public.budget_transactions | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~30 | 7 |  |
| public.entity_versions | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~10 | 1 |  |
| public.erp_sync_log | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~20 | 2 |  |
| public.exchange_rates | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~60 | 1 |  |
| public.notification_preferences | 2 | 40.0 KB | 8.0 KB | 32.0 KB | 2 | ~1.9k | 2 |  |
| public.order_contracts | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~30 | ~20 |  |
| public.secret_rotation_schedule | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~20 | 8 |  |
| public.sourcing_response_answers | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~20 | 0 |  |
| public.sourcing_response_items | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~20 | 0 |  |
| public.user_roles | 0 | 40.0 KB | 8.0 KB | 32.0 KB | ~40 | ~90 | ~119.2k |  |
| public.xbz_pedidos | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~140 | 0 |  |
| public.allowed_countries | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 8 |  |
| public.blocked_countries | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 7 |  |
| public.cron_watchdog_seen | 0 | 32.0 KB | 8.0 KB | 16.0 KB | 3 | 7 | ~23.8k |  |
| public.currencies | 0 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | ~20 | ~3.3k |  |
| public.dependency_health_history | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~10 | ~40 |  |
| public.integration_outbox | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~100 | ~13.7k |  |
| public.ip_whitelist | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | ~20 |  |
| public.negotiation_analyses | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | ~90 |  |
| public.qualification_requirements | 0 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | ~3k | ~8.3k |  |
| public.sourcing_event_questions | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 2 |  |
| public.user_organizations | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~10 | ~70 |  |
| public.webauthn_credentials | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~10 | ~10 |  |
| public.aliquotas_tributarias | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~10 | 7 |  |
| public.dashboard_filter_favorites | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~50 | 1 |  |
| public.dashboard_layouts | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 7 | ~620 |  |
| public.dependency_health | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~10 | ~40 |  |
| public.erp_connections | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 2 |  |
| public.erp_field_mappings | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~10 | 1 |  |
| public.geo_settings | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~10 | 9 |  |
| public.mfa_settings | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 8 | ~10 |  |
| public.push_subscriptions | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~10 | 4 |  |
| public.scim_provisioning_log | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~10 | 0 |  |
| public.webauthn_challenges | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~10 | 7 |  |
| public.xbz_carrinho_log | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~10 | 0 |  |
| public.xbz_credentials | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~780 | 1 |  |
| public.xbz_pedido_status_history | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~10 | 0 |  |
| public.xbz_produto_fiscal | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 0 |  |
| public.audit_logs_ancora | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 1 | 0 |  |
| public.xbz_cores | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | ~10 | 0 |  |


## Índices nunca usados (candidatos a remoção; ignore PK/UNIQUE)

| índice | tabela | tamanho |
|---|---|---|
| idx_spot_produtos_name | public.spot_produtos | 384.0 KB |
| idx_telemetry_logs_level | public.telemetry_logs | 112.0 KB |


## Storage

_nenhum_


## Auth (agregados)

| métrica | valor |
|---|---|
| usuários (~) | ~10 |
| confirmados (~) | ~10 |
| criados últimos 30d (~) | 0 |

| provider | usuários (~) |
|---|---|
| email | 3 |
| google | 2 |


## Consultas mais custosas (pg_stat_statements, desde o último reset)
| role | chamadas (~) | total ms (~) | média ms | query |
|---|---|---|---|---|
| authenticator | ~240 | ~214.9k | 876.96 | `SELECT name FROM pg_timezone_names` |
| postgres | ~360 | ~181.6k | 507.24 | `SELECT public.cron_watchdog()` |
| ci_snapshot | ~5.9k | ~133.3k | 22.55 | `SELECT public._invoke_edge_function('?')` |
| postgres | ~4.4k | ~93.3k | 21.30 | `SELECT public._invoke_edge_function($1)` |
| ci_snapshot | ~720 | ~74.8k | 103.48 | `SELECT json_build_object( $1, ( SELECT coalesce(json_agg(p ORDER BY p.tablename, p.policyname), $2::json) FROM ( SELECT tablename, policyname, permissive, roles::text[] AS roles, cmd, qual, with_check FROM pg_catalog.pg_` |
| service_role | ~2.1k | ~69.7k | 33.78 | `WITH pgrst_source AS (INSERT INTO "public"."spot_estoque"("incoming_date", "incoming_quantity", "product_reference", "quantity", "sku", "synced_at") SELECT "pgrst_body"."incoming_date", "pgrst_body"."incoming_quantity", ` |
| authenticator | ~240 | ~65.1k | 265.71 | `WITH -- Recursively get the base types of domains base_types AS ( WITH RECURSIVE recurse AS ( SELECT oid, typbasetype, typnamespace AS base_namespace, COALESCE(NULLIF(typbasetype, $2), oid) AS base_type FROM pg_type UNIO` |
| authenticated | ~240 | ~59.8k | 243.93 | `WITH pgrst_source AS ( SELECT "public"."solicitacoes"."id" FROM "public"."solicitacoes" WHERE "public"."solicitacoes"."status" = $1 LIMIT $2 OFFSET $3 ) , pgrst_source_count AS (SELECT $5 FROM "public"."solicitacoes" WHE` |
| postgres | ~300 | ~57.7k | 190.44 | `SELECT public.refresh_mv_dashboard_kpis()` |
| authenticator | ~240 | ~30.3k | 123.73 | `WITH -- Recursively get the base types of domains base_types AS ( WITH RECURSIVE recurse AS ( SELECT oid, typbasetype, typnamespace AS base_namespace, COALESCE(NULLIF(typbasetype, $3), oid) AS base_type FROM pg_type UNIO` |
| ci_snapshot | ~90 | ~27.3k | 303.59 | `SELECT e.extname AS name, e.extversion AS version, n.nspname AS schema, (SELECT default_version FROM pg_available_extensions a WHERE a.name = e.extname) AS available_version FROM pg_extension e JOIN pg_namespace n ON n.o` |
| service_role | ~10.3k | ~25.6k | 2.49 | `WITH pgrst_source AS (SELECT pgrst_call.pgrst_scalar FROM (SELECT $1 AS json_data) pgrst_payload, LATERAL (SELECT "p_job_name", "p_status", "p_error" FROM json_to_record(pgrst_payload.json_data) AS _("p_job_name" text, "` |
| ci_snapshot | ~90 | ~23.4k | 259.58 | `SELECT jobid, runid, status, start_time, end_time, EXTRACT($2 FROM (end_time - start_time))::numeric(10,2) AS seconds, left(return_message, $3) AS return_message FROM (SELECT *, row_number() OVER (PARTITION BY jobid ORDE` |
| authenticated | ~1.1k | ~21.2k | 19.90 | `WITH pgrst_source AS (SELECT pgrst_call.pgrst_scalar FROM (SELECT $1 AS json_data) pgrst_payload, LATERAL (SELECT "_email", "_ip_address", "_user_agent", "_success" FROM json_to_record(pgrst_payload.json_data) AS _("_ema` |
| pgbouncer | ~310 | ~17.7k | 57.54 | `SELECT t.oid, t.typname, t.typsend, t.typreceive, t.typoutput, t.typinput, coalesce(d.typelem, t.typelem), coalesce(r.rngsubtype, $1), ARRAY ( SELECT a.atttypid FROM pg_attribute AS a WHERE a.attrelid = t.typrelid AND a.` |


## Conexões
| usuário | estado | n |
|---|---|---|
| authenticator | idle | 11 |
| ci_snapshot | active | 1 |
| pgbouncer | idle | 1 |
| supabase_admin | idle | 3 |
| supabase_admin |  | 1 |
| supabase_auth_admin | idle | 1 |


## Saúde dos serviços
```json
[
  {
    "healthy": true,
    "info": {
      "description": "GoTrue is a user registration and authentication API",
      "name": "GoTrue",
      "version": "v2.199.0"
    },
    "name": "auth",
    "status": "ACTIVE_HEALTHY"
  },
  {
    "healthy": true,
    "name": "db",
    "status": "ACTIVE_HEALTHY"
  },
  {
    "healthy": true,
    "name": "pooler",
    "status": "ACTIVE_HEALTHY"
  },
  {
    "healthy": true,
    "info": {
      "connected_cluster": 0,
      "db_connected": false,
      "healthy": true,
      "node": "realtime@2600:1f1c:c90:ad01:7e10:b148:8761:c8b3",
      "region": "us-west-1",
      "replication_connected": false
    },
    "name": "realtime",
    "status": "ACTIVE_HEALTHY"
  },
  {
    "healthy": true,
    "info": {
      "db_schema": "public,graphql_public"
    },
    "name": "rest",
    "status": "ACTIVE_HEALTHY"
  },
  {
    "healthy": true,
    "name": "storage",
    "status": "ACTIVE_HEALTHY"
  }
]
```
