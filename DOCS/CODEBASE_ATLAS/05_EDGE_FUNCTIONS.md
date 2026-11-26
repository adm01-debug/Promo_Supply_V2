# 05. Edge Functions (Supabase / Deno)

**32 funções** em `supabase/functions/*`. Padrão comum: CORS via `_shared/security.ts` · Auth JWT via `getAuthUser` · Tenant via `getTenantId` (sem header legado `x-tenant-id`) · Validação Zod via `_shared/validation.ts` + `_shared/contracts.ts` · Log em `telemetry_logs` via `EdgeLogger` · Rate-limit por RPC `check_rate_limit` · Idempotência via tabela `webhook_events`.

## Utilitários compartilhados (`_shared/*`)

| Arquivo | Propósito | API pública |
|---|---|---|
| `security.ts` | CORS + resolução auth/tenant multi-empresa | `buildCorsHeaders(req)`, `getAuthUser(req)`, `getTenantId(client, user, preferredId?)`, `responses.success/error` |
| `validation.ts` | Zod + resposta padronizada | `validateBody(req, schema, logger?)`, `errorResponse(error, logger?)`, `validateMethod(req, methods[])` |
| `contracts.ts` | Schemas Zod centrais + registro | `NegotiationContract`, `WorkflowContract`, `ERPSyncContract`, `FiscalContract`, `TelemetryContract`, `DemandPredictionContract`, `SupplierSuggestionContract`, `SpotProxyContract`; `FunctionContracts`, `FunctionTableAudit`, `ContractValidator.validate` |
| `logger.ts` | Logger JSON estruturado + persistência | `EdgeLogger(fn, requestId?)` — `.info/.warn/.error/.debug`; redige `password/token/secret/key/auth/cvv` |
| `rate_limit.ts` | Rate limit via Postgres | `checkRateLimit({identifier, endpoint, maxRequests, windowSeconds})` (RPC `check_rate_limit`, fail-open); `rateLimitedResponse(retryAfter)` |
| `idempotency.ts` | Webhooks idempotentes | `getIdempotentResponse(source, key)`, `recordIdempotentResponse(...)`, `deriveIdempotencyKey(req, body)` (header ou SHA-256) |
| `ai_gateway.ts` | Chamada Lovable AI unificada | `callAIGateway({apiKey, body, timeoutMs?, retries?})` — circuit breaker `ai-gateway` (5 falhas / 30s), retry em 5xx/429/timeout; `AIGatewayCircuitOpenError` |
| `circuit_breaker.ts` | Circuit breaker em memória | `getBreaker(name, {failureThreshold, cooldownMs})` |
| `retry.ts` | Retry com backoff exp. + jitter | `retry(fn, {retries, baseDelayMs, maxDelayMs, shouldRetry?})` |
| `http.ts` | fetch com timeout | `fetchWithTimeout(url, {timeoutMs, ...init})` |
| `telemetry.ts` | Wrapper de exec. + duração | `withTelemetry(name, fn, ctx?)` (warn se >2s) |
| `fuzzer.ts` | Payload mutations | `PayloadFuzzer.generateMutations(schema, base)` — remove campos, tipos errados, SQLi, strings extremas |
| `simulation-engine.ts` | Runner de cenários | `SimulationEngine(url, key)`, `.runScenario`, `.getSummary` |
| `integrity_test.ts` | Suite anti-regressão | `runIntegrityTests(baseUrl, anonKey)` |

## Funções (32)

### IA (Lovable AI Gateway)

| Função | Modelo | Auth | Contrato | Efeito |
|---|---|---|---|---|
| `ai-demand-prediction` | gemini-2.0-flash | JWT · 15 req/min | `DemandPredictionContract` (`contracts.ts:67`) | Previsão de demanda a partir de histórico |
| `ai-negotiation` | gemini-3-flash-preview | JWT · 20 req/min | `NegotiationContract` (`:5`) | Estratégia de negociação (function calling) |
| `ai-supplier-risk` | gemini-2.5-flash | JWT · 20 req/min | ⚠️ sem Zod (parsing manual em `index.ts:51`) | Score de risco (financeiro/entregas/compliance/ESG) |
| `ai-supplier-suggestion` | gemini-2.0-flash | JWT · 20 req/min | `SupplierSuggestionContract` (`:73`) | Sugere fornecedores |

### Workflow, fiscal, ERP, punchout

