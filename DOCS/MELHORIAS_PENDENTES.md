# Melhorias Pendentes — Auditoria Consolidada

**Data:** 2026-07-11
**Autor:** Back-End Senior (Claude Opus 4.8)
**Fontes cruzadas:** `DOCS/AUDITORIA_BACKEND.md`, `DOCS/SECURITY.md`, `DOCS/ENGINEERING_EXCELLENCE.md`, `supabase--linter` (execução ao vivo), grep no repositório e histórico das últimas rodadas de execução.

> **Nenhum código foi alterado nesta rodada.** Este documento é o *snapshot* do que ainda falta e serve como backlog priorizado para PRs subsequentes.

---

## 1. Sumário Executivo

| Status | Contagem | Severidade |
|---|---|---|
| ✅ Feito | 4 | (M-02 principal, RLS Tests, prefetch, índices) |
| 🟡 Parcial | 5 | (M-02 harnesses, M-05, M-06, Auth cross-check, `scripts/rls-audit`) |
| ❌ Pendente | 12 | (M-01, M-03, M-04, B-01…B-05, Outbox, Alerting, Tracing, Runbook) |

**Highlight:** O núcleo de produção está seguro. As pendências são de **hardening incremental, resiliência operacional e higiene de tooling interno** — não há vulnerabilidade crítica em aberto.

---

## 2. Tabela Mestre

| ID | Título | Categoria | Severidade | Status | Evidência | Esforço |
|---|---|---|---|---|---|---|
| M-01 | `SECURITY DEFINER` executável por anon/authenticated | Segurança | 🟡 Média | ❌ Pendente | Linter reporta **38 warnings** ativos (0028/0029) | M |
| M-02 | Header legado `x-tenant-id` | Segurança | 🟡 Média | 🟡 Parcial | Produção OK; **6 harnesses/tests internos ainda enviam** (ver §3) | P |
| M-03 | Particionamento de `audit_logs`/`telemetry_logs`/`security_logs` | Perf/DB | 🟡 Média | ❌ Pendente | Sem `PARTITION BY RANGE`; `cleanup_old_telemetry` cobre só 30d | G |
| M-04 | Triggers pesados síncronos (`handle_pedido_budget_realization`, `sync_budget_on_payment`, `auto_calculate_delivery_penalty`) | Perf/DB | 🟡 Média | ❌ Pendente | Nenhuma fila via `pg_net` implementada | G |
| M-05 | Rate-limit não uniforme em edge functions | Edge/Sec | 🟡 Média | 🟡 Parcial | Apenas `spot-proxy` e `punchout-receive` usam `checkRateLimit`; **28 outras funções sem cobertura** | M |
| M-06 | Idempotência de webhooks | Edge/Sec | 🟡 Média | 🟡 Parcial | Só `punchout-receive` deduplica; `erp-sync`, `spot-proxy` incoming, `scim-v2` sem `webhook_events` | M |
| B-01 | CORS `Allow-Origin: *` em produção | Segurança | 🔵 Baixa | ❌ Pendente | `_shared/security.ts:11` fixo em `*` | P |
| B-02 | HIBP (Leaked Password Protection) | Auth | 🔵 Baixa | ❓ Divergente | `SECURITY.md` diz ativo; `AUDITORIA_BACKEND` sugere ativar — **validar via `configure_auth`** | P |
| B-03 | `EXPLAIN ANALYZE` versionado das queries críticas | Perf | 🔵 Baixa | ❌ Pendente | Diretório `DOCS/perf/` inexistente | P |
| B-04 | CORS duplicado em handlers | Higiene | 🔵 Baixa | ❌ Pendente | Sem varredura exaustiva registrada | P |
| B-05 | `AbortController` com timeout em `fetch()` externo | Resiliência | 🔵 Baixa | ❌ Pendente | `rg AbortController supabase/` → **0 ocorrências** | M |
| INT-01 | Circuit breaker (Spot, Bitrix, XBZ) | Integrações | 🔵 Baixa | ❌ Pendente | Sem lib/utilitário `circuitBreaker.ts` | M |
| INT-02 | Retry exponencial (Bitrix, WhatsApp) | Integrações | 🔵 Baixa | ❌ Pendente | Ad-hoc onde existe | P |
| INT-03 | Reconciliação diária Banco Inter | Integrações | 🔵 Baixa | ❌ Pendente | Sem cron job | M |
| INT-04 | Quota tracking WhatsApp | Integrações | 🔵 Baixa | ❌ Pendente | — | P |
| INT-05 | Checkpoint incremental em `erp-sync` | Integrações | 🔵 Baixa | ❌ Pendente | Falha parcial reprocessa lote inteiro | M |
| INT-06 | **Outbox pattern** global outbound | Arquitetura | 🟡 Média | ❌ Pendente | Tabela `integration_outbox` não existe | G |
| OBS-01 | Alerting acionável (Slack/email) para `system_alerts.severity=HIGH` | Observabilidade | 🟡 Média | ❌ Pendente | Sem edge function `alert-dispatcher` | M |
| OBS-02 | Tracing distribuído com `x-request-id` fim-a-fim | Observabilidade | 🔵 Baixa | 🟡 Parcial | Já parcial em `responses.success`; falta persistir + propagar em RPCs | M |
| OPS-01 | Runbook de rollback por migração | Operacionalidade | 🔵 Baixa | ❌ Pendente | Nenhum `DOCS/RUNBOOKS/*` | P |
| OPS-02 | Auditoria de canais Realtime ociosos | Operacionalidade | 🔵 Baixa | ❌ Pendente | Sem inventário | P |
| TEST-01 | `scripts/rls-audit.ts` depende de RPC `exec_sql` inexistente | Testes/Sec | 🔵 Baixa | 🟡 Parcial | Script existe mas quebra em execução | P |
| TEST-02 | Secrets `RLS_TEST_USER_A/B` no CI | Testes/Sec | 🔵 Baixa | ❌ Pendente | Workflow `ci.yml` referencia mas não provisiona | P |
| TEST-03 | Testes de RLS cross-tenant | Testes | 🟡 Média | ✅ Feito | `tests-rls/rls-isolation.test.ts` no CI | — |

