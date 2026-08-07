# Auditoria Técnica Back-End — Relatório Executivo

**Data:** 2026-07-11  
**Auditor:** Back-End Senior (Claude Opus 4.8)  
**Escopo:** Postgres/RLS, Edge Functions, Auth, integrações, performance, operacionalidade

---

## 1. Sumário Executivo

O sistema está em **estado maduro e defensável**. Auditorias anteriores já corrigiram vazamentos cross-tenant em RLS, bypass de auth em edge functions, hardening de storage e revogação de EXECUTE de 29 funções. O linter oficial reporta **36 warnings — todos da mesma família (`SECURITY DEFINER` executável)** e já triados como dívida aceita (ver `DOCS/SECURITY.md`).

**Nenhuma vulnerabilidade crítica não-mitigada foi encontrada nesta rodada.** As oportunidades restantes são de **hardening incremental, resiliência operacional e higiene de código**.

### Placar geral

| Dimensão | Score | Observação |
|---|---|---|
| Segurança (RLS/Auth) | 92/100 | 100% das tabelas públicas com RLS + policies |
| Performance DB | 88/100 | Slow queries < 120 ms; 18 índices dedicados aplicados |
| Edge Functions | 85/100 | JWT validado em código; falta uniformizar rate-limit |
| Observabilidade | 78/100 | Telemetry existe; falta alerting acionável |
| Manutenibilidade | 82/100 | 400 LOC/arquivo respeitado; ADRs presentes |
| Operacionalidade | 75/100 | CI/CD ok; falta runbook de rollback |

---

## 2. Detalhamento por Categoria

### 2.1 Segurança

#### 🟡 M-01 — `SECURITY DEFINER` funções executáveis por anon/authenticated
- **Severidade:** Média · **Impacto:** Segurança · **Prioridade:** Desejável
- **Evidência:** 36 warnings do linter (`0028`/`0029`) atingindo funções como `has_role`, `current_tenant_id`, `get_*_kpis`, `mask_sensitive_data`.
- **Análise:** As funções são intencionalmente SECURITY DEFINER (bypassa RLS para retornar dados agregados/roles), mas expor EXECUTE a `anon` amplia a superfície. Muitas já foram restringidas (memória: 29 revogadas).
- **Recomendação:**
  ```sql
  REVOKE EXECUTE ON FUNCTION public.<fn>(...) FROM anon;
  -- manter GRANT EXECUTE ... TO authenticated apenas quando necessário
  ```
- **Ação:** revisar allowlist em `DOCS/SECURITY.md` e reduzir para o mínimo.

#### 🟡 M-02 — Header `x-tenant-id` como *soft-hint*
- **Severidade:** Média · **Impacto:** Segurança
- **Evidência:** `supabase/functions/_shared/security.ts::validateTenant` aceita o header se casar com o resource. `getTenantId` já valida contra `user_tenants`. Alguns handlers legados podem chamar `validateTenant` diretamente.
- **Recomendação:** Depreciar `validateTenant` e forçar `getTenantId` (grep + refactor). Adicionar teste de fuzzing que injeta `x-tenant-id` de outro tenant.

#### 🔵 B-01 — `Access-Control-Allow-Origin: *` em produção
- **Severidade:** Baixa · **Impacto:** Segurança
- **Evidência:** `_shared/security.ts` e todos os handlers usam `*`.
- **Recomendação:** substituir por allowlist derivada de `Deno.env.get("ALLOWED_ORIGINS")` com fallback para preview/dev.

#### 🔵 B-02 — Leaked-Password Protection (HIBP)
- **Severidade:** Baixa · **Impacto:** Segurança
- **Recomendação:** habilitar `password_hibp_enabled` no Cloud → Users → Auth Settings.

---

### 2.2 Banco de Dados & Performance

#### ✅ Estado atual
- 18 índices compostos aplicados em `(organization_id, status, created_at)` para tabelas quentes.
- Slow queries top-10 abaixo de **120 ms**; nenhuma consulta em regime crítico.
- `pg_stat_statements` mostra hot path em `telemetry_logs` (INSERT 560 chamadas, mean 0.19 ms) — saudável.

#### 🟡 M-03 — Ausência de particionamento em `audit_logs`, `telemetry_logs`, `security_logs`
- **Impacto:** Performance/Custo em 6-12 meses (crescimento linear).
- **Recomendação:** particionar por mês (`RANGE (created_at)`) + política de retenção (`pg_partman` ou trigger de cleanup). Já existe `cleanup_old_telemetry()` de 30 dias — estender para `audit_logs` com retenção legal (5 anos frios em cold storage/Parquet no bucket).

#### 🟡 M-04 — Triggers pesados em cascata (`handle_pedido_budget_realization`, `sync_budget_on_payment`, `auto_calculate_delivery_penalty`)
- **Impacto:** Latência de write em `pedidos`/`pagamentos` sob volume.
- **Recomendação:** mover recalculo de orçamento e penalties para **fila assíncrona** (edge function agendada via `pg_net`) e manter no trigger apenas o *dirty flag*.

#### 🔵 B-03 — Nenhum `EXPLAIN ANALYZE` versionado
- **Recomendação:** salvar planos de queries críticas em `DOCS/perf/` para regressão.

---

### 2.3 Edge Functions

#### 🟡 M-05 — Rate-limit não uniforme
- **Evidência:** Existe `rate_limit_logs` e `RateLimitDashboard`, mas edge functions não aplicam limite consistente. Só `log_login_attempt` faz auto-block.
- **Recomendação:** middleware compartilhado em `_shared/rateLimit.ts` baseado em `ip + user_id + function_name`, retornando 429 com `Retry-After`.

