# Auditoria Back-End — v2 (Julho/2026)

> **Autor:** Time de Back-End Sênior · **Escopo:** Supabase (Postgres + Edge Functions) + integrações · **Base:** ~130 tabelas, 32 edge functions, ~200 policies RLS, ~120 SECURITY DEFINER, `pg_cron` orquestrado por `run_all_health_scans()`.
>
> Este documento **complementa** `DOCS/AUDITORIA_BACKEND.md` (v1) e `DOCS/MELHORIAS_PENDENTES.md`. Só lista o que ainda é **problema sistêmico**; achados já resolvidos nas Ondas 1–45 foram omitidos e referenciados quando necessário.

---

## 1. Sumário Executivo

| # | Achado | Severidade | Impacto | Prioridade |
|---|---|---|---|---|
| **A-01** | `external-db-bridge` sem allowlist de tabelas/RPCs nem Zod | 🔴 Alta | Segurança (SSRF/DB pivot) | Crítico |
| **A-02** | `system-simulation`, `run-audit`, `process-invoice-idp` sem `verify_jwt` explícito no gateway (dependem de config.toml não versionado) | 🔴 Alta | Segurança | Crítico |
| **A-03** | `ai-supplier-risk` fora de `FunctionContracts` — parsing manual sem Zod | 🟠 Média | Estabilidade / contrato | Importante |
| **A-04** | `process-invoice-idp` ainda **mockado** em produção | 🟠 Média | Funcional (fiscal) | Importante |
| **A-05** | `guided-buying-ai` responde por keyword — sem chamada real ao gateway | 🟠 Média | Funcional (IA) | Importante |
| **A-06** | Coexistência de policies legadas `organization_id = get_my_organization()` com as novas `tenant_in_my_group()` | 🟡 Baixa | Manutenibilidade | Desejável |
| **A-07** | Triggers duplicados em algumas tabelas (double-fire histórico) | 🟡 Baixa | Estabilidade / performance | Importante |
| **A-08** | 95 warnings 0028/0029 do linter (SECURITY DEFINER acessível) — **allowlist existe**, mas sem revisão trimestral formal | 🟡 Baixa | Segurança / governança | Desejável |
| **A-09** | Extensões em `public` (WARN 0014) — `btree_gist`, `pg_net`, `pg_cron` | 🟡 Baixa | Higiene de schema | Desejável |
| **A-10** | Idempotência de webhooks aplicada apenas em `punchout-receive` e `erp-sync` — outros webhooks (Slack callbacks, Resend bounces, Stripe se ativado) ficam sem proteção | 🟠 Média | Resiliência | Importante |
| **A-11** | `generate-contract-pdf` gera **HTML**, não PDF binário — nome enganoso, sem assinatura digital | 🟡 Baixa | Compliance / UX | Desejável |
| **A-12** | Retenção de `telemetry_logs`, `audit_logs`, `rate_limit_logs` — pruning existe via cron, mas **sem política formal LGPD** documentada por tabela | 🟠 Média | Compliance (LGPD) | Importante |
| **A-13** | `pg_cron` centralizado em `run_all_health_scans()` — sem circuit breaker: se uma sub-função trava, todo o batch atrasa | 🟡 Baixa | Observabilidade | Desejável |
| **A-14** | Falta de índice composto em `notifications(user_id, read_at, created_at DESC)` — query mais frequente do painel | 🟠 Média | Performance | Importante |
| **A-15** | `pgbouncer` transaction pooling + `SET LOCAL` em funções → risco silencioso de vazamento de GUC entre conexões | 🟠 Média | Correção / segurança | Importante |

**Recomendação estratégica:** priorizar **A-01, A-02, A-10, A-12, A-15** nas próximas 2 sprints; consolidar **A-06/A-07** em um "clean-up sprint" trimestral.

---

## 2. Detalhamento por Categoria

### 2.1 Segurança (OWASP · A01 Broken Access Control, A05 Security Misconfig, A08 Data Integrity)

#### A-01 · `external-db-bridge` — superfície aberta
**Problema.** A função aceita `{ table, op, filters, payload }` genéricos e executa contra um banco externo sem allowlist. Um usuário autenticado pode enumerar/mutar qualquer tabela.

**Evidência.** `supabase/functions/external-db-bridge/index.ts` — sem `z.enum` para `table`, sem lista branca.

**Impacto.** Escalada horizontal entre tenants do banco externo; possível pivot para DBs de outros clientes.