**Legenda de esforço:** P = <½ dia · M = 1–2 dias · G = >3 dias.

---

## 3. Detalhamento por Item Pendente / Parcial

### M-01 · `SECURITY DEFINER` executável por anon
- **O que falta:** `supabase--linter` reporta **38 warnings ativos** (era 36 na auditoria anterior — cresceu). Divergência com `DOCS/SECURITY.md` que diz “14 warnings”. Reconciliar allowlist.
- **Alvo:** revisar `pg_proc` filtrando `prosecdef = true` e cruzar com allowlist declarada em `SECURITY.md` (14 funções). Para todas as demais, aplicar:
  ```sql
  REVOKE EXECUTE ON FUNCTION public.<fn>(...) FROM anon;
  ```
- **Aceitação:** linter volta para ≤ 14 warnings (só a allowlist arquitetural).

### M-02 · Harnesses internos com `x-tenant-id` legado
- **Arquivos remanescentes:**
  - `scripts/stress-test.ts:17`
  - `supabase/functions/workflow-engine/fuzz.test.ts:17,56,69`
  - `supabase/functions/tests/integration_suite.ts:13`
  - `supabase/functions/tests/fuzzing_suite.ts:16`
  - `supabase/functions/system-simulation/index.ts:9,78`
  - `supabase/functions/_shared/integrity_test.ts:74`
- **Ação:** substituir por JWT válido de teste (usar `RLS_TEST_USER_A` do CI). O handler não aceita mais o header — esses testes só passam por acidente (a asserção `fuzz.test.ts:69` valida mensagem obsoleta).

### M-05 · Cobertura de rate-limit
- **Feito:** `spot-proxy`, `punchout-receive`.
- **Pendente crítico (endpoints públicos ou custosos):** `scim-v2`, `punchout-setup`, `external-db-bridge`, `webauthn-*`, `send-push-notification`, todas as `ai-*` (custo de token elevado), `process-invoice-idp`, `generate-contract-pdf`.
- **Padrão:** aplicar `await checkRateLimit({identifier: user.id ?? ip, endpoint: '<fn>', maxRequests, windowSeconds})` no topo do handler.

### M-06 · Idempotência de webhooks
- **Feito:** `punchout-receive`.
- **Pendente:** `erp-sync` (webhooks Bitrix/ERP), `scim-v2` (SCIM PUT/PATCH), `spot-proxy` (callbacks Spot), receivers de Banco Inter (quando existirem).
- **Padrão:** helper `checkIdempotency(source, key, bodyHash)` já pronto em `_shared/idempotency.ts`.

### B-01 · CORS allowlist por ambiente
- **Ação:** `_shared/security.ts` → derivar `Access-Control-Allow-Origin` de `Deno.env.get("ALLOWED_ORIGINS")` (CSV) com fallback `*` só em dev. Adicionar `Vary: Origin`.

### B-02 · HIBP divergência
- **Ação:** rodar `configure_auth` para confirmar `password_hibp_enabled = true` e alinhar docs (`SECURITY.md` vs `AUDITORIA_BACKEND.md`).

### B-05 · `AbortController` em fetches externos
- **Ação:** wrapper `fetchWithTimeout(url, opts, timeoutMs=10000)` em `_shared/http.ts`. Substituir todos `fetch(` para APIs externas em `spot-proxy`, `erp-sync`, `ai-*`, `fiscal-orchestrator`, `guided-buying-ai`, `process-invoice-idp`, `generate-contract-pdf`, `check-*`, `send-push-notification`.

