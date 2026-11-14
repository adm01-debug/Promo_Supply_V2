# 11 · GLOSSÁRIO, DADOS DE REFERÊNCIA E LACUNAS

> Gerado automaticamente por AI Context Sync v1.4.0 · commit `4f1a4caba7` · branch `main` · 2026-11-14 00:00 UTC
> Não edite à mão — regras humanas vão em `manual/`.

## Glossário do domínio (entidades do sistema)

| Termo | Significado / valores | Tamanho | Origem |
|---|---|---|---|
| `account_lockouts` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `active_sessions` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `alert_subscriptions` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `aliquotas_tributarias` | _(sem COMMENT ON TABLE — significado não documentado)_ | 16 colunas | migration |
| `allowed_countries` | _(sem COMMENT ON TABLE — significado não documentado)_ | 6 colunas | migration |
| `approval_delegations` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `approval_hierarchy` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `approval_history` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `approval_rules` | _(sem COMMENT ON TABLE — significado não documentado)_ | 20 colunas | migration |
| `approval_steps` | _(sem COMMENT ON TABLE — significado não documentado)_ | 15 colunas | migration |
| `approval_workflows` | _(sem COMMENT ON TABLE — significado não documentado)_ | 15 colunas | migration |
| `auction_bids` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `audit_logs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 16 colunas | migration |
| `audit_logs_202605` | _(sem COMMENT ON TABLE — significado não documentado)_ | 16 colunas | types.ts |
| `audit_logs_202606` | _(sem COMMENT ON TABLE — significado não documentado)_ | 16 colunas | types.ts |
| `audit_logs_202607` | _(sem COMMENT ON TABLE — significado não documentado)_ | 16 colunas | types.ts |
| `audit_logs_202608` | _(sem COMMENT ON TABLE — significado não documentado)_ | 16 colunas | types.ts |
| `audit_logs_202609` | _(sem COMMENT ON TABLE — significado não documentado)_ | 16 colunas | types.ts |
| `audit_logs_legacy_20260712` | _(sem COMMENT ON TABLE — significado não documentado)_ | 16 colunas | migration |
| `blocked_countries` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | types.ts |
| `blocked_ips` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `budget_audit_logs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `budget_transactions` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `categorias` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `category_strategies` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | migration |
| `checkpoint_snapshots` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | migration |
| `contact_notes` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `contract_documents` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `contract_history` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `contract_items` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `contract_penalties` | _(sem COMMENT ON TABLE — significado não documentado)_ | 14 colunas | migration |
| `contracts` | _(sem COMMENT ON TABLE — significado não documentado)_ | 31 colunas | migration |
| `cost_centers` | _(sem COMMENT ON TABLE — significado não documentado)_ | 14 colunas | migration |
| `cotacoes` | _(sem COMMENT ON TABLE — significado não documentado)_ | 32 colunas | migration |
| `creditos_fornecedor` | _(sem COMMENT ON TABLE — significado não documentado)_ | 16 colunas | migration |
| `cron_heartbeats` | Health monitoring for scheduled cron edge functions. Each job upserts a row after each run. | 8 colunas | migration |
| `currencies` | _(sem COMMENT ON TABLE — significado não documentado)_ | 6 colunas | migration |
| `dashboard_filter_favorites` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `dashboard_layouts` | _(sem COMMENT ON TABLE — significado não documentado)_ | 6 colunas | migration |
| `deadlock_snapshots` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `department_budgets` | _(sem COMMENT ON TABLE — significado não documentado)_ | 14 colunas | migration |
| `dependency_health` | _(sem COMMENT ON TABLE — significado não documentado)_ | 4 colunas | migration |
| `dependency_health_history` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `devolucao_itens` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `devolucoes` | _(sem COMMENT ON TABLE — significado não documentado)_ | 23 colunas | migration |
| `entity_versions` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `erp_connections` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `erp_field_mappings` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `erp_sync_log` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `estoque` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `estoque_movimentacoes` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `exchange_rates` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `financial_audit_logs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `fiscal_documents` | _(sem COMMENT ON TABLE — significado não documentado)_ | 28 colunas | migration |
| `fiscal_events` | _(sem COMMENT ON TABLE — significado não documentado)_ | 16 colunas | migration |
| `fornecedor_categorias` | _(sem COMMENT ON TABLE — significado não documentado)_ | 5 colunas | migration |
| `fornecedores` | _(sem COMMENT ON TABLE — significado não documentado)_ | 28 colunas | migration |
| `geo_access_logs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | types.ts |
| `geo_settings` | _(sem COMMENT ON TABLE — significado não documentado)_ | 5 colunas | migration |
| `health_scan_runs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 14 colunas | migration |
| `historico_compras` | _(sem COMMENT ON TABLE — significado não documentado)_ | 6 colunas | migration |
| `integration_outbox` | _(sem COMMENT ON TABLE — significado não documentado)_ | 14 colunas | migration |
| `ip_whitelist` | _(sem COMMENT ON TABLE — significado não documentado)_ | 5 colunas | migration |
| `licitacao_lances` | Real-time bidding for reverse auctions. | 6 colunas | migration |
| `licitacao_propostas` | _(sem COMMENT ON TABLE — significado não documentado)_ | 19 colunas | migration |
| `licitacoes` | _(sem COMMENT ON TABLE — significado não documentado)_ | 27 colunas | migration |
| `login_attempts` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `mfa_settings` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `negotiation_analyses` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `notification_preferences` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `notifications` | _(sem COMMENT ON TABLE — significado não documentado)_ | 14 colunas | migration |
| `order_contracts` | _(sem COMMENT ON TABLE — significado não documentado)_ | 5 colunas | migration |
| `organizations` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `pagamentos` | _(sem COMMENT ON TABLE — significado não documentado)_ | 23 colunas | migration |
| `password_reset_requests` | _(sem COMMENT ON TABLE — significado não documentado)_ | 14 colunas | migration |
| `payment_history` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `pedido_itens` | _(sem COMMENT ON TABLE — significado não documentado)_ | 14 colunas | migration |
| `pedidos` | _(sem COMMENT ON TABLE — significado não documentado)_ | 26 colunas | migration |
| `penalty_escalation_config` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `permissions` | _(sem COMMENT ON TABLE — significado não documentado)_ | 6 colunas | migration |
| `produto_fornecedores` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | migration |
| `produtos` | _(sem COMMENT ON TABLE — significado não documentado)_ | 25 colunas | migration |
| `profiles` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `punchout_catalogs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | migration |
| `punchout_sessions` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `push_subscriptions` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `qualification_history` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | types.ts |
| `qualification_requirements` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | types.ts |
| `query_telemetry` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `rate_limit_logs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `receiving_checklists` | _(sem COMMENT ON TABLE — significado não documentado)_ | 19 colunas | migration |
| `repurchase_suggestions` | _(sem COMMENT ON TABLE — significado não documentado)_ | 14 colunas | migration |
| `role_permissions` | _(sem COMMENT ON TABLE — significado não documentado)_ | 5 colunas | migration |
| `saved_filters` | Filtros salvos por usuários para diferentes entidades | 8 colunas | migration |
| `savings_tracker` | _(sem COMMENT ON TABLE — significado não documentado)_ | 14 colunas | migration |
| `scim_provisioning_log` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `secret_rotation_schedule` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | migration |
| `security_definer_baseline` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `security_logs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `solicitacoes` | _(sem COMMENT ON TABLE — significado não documentado)_ | 29 colunas | migration |
| `sourcing_awards` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `sourcing_event_criteria` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `sourcing_event_lots` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | migration |
| `sourcing_event_questions` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | migration |
| `sourcing_events` | _(sem COMMENT ON TABLE — significado não documentado)_ | 21 colunas | migration |
| `sourcing_invitations` | _(sem COMMENT ON TABLE — significado não documentado)_ | 14 colunas | migration |
| `sourcing_pipeline` | _(sem COMMENT ON TABLE — significado não documentado)_ | 15 colunas | migration |
| `sourcing_projects` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `sourcing_response_answers` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `sourcing_response_items` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `sourcing_responses` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `spend_forecasts` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `spot_api_sync_log` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `spot_customization_options` | _(sem COMMENT ON TABLE — significado não documentado)_ | 18 colunas | migration |
| `spot_estoque` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `spot_pedidos` | _(sem COMMENT ON TABLE — significado não documentado)_ | 17 colunas | migration |
| `spot_produtos` | _(sem COMMENT ON TABLE — significado não documentado)_ | 16 colunas | migration |
| `spot_sessions` | _(sem COMMENT ON TABLE — significado não documentado)_ | 6 colunas | migration |
| `spot_skus` | _(sem COMMENT ON TABLE — significado não documentado)_ | 19 colunas | migration |
| `sso_configurations` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `supplier_bonifications` | _(sem COMMENT ON TABLE — significado não documentado)_ | 16 colunas | migration |
| `supplier_documents` | _(sem COMMENT ON TABLE — significado não documentado)_ | 17 colunas | types.ts |
| `supplier_qualification_scores` | _(sem COMMENT ON TABLE — significado não documentado)_ | 19 colunas | types.ts |
| `system_alerts` | _(sem COMMENT ON TABLE — significado não documentado)_ | 14 colunas | migration |
| `table_size_snapshots` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `telemetry_logs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `telemetry_logs_202605` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | types.ts |
| `telemetry_logs_202606` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | types.ts |
| `telemetry_logs_202607` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | types.ts |
| `telemetry_logs_202608` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | types.ts |
| `telemetry_logs_202609` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | types.ts |
| `telemetry_logs_legacy_20260712` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `temp_file_snapshots` | _(sem COMMENT ON TABLE — significado não documentado)_ | 6 colunas | migration |
| `tenants` | _(sem COMMENT ON TABLE — significado não documentado)_ | 21 colunas | migration |
| `unspsc_codes` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `user_filter_preferences` | _(sem COMMENT ON TABLE — significado não documentado)_ | 6 colunas | migration |
| `user_organizations` | _(sem COMMENT ON TABLE — significado não documentado)_ | 6 colunas | migration |
| `user_roles` | _(sem COMMENT ON TABLE — significado não documentado)_ | 4 colunas | migration |
| `user_tenants` | _(sem COMMENT ON TABLE — significado não documentado)_ | 5 colunas | migration |
| `user_tour_preferences` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `wal_rate_snapshots` | _(sem COMMENT ON TABLE — significado não documentado)_ | 6 colunas | migration |
| `webauthn_challenges` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `webauthn_credentials` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | migration |
| `webhook_events` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `workflow_approvals` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `workflow_audit_log` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `workflow_edges` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `workflow_instances` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `workflow_logs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `workflow_nodes` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `workflow_sod_rules` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `workflow_tasks` | _(sem COMMENT ON TABLE — significado não documentado)_ | 15 colunas | migration |
| `workflow_templates` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `xbz_carrinho_log` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `xbz_cores` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `xbz_credentials` | _(sem COMMENT ON TABLE — significado não documentado)_ | 18 colunas | migration |
| `xbz_pedido_status_history` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `xbz_pedidos` | _(sem COMMENT ON TABLE — significado não documentado)_ | 30 colunas | migration |
| `xbz_produto_fiscal` | _(sem COMMENT ON TABLE — significado não documentado)_ | 16 colunas | migration |
| `xbz_produtos` | _(sem COMMENT ON TABLE — significado não documentado)_ | 20 colunas | migration |
| `audit_action_type` (enum) | create, update, delete, view, export, login, logout, approve, reject, cancel |  | banco |
| `audit_entity_type` (enum) | solicitacao, cotacao, pedido, pagamento, fornecedor, usuario, configuracao, relatorio |  | banco |
| `app_role` (enum) | admin, coordinator, buyer, finance, viewer, supplier |  | banco |
| `sourcing_type` (enum) | rfi, rfp, rfq, auction |  | banco |
| `sourcing_status` (enum) | draft, published, in_progress, evaluation, awarded, cancelled |  | banco |
| `invitation_status` (enum) | pending, viewed, declined, submitted, expired |  | banco |
| `question_type` (enum) | text, number, single_choice, multi_choice, file, date |  | banco |
| `bid_status` (enum) | valid, rejected, withdrawn, winning |  | banco |
| `audit_event_type` (enum) | create, update, delete, approve, reject, auth, security, export |  | banco |
| `tenant_status` (enum) | active, suspended, trial, churned |  | banco |
| `sourcing_project_status` (enum) | backlog, planning, execution, negotiation, implementation, completed, cancelled |  | banco |
| `saving_type` (enum) | negotiated, avoidance, process, specification |  | banco |
| `workflow_node_type` (enum) | start, end, approval, condition, action, delay |  | banco |
| `workflow_status` (enum) | pending, running, completed, failed, cancelled |  | banco |
| `tipo_produto_enum` (enum) | importado, fabricado, personalizado |  | banco |
| `status_producao_enum` (enum) | pendente, primeira_peca, em_producao, personalizando, concluido |  | banco |
| `log_level` (enum) | info, warn, error, debug |  | banco |
| `regime_tributario` (enum) | simples_nacional, lucro_presumido, lucro_real, mei |  | banco |
| `KpiColor` (TS) | emerald \| orange \| blue \| purple \| green \| cyan \| red \| indigo \| teal \| violet \| fuchsia |  | `src/components/compras/enhanced-kpi/EnhancedKpiHelpers.tsx` |
| `SortOption` (TS) | prazo \| valor \| data |  | `src/components/compras/pending-approvals/pendingApprovalsData.ts` |
| `FilterStatus` (TS) | all \| urgente \| escalado \| normal |  | `src/components/compras/pending-approvals/pendingApprovalsData.ts` |
| `CelebrationType` (TS) | success \| achievement \| milestone \| streak \| level-up \| purchase \| savings \| record \| first-time |  | `src/components/ui/celebration-particles.tsx` |
| `StatusType` (TS) | pending \| processing \| approved \| completed \| cancelled \| error \| warning \| info \| draft \| active \| inactive \| success \| neutral |  | `src/components/ui/indicators/StatusIndicator.tsx` |
| `AppRole` (TS) | admin \| coordinator \| buyer \| finance \| viewer \| supplier |  | `src/features/auth/types/authRoles.ts` |
| `SearchCategory` (TS) | all \| pages \| solicitacoes \| pedidos \| fornecedores \| pagamentos \| contratos |  | `src/features/layout/components/search/searchConfig.ts` |
| `TransitionName` (TS) | fade \| slide-left \| slide-right \| slide-up \| slide-down \| zoom-in \| zoom-out \| flip-x \| flip-y \| parallax \| blur-scale \| none |  | `src/features/layout/transitions/presets.ts` |
| `FeedbackType` (TS) | success \| error \| warning \| info \| notification \| click \| approval \| rejection |  | `src/hooks/useFeedback.ts` |
| `WorkflowDLQOperationType` (TS) | create_workflow \| approve_step \| reject_step \| escalate |  | `src/hooks/useWorkflowDLQ.ts` |
| `PrivateBucket` (TS) | documentos \| comprovantes |  | `src/lib/storageFiles.ts` |
| `SLAStatus` (TS) | atrasado \| critico \| atencao \| no_prazo \| entregue |  | `src/pages/acompanhamento/AcompanhamentoHelpers.ts` |
| `SeverityFilter` (TS) | all \| slow \| very_slow \| error |  | `src/pages/admin-telemetria/telemetriaHelpers.ts` |
| `TimeFilter` (TS) | 1h \| 6h \| 24h \| 7d \| custom |  | `src/pages/admin-telemetria/telemetriaHelpers.ts` |
| `CacheFreshness` (TS) | fresh \| stale \| missing |  | `src/pages/catalogo-spot/useSpotCatalog.ts` |
| `PagamentoStatus` (TS) | pago \| pendente \| desconhecido |  | `src/pages/catalogo-xbz/xbzHelpers.ts` |
| `XBZ_PERIODOS` (TS) | { value: 1, label: 'Recente (~2 meses)' }, { value: 2, label: 'Médio (~3 meses)' }, { value: 3, label: 'Longo (~6 meses)' }, |  | `src/pages/catalogo-xbz/xbzHelpers.ts` |
| `XBZ_FILTROS_FINANCEIROS` (TS) | { value: 0, label: 'Todos' }, { value: 2, label: 'Somente pagos' }, { value: 3, label: 'Somente pendentes' }, |  | `src/pages/catalogo-xbz/xbzHelpers.ts` |
| `XbzNetworkLevel` (TS) | collecting \| below \| warning \| healthy |  | `src/pages/catalogo-xbz/xbzNetworkHealth.ts` |
| `XbzTrendDirection` (TS) | unknown \| degrading \| stable \| improving |  | `src/pages/catalogo-xbz/xbzNetworkTrend.ts` |
| `AuditActionType` (TS) | create \| update \| delete \| view \| export \| login \| logout \| approve \| reject \| cancel |  | `src/services/auditTypes.ts` |
| `AuditEntityType` (TS) | solicitacao \| cotacao \| pedido \| pagamento \| fornecedor \| usuario \| configuracao \| relatorio |  | `src/services/auditTypes.ts` |
| `ALLOWED_OPERATIONS` (TS) | "select", "insert", "update", "delete", "rpc", |  | `supabase/functions/_shared/external-bridge-allowlist.ts` |
| `CanonicalLogLevel` (TS) | info \| warn \| error \| debug |  | `supabase/functions/_shared/logLevel.ts` |
| `LogLevel` (TS) | info \| warn \| error \| debug |  | `supabase/functions/_shared/logger.ts` |
| `Role` (TS) | admin \| coordinator \| buyer \| approver \| viewer |  | `supabase/functions/_shared/xbz_auth.ts` |
| `XBZ_PERMISSION_FLAGS` (TS) | "WebHabilitarAcessoPortal", "WebExibePreco", "WebExibeQuantidade", "WebIgnoraRestricoes", "WebConsultaProdutos", "WebConsultaPedidos", "WebExibePrecosPedidos", "WebCarrinhoInserir", "WebCarrinhoVisualizar", "WebPedidoEnviar", |  | `supabase/functions/_shared/xbz_client.ts` |