**Correção.**
```ts
// _shared/external-bridge-allowlist.ts
export const ALLOWED_TABLES = new Set([
  "produtos_externos", "fornecedores_externos", "spot_pedidos_view",
]);
export const ALLOWED_RPCS = new Set(["get_saldo_credito", "buscar_produto_por_sku"]);

// no handler
const Body = z.object({
  table: z.enum([...ALLOWED_TABLES] as [string, ...string[]]).optional(),
  rpc:   z.enum([...ALLOWED_RPCS]   as [string, ...string[]]).optional(),
  op:    z.enum(["select","insert","update","delete","call"]),
  filters: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  payload: z.record(z.unknown()).optional(),
}).refine(v => v.table || v.rpc, "table ou rpc obrigatório");
```
Adicionalmente: rate-limit por usuário + auditoria por chamada em `audit_logs`.

---

#### A-02 · Edges sem `verify_jwt` explícito
**Problema.** `run-audit`, `system-simulation`, `process-invoice-idp` — dependem do `verify_jwt = false` implícito e fazem checagem manual, mas o `supabase/config.toml` não é versionado (regra do platform).

**Correção.** Adicionar guarda dupla no início de cada handler:
```ts
const { user } = await getAuthUser(req);
if (!user) return responses.error("Unauthorized", 401);
// admin-only quando aplicável:
const { data: isAdmin } = await client.rpc("has_role", { _user_id: user.id, _role: "admin" });
if (!isAdmin) return responses.error("Forbidden", 403);
```
Considerar mover `system-simulation` para **cron interno** (chamado só por `pg_cron` com service role via `pg_net`), removendo endpoint público.

---

#### A-08 · Governança de SECURITY DEFINER
**Problema.** 95 warns 0028/0029 (linter). Memória do projeto marca como "esperados", mas não há processo formal de revisão.

**Correção.**
1. Criar view `public.security_definer_allowlist_v` derivada de comentário `COMMENT ON FUNCTION ... IS 'ALLOWLIST_SECURITY_DEFINER: <ticket>'`.
2. Cron trimestral que compara `pg_proc.prosecdef=true` × allowlist e abre alerta em `system_alerts` para o que estiver fora.

---

### 2.2 Persistência / Modelagem

#### A-06 · Policies legadas coexistentes
Muitas tabelas mantêm 2 policies: `organization_id = get_my_organization()` (legado) + `tenant_in_my_group(tenant_id)` (novo). Isso funciona (defesa em profundidade), mas **complica auditoria** e pode mascarar bugs (permissivo por OR).

**Correção.** Migration única:
```sql
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname='public'
      AND qual ILIKE '%get_my_organization()%'
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;
```
Rodar **em janela de manutenção** com script anterior de validação `tests-rls/rls-isolation.test.ts` estendido.

---

#### A-07 · Triggers duplicados
Diagnóstico:
```sql
SELECT c.relname, t.tgname, count(*)
FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
WHERE NOT t.tgisinternal
GROUP BY 1,2 HAVING count(*)>1;
```
Correção caso a caso — desabilitar (`ALTER TABLE ... DISABLE TRIGGER x_old`) antes de dropar.

---

#### A-14 · Índice ausente em `notifications`
Query real do painel:
```sql
SELECT * FROM notifications
WHERE user_id = $1 AND read_at IS NULL
ORDER BY created_at DESC LIMIT 20;
```
`EXPLAIN ANALYZE` provável: seq scan filtrado (mesmo com índice em `user_id`). Adicionar:
```sql
CREATE INDEX idx_notifications_user_unread
  ON public.notifications(user_id, created_at DESC)
  WHERE read_at IS NULL;
```
Índice parcial — pequeno e altamente seletivo.

---

### 2.3 Edge Functions / Integrações

#### A-03 · Contrato ausente em `ai-supplier-risk`
Adicionar ao `_shared/contracts.ts`:
```ts
export const SupplierRiskContract = z.object({
  supplier_id: z.string().uuid(),
  window_days: z.number().int().min(30).max(730).default(365),
});
```
E registrar em `FunctionContracts`.

#### A-04 / A-05 · Funcionalidades mock em produção
- `process-invoice-idp`: substituir mock por chamada real ao provedor de OCR/IDP (ex.: Azure Doc Intelligence, AWS Textract via edge). Se ainda não priorizado, **desabilitar botão no frontend** e marcar como "beta".
- `guided-buying-ai`: cablear ao `callAIGateway({ model: "google/gemini-2.5-flash" })` com system prompt de compras assistidas + histórico da conversa.

#### A-10 · Idempotência universal para webhooks
Padrão a aplicar em toda função pública que recebe callback externo:
```ts
const key = deriveIdempotencyKey(req, body);
const prev = await getIdempotentResponse("resend-bounce", key);
if (prev) return prev;
// ...processa
await recordIdempotentResponse("resend-bounce", key, response);
```

#### A-11 · Gerar PDF real
Trocar `generate-contract-pdf` por `deno.land/x/pdfkit` ou chamada a serviço externo (WeasyPrint via edge). Armazenar em `contract_documents` com hash SHA-256 + timestamp para trilha de auditoria.

---

### 2.4 Compliance & Governança de Dados