### INT-06 · Outbox pattern
- **Escopo:** tabela `integration_outbox(id, target, payload, status, retries, next_attempt_at, created_at)` + worker (`cron` via `pg_net` ou edge function `process-outbox`) com backoff exponencial. Migrar Bitrix, Inter, WhatsApp, ERP outbound.

### OBS-01 · Alerting acionável
- **Escopo:** edge function `alert-dispatcher` triggerada por `AFTER INSERT ON system_alerts WHERE severity='HIGH'` via `pg_net`, entregando em Slack (`SLACK_WEBHOOK_URL`) e email (Resend). Dedupe por `alert_type` em janela de 15 min.

### OBS-02 · Tracing fim-a-fim
- **Ação:** middleware `withRequestId(req)` que gera/propaga `x-request-id`, persiste em `telemetry_logs.request_id` e passa como GUC (`SET LOCAL app.request_id = ...`) para RPCs.

### TEST-01 · `scripts/rls-audit.ts`
- Refatorar para consulta direta a `pg_policies` via `supabase.from('pg_policies')` com service-role (ou remover script, já coberto por `tests-rls/`).

### TEST-02 · Secrets do CI
- Provisionar `RLS_TEST_USER_A` e `RLS_TEST_USER_B` em GitHub Secrets. Enquanto ausentes, 5 testes cross-tenant ficam skipped.

### OPS-01 · Runbook de rollback
- Template `DOCS/RUNBOOKS/rollback-<migration>.md` gerado por script para cada nova migration com: `DROP`/`ALTER` reversos, dados a preservar, janela de risco.

---

## 4. Novos Achados desta Rodada

1. **Linter cresceu de 36 → 38 warnings** entre auditorias — investigar quais 2 funções novas caíram na regra 0028/0029.
2. **Divergência de contagem de warnings** entre `SECURITY.md` (14 aceitos) e linter atual (38) — a allowlist precisa ser reconciliada; possivelmente 24 funções deveriam ter tido `REVOKE EXECUTE FROM anon` e não tiveram.
3. **`fuzz.test.ts:69` afirma comportamento obsoleto** (`error mentions x-tenant-id`) — teste passa por asserção defasada, mascarando regressão silenciosa.
4. **`system-simulation/index.ts:9`** ainda declara `x-tenant-id` em `Access-Control-Allow-Headers` — vestígio de CORS que sugere ao cliente que o header é aceito.
5. **Zero uso de `AbortController` no repositório inteiro** (`supabase/` e `src/`) — risco de leak de conexões e travamentos silenciosos em outages de terceiros.
6. **`fuzz.test.ts` e `integration_suite.ts`** não são executados no CI (`.github/workflows/ci.yml` só chama `bunx vitest` e `system-simulation` remota) — cobertura fantasma.

---

## 5. Roadmap Priorizado

### 🔴 Onda 1 — Sprint atual (≤3 dias)
1. **M-02 residual** — limpar 6 harnesses/tests que ainda enviam `x-tenant-id` + remover header do CORS de `system-simulation`.
2. **M-01 reconciliação** — rodar `REVOKE EXECUTE ... FROM anon` para todas as funções fora da allowlist (SECURITY.md §3).
3. **B-02** — confirmar HIBP via `configure_auth` e sincronizar docs.
4. **TEST-02** — provisionar `RLS_TEST_USER_A/B` no GitHub Secrets.

### 🟡 Onda 2 — Próximas 2 sprints
5. **M-05 completo** — estender `checkRateLimit` para 12+ edge functions críticas.
6. **M-06 completo** — idempotência em `erp-sync`, `scim-v2`, receivers Inter.
7. **B-01** — CORS allowlist por env.
8. **B-05** — `fetchWithTimeout` universal + refactor.
9. **OBS-01** — `alert-dispatcher` para Slack/email.
10. **TEST-01** — corrigir `scripts/rls-audit.ts`.

### 🔵 Onda 3 — Backlog estratégico
11. **M-03** — particionamento mensal de logs + retenção diferenciada.
12. **M-04** — assincronizar triggers pesados via `pg_net`.
13. **INT-06** — outbox pattern global.
14. **INT-01/02/03/05** — circuit breaker, retries, reconciliação Inter, checkpoints ERP.
15. **OBS-02** — tracing distribuído com `x-request-id`.
16. **OPS-01/02** — runbooks de rollback + auditoria Realtime.
17. **B-03/B-04** — `EXPLAIN` versionado + varredura CORS duplicado.

---

## 6. Próximo Passo

Aprove uma ou mais **ondas** (ou itens específicos por ID) e eu abro as PRs correspondentes, uma por item, com migration + testes + docs atualizadas. Sugestão: começar por **Onda 1** — é a de menor risco e maior redução de dívida acumulada.
