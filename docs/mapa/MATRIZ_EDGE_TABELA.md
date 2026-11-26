# Matriz edge function x tabela

> Gerado por `node scripts/ci/gerar-matriz-edge-tabela.mjs` — não editar à mão.
> Fonte: chamadas `.from('tabela')` em `supabase/functions/<funcao>/**/*.ts` (sem testes e sem `_shared`).
>
> Não cobre: tabelas acessadas por `.rpc()` (chamada de função, não de tabela), por nome em variável
> (`from(nome)`) nem por SQL cru. Chamadas `storage.from('bucket')` são bucket de storage, não tabela, e ficam de fora.
> Também conta `.from()` que esteja dentro de código comentado — é varredura de texto, não AST.
> As tabelas usadas por `_shared/` saem na última seção: elas valem para TODA função que importa o helper.

## Por função

| Função | Tabelas |
|---|---|
| `ai-demand-prediction` | — |
| `ai-negotiation` | — |
| `ai-supplier-risk` | — |
| `ai-supplier-suggestion` | — |
| `alert-dispatcher` | `system_alerts` |
| `check-approval-escalations` | `approval_history`, `approval_steps`, `approval_workflows` |
| `check-cotacao-followup` | `cotacoes`, `notifications`, `profiles` |
| `check-expiry-alerts` | `contracts`, `cotacoes`, `pagamentos`, `user_roles` |
| `check-sla-alerts` | `pagamentos`, `pedidos`, `solicitacoes`, `user_roles` |
| `dependency-health` | `audit_logs`, `dependency_health`, `dependency_health_history` |
| `erp-credential-encrypt` | `user_tenants` |
| `erp-sync` | `erp_connections`, `erp_sync_log` |
| `escalate-solicitacao` | `approval_history`, `pedidos`, `profiles`, `solicitacoes`, `user_roles` |
| `external-db-bridge` | `query_telemetry` |
| `fiscal-orchestrator` | `fiscal_events` |
| `generate-contract-pdf` | `contract_items`, `contract_penalties`, `contracts` |
| `guided-buying-ai` | `fornecedores`, `produtos` |
| `health-dashboard` | `audit_logs`, `health_scan_runs`, `system_alerts`, `v_system_health_overview` |
| `maintain-partitions` | — |
| `migrate-storage-paths` | `profiles` |
| `process-invoice-idp` | — |
| `process-outbox` | `integration_outbox` |
| `process-solicitacao-neural` | — |
| `punchout-encrypt` | `user_tenants` |
| `punchout-receive` | `profiles`, `punchout_catalogs`, `punchout_sessions`, `solicitacoes` |
| `punchout-setup` | `punchout_catalogs`, `punchout_sessions`, `user_tenants` |
| `receive-os-sync` | `profiles`, `solicitacoes`, `tenants`, `user_tenants` |
| `run-audit` | — |
| `scim-v2` | `sso_configurations` |
| `send-push-notification` | `profiles`, `push_subscriptions`, `user_roles`, `user_tenants` |
| `spot-api` | `spot_api_sync_log`, `spot_estoque`, `spot_pedidos`, `spot_sessions`, `user_roles` |
| `spot-proxy` | `spot_pedidos`, `spot_sessions`, `user_roles` |
| `system-simulation` | — |
| `telemetry` | `telemetry_logs` |
| `tests` | — |
| `webauthn-authenticate` | `webauthn_challenges`, `webauthn_credentials` |
| `webauthn-register` | `webauthn_challenges`, `webauthn_credentials` |
| `weekly-report` | `cotacoes`, `pagamentos`, `pedidos`, `solicitacoes`, `user_roles` |
| `weekly-summary-report` | `cotacoes`, `pedidos`, `solicitacoes`, `user_roles` |
| `workflow-engine` | `workflow_approvals`, `workflow_edges`, `workflow_instances`, `workflow_logs`, `workflow_nodes` |
| `xbz-proxy` | `xbz_carrinho_log`, `xbz_credentials` |
| `xbz-sync-pedidos` | `system_alerts`, `xbz_credentials`, `xbz_pedido_status_history`, `xbz_pedidos` |

## Por tabela

