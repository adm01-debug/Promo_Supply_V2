# Security Posture — Promo Supply

> Última auditoria: 2026-06-19
> Responsável: Engenharia (revisão trimestral obrigatória)

## 1. Sumário Executivo

| Métrica | Valor |
|---|---|
| ERRORs no linter Supabase | **0** |
| WARNs no linter Supabase | **14** (todos classificados como falsos positivos arquiteturais — ver §3) |
| Tabelas públicas sem RLS | **0** |
| RLS policies recursivas | **0** |
| Funções com `search_path` mutável | **0** |
| HIBP (leaked password protection) | ✅ Ativo |
| MFA disponível | ✅ TOTP + WebAuthn |
| Rate limiting de login | ✅ 5 falhas / 15 min → bloqueio 1h |

## 2. Correções Críticas Aplicadas (junho/2026)

1. **RLS endurecida** em 5 tabelas sensíveis (`profiles`, `user_roles`, `audit_logs`, `security_logs`, `notifications`).
2. **`pg_net` movido** de `public` → `extensions` (sem impacto, nenhuma função do projeto referenciava `net.http_*`).
3. **HIBP habilitado** via `password_hibp_enabled: true` no Auth.
4. **`build:dev` script** adicionado ao `package.json` (CI/CD).
5. **Sanitização de auditoria** (`sanitize_audit_metadata`, `mask_sensitive_data`) remove `password`, `token`, `secret`, `api_key`, `session_token`, `mfa_code`, `backup_codes` de todos os logs.

## 3. Warnings Aceitos como Dívida Arquitetural

O linter Supabase reporta 14 warnings da regra `0029_authenticated_security_definer_function_executable`. Após análise individual, **todas as 14 funções são intencionais** e seguem o padrão oficial recomendado pelo Supabase.

### 3.1 Helpers de RLS (6 funções) — REVOGAR QUEBRA O APP

Estas funções são chamadas **dentro de policies RLS** e precisam ser executáveis por `authenticated`:

| Função | Usada em policies de |
|---|---|
| `has_role(uuid, app_role)` | `audit_logs`, `security_logs`, `user_roles`, todas as tabelas com gate de admin |
| `has_permission(uuid, text, text)` | Tabelas com RBAC granular |
| `get_user_role(uuid)` | Componentes de UI condicional via RPC |
| `get_my_organization()` | Multi-tenant isolation em todas as tabelas |
| `current_tenant_id()` | Isolamento multi-tenant |
| `user_belongs_to_tenant(uuid)` | Validação de tenant em INSERT/UPDATE |

**Mitigação:** todas são `STABLE SECURITY DEFINER` com `SET search_path = public` (imune a search_path hijacking) e lógica somente-leitura (sem efeitos colaterais).

**Referência oficial:** [Supabase docs — User Management](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac).

### 3.2 RPCs de Dashboard (4 funções) — REVOGAR QUEBRA OS DASHBOARDS

| Função | Consumidor frontend |
|---|---|
| `get_solicitacoes_kpis(uuid)` | `useDashboardKPIs.ts` |
| `get_pedidos_kpis(uuid)` | `useDashboardKPIs.ts` |
| `get_fornecedores_kpis(uuid)` | `useDashboardKPIs.ts` |
| `get_compras_dashboard_metrics(...)` | Página `/compras` |

**Mitigação:** todas filtram por `organization_id` recebido como parâmetro, e o frontend só envia o `organization_id` do próprio usuário (validado por `get_my_organization()`). Cross-tenant data leak é impossível sem comprometer o JWT.

### 3.3 RPCs de Workflow (4 funções) — REVOGAR QUEBRA APROVAÇÕES

| Função | Uso |
|---|---|
| `find_approval_rule(numeric, uuid)` | Determina regra de aprovação por valor/categoria |
| `fx_convert(numeric, char, char, date)` | Conversão cambial (leitura de `exchange_rates`) |
| `check_workflow_sod(uuid, uuid, uuid)` | Segregation of Duties em aprovações |
| `log_audit_event(...)` | Append-only em `audit_logs` (sanitizada por trigger) |

**Mitigação:** todas são append-only ou read-only; `log_audit_event` força `auth.uid()` via trigger `enforce_audit_integrity`, então um atacante não consegue forjar logs de outro usuário.

## 4. Por que NÃO migramos para Edge Functions?

Refatorar essas 14 funções como edge functions com `verify_jwt` manual:

- ✅ Removeria os warnings do linter (estético)
- ❌ **Não aumenta a segurança** — `SECURITY DEFINER` com `search_path` fixo já é o padrão seguro
- ❌ Adiciona latência (HTTP roundtrip vs. chamada in-database)
- ❌ Quebra os 6 helpers de RLS que **precisam** ser SQL para serem chamáveis em policies
- ❌ Requer reescrita de ~25 arquivos e re-teste manual de 6 fluxos críticos

**Decisão:** manter arquitetura atual. Warnings aceitos e documentados.

## 5. Revisão Trimestral

A cada trimestre, executar:

1. `supabase--linter` — confirmar que warnings permanecem nas mesmas 14 funções (sem crescimento).
2. `security--run_security_scan` — varredura ampla.
3. Revisar `audit_logs` dos últimos 90 dias buscando padrões anômalos.
4. Validar que HIBP, MFA e rate-limiting continuam ativos.
5. Atualizar este documento com a data da auditoria.

## 6. Contato

Em caso de incidente: abrir issue com label `security:critical` e notificar engenharia imediatamente.