## Dados de referência (seed — planos, categorias, perfis fixos)

| Tabela | Colunas | Valores | Origem |
|---|---|---|---|
| `currencies` | `code, name, symbol, decimal_places, is_active` | `('BRL', 'Real Brasileiro', 'R$', 2, true), ('USD', 'US Dollar', '$', 2, true), ('EUR', 'Euro', '€', 2, true) ON CONFLICT DO NOTHING` | `supabase/migrations/20260805100000_promo_supply_v2_seed_and_fixes.sql` |
| `audit_logs` | `id, user_id, user_email, user_name, action_type, entity_type, entity_id, entity_description, old_values, new_values, metadata, tenant_id, created_at` | `(gen_random_uuid(), v_actor, COALESCE(v_actor_email,'system'), 'user_roles_trigger', v_action::public.audit_action_type, 'usuario', v_target::text, format('Role %s: %s', TG_OP, COALESCE(NEW.role::text, OLD.role::text)), v_old, v_new, jsonb_build_object('source','user_roles_audit','op',TG_OP,'target_user_id',v_target,'target_email',v_target_email), COALESCE(v_tenant, gen_random_uuid()), now()) ON C …` | `supabase/migrations/20260805100000_promo_supply_v2_seed_and_fixes.sql` |
| `tenants` | `id, slug, name, status, plan, organization_id, default_currency, default_locale, created_at, updated_at` | `(gen_random_uuid(), 'promo-supply', 'Promo Supply', 'active', 'standard', v_org_id, 'BRL', 'pt-BR', now(), now()) ON CONFLICT (slug) DO UPDATE SET updated_at = now(), organization_id = EXCLUDED.organization_id RETURNING id INTO v_tenant_id` | `supabase/migrations/20260805100000_promo_supply_v2_seed_and_fixes.sql` |
| `user_tenants` | `user_id, tenant_id, role, is_default, joined_at` | `('fceb0729-82a2-458b-adb7-4c9716dc8801', v_tenant_id, 'admin', true, now()) ON CONFLICT (user_id, tenant_id) DO UPDATE SET is_default = true, role = 'admin'` | `supabase/migrations/20260805100000_promo_supply_v2_seed_and_fixes.sql` |
| `user_tenants` | `user_id, tenant_id, role, is_default, joined_at` | `('0da266d8-e1cf-40ac-9d69-265c46e67336', v_tenant_id, 'admin', true, now()) ON CONFLICT (user_id, tenant_id) DO UPDATE SET is_default = true, role = 'admin'` | `supabase/migrations/20260805100000_promo_supply_v2_seed_and_fixes.sql` |
| `user_tenants` | `user_id, tenant_id, role, is_default, joined_at` | `('2fafbb50-8ef0-4bf8-beed-e9952983e0e7', v_tenant_id, 'admin', true, now()) ON CONFLICT (user_id, tenant_id) DO UPDATE SET is_default = true, role = 'admin'` | `supabase/migrations/20260805100000_promo_supply_v2_seed_and_fixes.sql` |
| `user_tenants` | `user_id, tenant_id, role, is_default, joined_at` | `('b1255ee0-9637-4d52-a9b5-ab351d292ceb', v_tenant_id, 'admin', true, now()) ON CONFLICT (user_id, tenant_id) DO UPDATE SET is_default = true, role = 'admin'` | `supabase/migrations/20260805100000_promo_supply_v2_seed_and_fixes.sql` |
| `profiles` | `id, user_id, full_name, email, tenant_id, current_organization_id, preferred_locale, created_at, updated_at` | `(gen_random_uuid(), 'fceb0729-82a2-458b-adb7-4c9716dc8801', 'Administrador', 'adm01@promobrindes.com.br', v_tenant_id, v_org_id, 'pt-BR', now(), now()) ON CONFLICT (user_id) DO UPDATE SET tenant_id = v_tenant_id, current_organization_id = v_org_id, full_name = EXCLUDED.full_name, email = EXCLUDED.email, updated_at = now()` | `supabase/migrations/20260805100000_promo_supply_v2_seed_and_fixes.sql` |
| `profiles` | `id, user_id, full_name, email, tenant_id, current_organization_id, preferred_locale, created_at, updated_at` | `(gen_random_uuid(), '0da266d8-e1cf-40ac-9d69-265c46e67336', 'TI 02', 'ti02.promobrindes@gmail.com', v_tenant_id, v_org_id, 'pt-BR', now(), now()) ON CONFLICT (user_id) DO UPDATE SET tenant_id = v_tenant_id, current_organization_id = v_org_id, full_name = EXCLUDED.full_name, email = EXCLUDED.email, updated_at = now()` | `supabase/migrations/20260805100000_promo_supply_v2_seed_and_fixes.sql` |
| `profiles` | `id, user_id, full_name, email, tenant_id, current_organization_id, preferred_locale, created_at, updated_at` | `(gen_random_uuid(), '2fafbb50-8ef0-4bf8-beed-e9952983e0e7', 'TI', 'ti@promobrindes.com.br', v_tenant_id, v_org_id, 'pt-BR', now(), now()) ON CONFLICT (user_id) DO UPDATE SET tenant_id = v_tenant_id, current_organization_id = v_org_id, full_name = EXCLUDED.full_name, email = EXCLUDED.email, updated_at = now()` | `supabase/migrations/20260805100000_promo_supply_v2_seed_and_fixes.sql` |
| `devolucoes` | `numero, pedido_id, fornecedor_id, solicitante_id, status, tipo, motivo, motivo_detalhe, valor_total, resolucao, observacoes` | `( 'DEV-' \|\| to_char(now(), 'YYYYMMDDHH24MISS') \|\| '-A', v_pedido_a, v_forn_a, v_solicitante, 'solicitada', 'devolucao', 'defeito', 'Produto apresentou defeito de fábrica na primeira utilização.', 1250.00, 'credito', '[SEED] devolução em análise pela equipe de qualidade' ) RETURNING id INTO v_dev_id_1` | `supabase/migrations/20260806180000_seed_devolucoes_creditos.sql` |
| `devolucoes` | `numero, pedido_id, fornecedor_id, solicitante_id, status, tipo, motivo, motivo_detalhe, valor_total, resolucao, observacoes, data_aprovacao, data_envio, codigo_rastreamento, transportadora` | `( 'DEV-' \|\| to_char(now(), 'YYYYMMDDHH24MISS') \|\| '-B', v_pedido_b, v_forn_b, v_solicitante, 'em_transito', 'troca', 'troca', 'Cliente solicitou troca por modelo diferente.', 480.50, 'reposicao', '[SEED] devolução em trânsito para fornecedor', now() - interval '5 days', now() - interval '2 days', 'BR' \|\| (random() * 1e10)::bigint::text, 'Correios' ) RETURNING id INTO v_dev_id_2` | `supabase/migrations/20260806180000_seed_devolucoes_creditos.sql` |
| `devolucoes` | `numero, pedido_id, fornecedor_id, solicitante_id, status, tipo, motivo, motivo_detalhe, valor_total, resolucao, observacoes, data_aprovacao, data_envio, data_recebimento_fornecedor` | `( 'DEV-' \|\| to_char(now(), 'YYYYMMDDHH24MISS') \|\| '-C', v_pedido_a, v_forn_a, v_solicitante, 'credito_emitido', 'garantia', 'garantia', 'Garantia acionada dentro do prazo de 90 dias.', 2750.75, 'credito', '[SEED] crédito emitido pelo fornecedor', now() - interval '20 days', now() - interval '15 days', now() - interval '7 days' ) RETURNING id INTO v_dev_id_3` | `supabase/migrations/20260806180000_seed_devolucoes_creditos.sql` |
| `creditos_fornecedor` | `fornecedor_id, devolucao_id, tipo, valor, valor_utilizado, saldo, status, descricao, data_emissao` | `( v_forn_a, v_dev_id_3, 'credito_devolucao', 2750.75, 0, 2750.75, 'ativo', '[SEED] crédito gerado automaticamente para devolução concluída', now() - interval '7 days' )` | `supabase/migrations/20260806180000_seed_devolucoes_creditos.sql` |

