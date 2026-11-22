# Métricas (voláteis — mudam sem alteração de schema)

Valores aproximados de propósito, para não gerar commits a cada coleta. Fora de `snapshot.json`; o bruto está em `stats.json`.

## Banco

| métrica | valor |
|---|---|
| tamanho | 69.3 MB |
| schema public | 39.8 MB |


## Tabelas (ordenadas por tamanho)

| tabela | linhas (~) | total | heap | índices | linhas mortas (~) | seq scans (~) | idx scans (~) | último autovacuum |
|---|---|---|---|---|---|---|---|---|
| public.spot_skus | ~3.8k | 14.0 MB | 13.3 MB | 640.0 KB | 0 | ~30 | ~26.4k | 2026-11-22 |
| public.spot_produtos | ~1.3k | 8.0 MB | 1.0 MB | 736.0 KB | 0 | ~30 | ~9k | 2026-11-22 |
| public.spot_estoque | ~3.8k | 1.4 MB | 760.0 KB | 616.0 KB | 0 | ~20 | ~1.7M | 2026-11-22 |
| public.telemetry_logs | ~580 | 1.2 MB | 144.0 KB | 1.1 MB | 6 | ~220 | ~870 | 2026-09-07 |
| public.system_alerts | ~460 | 1008.0 KB | 312.0 KB | 656.0 KB | ~40 | ~6.3k | ~8.3k | 2026-11-22 |
| public.health_scan_runs | ~740 | 648.0 KB | 144.0 KB | 464.0 KB | ~100 | ~200 | ~3.5k | 2026-11-22 |
| public.telemetry_logs_202605 | ~560 | 520.0 KB | 320.0 KB | 168.0 KB | 0 | ~20 | ~560 |  |
| public.telemetry_logs_legacy_20260712 | ~570 | 496.0 KB | 312.0 KB | 152.0 KB | 0 | ~20 | ~570 |  |
| public.login_attempts | ~940 | 440.0 KB | 200.0 KB | 208.0 KB | ~30 | ~120 | ~100 |  |
| public.solicitacoes | ~10 | 320.0 KB | 24.0 KB | 256.0 KB | ~40 | ~10.4k | ~19.1k | 2026-11-13 |
| public.pedidos | ~30 | 312.0 KB | 16.0 KB | 256.0 KB | ~40 | ~5.1k | ~11.6k | 2026-11-13 |
| public.cotacoes | ~60 | 288.0 KB | 40.0 KB | 208.0 KB | ~60 | ~4.1k | ~8.2k | 2026-11-21 |
| public.fornecedores | ~10 | 280.0 KB | 16.0 KB | 224.0 KB | ~20 | ~12.7k | ~980 | 2026-11-13 |
| public.pagamentos | 3 | 272.0 KB | 8.0 KB | 224.0 KB | ~50 | ~2.8k | ~5.4k | 2026-11-13 |
| public.audit_logs | ~30 | 248.0 KB | 48.0 KB | 160.0 KB | ~30 | ~120 | ~520 | 2026-11-17 |
| public.produtos | ~10 | 200.0 KB | 16.0 KB | 144.0 KB | ~20 | ~170 | ~360 | 2026-11-12 |
| public.notifications | ~20 | 192.0 KB | 48.0 KB | 112.0 KB | ~60 | ~290 | ~1.9k |  |
| public.spot_api_sync_log | ~480 | 184.0 KB | 64.0 KB | 88.0 KB | 0 | ~1k | ~870 |  |
| public.telemetry_logs_202607 | ~50 | 184.0 KB | 40.0 KB | 112.0 KB | 0 | ~20 | ~50 |  |
| public.licitacoes | 7 | 168.0 KB | 16.0 KB | 112.0 KB | 0 | ~140 | ~290 | 2026-11-13 |
| public.contracts | 0 | 152.0 KB | 24.0 KB | 96.0 KB | ~50 | ~210 | ~270 |  |
| public.profiles | ~10 | 152.0 KB | 8.0 KB | 104.0 KB | ~30 | ~46k | ~71.5k | 2026-11-13 |
| public.tenants | 1 | 152.0 KB | 8.0 KB | 104.0 KB | ~20 | ~12.2k | ~88.2k | 2026-11-13 |
| public.approval_workflows | 0 | 144.0 KB | 8.0 KB | 112.0 KB | ~20 | ~230 | ~9.5k | 2026-11-13 |
| public.pedido_itens | 7 | 144.0 KB | 8.0 KB | 96.0 KB | ~10 | ~100 | ~150 | 2026-11-13 |
| public.rate_limit_logs | 0 | 144.0 KB | 8.0 KB | 128.0 KB | ~10 | ~2.6k | ~240 |  |
| public.department_budgets | ~30 | 136.0 KB | 16.0 KB | 80.0 KB | ~20 | ~790 | ~2k | 2026-11-13 |
| public.fiscal_documents | ~20 | 136.0 KB | 16.0 KB | 80.0 KB | 0 | ~160 | 8 | 2026-11-12 |
| public.licitacao_propostas | ~10 | 136.0 KB | 16.0 KB | 80.0 KB | ~20 | ~100 | 7 | 2026-11-12 |
| public.categorias | 9 | 128.0 KB | 8.0 KB | 80.0 KB | ~10 | ~8.8k | ~60 | 2026-11-12 |
| public.cost_centers | 7 | 128.0 KB | 8.0 KB | 80.0 KB | ~10 | ~1.9k | ~70 | 2026-11-13 |
| public.query_telemetry | ~20 | 128.0 KB | 8.0 KB | 112.0 KB | ~40 | ~220 | ~210 |  |
| public.sourcing_invitations | 0 | 128.0 KB | 16.0 KB | 80.0 KB | ~20 | ~20 | 2 |  |
| public.supplier_documents | ~110 | 128.0 KB | 24.0 KB | 64.0 KB | 5 | ~220 | ~6.7k | 2026-11-12 |
| public.approval_steps | 0 | 120.0 KB | 8.0 KB | 88.0 KB | ~40 | ~370 | ~13.6k | 2026-11-13 |
| public.deadlock_snapshots | 0 | 120.0 KB | 8.0 KB | 88.0 KB | 6 | ~170 | ~880 | 2026-08-02 |
| public.estoque | ~20 | 120.0 KB | 16.0 KB | 64.0 KB | ~30 | ~90 | ~200 | 2026-11-12 |
| public.account_lockouts | 4 | 112.0 KB | 8.0 KB | 64.0 KB | ~30 | ~2.3k | 1 | 2026-11-12 |
| public.budget_audit_logs | ~30 | 112.0 KB | 24.0 KB | 48.0 KB | 0 | ~40 | ~140 | 2026-11-13 |
| public.creditos_fornecedor | 0 | 112.0 KB | 8.0 KB | 96.0 KB | ~20 | ~60 | ~70 |  |
| public.estoque_movimentacoes | ~70 | 112.0 KB | 16.0 KB | 64.0 KB | 0 | ~240 | 6 |  |
| public.punchout_sessions | 0 | 112.0 KB | 8.0 KB | 96.0 KB | 3 | ~30 | ~50 |  |
| public.security_definer_baseline | ~120 | 112.0 KB | 32.0 KB | 48.0 KB | 0 | ~20 | ~120 |  |
| public.sourcing_events | 0 | 112.0 KB | 8.0 KB | 96.0 KB | 0 | ~40 | ~70 |  |
| public.sourcing_pipeline | 0 | 112.0 KB | 8.0 KB | 96.0 KB | 4 | ~50 | 7 |  |
| public.workflow_edges | 0 | 112.0 KB | 8.0 KB | 96.0 KB | 0 | ~30 | ~20 |  |
| public.supplier_qualification_scores | ~10 | 104.0 KB | 16.0 KB | 48.0 KB | ~10 | ~60 | ~2.3k | 2026-11-12 |
| public.user_tenants | ~10 | 104.0 KB | 8.0 KB | 64.0 KB | ~10 | ~159.7k | ~50 | 2026-11-13 |
| public.approval_history | 0 | 96.0 KB | 8.0 KB | 80.0 KB | 9 | ~60 | ~160 |  |
| public.approval_rules | 0 | 96.0 KB | 8.0 KB | 80.0 KB | ~30 | ~80 | ~24.2k |  |
| public.contact_notes | 0 | 96.0 KB | 8.0 KB | 80.0 KB | 5 | ~1.4k | ~40 |  |
| public.contract_penalties | 0 | 96.0 KB | 8.0 KB | 80.0 KB | 6 | ~40 | ~110 |  |
| public.devolucoes | 0 | 96.0 KB | 8.0 KB | 80.0 KB | 9 | ~70 | ~120 |  |
| public.workflow_instances | 0 | 96.0 KB | 8.0 KB | 80.0 KB | 3 | ~20 | 6 |  |
| public.workflow_logs | 0 | 96.0 KB | 8.0 KB | 80.0 KB | 1 | ~20 | 8 |  |
| public.spot_customization_options | 0 | 88.0 KB | 0 B | 64.0 KB | 0 | ~20 | ~100 | 2026-11-17 |
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
| public.financial_audit_logs | 0 | 80.0 KB | 16.0 KB | 32.0 KB | ~10 | ~120 | 6 | 2026-11-13 |
| public.fiscal_events | 0 | 80.0 KB | 8.0 KB | 64.0 KB | 2 | ~20 | 3 |  |
| public.geo_access_logs | 0 | 80.0 KB | 0 B | 72.0 KB | 0 | ~30 | ~200 |  |
| public.organizations | 1 | 80.0 KB | 8.0 KB | 32.0 KB | 6 | ~6.4k | 1 | 2026-11-13 |
| public.security_logs | 0 | 80.0 KB | 8.0 KB | 64.0 KB | 3 | ~40 | ~100 |  |
| public.sourcing_projects | 0 | 80.0 KB | 8.0 KB | 64.0 KB | 0 | ~20 | ~10 |  |
| public.supplier_bonifications | 0 | 80.0 KB | 8.0 KB | 64.0 KB | 3 | ~30 | ~30 |  |
| public.temp_file_snapshots | ~140 | 80.0 KB | 16.0 KB | 32.0 KB | 0 | ~10 | ~150 |  |
| public.approval_delegations | 0 | 72.0 KB | 8.0 KB | 56.0 KB | 5 | ~40 | ~17.4k |  |
| public.licitacao_lances | 0 | 72.0 KB | 8.0 KB | 64.0 KB | 0 | ~20 | ~40 |  |
| public.password_reset_requests | 0 | 72.0 KB | 0 B | 64.0 KB | 0 | ~30 | ~10 |  |
| public.role_permissions | ~90 | 72.0 KB | 8.0 KB | 64.0 KB | 0 | ~460 | ~540 |  |
| public.sourcing_awards | 0 | 72.0 KB | 0 B | 64.0 KB | 0 | ~30 | ~40 |  |
| public.sso_configurations | 0 | 72.0 KB | 8.0 KB | 56.0 KB | 0 | ~20 | 6 |  |
| public.table_size_snapshots | 0 | 72.0 KB | 0 B | 64.0 KB | 0 | ~10 | 1 |  |
| public.blocked_ips | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 6 | ~20 | ~10 |  |
| public.contract_documents | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 7 | ~80 | ~20 |  |
| public.contract_history | 0 | 64.0 KB | 8.0 KB | 48.0 KB | ~20 | ~40 | ~30 |  |
| public.contract_items | 0 | 64.0 KB | 8.0 KB | 48.0 KB | ~30 | ~60 | ~40 |  |
| public.cron_heartbeats | 9 | 64.0 KB | 8.0 KB | 16.0 KB | ~50 | ~20 | ~5.2k | 2026-11-22 |
| public.payment_history | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 5 | ~50 | ~40 |  |
| public.penalty_escalation_config | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 7 | ~30 | ~30 |  |
| public.permissions | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | ~20 | ~590 |  |
| public.produto_fornecedores | 0 | 64.0 KB | 8.0 KB | 48.0 KB | ~30 | ~230 | ~70 |  |
| public.punchout_catalogs | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 1 | ~40 | 5 |  |
| public.savings_tracker | 5 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | ~50 | 1 |  |
| public.sourcing_event_criteria | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | ~20 | 1 |  |
| public.sourcing_event_lots | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | ~40 | 2 |  |
| public.spot_pedidos | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 1 | ~20 | 3 |  |
| public.spot_sessions | ~80 | 64.0 KB | 16.0 KB | 16.0 KB | 5 | ~1.1k | 1 |  |
| public.unspsc_codes | ~20 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | ~40 | ~20 |  |
| public.webhook_events | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 3 | ~40 | ~30 |  |
| public.workflow_nodes | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 4 | ~30 | ~180 |  |
| public.auction_bids | 0 | 56.0 KB | 0 B | 48.0 KB | 0 | ~20 | 7 |  |
| public.fornecedor_categorias | 2 | 56.0 KB | 8.0 KB | 48.0 KB | 2 | ~40 | 2 |  |
| public.saved_filters | 0 | 56.0 KB | 0 B | 48.0 KB | 0 | 6 | 6 |  |
| public.wal_rate_snapshots | 0 | 56.0 KB | 0 B | 32.0 KB | 0 | ~60 | ~330 | 2026-08-30 |
| public.workflow_approvals | 0 | 56.0 KB | 0 B | 48.0 KB | 0 | ~2k | 9 |  |
| public.checkpoint_snapshots | 0 | 48.0 KB | 0 B | 32.0 KB | 0 | ~30 | ~310 | 2026-08-30 |
| public.qualification_history | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | ~20 | 1 |  |
| public.receiving_checklists | 0 | 48.0 KB | 0 B | 40.0 KB | 0 | ~40 | ~60 |  |
| public.repurchase_suggestions | 0 | 48.0 KB | 0 B | 40.0 KB | 0 | ~110 | 1 |  |
| public.sourcing_responses | 0 | 48.0 KB | 0 B | 40.0 KB | 0 | ~20 | 2 |  |
| public.spend_forecasts | 0 | 48.0 KB | 0 B | 40.0 KB | 0 | ~30 | 1 |  |
| public.user_filter_preferences | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 1 | 8 | ~350 |  |
| public.user_tour_preferences | 1 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | ~50 | 2 |  |
| public.workflow_audit_log | 0 | 48.0 KB | 0 B | 40.0 KB | 0 | ~20 | 8 |  |
| public.workflow_sod_rules | 2 | 48.0 KB | 8.0 KB | 32.0 KB | 5 | ~60 | 2 |  |
| public.workflow_tasks | 0 | 48.0 KB | 0 B | 40.0 KB | 0 | ~30 | 9 |  |
| public.workflow_templates | 3 | 48.0 KB | 8.0 KB | 32.0 KB | ~10 | ~140 | 3 |  |
| public.xbz_produtos | 0 | 48.0 KB | 0 B | 40.0 KB | 0 | ~20 | 0 |  |
| public.active_sessions | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~40 | 9 |  |
| public.alert_subscriptions | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~20 | ~80 |  |
| public.approval_hierarchy | 0 | 40.0 KB | 0 B | 40.0 KB | 0 | ~20 | ~20 |  |
| public.budget_transactions | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~30 | 7 |  |
| public.entity_versions | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~10 | 1 |  |
| public.erp_sync_log | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~20 | 2 |  |
| public.exchange_rates | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~50 | 1 |  |
| public.notification_preferences | 2 | 40.0 KB | 8.0 KB | 32.0 KB | 2 | ~1.4k | 2 |  |
| public.order_contracts | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~30 | ~20 |  |
| public.secret_rotation_schedule | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~20 | 8 |  |
| public.sourcing_response_answers | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~20 | 0 |  |
| public.sourcing_response_items | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~20 | 0 |  |
| public.user_roles | 0 | 40.0 KB | 8.0 KB | 32.0 KB | ~40 | ~80 | ~103k |  |
| public.xbz_pedidos | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~50 | 0 |  |
| public.allowed_countries | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~10 | 8 |  |
| public.blocked_countries | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 7 |  |
| public.cron_watchdog_seen | 0 | 32.0 KB | 8.0 KB | 16.0 KB | 2 | 6 | ~2.7k |  |
| public.currencies | 0 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | ~20 | ~3.3k |  |
| public.dependency_health_history | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~10 | ~40 |  |
| public.integration_outbox | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~100 | ~9k |  |
| public.ip_whitelist | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | ~20 |  |
| public.negotiation_analyses | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | ~90 |  |
| public.qualification_requirements | 0 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | ~3k | ~8.3k |  |
| public.sourcing_event_questions | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 2 |  |
| public.user_organizations | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~10 | ~70 |  |
| public.webauthn_credentials | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~10 | ~10 |  |
| public.aliquotas_tributarias | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 9 | 7 |  |
| public.dashboard_filter_favorites | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~40 | 1 |  |
| public.dashboard_layouts | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 6 | ~610 |  |
| public.dependency_health | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~10 | ~40 |  |
| public.erp_connections | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 2 |  |
| public.erp_field_mappings | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~10 | 1 |  |
| public.geo_settings | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~10 | 9 |  |
| public.mfa_settings | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 7 | ~10 |  |
| public.push_subscriptions | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 9 | 4 |  |
| public.scim_provisioning_log | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~10 | 0 |  |
| public.webauthn_challenges | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~10 | 7 |  |
| public.xbz_carrinho_log | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~10 | 0 |  |
| public.xbz_credentials | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~490 | 0 |  |
| public.xbz_pedido_status_history | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~10 | 0 |  |
| public.xbz_produto_fiscal | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~10 | 0 |  |
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
| authenticator | ~220 | ~190.4k | 861.45 | `SELECT name FROM pg_timezone_names` |
| postgres | ~9.7k | ~175.7k | 18.04 | `SELECT public._invoke_edge_function($1)` |
| service_role | ~3.7k | ~118.7k | 32.46 | `WITH pgrst_source AS (INSERT INTO "public"."spot_estoque"("incoming_date", "incoming_quantity", "product_reference", "quantity", "sku", "synced_at") SELECT "pgrst_body"."incoming_date", "pgrst_body"."incoming_quantity", ` |
| postgres | ~650 | ~116.9k | 180.08 | `SELECT public.refresh_mv_dashboard_kpis()` |
| postgres | ~160 | ~111.5k | 675.86 | `select public.xbz_sync_watchdog()` |
| ci_snapshot | ~130 | ~93k | 704.60 | `SELECT jobid, runid, status, start_time, end_time, EXTRACT($2 FROM (end_time - start_time))::numeric(10,2) AS seconds, left(return_message, $3) AS return_message FROM (SELECT *, row_number() OVER (PARTITION BY jobid ORDE` |
| authenticator | ~220 | ~62.7k | 283.87 | `WITH -- Recursively get the base types of domains base_types AS ( WITH RECURSIVE recurse AS ( SELECT oid, typbasetype, typnamespace AS base_namespace, COALESCE(NULLIF(typbasetype, $2), oid) AS base_type FROM pg_type UNIO` |
| ci_snapshot | ~1.9k | ~42.4k | 21.95 | `SELECT public._invoke_edge_function($1)` |
| ci_snapshot | ~130 | ~40.5k | 306.97 | `SELECT e.extname AS name, e.extversion AS version, n.nspname AS schema, (SELECT default_version FROM pg_available_extensions a WHERE a.name = e.extname) AS available_version FROM pg_extension e JOIN pg_namespace n ON n.o` |
| ci_snapshot | ~130 | ~37k | 280.53 | `with tables as ( SELECT c.oid :: int8 AS id, nc.nspname AS schema, c.relname AS name, c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced, CASE WHEN c.relreplident = $1 THEN $2 WHEN c.relreplident = $3 T` |
| ci_snapshot | ~130 | ~34.7k | 263.17 | `SELECT n.nspname AS schema, c.relname AS "table", a.attnum AS position, a.attname AS name, format_type(a.atttypid, a.atttypmod) AS type, NOT a.attnotnull AS nullable, pg_get_expr(d.adbin, d.adrelid) AS "default", NULLIF(` |
| service_role | ~60 | ~34.7k | 619.65 | `WITH pgrst_source AS (INSERT INTO "public"."spot_skus"("capacity", "color_code", "color_hex", "color_name", "handling_costs", "image_url", "no_replenishment", "price_tiers", "print_area", "product_reference", "raw", "siz` |
| authenticator | ~220 | ~28.8k | 130.41 | `WITH -- Recursively get the base types of domains base_types AS ( WITH RECURSIVE recurse AS ( SELECT oid, typbasetype, typnamespace AS base_namespace, COALESCE(NULLIF(typbasetype, $3), oid) AS base_type FROM pg_type UNIO` |
| ci_snapshot | ~320 | ~28.2k | 87.23 | `SELECT json_build_object( $1, ( SELECT coalesce(json_agg(p ORDER BY p.tablename, p.policyname), $2::json) FROM ( SELECT tablename, policyname, permissive, roles::text[] AS roles, cmd, qual, with_check FROM pg_catalog.pg_` |
| postgres | ~60 | ~19.6k | 356.39 | `select public.cron_watchdog()` |


## Conexões
| usuário | estado | n |
|---|---|---|
| authenticator | idle | 6 |
| ci_snapshot | active | 1 |
| pgbouncer | idle | 1 |
| supabase_admin | idle | 3 |
| supabase_admin |  | 1 |