#### A-12 · Retenção formal (LGPD Art. 15/16)
Criar tabela `data_retention_policies`:
```sql
CREATE TABLE public.data_retention_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text UNIQUE NOT NULL,
  retention_days int NOT NULL CHECK (retention_days > 0),
  legal_basis text NOT NULL,               -- "consent", "legal_obligation", "legitimate_interest"
  anonymize_columns text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
GRANT SELECT ON public.data_retention_policies TO authenticated;
GRANT ALL    ON public.data_retention_policies TO service_role;
ALTER TABLE public.data_retention_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_only ON public.data_retention_policies
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'))
  WITH CHECK (has_role(auth.uid(),'admin'));
```
Cron diária lê essa tabela e executa `DELETE`/anonimização — em vez de valores hard-coded nas funções atuais.

---

### 2.5 Operacionalidade & Resiliência

#### A-13 · Orquestrador `run_all_health_scans()`
Se um scan (ex.: `scan_replication_lag`) trava por lock, todos os subsequentes atrasam. Correção:
```sql
CREATE OR REPLACE FUNCTION public.run_all_health_scans()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE fn text; started timestamptz;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'scan_cache_hit_ratio','scan_pool_saturation','scan_replication_lag',
    'scan_deadlocks','scan_invalid_indexes','scan_long_transactions'
  ] LOOP
    started := clock_timestamp();
    BEGIN
      EXECUTE format('SET LOCAL statement_timeout = %L', '30s');
      EXECUTE format('SELECT public.%I()', fn);
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO health_scan_runs(fn_name, status, error, duration_ms)
        VALUES (fn, 'error', SQLERRM, extract(ms from clock_timestamp()-started));
    END;
  END LOOP;
END $$;
```

#### A-15 · `SET LOCAL` sob transaction pooling
PgBouncer em modo transaction reutiliza conexões — `SET LOCAL` só vive na transação, mas `SET` (sem LOCAL) vaza. Auditar:
```sql
SELECT proname, prosrc FROM pg_proc
WHERE prosrc ~* '(^|[^_])SET\s+(?!LOCAL)';
```
Substituir todo `SET search_path = public` por `SET LOCAL search_path = public` **dentro** do corpo, ou usar cláusula `SET` no `CREATE FUNCTION` (que é escopo-função — ideal).

---

## 3. Roadmap Priorizado

### Sprint 1 (crítico — 1 semana)
- A-01 Allowlist `external-db-bridge`
- A-02 Guarda dupla em edges sem `verify_jwt`
- A-14 Índice parcial `notifications`
- A-15 Auditoria `SET` vs `SET LOCAL`

### Sprint 2 (importante — 2 semanas)
- A-10 Idempotência universal em webhooks
- A-12 `data_retention_policies` + cron único
- A-03 Contrato `SupplierRiskContract`
- A-04 / A-05 Roadmap para desmockar IDP e Guided-Buying

### Sprint 3 (higiene — 2 semanas)
- A-06 Remover policies legadas `organization_id`
- A-07 Consolidar triggers duplicados
- A-11 PDF real de contratos
- A-13 Isolar scans no orquestrador
- A-08 / A-09 Governança de SECURITY DEFINER + mover extensões

---

## 4. Benchmarking

| Dimensão | Estado atual | Padrão mercado (SaaS multi-tenant) | Gap |
|---|---|---|---|
| RLS coverage | 100 % tabelas `public` | 100 % | ✅ |
| Rate-limit | Postgres RPC + fail-open | Redis/Upstash + fail-closed | 🟡 fail-open pode virar bypass sob carga |
| Idempotência | 2/32 funções | 100 % dos webhooks | 🔴 |
| Observabilidade | `health_scan_runs`, `system_alerts`, dispatcher (Slack/Email/Webhook) | + APM (Sentry, Datadog) | 🟡 falta APM cliente-servidor |
| Circuit breaker | ai-gateway, spot-login | Todo I/O externo | 🟡 |
| Governança IAM | `user_roles` + `has_role` | + revisão trimestral automatizada | 🟡 |
| LGPD retention | pruning ad-hoc | política declarativa + trilha | 🔴 |
| Testes RLS | `tests-rls/rls-isolation.test.ts` | + fuzz por policy | 🟡 |

---

## 5. Referências

- OWASP Top 10 2021 · A01, A05, A08 · https://owasp.org/Top10/
- Supabase Database Linter · https://supabase.com/docs/guides/database/database-linter
- PgBouncer & `SET LOCAL` · https://www.pgbouncer.org/faq.html#how-to-use-prepared-statements-with-transaction-pooling
- LGPD Art. 15/16 · https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm

---

**Este relatório é diagnóstico.** As correções listadas ainda não foram aplicadas — cada Sprint deve virar uma "Onda" de execução com PR/migration próprio, seguindo o padrão já estabelecido no projeto.