## Auditoria de consistência (código × schema) — trate como NÃO VERIFICADO

> `status`: inclui estados só de UI/realtime (ex.: `uploading`, `SUBSCRIBED`) que nunca vão ao banco — confira o arquivo antes de concluir que falta valor no enum.

| Tipo | Problema | Onde |
|---|---|---|
| status | valor `critical` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/compras/AdvancedProcurementKPIs.tsx`<br>`compara:src/components/compras/BuyerPerformanceAlerts.tsx`<br>`compara:src/components/compras/PendingApprovalsList.tsx`<br>`compara:src/components/compras/PurchaseClimateWidget.tsx` |
| status | valor `encontrado` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/compras/BuscaAutomatica.tsx`<br>`compara:src/pages/cotacao/cotacaoHelpers.ts`<br>`escreve:src/components/compras/BuscaAutomatica.tsx`<br>`escreve:src/pages/cotacao/cotacaoHelpers.ts` |
| status | valor `idle` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/compras/BuscaAutomatica.tsx`<br>`compara:src/components/compras/NeuralFollowUpMonitor.tsx`<br>`escreve:src/components/compras/BuscaAutomatica.tsx` |
| status | valor `searching` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/compras/BuscaAutomatica.tsx` |
| status | valor `delayed` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/compras/DeliveryCalendar.tsx`<br>`compara:src/components/compras/delivery-calendar/deliveryCalendarHelpers.ts` |
| status | valor `in_transit` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/compras/DeliveryCalendar.tsx`<br>`compara:src/components/compras/delivery-calendar/deliveryCalendarHelpers.ts` |
| status | valor `signed` para `status` usado no código não existe em nenhum enum do banco/TS | `escreve:src/components/compras/DigitalSignature.tsx`<br>`escreve:src/components/compras/digital-signature/signatureHelpers.ts` |
| status | valor `atual` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/compras/EnhancedPedidoTimeline.tsx`<br>`compara:src/components/compras/PedidoTimeline.tsx` |
| status | valor `erro` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/compras/EnhancedPedidoTimeline.tsx` |
| status | valor `analyzing` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/compras/NeuralFollowUpMonitor.tsx` |
| status | valor `drafting` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/compras/NeuralFollowUpMonitor.tsx` |
| status | valor `sent` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/compras/NeuralFollowUpMonitor.tsx`<br>`compara:src/components/compras/SupplierInteractionLog.tsx`<br>`escreve:src/components/compras/SupplierInteractionLog.tsx`<br>`escreve:src/features/layout/components/chat/ChatArea.tsx` |
| status | valor `overdue` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/compras/PendingApprovalsList.tsx`<br>`escreve:src/components/compras/pending-approvals/pendingApprovalsData.ts` |
| status | valor `upcoming` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/compras/StatusTimeline.tsx`<br>`escreve:src/components/compras/ProductionRoutingEngine.tsx`<br>`escreve:src/components/compras/StatusTimeline.tsx` |
| status | valor `recebido` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/compras/PurchaseClimateWidget.tsx`<br>`compara:src/components/compras/delivery-calendar/deliveryCalendarHelpers.ts` |
| status | valor `ok` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/compras/SLADistributionChart.tsx`<br>`compara:src/pages/admin/DependencyHealth.tsx`<br>`compara:src/pages/admin/ScanRunsSlaCard.tsx`<br>`compara:supabase/functions/external-db-bridge/index.ts` |
| status | valor `current` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/compras/SolicitacaoCard.tsx`<br>`compara:src/components/compras/StatusTimeline.tsx`<br>`compara:src/components/ui/indicators/StepAndHealth.tsx`<br>`escreve:src/components/compras/SolicitacaoCard.tsx` |
| status | valor `ENTREGUE` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/compras/SolicitacaoCard.tsx`<br>`compara:src/components/compras/SolicitacaoKanban.tsx` |
| status | valor `EM_COTACAO` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/compras/SolicitacaoCard.tsx` |
| status | valor `FORNECEDOR_SELECIONADO` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/compras/SolicitacaoCard.tsx` |
| status | valor `AGUARDANDO_COTACAO` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/compras/SolicitacaoCard.tsx`<br>`escreve:src/types/legacyTypes.ts` |
| status | valor `Otimizado` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/compras/SourcingHistoryConsole.tsx`<br>`escreve:src/components/compras/SourcingHistoryConsole.tsx` |
| status | valor `Crítico` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/compras/SourcingHistoryConsole.tsx`<br>`escreve:src/components/compras/SourcingHistoryConsole.tsx` |
| status | valor `read` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/compras/SupplierInteractionLog.tsx`<br>`compara:src/features/layout/components/chat/MessageBubble.tsx`<br>`escreve:src/components/compras/SupplierInteractionLog.tsx`<br>`escreve:src/features/layout/components/SupplierChat.tsx` |
| status | valor `replied` para `status` usado no código não existe em nenhum enum do banco/TS | `escreve:src/components/compras/SupplierInteractionLog.tsx` |
| status | valor `applied` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/compras/contract/ContractDetailsTabs.tsx`<br>`compara:supabase/functions/generate-contract-pdf/index.ts` |
| status | valor `scheduled` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/compras/delivery-calendar/deliveryCalendarHelpers.ts`<br>`escreve:src/components/compras/delivery-calendar/deliveryCalendarHelpers.ts` |
| status | valor `todos` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/pagamentos/PagamentoAdvancedFilters.tsx`<br>`compara:src/features/cotacoes/hooks/useCotacoes.ts`<br>`compara:src/features/pedidos/hooks/usePedidos.ts`<br>`compara:src/hooks/useDevolucoes.ts` |
| status | valor `online` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/ui/indicators/MiscIndicators.tsx`<br>`escreve:src/components/ui/indicators/MiscIndicators.tsx` |
| status | valor `connecting` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/ui/indicators/MiscIndicators.tsx` |
| status | valor `degraded` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/ui/indicators/StepAndHealth.tsx` |
| status | valor `down` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/ui/indicators/StepAndHealth.tsx` |
| status | valor `SUBSCRIBED` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/features/layout/components/SupplierChat.tsx` |
| status | valor `todas` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/features/solicitacoes/hooks/useSolicitacoes.ts` |
| status | valor `solicitada` para `status` usado no código não existe em nenhum enum do banco/TS | `escreve:src/hooks/useDevolucoes.ts`<br>`escreve:src/pages/devolucoes/DevolucoesModals.tsx` |
| status | valor `vencedora` para `status` usado no código não existe em nenhum enum do banco/TS | `escreve:src/hooks/useLicitacoes.ts` |
| status | valor `homologada` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/pages/licitacoes/Licitacoes.tsx`<br>`escreve:src/hooks/useLicitacoes.ts` |
| status | valor `returned` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/hooks/usePurchaseHistory.ts` |
| status | valor `empty` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/pages/admin/DependencyHealth.tsx`<br>`escreve:src/pages/admin/DependencyHealth.tsx`<br>`escreve:supabase/functions/dependency-health/index.ts` |
| status | valor `queued` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/pages/admin/DependencyHealth.tsx`<br>`escreve:supabase/functions/dependency-health/index.ts` |
| status | valor `authorized` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/pages/admin/FiscalDashboard.tsx` |
| status | valor `denied` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/pages/admin/FiscalDashboard.tsx` |
| status | valor `nao_encontrado` para `status` usado no código não existe em nenhum enum do banco/TS | `escreve:src/pages/cotacao/cotacaoHelpers.ts` |
| status | valor `recebida_fornecedor` para `status` usado no código não existe em nenhum enum do banco/TS | `escreve:src/pages/devolucoes/DevolucoesModals.tsx` |
| status | valor `credito_emitido` para `status` usado no código não existe em nenhum enum do banco/TS | `escreve:src/pages/devolucoes/DevolucoesModals.tsx` |
| status | valor `reposicao_enviada` para `status` usado no código não existe em nenhum enum do banco/TS | `escreve:src/pages/devolucoes/DevolucoesModals.tsx` |
| status | valor `validada` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/pages/documentos/DocumentosFiscais.tsx`<br>`escreve:src/pages/documentos/DocumentosFiscais.tsx` |
| status | valor `publicada` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/pages/licitacoes/LicitacaoDetailDialog.tsx`<br>`escreve:src/pages/licitacoes/LicitacaoDetailDialog.tsx` |
| status | valor `encerrada` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/pages/licitacoes/LicitacaoDetailDialog.tsx`<br>`escreve:src/pages/licitacoes/LicitacaoDetailDialog.tsx` |
| status | valor `rascunho` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/pages/licitacoes/LicitacaoDetailDialog.tsx`<br>`escreve:supabase/functions/punchout-receive/index.ts` |
| status | valor `sugerido` para `status` usado no código não existe em nenhum enum do banco/TS | `escreve:src/pages/recompra/RecompraInteligente.tsx`<br>`filtra:src/pages/recompra/RecompraInteligente.tsx` |
| status | valor `descartado` para `status` usado no código não existe em nenhum enum do banco/TS | `escreve:src/pages/recompra/RecompraInteligente.tsx` |
| status | valor `aceito` para `status` usado no código não existe em nenhum enum do banco/TS | `escreve:src/pages/recompra/RecompraInteligente.tsx` |
| status | valor `PENDENTE` para `status` usado no código não existe em nenhum enum do banco/TS | `escreve:src/types/legacyTypes.ts` |
| status | valor `expirado` para `status` usado no código não existe em nenhum enum do banco/TS | `escreve:supabase/functions/check-approval-escalations/index.ts` |
| status | valor `open` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:supabase/functions/punchout-receive/index.ts` |
| status | valor `quota_blocked` para `status` usado no código não existe em nenhum enum do banco/TS | `escreve:supabase/functions/spot-api/index.ts` |
| status | valor `PROCESSING` para `status` usado no código não existe em nenhum enum do banco/TS | `escreve:supabase/functions/spot-api/index.ts` |
| status | valor `finalizada` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:supabase/migrations/20260512142511_3e8db5bf-b32f-40a8-8fd9-7c7ddecc09de.sql`<br>`compara:supabase/migrations/20261113122251_fix_gatilhos_solicitacao_pagamento_orcamento.sql` |
| status | valor `succeeded` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:supabase/migrations/20260711183343_43dc2b31-4f1c-4e2d-bea9-1da967fe29e5.sql` |
| status | valor `blocked` para `qualification_status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/compras/scorecard/supplierScorecardData.ts`<br>`compara:src/pages/portal-fornecedor/PortalFornecedor.tsx` |
| status | valor `qualified` para `qualification_status` usado no código não existe em nenhum enum do banco/TS | `compara:src/pages/qualificacao/QualificacaoFornecedores.tsx` |
| status | valor `disqualified` para `qualification_status` usado no código não existe em nenhum enum do banco/TS | `compara:src/pages/qualificacao/QualificacaoFornecedores.tsx` |
| status | valor `enroll` para `step` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/security/MFASettings.tsx` |
| status | valor `expanded` para `state` usado no código não existe em nenhum enum do banco/TS | `escreve:src/components/ui/sidebar.tsx` |
| status | valor `collapsed` para `state` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/ui/sidebar.tsx` |
| status | valor `open` para `state` usado no código não existe em nenhum enum do banco/TS | `compara:supabase/functions/_shared/circuit_breaker.ts` |
| status | valor `matched` para `reconciliation_status` usado no código não existe em nenhum enum do banco/TS | `compara:src/pages/documentos/DocumentosFiscais.tsx` |
| status | valor `unmatched` para `reconciliation_status` usado no código não existe em nenhum enum do banco/TS | `compara:src/pages/documentos/DocumentosFiscais.tsx` |
| status | valor `suppressed_dedup` para `dispatch_status` usado no código não existe em nenhum enum do banco/TS | `escreve:supabase/functions/alert-dispatcher/index.ts` |
| status | valor `dispatch_error` para `sefaz_status` usado no código não existe em nenhum enum do banco/TS | `compara:supabase/functions/fiscal-orchestrator/index.ts`<br>`escreve:supabase/functions/fiscal-orchestrator/index.ts` |
| status | valor `finalizada` para `v_old_status` usado no código não existe em nenhum enum do banco/TS | `compara:supabase/migrations/20260512142511_3e8db5bf-b32f-40a8-8fd9-7c7ddecc09de.sql`<br>`compara:supabase/migrations/20261113122251_fix_gatilhos_solicitacao_pagamento_orcamento.sql` |
| status | valor `finalizada` para `v_new_status` usado no código não existe em nenhum enum do banco/TS | `compara:supabase/migrations/20260512142511_3e8db5bf-b32f-40a8-8fd9-7c7ddecc09de.sql`<br>`compara:supabase/migrations/20261113122251_fix_gatilhos_solicitacao_pagamento_orcamento.sql` |
| coluna | coluna `categorias_atendidas` usada no código não existe no schema de `fornecedores` |  |
| coluna | coluna `action` usada no código não existe no schema de `audit_logs` |  |
| coluna | coluna `actor_id` usada no código não existe no schema de `audit_logs` |  |
| coluna | coluna `resource_id` usada no código não existe no schema de `audit_logs` |  |
| coluna | coluna `resource_type` usada no código não existe no schema de `audit_logs` |  |
| rls | `blocked_countries`: acessada do front (1 arquivo(s)) e nenhuma migration do repo liga RLS nela — NÃO VERIFICADO, confirme no banco real | `src/components/security/BlockedCountriesPanel.tsx` |
| rls | `geo_access_logs`: acessada do front (1 arquivo(s)) e nenhuma migration do repo liga RLS nela — NÃO VERIFICADO, confirme no banco real | `src/components/security/GeoAccessLogsPanel.tsx` |
| rls | `qualification_history`: acessada do front (1 arquivo(s)) e nenhuma migration do repo liga RLS nela — NÃO VERIFICADO, confirme no banco real | `src/components/compras/QualificationHistoryTimeline.tsx` |
| rls | `qualification_requirements`: acessada do front (1 arquivo(s)) e nenhuma migration do repo liga RLS nela — NÃO VERIFICADO, confirme no banco real | `src/hooks/useSupplierQualification.ts` |
| rls | `supplier_documents`: acessada do front (1 arquivo(s)) e nenhuma migration do repo liga RLS nela — NÃO VERIFICADO, confirme no banco real | `src/hooks/useSupplierQualification.ts` |
| rls | `supplier_qualification_scores`: acessada do front (3 arquivo(s)) e nenhuma migration do repo liga RLS nela — NÃO VERIFICADO, confirme no banco real | `src/components/compras/scorecard/supplierScorecardData.ts`<br>`src/hooks/useSupplierQualification.ts`<br>`src/pages/portal-fornecedor/portalFornecedorData.ts` |
| rls | `user_tenants`: front faz UPDATE mas nenhuma política RLS permite UPDATE → vai falhar/retornar vazio para usuários | `src/features/auth/hooks/useAuth.tsx` |
| tenant | `saved_filters` não tem coluna `tenant_id` (isolamento por tenant pode estar incompleto) |  |
| tenant | `entity_versions` não tem coluna `tenant_id` (isolamento por tenant pode estar incompleto) |  |
| tenant | `historico_compras` não tem coluna `tenant_id` (isolamento por tenant pode estar incompleto) |  |
| tenant | `dashboard_filter_favorites` não tem coluna `tenant_id` (isolamento por tenant pode estar incompleto) |  |
| tenant | `push_subscriptions` não tem coluna `tenant_id` (isolamento por tenant pode estar incompleto) |  |
| tenant | `notification_preferences` não tem coluna `tenant_id` (isolamento por tenant pode estar incompleto) |  |
| tenant | `permissions` não tem coluna `tenant_id` (isolamento por tenant pode estar incompleto) |  |
| tenant | `blocked_ips` não tem coluna `tenant_id` (isolamento por tenant pode estar incompleto) |  |
| tenant | `ip_whitelist` não tem coluna `tenant_id` (isolamento por tenant pode estar incompleto) |  |
| tenant | `webauthn_credentials` não tem coluna `tenant_id` (isolamento por tenant pode estar incompleto) |  |
| tenant | `webauthn_challenges` não tem coluna `tenant_id` (isolamento por tenant pode estar incompleto) |  |
| tenant | `allowed_countries` não tem coluna `tenant_id` (isolamento por tenant pode estar incompleto) |  |
| tenant | `password_reset_requests` não tem coluna `tenant_id` (isolamento por tenant pode estar incompleto) |  |
| tenant | `account_lockouts` não tem coluna `tenant_id` (isolamento por tenant pode estar incompleto) |  |
| tenant | `user_tour_preferences` não tem coluna `tenant_id` (isolamento por tenant pode estar incompleto) |  |
| tenant | `spot_sessions` não tem coluna `tenant_id` (isolamento por tenant pode estar incompleto) |  |
| tenant | `spot_pedidos` não tem coluna `tenant_id` (isolamento por tenant pode estar incompleto) |  |
| tenant | `negotiation_analyses` não tem coluna `tenant_id` (isolamento por tenant pode estar incompleto) |  |
| tenant | `query_telemetry` não tem coluna `tenant_id` (isolamento por tenant pode estar incompleto) |  |
| tenant | `dependency_health` não tem coluna `tenant_id` (isolamento por tenant pode estar incompleto) |  |
| tenant | `dependency_health_history` não tem coluna `tenant_id` (isolamento por tenant pode estar incompleto) |  |
| tenant | `user_filter_preferences` não tem coluna `tenant_id` (isolamento por tenant pode estar incompleto) |  |
| tenant | `dashboard_layouts` não tem coluna `tenant_id` (isolamento por tenant pode estar incompleto) |  |
| tenant | `erp_field_mappings` não tem coluna `tenant_id` (isolamento por tenant pode estar incompleto) |  |
| tenant | `currencies` não tem coluna `tenant_id` (isolamento por tenant pode estar incompleto) |  |
| tenant | `exchange_rates` não tem coluna `tenant_id` (isolamento por tenant pode estar incompleto) |  |
| tenant | `estoque` não tem coluna `tenant_id` (isolamento por tenant pode estar incompleto) |  |
| tenant | `estoque_movimentacoes` não tem coluna `tenant_id` (isolamento por tenant pode estar incompleto) |  |
| tenant | `aliquotas_tributarias` não tem coluna `tenant_id` (isolamento por tenant pode estar incompleto) |  |
| tenant | `webhook_events` não tem coluna `tenant_id` (isolamento por tenant pode estar incompleto) |  |
| tenant | `wal_rate_snapshots` não tem coluna `tenant_id` (isolamento por tenant pode estar incompleto) |  |
| tenant | `checkpoint_snapshots` não tem coluna `tenant_id` (isolamento por tenant pode estar incompleto) |  |
| tenant | `temp_file_snapshots` não tem coluna `tenant_id` (isolamento por tenant pode estar incompleto) |  |
| tenant | `deadlock_snapshots` não tem coluna `tenant_id` (isolamento por tenant pode estar incompleto) |  |
| tenant | `health_scan_runs` não tem coluna `tenant_id` (isolamento por tenant pode estar incompleto) |  |
| tenant | `alert_subscriptions` não tem coluna `tenant_id` (isolamento por tenant pode estar incompleto) |  |
| tenant | `security_definer_baseline` não tem coluna `tenant_id` (isolamento por tenant pode estar incompleto) |  |
| tenant | `secret_rotation_schedule` não tem coluna `tenant_id` (isolamento por tenant pode estar incompleto) |  |
| tenant | `table_size_snapshots` não tem coluna `tenant_id` (isolamento por tenant pode estar incompleto) |  |
| tenant | `cron_heartbeats` não tem coluna `tenant_id` (isolamento por tenant pode estar incompleto) |  |
| tenant | `xbz_cores` não tem coluna `tenant_id` (isolamento por tenant pode estar incompleto) |  |
| tenant | `spot_produtos` não tem coluna `tenant_id` (isolamento por tenant pode estar incompleto) |  |
| tenant | `spot_skus` não tem coluna `tenant_id` (isolamento por tenant pode estar incompleto) |  |
| tenant | `spot_customization_options` não tem coluna `tenant_id` (isolamento por tenant pode estar incompleto) |  |
| tenant | `spot_estoque` não tem coluna `tenant_id` (isolamento por tenant pode estar incompleto) |  |
| tenant | `blocked_countries` não tem coluna `tenant_id` (isolamento por tenant pode estar incompleto) |  |
| tenant | `qualification_history` não tem coluna `tenant_id` (isolamento por tenant pode estar incompleto) |  |
| tenant | `qualification_requirements` não tem coluna `tenant_id` (isolamento por tenant pode estar incompleto) |  |
| edge | edge function `process-solicitacao-neural` invocada mas não existe em supabase/functions/ | `src/components/compras/NovaSolicitacaoModal.tsx`<br>`src/pages/admin/DeveloperDocs.tsx` |
| dinâmico | 4 chamada(s) `.from(variável)` — tabela só conhecida em runtime | `src/hooks/useOfflineSync.ts` |
| dinâmico | 4 chamada(s) `.from(variável)` — tabela só conhecida em runtime | `supabase/functions/external-db-bridge/index.ts` |
| dinâmico | 2 chamada(s) `.from(variável)` — tabela só conhecida em runtime | `supabase/functions/migrate-storage-paths/index.ts` |
| dinâmico | 1 chamada(s) `.from(variável)` — tabela só conhecida em runtime | `supabase/functions/spot-api/index.ts` |
| ddl dinâmico | 2 comando(s) de schema cujo efeito depende do banco em runtime (EXECUTE montado a partir do catálogo, ou IF que só o banco responde) — políticas/RLS/tabelas tocadas por eles podem estar diferentes do que este contexto mostra. Ex.: `EXECUTE format('DROP POLICY IF EXISTS %I ON public.audit_logs', pol.policyname);` · `EXECUTE format('DROP POLICY IF EXISTS %I ON public.security_logs', pol.policyname);` | `supabase/migrations/20260317222336_b11455d7-3bed-421d-9f68-835d7ef26d66.sql` |
| ddl dinâmico | 1 comando(s) de schema cujo efeito depende do banco em runtime (EXECUTE montado a partir do catálogo, ou IF que só o banco responde) — políticas/RLS/tabelas tocadas por eles podem estar diferentes do que este contexto mostra. Ex.: `EXECUTE format('DROP POLICY IF EXISTS %I ON public.rate_limit_logs', pol.policyname);` | `supabase/migrations/20260317225700_89f28570-4d8b-455a-8d44-8c36c454efd3.sql` |
| ddl dinâmico | 5 comando(s) de schema cujo efeito depende do banco em runtime (EXECUTE montado a partir do catálogo, ou IF que só o banco responde) — políticas/RLS/tabelas tocadas por eles podem estar diferentes do que este contexto mostra. Ex.: `EXECUTE (SELECT string_agg(format('DROP POLICY IF EXISTS %I ON public.approval_rules', policyname), '; ') FROM pg_policies WHERE tablename='approval_rules' AND cmd='SELECT');` · `EXECUTE (SELECT string_agg(format('DROP POLICY IF EXISTS %I ON public.supplier_qualification_scores', policyname), '; ') FROM pg_policies WHERE tablename='supplier_qualification_scores' AND cmd='SELECT');` · `EXECUTE (SELECT string_agg(format('DROP POLICY IF EXISTS %I ON public.receiving_checklists', policyname), '; ') FROM pg_policies WHERE tablename='receiving_checklists' AND cmd='SELECT');` | `supabase/migrations/20260317230002_e7619b9a-5a26-4d44-9023-1d986f965464.sql` |
| ddl dinâmico | 1 comando(s) de schema cujo efeito depende do banco em runtime (EXECUTE montado a partir do catálogo, ou IF que só o banco responde) — políticas/RLS/tabelas tocadas por eles podem estar diferentes do que este contexto mostra. Ex.: `EXECUTE 'REVOKE EXECUTE ON FUNCTION public.' \|\| quote_ident(func_record.func_name) \|\| '(' \|\| func_record.args \|\| ') FROM PUBLIC';` | `supabase/migrations/20260507194122_b32edeb5-a032-4132-8ee2-1fc234103852.sql` |
| ddl dinâmico | 1 comando(s) de schema cujo efeito depende do banco em runtime (EXECUTE montado a partir do catálogo, ou IF que só o banco responde) — políticas/RLS/tabelas tocadas por eles podem estar diferentes do que este contexto mostra. Ex.: `EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path = public, pg_temp;', func_record.nspname, func_record.proname, func_record.args);` | `supabase/migrations/20260514211742_3b400e1b-5a7e-4c5b-8326-3f4a7ab9e309.sql` |
| ddl dinâmico | 2 comando(s) de schema cujo efeito depende do banco em runtime (EXECUTE montado a partir do catálogo, ou IF que só o banco responde) — políticas/RLS/tabelas tocadas por eles podem estar diferentes do que este contexto mostra. Ex.: `EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated;', func_record.oid::regprocedure);` · `EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role;', func_record.oid::regprocedure);` | `supabase/migrations/20260514211800_648e4d06-4b0d-4ca2-b3e3-5c682f7b6079.sql` |
| ddl dinâmico | 1 comando(s) de schema cujo efeito depende do banco em runtime (EXECUTE montado a partir do catálogo, ou IF que só o banco responde) — políticas/RLS/tabelas tocadas por eles podem estar diferentes do que este contexto mostra. Ex.: `EXECUTE format( 'ALTER FUNCTION %I.%I(%s) SET search_path = public, pg_temp', r.nspname, r.proname, r.argtypes );` | `supabase/migrations/20260521142029_security_hardening.sql` |
| ddl dinâmico | 3 comando(s) de schema cujo efeito depende do banco em runtime (EXECUTE montado a partir do catálogo, ou IF que só o banco responde) — políticas/RLS/tabelas tocadas por eles podem estar diferentes do que este contexto mostra. Ex.: `EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path = public', r.nspname, r.proname, pg_get_function_identity_arguments(r.oid));` · `EXECUTE format('REVOKE ALL ON FUNCTION %I.%I(%s) FROM PUBLIC', r.nspname, r.proname, pg_get_function_identity_arguments(r.oid));` · `EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO service_role', r.nspname, r.proname, pg_get_function_identity_arguments(r.oid));` | `supabase/migrations/20260529192540_87382966-9b4e-41cf-851a-a359e114d03b.sql` |
| ddl dinâmico | 1 comando(s) de schema cujo efeito depende do banco em runtime (EXECUTE montado a partir do catálogo, ou IF que só o banco responde) — políticas/RLS/tabelas tocadas por eles podem estar diferentes do que este contexto mostra. Ex.: `EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path = public', r.nspname, r.proname, pg_get_function_identity_arguments(r.oid));` | `supabase/migrations/20260529192650_fc849ba0-cdfa-4a50-8c04-23fcee8f864d.sql` |
| ddl dinâmico | 2 comando(s) de schema cujo efeito depende do banco em runtime (EXECUTE montado a partir do catálogo, ou IF que só o banco responde) — políticas/RLS/tabelas tocadas por eles podem estar diferentes do que este contexto mostra. Ex.: `EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path = public', r.nspname, r.proname, r.args);` · `EXECUTE format('REVOKE ALL ON FUNCTION %I.%I(%s) FROM PUBLIC', r.nspname, r.proname, r.args);` | `supabase/migrations/20260531123936_21233c39-85c5-494f-bf4e-599e7756bdc9.sql` |
| ddl dinâmico | 1 comando(s) de schema cujo efeito depende do banco em runtime (EXECUTE montado a partir do catálogo, ou IF que só o banco responde) — políticas/RLS/tabelas tocadas por eles podem estar diferentes do que este contexto mostra. Ex.: `EXECUTE format( 'REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC, anon, authenticated', f.schema_name, f.func_name, f.args );` | `supabase/migrations/20260619194754_f1a59f1a-7413-46ad-86f5-3e325c85da41.sql` |
| ddl dinâmico | 11 comando(s) de schema cujo efeito depende do banco em runtime (EXECUTE montado a partir do catálogo, ou IF que só o banco responde) — políticas/RLS/tabelas tocadas por eles podem estar diferentes do que este contexto mostra. Ex.: `EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.tenant_in_my_group(tenant_id))', pol.policyname, pol.tablename);` · `EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.tenant_in_my_group(tenant_id))', pol.policyname, pol.tablename);` · `EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.tenant_in_my_group(tenant_id)) WITH CHECK (public.tenant_in_my_group(tenant_id))', pol.policyname, pol.tablename);` | `supabase/migrations/20260619205841_08fc0043-6b1e-4ed9-9c1a-89440df3c816.sql` |
| ddl dinâmico | 1 comando(s) de schema cujo efeito depende do banco em runtime (EXECUTE montado a partir do catálogo, ou IF que só o banco responde) — políticas/RLS/tabelas tocadas por eles podem estar diferentes do que este contexto mostra. Ex.: `EXECUTE format( 'CREATE TABLE IF NOT EXISTS public.%I PARTITION OF public.telemetry_logs FOR VALUES FROM (%L) TO (%L);', part_name, start_date, end_date );` | `supabase/migrations/20260712222930_cd4547af-7aac-44d8-8ac2-48991a40dfbf.sql` |
| ddl dinâmico | 1 comando(s) de schema cujo efeito depende do banco em runtime (EXECUTE montado a partir do catálogo, ou IF que só o banco responde) — políticas/RLS/tabelas tocadas por eles podem estar diferentes do que este contexto mostra. Ex.: `IF EXISTS ( SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND policyname IN ( 'Authenticated users can … THEN CREATE POLICY "Users can manage own notifications" ON public.notifications FOR ALL TO authenticated US …` | `supabase/migrations/20260719000001_rls_using_true_cleanup.sql` |
| ddl dinâmico | 2 comando(s) de schema cujo efeito depende do banco em runtime (EXECUTE montado a partir do catálogo, ou IF que só o banco responde) — políticas/RLS/tabelas tocadas por eles podem estar diferentes do que este contexto mostra. Ex.: `EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', s::regprocedure);` · `EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', s::regprocedure);` | `supabase/migrations/20261112171300_secdef_revoga_anon.sql` |
| ddl dinâmico | 1 comando(s) de schema cujo efeito depende do banco em runtime (EXECUTE montado a partir do catálogo, ou IF que só o banco responde) — políticas/RLS/tabelas tocadas por eles podem estar diferentes do que este contexto mostra. Ex.: `EXECUTE format( 'ALTER TABLE public.%I ALTER COLUMN %I TYPE character(3) USING (CASE WHEN %I = %L THEN %L ELSE %I END)::character(3)', r.table_name, r.column_name, r.column_name, 'B', 'BRL', r.column_name);` | `supabase/migrations/20261112222817_moeda_char3_cotacao_pedido.sql` |
| ddl dinâmico | 1 comando(s) de schema cujo efeito depende do banco em runtime (EXECUTE montado a partir do catálogo, ou IF que só o banco responde) — políticas/RLS/tabelas tocadas por eles podem estar diferentes do que este contexto mostra. Ex.: `execute format( 'create trigger a_fill_tenant_id before insert on public.%I ' 'for each row execute function public.fill_tenant_id_from_profile()', t);` | `supabase/migrations/20261112223246_fill_tenant_id_from_profile.sql` |
| segurança | função `update_licitacao_best_bid` é SECURITY DEFINER sem `set search_path` na definição; `supabase/migrations/20260531123936_21233c39-85c5-494f-bf4e-599e7756bdc9.sql` aplica `ALTER FUNCTION … SET search_path` em runtime depois dela — NÃO VERIFICADO se cobre esta função | `supabase/migrations/20260507204732_0bb6c80f-2526-453e-9be9-4990561632e4.sql` |
| segurança | função `log_budget_changes` é SECURITY DEFINER sem `set search_path` na definição; `supabase/migrations/20260531123936_21233c39-85c5-494f-bf4e-599e7756bdc9.sql` aplica `ALTER FUNCTION … SET search_path` em runtime depois dela — NÃO VERIFICADO se cobre esta função | `supabase/migrations/20260512141452_3be6aedb-f8fa-4312-b1be-610e86b46974.sql` |
| segurança | função `audit_pagamento_changes` é SECURITY DEFINER sem `set search_path` na definição; `supabase/migrations/20260531123936_21233c39-85c5-494f-bf4e-599e7756bdc9.sql` aplica `ALTER FUNCTION … SET search_path` em runtime depois dela — NÃO VERIFICADO se cobre esta função | `supabase/migrations/20260512143218_6a3c9f90-f3f0-47c5-acb6-3aa5ab4de6cd.sql` |
| segurança | função `update_cost_center_budget_totals` é SECURITY DEFINER sem `set search_path` na definição; `supabase/migrations/20260531123936_21233c39-85c5-494f-bf4e-599e7756bdc9.sql` aplica `ALTER FUNCTION … SET search_path` em runtime depois dela — NÃO VERIFICADO se cobre esta função | `supabase/migrations/20260512143450_5e734e19-0c49-4b8b-ba15-dfc0d412b863.sql` |
| segurança | função `check_budget_availability` é SECURITY DEFINER sem `set search_path` na definição; `supabase/migrations/20260531123936_21233c39-85c5-494f-bf4e-599e7756bdc9.sql` aplica `ALTER FUNCTION … SET search_path` em runtime depois dela — NÃO VERIFICADO se cobre esta função | `supabase/migrations/20260512143450_5e734e19-0c49-4b8b-ba15-dfc0d412b863.sql` |