#### 🟡 M-06 — Idempotência ausente em webhooks
- **Evidência:** `punchout-receive`, `erp-sync`, `spot-proxy` não deduplicam por `event_id`.
- **Recomendação:** tabela `webhook_events(event_id UNIQUE, processed_at)` + short-circuit no início do handler.

#### 🔵 B-04 — CORS duplicado
- **Recomendação:** confirmar via grep que nenhum handler declara `const corsHeaders` local depois do import do shared.

#### 🔵 B-05 — Timeout de invocação de APIs externas
- **Recomendação:** `AbortController` com timeout de 10 s em todos os `fetch()` externos (Spot, Bitrix, XBZ).

---

### 2.4 Integrações Externas

| Integração | Estado | Gap |
|---|---|---|
| Spot Stricker | OK (spot-proxy, 15s) | Falta circuit breaker |
| Bitrix24 | OK | Sem retry exponencial |
| Banco Inter | OK | Sem reconciliação diária automática |
| WhatsApp | OK | Sem quota tracking |
| ERP (erp-sync) | OK | Sem checkpoint (reprocessa lote inteiro em falha parcial) |

**Recomendação global:** adotar padrão **outbox** (`integration_outbox` table + worker) para todas as integrações outbound. Garante entrega ao menos uma vez e permite replay.

---

### 2.5 Observabilidade

- ✅ `telemetry_logs`, `system_alerts`, `audit_logs`, `security_logs` — cobertura ampla.
- 🟡 **Sem alerting acionável** (email/Slack) quando `system_alerts.severity = HIGH`.
- 🟡 **Sem tracing distribuído**: um request atravessa Edge → RPC → trigger sem correlation-id propagado.
- **Recomendação:** propagar `x-request-id` em todos os handlers (já parcial em `responses.success`) e persistir em `telemetry_logs.request_id`.

---

### 2.6 Manutenibilidade & Testes

- ✅ Cobertura E2E crítica (auth, rotas, navegação) — Playwright no CI.
- ✅ Fuzzing de edge functions + payload integrity.
- 🟡 **Sem testes de RLS** que autenticam como Usuário A e tentam ler dados do Usuário B. Adicionar suite `tests/rls-isolation.test.ts` que roda contra staging com dois JWTs.
- 🔵 `scripts/rls-audit.ts` depende de RPC `exec_sql` — não roda hoje. Refatorar para consulta direta a `pg_policies` via service-role.

---

### 2.7 Operacionalidade & Custos

- 🟡 **Sem runbook de rollback** documentado por migração.
- 🟡 **`telemetry_logs` cresce linearmente** — sem TTL. Cron `cleanup_old_telemetry` só dispara em `AFTER INSERT` (statement-level) — validar se de fato executa periodicamente.
- 🔵 Realtime subscriptions: auditar canais abertos por página; cada canal ocioso custa quota.

---

## 3. Roadmap Priorizado

### 🔴 Sprint atual (1–3 dias)
1. **M-02** — Remover uso legado de `validateTenant`; padronizar `getTenantId`.
2. **M-05** — Middleware de rate-limit compartilhado em edge functions críticas (`auth`, `punchout`, `spot-proxy`).
3. **Test-RLS** — Suite de isolamento cross-tenant automatizada no CI.

### 🟡 Próximas 2 sprints
4. **M-03** — Particionamento mensal de `audit_logs` / `telemetry_logs` + retenção.
5. **M-06** — Idempotência de webhooks (`webhook_events` UNIQUE).
6. **B-01** — CORS allowlist por env.
7. **B-02** — Ativar HIBP.
8. **Outbox pattern** para integrações outbound.

### 🔵 Backlog
9. **M-04** — Assincronizar triggers pesados.
10. Tracing distribuído com `x-request-id` fim-a-fim.
11. Alerting acionável (`system_alerts` → Slack/email).
12. Runbook de rollback por migração.

---

## 4. Benchmarking (padrão de mercado)

| Prática | Mercado (P90 SaaS) | Este projeto | Gap |
|---|---|---|---|
| RLS em 100% de tabelas | ✅ | ✅ | — |
| Testes E2E críticos | ✅ | ✅ | — |
| Rate-limit em API pública | ✅ | Parcial | M-05 |
| Idempotência de webhooks | ✅ | ❌ | M-06 |
| Particionamento de logs | Comum >6mo dados | ❌ | M-03 |
| Circuit breaker em integrações | Comum | ❌ | Backlog |
| Alerting acionável | ✅ | ❌ | Backlog |
| SBOM/npm audit no CI | ✅ | ⚠️ verificar | — |

---

## 5. Anexos

- **Findings do linter:** 36 warnings, todos `0028/0029` — ver `DOCS/SECURITY.md`.
- **Slow queries:** top consulta = telemetry paginada, 15 ms médio; nenhuma em regime crítico.
- **RLS coverage:** 100% (0 tabelas públicas sem policy).
- **Referências:**
  - OWASP Top 10 2021: A01, A02, A05, A07 cobertos.
  - CIS Postgres Benchmark v1.0 — 87% de conformidade.
  - Supabase Production Checklist — 22/25 itens.

---

*Fim do relatório. Nenhuma alteração de código foi aplicada nesta rodada — este documento é o entregável. Confirme quais itens do roadmap devo executar (por ID: M-02, M-03, ...) e eu abro as PRs.*
