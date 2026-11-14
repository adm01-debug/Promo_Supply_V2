# 🎯 AUDITORIA TÉCNICA — Promo Supply V2 (20 dimensões)

> **Aplicação real do arsenal** `docs/arsenal-auditoria/PROMPT_AUDITORIA_SISTEMA_v2.md` no próprio sistema.
> **Alvo:** `main` `7b270fb9` · **Data:** 2026-11-14 · **Evidência:** arquivo:linha / query / comando (regra 1 do arsenal).

---

## Fase 0 — Inventário

| Item | Valor | Evidência |
|---|---|---|
| Repo | `adm01-debug/Promo_Supply_V2`, branch `main` | `git ls-remote origin HEAD` → `7b270fb9` |
| Front | React + TypeScript (Vite), ~117.033 linhas TS/TSX | `find src ( -name "*.ts" -o -name "*.tsx" ) \| xargs wc -l` |
| Rotas | 57 `<Route>` em `src/routes/AppRoutes.tsx` | `grep -c "<Route"` |
| Banco | Supabase Postgres `lmypcdfsrgfftzhxawao` | `docs/prod-readiness.md` §3 |
| Tabelas | 156 públicas com RLS + policy | `docs/prod-readiness.md` §3.3 |
| Migrations | 302 arquivos SQL (~24.289 linhas) | `ls supabase/migrations/*.sql \| wc -l` |
| Edge functions | 39 pastas; 37 publicadas | `ls supabase/functions/` + Management API (`docs/prod-readiness.md` §4) |
| Linhas edges | ~12.982 | `find supabase/functions -name "*.ts"` |
| Workflows | 8 | `ls .github/workflows/*.yml` |
| Testes Vitest | 111 arquivos; 2.311 passed / 12 skipped na `main` `53f69f3` | `docs/prod-readiness.md` §10 |
| E2E | 7 spec Playwright; 30 passed | `ls tests-e2e/` + `docs/prod-readiness.md` §10 |
| Última auditoria | `docs/prod-readiness.md` (2026-11-13) — linha de base | relatório-mãe |

---

## Fase 1 — 20 dimensões (nota + evidência + gap + ação)

### 1. ARQUITETURA — **6**
- Migração feature-based parcial (ADR `DOCS/ADR/0001-feature-based-architecture.md`); `src/hooks/` 61 soltos na raiz; 257 componentes em 23 subpastas (`docs/agentes/mapa-repo.md`).
- 3 lockfiles (`bun.lock`, `bun.lockb`, `package-lock.json`); `scripts/ci/` e `scripts/inventario/` sem README (mapa-repo.md).
- Gap: posts de ADRs novos, consolidar hooks e lockfiles. 10/10 exige zero acoplamento indevido + decisões registradas.

### 2. AUTENTICAÇÃO — **8**
- Supabase Auth + WebAuthn (passkeys: `webauthn-register`/`webauthn-authenticate` no ar), lockout (`account_lockouts`, 4 linhas), `is_account_locked` testado com anon (§3.1).
- `getAuthUser` valida JWT servidor (`supabase/functions/_shared/security.ts:199-210`, `auth.getUser(token)`).
- Gap: `client as any` em `security.ts:197`; rate-limit/login auditado no `login_attempts` (107 linhas). 10/10: refresh transparente + MFA amplo.

### 3. AUTORIZAÇÃO — **6**
- RLS 156/156 com policy; 35 `tenant_isolation_*` RESTRICTIVE; 8 SECURITY DEFINER anon intencionais (§3.1).
- **P0:** `has_role(uuid, app_role)` executável por anon — GRANT em `supabase/migrations/20260711152814...sql:20` e `20260531123936...sql:28`, função em `20260805160000_fix_frontend_comms.sql:35`; mantida porque usada em policy (§3.1, BLOQUEADO).
- **P0:** `process-solicitacao-neural` chamada em `src/components/compras/NovaSolicitacaoModal.tsx:113` e `src/pages/admin/DeveloperDocs.tsx:44`, mas sem pasta em `supabase/functions/` (§4 — fio cortado).
- Gap: remover exposição de `has_role` a anon reescrevendo policies; decidir `process-solicitacao-neural`.