| Tabela | Funções |
|---|---|
| `approval_history` | `check-approval-escalations`, `escalate-solicitacao` |
| `approval_steps` | `check-approval-escalations` |
| `approval_workflows` | `check-approval-escalations` |
| `audit_logs` | `dependency-health`, `health-dashboard` |
| `contract_items` | `generate-contract-pdf` |
| `contract_penalties` | `generate-contract-pdf` |
| `contracts` | `check-expiry-alerts`, `generate-contract-pdf` |
| `cotacoes` | `check-cotacao-followup`, `check-expiry-alerts`, `weekly-report`, `weekly-summary-report` |
| `dependency_health` | `dependency-health` |
| `dependency_health_history` | `dependency-health` |
| `erp_connections` | `erp-sync` |
| `erp_sync_log` | `erp-sync` |
| `fiscal_events` | `fiscal-orchestrator` |
| `fornecedores` | `guided-buying-ai` |
| `health_scan_runs` | `health-dashboard` |
| `integration_outbox` | `process-outbox` |
| `notifications` | `check-cotacao-followup` |
| `pagamentos` | `check-expiry-alerts`, `check-sla-alerts`, `weekly-report` |
| `pedidos` | `check-sla-alerts`, `escalate-solicitacao`, `weekly-report`, `weekly-summary-report` |
| `produtos` | `guided-buying-ai` |
| `profiles` | `check-cotacao-followup`, `escalate-solicitacao`, `migrate-storage-paths`, `punchout-receive`, `receive-os-sync`, `send-push-notification` |
| `punchout_catalogs` | `punchout-receive`, `punchout-setup` |
| `punchout_sessions` | `punchout-receive`, `punchout-setup` |
| `push_subscriptions` | `send-push-notification` |
| `query_telemetry` | `external-db-bridge` |
| `solicitacoes` | `check-sla-alerts`, `escalate-solicitacao`, `punchout-receive`, `receive-os-sync`, `weekly-report`, `weekly-summary-report` |
| `spot_api_sync_log` | `spot-api` |
| `spot_estoque` | `spot-api` |
| `spot_pedidos` | `spot-api`, `spot-proxy` |
| `spot_sessions` | `spot-api`, `spot-proxy` |
| `sso_configurations` | `scim-v2` |
| `system_alerts` | `alert-dispatcher`, `health-dashboard`, `xbz-sync-pedidos` |
| `telemetry_logs` | `telemetry` |
| `tenants` | `receive-os-sync` |
| `user_roles` | `check-expiry-alerts`, `check-sla-alerts`, `escalate-solicitacao`, `send-push-notification`, `spot-api`, `spot-proxy`, `weekly-report`, `weekly-summary-report` |
| `user_tenants` | `erp-credential-encrypt`, `punchout-encrypt`, `punchout-setup`, `receive-os-sync`, `send-push-notification` |
| `v_system_health_overview` | `health-dashboard` |
| `webauthn_challenges` | `webauthn-authenticate`, `webauthn-register` |
| `webauthn_credentials` | `webauthn-authenticate`, `webauthn-register` |
| `workflow_approvals` | `workflow-engine` |
| `workflow_edges` | `workflow-engine` |
| `workflow_instances` | `workflow-engine` |
| `workflow_logs` | `workflow-engine` |
| `workflow_nodes` | `workflow-engine` |
| `xbz_carrinho_log` | `xbz-proxy` |
| `xbz_credentials` | `xbz-proxy`, `xbz-sync-pedidos` |
| `xbz_pedido_status_history` | `xbz-sync-pedidos` |
| `xbz_pedidos` | `xbz-sync-pedidos` |

## Por helper de `_shared/` (herdado por quem importa)

> Estas tabelas NÃO estão nas seções acima: o `.from()` está no helper, não na função.
> Quem importa o helper toca a tabela.

| Helper | Tabelas |
|---|---|
| `_shared/idempotency.ts` | `webhook_events` |
| `_shared/logger.ts` | `telemetry_logs` |
| `_shared/notifications.ts` | `notifications`, `profiles` |
| `_shared/security.ts` | `user_tenants` |
| `_shared/telemetry.ts` | `telemetry_logs` |
| `_shared/xbz_auth.ts` | `user_roles`, `user_tenants`, `xbz_carrinho_log`, `xbz_credentials` |
| `_shared/xbz_catalog_cache.ts` | `xbz_produtos` |
| `_shared/xbz_fiscal_cache.ts` | `xbz_cores`, `xbz_produto_fiscal` |