## Lacunas — o que este contexto NÃO consegue responder (perguntas para o dono do negócio)

- Nenhuma regra manual em `manual/`: prazos, limites, exceções comerciais, quem aprova o quê — só o negócio sabe.
- `cotacoes.follow_up_status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `contracts.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `approval_steps.etapa` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `spot_pedidos.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `fiscal_documents.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `fiscal_documents.reconciliation_status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `fiscal_documents.sefaz_status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `repurchase_suggestions.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `contract_penalties.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `receiving_checklists.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `devolucoes.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `devolucao_itens.estado_item` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `creditos_fornecedor.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `licitacoes.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `licitacao_propostas.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `scim_provisioning_log.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `punchout_catalogs.last_test_status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `fiscal_events.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `workflow_approvals.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `workflow_audit_log.old_state` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `workflow_audit_log.new_state` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `system_alerts.dispatch_status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `health_scan_runs.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `xbz_pedidos.id_status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `xbz_pedidos.status_logistico` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `xbz_pedidos.id_lote_debito_status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `xbz_pedidos.lote_debito_status_cliente` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `xbz_carrinho_log.response_status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `spot_api_sync_log.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `supplier_documents.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `supplier_qualification_scores.qualification_status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- 157/160 tabelas sem `COMMENT ON TABLE` — o significado de negócio não está no schema: `entity_versions`, `solicitacoes`, `cotacoes`, `fornecedores`, `historico_compras`, `user_roles`, `profiles`, `dashboard_filter_favorites`, `contracts`, `contract_items`, `contract_documents`, `contract_history` …

## Regras manuais presentes

_nenhuma — copie `manual/TEMPLATE-regras-de-negocio.md`_