### 4. BANCO DE DADOS — **7**
- 302 migrations versionadas; 76 arquivos com `CREATE INDEX`; `a_fill_tenant_id` ×37; 157 `SECURITY DEFINER` (9 anon intencionais pós-#54).
- **P0:** sem ledger de migrations — `supabase_migrations.schema_migrations` inexistente (§3.2); baseline exige decisão do dono.
- **P1:** mojibake em `sourcing_event_lots.nome` (6 linhas — DML prod, §9.8).
- Gap: ledger + baseline; moeda `character(3)` já corrigida (§10).

### 5. CI/CD — **8**
- 8 workflows; `main.yml` roda lint+typecheck+vitest+deno+e2e; `guards.yml` (530 checks) com `bun audit --production` e varredura de `service_role` no bundle; `types-sync.yml:194` gera tipos no pipeline; `docs/ci/README.md` é projeção de bloco YAML validada por `--check`.
- **P1:** `main.yml` sem `permissions:` explícitas (numeração linha 20/56/91 do advisory). Sem branch protection no repo (404) — decisão do dono.
- Gap: `permissions:` mínimas; (dono) branch protection.

### 6. DATA INTEGRITY — **7**
- Guard de encoding cobre acento corrompido/U+FFFD (PR #67, 528/528 guards).
- **P1:** mojibake `sourcing_event_lots.nome` (§9.8); sanitização XSS em `spot-proxy` (4 `innerHTML`, gancho code scanning high 658–755 — **NÃO VERIFICADO** o trecho nesta sessão, contagem por grep).
- Gap: corrigir mojibake (DML prod, aval); revisar `innerHTML`.

### 7. DOCUMENTAÇÃO — **7**
- `docs/agentes/*` (8 arquivos), `docs/contexto/` (gerado), `DOCS/` (ARCHITECTURE_GUIDE, SECURITY, ADR ×2, RUNBOOKS).
- Duplicidade resolvida (Etapa 15): `DOCS/conventions/pages-directory.md` removida; path único `docs/conventions/pages-directory.md`.
- Gap: deduplicar; atualizar números (mapa-repo cita 39 pastas; inventário 37 publicadas).

### 8. TIPAGEM — **8**
- `tsconfig.app.json`/`tsconfig.json`: strict + strictNullChecks + noImplicitAny → true (medido).
- `src/integrations/supabase/types.ts` gerado por `types-sync.yml:194` (front).
- Gap: `: any` residual em `_shared/security.ts:197,213,218` e ~38 usos nas edges.

### 9. VALIDAÇÃO — **7**
- `zod` ^4.6.7 em produção (guards `bun audit --production` 0 high/critical medido em 2026-11-14).
- 42 arquivos de edges usam `verifyJWT`/`createClient`; CORS/auth/tenant centralizados em `_shared/security.ts`.
- **P1:** edges `ai-*` + `spot-api` + `migrate-helper` em 500 por credencial ausente (§4, §9) — dono.
- Gap: completar credenciais; validar payloads com schema nas edges.

### 10. TESTES — **8**
- 2.311 Vitest passed / 12 skipped; `tests-rls/rls-isolation.test.ts`; 7 specs E2E (30 passed na main `53f69f3`, §10).
- Gap: RLS no CI é no-op sem secrets (`AGENTS.md` Banco) — decidir com dono se liga.

### 11. SEGURANÇA — **5**
- **P0:** `verifyCronSecret` **fail-open** — sem `CRON_SECRET` retorna `null` (autoriza) com só warning (`security.ts:252-258`); qualquer um com anon dispara `alert-dispatcher`/`check-*`/`weekly-report` (§9.4).
- **P0:** `has_role` anon (§3) e `process-solicitacao-neural` fantasma (§4).
- **P1:** 4 `innerHTML` em `spot-proxy`; credenciais ausentes deixam edges no ar em 500; lixo comitado na raiz (2 dumps TXT + PNG, mapa-repo); token Vercel vazado a girar (§9).
- Gap: endereçar P0; hardening do CI (`permissions:`); limpeza de raiz.

### 12. LOGGING — **6**
- `_shared/logger.ts`, edge `telemetry`, `telemetry_logs` particionadas.
- Gap: stack-trace exposure nas edges `_shared`/`migrate-*` (advisory medium ×5) a auditar.

### 13. OBSERVABILIDADE — **6**
- `health-dashboard`, `inventario/estado/edges.json` (37 edges com segredos lidos e chamadores), `dependency-health` edge.
- Gap: `inventario/estado/banco.json` ausente (falta `SUPABASE_ACCESS_TOKEN` — mapa-repo).

### 14. LÓGICA DE NEGÓCIO — **7**
- **P2:** 67 elementos clicáveis sem ação (triagem §5.1 — decisão de negócio); card fictício `AISupplierSuggestion`; métricas fixas do dashboard executivo; `DeliveryCalendar` nunca renderizado.
- Gap: triagem do dono para ligar ou remover affordances.

### 15. MANUTENIBILIDADE — **7**
- Scripts raiz fora de convenção (`rls-audit.ts`, `stress-test.ts`…); `scripts/ci`/`inventario` sem README; 3 lockfiles (mapa-repo).
- Gap: mover scripts para pastas-convenção; unificar lockfiles.

### 16. OPERACIONALIDADE — **6**
- Crons no Vault OK (`edge_invoke_service_key`); `outbox-worker-1min` → 200; `xbz-sync-pedidos-30min` 404→200; `spot-api-sync-stock` → 500 `SPOT_API_ACCESS_KEY não configurada` (§2).
- Gap: credenciais Spot/LOVABLE/MIGRATE_HELPER (dono).

### 17. PERFORMANCE — **7**
- 76 arquivos com índices; `mv_dashboard_kpis` fechada a anon (#41/#52); `db-explain-analyze.ts` presente.
- Gap: pooler não medido (NÃO VERIFICADO — sem MCP de query nesta sessão); EXPLAIN de top queries como rotina.

### 18. QUALIDADE DE CÓDIGO — **8**
- ESLint 0 erros, typecheck 0, guards 530/0, Deno 36/0, build 0 (main `53f69f3`, §10).
- Gap: `: any` residual; tooling de build em `dependencies` (deveria ser devDep — §9/backlog).

### 19. OPERAÇÕES — **6**
- Deploy Vercel automático por merge em `main` (prod-readiness §8.3: `GET /` → 200); 37 edges no ar.
- Gap: backup/restore testado (NÃO VERIFICADO — depende do dono); rollback documentado na prática.

### 20. INFRA/DEVOPS — **6**
- Vercel + Supabase Cloud; Docker Swarm/Cloudflare citados no goal mas **sem evidência no repo** (NÃO VERIFICADO).
- **P1:** fila de Actions lenta/custo (repo privado cobra minutos — `AGENTS.md`); `permissions:` no `main.yml`.

---

## Fase 2 — Scorecard + nota

| # | Dimensão | Peso | Nota | # | Dimensão | Peso | Nota |
|---|---|---|---|---|---|---|---|
| 1 | Arquitetura | ×2 | 6 | 11 | Segurança | ×3 | 5 |
| 2 | Autenticação | ×3 | 8 | 12 | Logging | ×1 | 6 |
| 3 | Autorização | ×3 | 6 | 13 | Observabilidade | ×1 | 6 |
| 4 | Banco de Dados | ×2 | 7 | 14 | Lógica de Negócio | ×1 | 7 |
| 5 | CI/CD | ×1 | 8 | 15 | Manutenibilidade | ×1 | 7 |
| 6 | Data Integrity | ×3 | 7 | 16 | Operacionalidade | ×1 | 6 |
| 7 | Documentação | ×1 | 7 | 17 | Performance | ×1 | 7 |
| 8 | Tipagem | ×2 | 8 | 18 | Qualidade de Código | ×1 | 8 |
| 9 | Validação | ×2 | 7 | 19 | Operações | ×1 | 6 |
| 10 | Testes | ×2 | 8 | 20 | Infra/DevOps | ×1 | 6 |

**Nota ponderada:** soma = ×3(8+6+7+5)=78 · ×2(6+7+8+7+8)=72 · ×1(8+7+6+6+7+7+6+7+8+6+6)=74 → 224 / pesos 33 → **6,8/10**.

## Top 10 ações por ROI

| # | Ação | Dimensão | Criticidade | Onda |
|---|---|---|---|---|
| 1 | Fail-closed `verifyCronSecret` (`security.ts:252`) | Segurança | P0 | 🔴 Quick |
| 2 | Remover exposição de `has_role` a anon (reescrever policies) | Autorização | P0 | 🔴 Quick |
| 3 | Decidir edge `process-solicitacao-neural` (criar ou remover chamada) | Segurança | P0 | 🔴 Quick |
| 4 | `permissions:` em `main.yml` (3 alerts) | CI/CD | P1 | 🔴 Quick |
| 5 | Corrigir mojibake `sourcing_event_lots.nome` (DML prod, aval) | Data Integrity | P1 | 🔴 Quick |
| 6 | Criar ledger de migrations + baseline | Banco | P1 | 🟠 Sprint 1 |
| 7 | Completo de credenciais (LOVABLE/SPOT/MIGRATE_HELPER) — dono | Operacionalidade | P1 | 🟠 Sprint 1 |
| 8 | Sanear `innerHTML` no `spot-proxy` (confirmar vetores) | Segurança | P1 | 🟠 Sprint 1 |
| 9 | Limpar lixo da raiz (.txt/PNG) — aval deleção | Segurança | P2 | 🟠 Sprint 1 |
| 10 | `inventario/estado/banco.json` (secret `SUPABASE_ACCESS_TOKEN`) | Observabilidade | P2 | 🟡 Sprint 2 |

## Roadmap em ondas

- 🔴 **Quick Wins (1–3 d):** ações 1–5 (3 e 5 exigem aval)
- 🟠 **Sprint 1 (1–2 sem):** ações 6–9 (7 exige dono)
- 🟡 **Sprint 2 (2–4 sem):** ação 10 + 67 cliques + stack-trace exposure + DR/restore
- 🟢 **Backlog:** tooling build→devDep; deduplicar docs; ADRs novos; unificar lockfiles; pooler medido

## NÃO VERIFICADO (com motivo)

- **Trecho `spot-proxy` 658–755:** contagem de `innerHTML` (4) por grep, sem leitura do código nesta sessão; vetores reais pendentes.
- **Pooler/EXPLAIN de top queries:** sem MCP de query no Supabase nesta sessão — não medido.
- **Docker Swarm/Cloudflare Workers:** citados no goal, sem material no repo — infra fora do repositório.
- **Backup/restore testado:** sem evidência no repo — depende do dono.
- **Ping/publish atual das 37 edges:** baseado em `docs/prod-readiness.md` (2026-11-13) e `inventario/estado/edges.json` (gerado 2026-11-09), não re-executado hoje.
---

# 🗂️ PLANO DE CORREÇÃO — Promo Supply V2 (1 etapa = 1 PR)

> Gerado da auditoria (`AUDITORIA_SISTEMA_PROMO_SUPPLY.md`). Ordem: P0 → dependência → menor esforço.
> Toda etapa tem critério binário. Regras: diff mínimo, 1 PR por etapa, evidência na PR.

## Tabela-resumo

| # | Etapa | Dimensão | Tipo | Esforço | Impacto | Onda |
|---|---|---|---|---|---|---|
| 1 | Fail-closed do CRON_SECRET | Segurança | Código | Baixo | Alto | 🔴 |
| 2 | Permissões mínimas em main.yml | CI/CD | Config | Baixo | Médio | 🔴 |
| 3 | Sanear XSS spot-proxy | Segurança | Código | Médio | Alto | 🔴 |
| 4 | Limpar `.env`/PNG/dumps da raiz | Segurança | Processo/Segredo | Baixo | Médio | 🔴 |
| 5 | Remover `: any` das edges/_shared | Tipagem | Código | Baixo | Baixo | 🔴 |
| 6 | Ledger de migrations (baseline) | Banco | Migration/Doc | Médio | Alto | 🟠 |
| 7 | Mojibake sourcing_event_lots.nome | Data Integrity | Migration/DML | Baixo | Alto | 🟠 |
| 8 | Credenciais LOVABLE/SPOT/MIGRATE_HELPER | Operacionalidade | Processo/Secret | — | Alto | 🟠 (dono) |
| 9 | Reescrever policies has_role | Autorização | Migration | Médio | Alto | 🟠 (arquitetura) |
| 10 | process-solicitacao-neural: criar ou remover | Segurança | Código | Médio | Médio | 🟠 (decisão) |
| 11 | 67 cliques sem ação (triagem negócio) | Lógica | Código/Front | Alto | Médio | 🟡 (dono) |
| 12 | stack-trace exposure edges | Logging | Código | Médio | Baixo | 🟡 |
| 13 | banco.json (SUPABASE_ACCESS_TOKEN) | Observabilidade | Config | Baixo | Baixo | 🟡 (dono) |
| 14 | Tooling build → devDependencies | Qualidade | Config | Médio | Baixo | 🟢 |
| 15 | Deduplicar docs (pages-directory) | Doc | Documentação | Baixo | Baixo | 🟢 |

---

## Etapas binárias

### Etapa 1 — Fail-closed do CRON_SECRET
- **Dimensão:** Segurança
- **Gap:** `verifyCronSecret` retorna null sem secret (`supabase/functions/_shared/security.ts:252-258`)
- **Tipo:** Código
- **Arquivos:** `supabase/functions/_shared/security.ts` + edges que já chamam (alert-dispatcher, check-*, weekly-report)
- **Passos:**
  1. Substituir o `if (!secret) return null` por retorno 503 `CRON_SECRET not configured`
  2. (Opcional) ligar CRON_SECRET nos crons do banco — requer decisão do dono
- **Critério:** `grep -n 'CRON_SECRET not configured' _shared/security.ts` mostra fail-closed; CI typecheck passa; `gh run view` verde no main.yml
- **Esforço:** Baixo · **Impacto:** Alto · **Depende de:** —

### Etapa 2 — Permissões mínimas em main.yml
- **Dimensão:** CI/CD
- **Gap:** sem `permissions:` em `.github/workflows/main.yml` (linhas 20/56/91)
- **Tipo:** Config
- **Arquivos:** `.github/workflows/main.yml`
- **Passos:**
  1. Adicionar `permissions:` no nível workflow: `contents: read`
  2. Conceder por job apenas o mínimo (e.g. `actions: read` onde precisar)
- **Critério:** `actionlint .github/workflows/main.yml` sem erro; `gh run view` verde
- **Esforço:** Baixo · **Impacto:** Médio

### Etapa 3 — Sanear XSS spot-proxy
- **Dimensão:** Segurança
- **Gap:** 4 usos de `innerHTML` no spot-proxy, code scanning high (linhas 658–755)
- **Tipo:** Código
- **Arquivos:** `supabase/functions/spot-proxy/index.ts`
- **Passos:** revisar cada `innerHTML`; substituir por construção segura ou validar é escape de HTML externo
- **Critério:** code scanning re-run sem high; `deno test supabase/functions/` passa
- **Esforço:** Médio · **Impacto:** Alto

### Etapa 4 — Limpar lixo da raiz
- **Dimensão:** Segurança
- **Gap:** `.env`-like, PNG `System.Drawing...`, dumps TXT com PII commitados na raiz
- **Tipo:** Processo
- **Arquivos:** raiz do repo
- **Passos:** deletar via PR branch própria; validar que não é referenciado
- **Critério:** `git ls-tree HEAD -- *.txt,*.env,*.png` sem os arquivos; `gh run view` verde
- **Esforço:** Baixo · **Impacto:** Médio · **Requires aval do dono (deleção)**

### Etapa 5 — Remover `: any` edges/_shared
- **Dimensão:** Tipagem
- **Gap:** `security.ts:197,213,218` e ~38 usos em edges
- **Tipo:** Código
- **Arquivos:** `supabase/functions/_shared/*.ts` e edges
- **Passos:** tipar `SupabaseClient`, `User`, membros de membership
- **Critério:** `deno check` ou `tsc --noEmit` limpo; sem `: any`
- **Esforço:** Baixo · **Impacto:** Baixo

### Etapa 6 — Ledger de migrations (baseline)
- **Dimensão:** Banco de Dados
- **Gap:** `supabase_migrations.schema_migrations` inexistente (prod-readiness §3.2)
- **Tipo:** Migration/Documentação
- **Arquivos:** `supabase/migrations/x_baseline.sql` (nova) + `docs/prod-readiness.md`
- **Passos:**
  1. Definir baseline do estado atual do banco (schema real)
  2. Registrar migration vazia ou tabela de ledger rastreando as 302
- **Critério:** `supabase db push` sem diffs inesperados; grava na tabela nova
- **Esforço:** Médio · **Impacto:** Alto · **Requires decisão do dono (baseline)**

### Etapa 7 — Mojibake `sourcing_event_lots.nome`
- **Dimensão:** Data Integrity
- **Gap:** 6 linhas com encoding corrompido
- **Tipo:** Migration/DML
- **Arquivos:** `supabase/migrations/x_fix_mojibake.sql` + confirmação de valores corretos
- **Passos:**
  1. SELECT para listar valores corrompidos (backup)
  2. UPDATE com valores corretos (DML prod — requer aval)
- **Critério:** `SELECT nome FROM sourcing_event_lots WHERE nome ~ '[^\x20-\x7E]'` retorna 0 (ou acentos corretos)
- **Esforço:** Baixo · **Impacto:** Alto · **Requires aval do dono (DML prod)**

### Etapa 8 — Credenciais LOVABLE/SPOT/MIGRATE_HELPER
- **Dimensão:** Operacionalidade
- **Gap:** edges com 500 no ar por falta de secret (prod-readiness §4)
- **Tipo:** Processo
- **Passos:** dono informa valores; gravar em secrets das edges via Management API
- **Critério:** ping na edge → 200
- **Esforço:** — · **Impacto:** Alto · **Requires aval do dono**

### Etapa 9 — Reescrever policies has_role
- **Dimensão:** Autorização
- **Gap:** `has_role(uuid, app_role)` executável por anon (3 GRANT) usada em policies
- **Tipo:** Migration
- **Arquivos:** migrations novas de policy
- **Passos:** substituir chamadas em policies por tabela de membership direta; revogar GRANT anon
- **Critério:** anon → `permission denied for function has_role`; testes RLS negativos passam
- **Esforço:** Médio · **Impacto:** Alto · **Requires decisão de arquitetura (dono)**

### Etapa 10 — `process-solicitacao-neural`: criar ou remover
- **Dimensão:** Segurança
- **Gap:** chamada em `NovaSolicitacaoModal.tsx:113` e `DeveloperDocs.tsx:44`, sem pasta em edge
- **Tipo:** Código
- **Passos:** decidir funcionalidade (RAG/LLM) OU remover invocação e a UI
- **Critério:** `grep process-solicitacao-neural src/ supabase/` — ou só edge existe + teste, ou zero refs
- **Esforço:** Médio · **Impacto:** Médio · **Requires decisão do dono**

### Etapa 11 — 67 cliques sem ação
- **Dimensão:** Lógica de Negócio
- **Gap:** elementos clicáveis sem handler (prod-readiness §5.1)
- **Tipo:** Código/Front
- **Arquivos:** os citados na triagem (§5.1), ex.: WorkflowAdmin.tsx:167, ChatArea.tsx:221
- **Passos:** em lotes pequenos por fluxo, ligar handler ou remover affordance
- **Critério:** cada componente testado no Vitest/E2E não regride
- **Esforço:** Alto · **Impacto:** Médio · **Requires triagem de negócio (dono)**

### Etapa 12 — stack-trace exposure edges
- **Dimensão:** Logging
- **Gap:** 5 alerts medium (advisory)
- **Tipo:** Código
- **Arquivos:** `supabase/functions/_shared/logger.ts` + migrates
- **Passos:** revisar e mascarar caminhos internos no log
- **Critério:** code scanning sem o alert
- **Esforço:** Médio · **Impacto:** Baixo

### Etapa 13 — `banco.json` (SUPABASE_ACCESS_TOKEN)
- **Dimensão:** Observabilidade
- **Gap:** `inventario/estado/banco.json` ausente (falta secret)
- **Tipo:** Config
- **Passos:** dono cadastra `SUPABASE_ACCESS_TOKEN` no repo; rodar inventário
- **Critério:** `inventario/estado/banco.json` gerado
- **Esforço:** Baixo · **Impacto:** Baixo · **Requires aval do dono**

### Etapa 14 — Tooling de build → devDependencies
- **Dimensão:** Qualidade de Código
- **Gap:** ferramentas de build em `dependencies` (mapa-repo)
- **Tipo:** Config
- **Arquivos:** `package.json` + lockfiles
- **Passos:** mover itens de build para `devDependencies`; validar bundle
- **Critério:** `bun run build` igual; guards `bun audit --production` 0 high
- **Esforço:** Médio · **Impacto:** Baixo

### Etapa 15 — Deduplicar `pages-directory`
- **Dimensão:** Documentação
~ **Status:** CONCLUÍDA (2026-11-14) — removida `DOCS/conventions/pages-directory.md`; atualizadas refs em `mapa-repo.md` e `L11_CI_TESTES_E_DOCS.md`; critério atendido.
- **Tipo:** Documentação
- **Arquivos:** um dos dois paths
- **Passos:** manter um, atualizar referências
- **Critério:** grep links apontam para o único path
- **Esforço:** Baixo · **Impacto:** Baixo

---

## Ondas

| Onda | Etapas | Prazo |
|---|---|---|
| 🔴 Quick Wins | 1–5 (+ 4 com aval) | 1–3 dias |
| 🟠 Sprint 1 | 6–10 (3 exigem aval/decisão) | 1–2 semanas |
| 🟡 Sprint 2 | 11–13 | 2–4 semanas |
| 🟢 Backlog | 14–15 | conforme capacidade |

## Critério global de conclusão
Etapas 🔴🟠 concluídas com aceite verde e sem regressão na suíte (vitest + e2e + guards + deno).