| Função | Auth | Contrato | Efeito |
|---|---|---|---|
| `workflow-engine` | JWT + tenant | `WorkflowContract` (discriminated union) — `start_workflow` / `approve_step` / `submit_decision` | Motor de aprovação; RPC `check_workflow_sod` bloqueia auto-aprovação |
| `fiscal-orchestrator` | JWT + tenant | `FiscalContract` — `{action, type, document_id?, payload?}` | Insere `fiscal_events` (status pending) |
| `erp-sync` | JWT · 30 req/min · idempotência | `ERPSyncContract` — `push/pull/sync_po/sync_supplier/sync_invoice` | Valida `erp_connections`, log em `erp_sync_log` |
| `punchout-setup` | JWT + membership | sem Zod — `{catalog_id, return_url}` | Gera cXML `PunchOutSetupRequest`, insere `punchout_sessions` |
| `punchout-receive` | público (webhook) · 30 req/min por IP · idempotência | cXML `BrowserFormPost` (regex parser) | Cria `solicitacoes` do carrinho; 303 redirect |
| `process-invoice-idp` | ⚠️ sem JWT explícito | `{filePath}` | **Mockado** hoje — extrai dados fiscais de PDF |
| `generate-contract-pdf` | JWT | `{contract_id}` | Gera HTML de contrato (nome enganoso — não é PDF binário) |
| `guided-buying-ai` | JWT · 30 req/min | Zod inline — `{message, history?, context?}` | Chat guiado; **hoje resposta mock por keyword**, sem chamada real |

### Cron / alertas (sem auth de usuário; service role)

| Função | Efeito |
|---|---|
| `alert-dispatcher` | Despacha `system_alerts` HIGH/CRITICAL para Slack; dedup in-memory + `dispatched_at` |
| `check-approval-escalations` | Escalona workflows vencidos; envia lembretes/avisos |
| `check-cotacao-followup` | Notifica cotações pendentes >48h (in-app + email Resend) |
| `check-expiry-alerts` | Expira cotações, marca pagamentos atrasados, notifica vencimentos |
| `check-sla-alerts` | Verifica SLA de pedidos, aprovações e pagamentos; dedupe por título+dia |
| `process-outbox` | Worker do outbox pattern (batch 20, retry backoff 30·2^n cap 1h, `dead` após 5) |
| `weekly-report` / `weekly-summary-report` | Relatórios semanais para admin/coordinator |

### Segurança / infra

| Função | Auth | Efeito |
|---|---|---|
| `webauthn-register` | JWT · força `userId` = user autenticado | `start` / `finish`; grava `webauthn_credentials`, `webauthn_challenges` (TTL 5min) |
| `webauthn-authenticate` | público (pré-login) | Gera magic link após verificar credencial; não vaza existência de usuário |
| `scim-v2` | Bearer SCIM (SHA-256 + comparação constant-time) · 120 req/min por IP | Provisionamento SCIM 2.0 Users |
| `send-push-notification` | JWT · 60 req/min | Web Push VAPID (JWT ES256 assinado manualmente); remove subs inválidas após 3 falhas |
| `telemetry` | opcional | Sink de `telemetry_logs` |
| `dependency-health` | GET público (stub fallback) · POST admin | Drift de dependências; pode disparar `workflow_dispatch` no GitHub |
| `run-audit` | ⚠️ sem JWT explícito | Varre `pg_policies` (RPC `exec_sql`); 403 se houver CRITICAL |
| `system-simulation` | ⚠️ sem auth de usuário | Chama outras functions com service role — bypass RLS. **Restringir por rede/env em produção** |
| `migrate-storage-paths` | JWT + `has_role('admin')` | Migra objetos de `{userId}/...` para `{tenantId}/{userId}/...`; atualiza URLs em `pagamentos`, `payment_history`, `contract_documents`, `supplier_documents` |
| `external-db-bridge` | JWT | Proxy CRUD/RPC genérico para banco externo · ⚠️ **sem allowlist de tabelas — superfície ampla** |
| `spot-proxy` | JWT + role `admin|coordinator|buyer` · 60 req/min · circuit breaker `spot-login` | Scraping SpotGifts (login, catálogo, carrinho, pedidos, checkout, financeiro) |

## Riscos conhecidos
- `system-simulation`, `run-audit`, `process-invoice-idp`: verificar `verify_jwt` no gateway (não versionado).
- `external-db-bridge`: falta allowlist / Zod → superfície ampla.
- `ai-supplier-risk`: fora de `FunctionContracts` — sem validação Zod.
- `spot-proxy`: `SpotProxyContract` existe mas não é usado — dívida técnica.
- Triggers duplicados em algumas tabelas — ver doc 04.
