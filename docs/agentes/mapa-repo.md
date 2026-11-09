# Mapa do repositório — referência para agentes

Ler quando precisar saber onde fica algo antes de buscar por texto.

## Onde olhar primeiro

| Precisa de | Leia |
|---|---|
| **Contexto gerado para agentes — antes de qualquer tarefa ou planejamento** | **`docs/contexto/00-INDEX.md` na branch `contexto`** (`git show origin/contexto:docs/contexto/00-INDEX.md`): diz qual fonte é dona de cada fato e a ordem de leitura. Regerado a cada 10 min — não editar. Como funciona: `docs/agentes/contexto-ia.md` |
| O que está quebrado, o que nunca entrou em operação e qual a prioridade | `ESTADO_ATUAL.md` (executivo, auditoria de 2026-08-16) e as provas em `DOCS/ESTADO/00_INDICE.md` (`L01`…`L15`, toda linha com `arquivo:linha`) |
| Onde fica o código de cada fluxo (tela → hook → edge → tabela) | `inventario/estado/rotas.json` (gerado) e `DOCS/CODEBASE_ATLAS/` (escrito à mão, números defasados) |
| Qual banco, migration, GitHub/CI, deploy | `AGENTS.md` + `docs/agentes/*.md` |
| Estado real do banco e das edges (tabelas, RLS, cron, uso no código) | `inventario/estado/*.json` — **consulte antes de buscar por texto**; como gerar e como ler em `inventario/README.md` |
| Histórico, auditorias, ADRs, planos antigos | `DOCS/` (`AUDITORIA_*`, `AUDIT-*`, `ADR/`, `RUNBOOKS/`, `MELHORIAS_PENDENTES.md`), `.lovable/plan.md` — contexto, **não** fonte de verdade |

## Mapa rápido

| Onde | O que tem |
|---|---|
| `src/components/` | 257 arquivos em 23 subpastas; maiores: `compras/` (117), `ui/` (65, shadcn). Mistura atomic design (`atoms/`, `molecules/`, `organisms/`) com pastas por domínio (`compras/`, `pedidos/`, `fornecedores/`, `licitacoes/`) |
| `src/features/` | 63 arquivos em 7 features (`auth`, `aprovacoes`, `cotacoes`, `empresas`, `layout`, `pedidos`, `solicitacoes`), cada uma com `components/`, `hooks/`, `schemas/`, `types/`. A migração para arquitetura por feature é **parcial** (ADR `DOCS/ADR/0001-feature-based-architecture.md`): hook novo de domínio existente vai na feature, não em `src/hooks/` |
| `src/hooks/` | 71 arquivos, 61 soltos na raiz da pasta (`usePermissions.ts`, `useMFA.ts`, `useProdutos.ts`…) |
| `src/pages/` | 117 arquivos em 38 subpastas, uma por área de rota; rotas declaradas em `src/routes/AppRoutes.tsx` (arquivo único) |
| `src/integrations/` | `supabase/client.ts`, `supabase/types.ts` (**gerado** pelo `types-sync.yml` — nunca editar à mão), `lovable/index.ts` |
| `src/lib/` | utilitários transversais: `supabaseQuery.ts`, `supabaseRpc.ts`, `query-client.ts`, `logger.ts`, `security.ts`, `secureStorage.ts`, `paginatedFetch.ts`, `pdfGenerator.ts` |
| `src/stores/` | Zustand (`slaSettingsStore`, `kpiTargetsStore`, `buyerAlertsStore`, `undoStore`, `dashboardLayoutStore`) |
| `src/locales/` · `src/i18n/` | `pt/`, `en/`, `es/` (um `translation.json` cada) + `config.ts` do i18next |
| `supabase/functions/` | 39 entradas: edges + `_shared/` (26 arquivos: `logger.ts`, `rate_limit.ts`, `idempotency.ts`, `retry.ts`, `circuit_breaker.ts`, `validation.ts`, `security.ts`, `contracts.ts`, família `xbz_*`, `spot_api.ts`, `ai_gateway.ts`…) |
| `supabase/migrations/` | 279 arquivos `.sql`, todos `^[0-9]{14}_`; dois estilos de sufixo (UUID do Lovable e nome descritivo). **Não há pasta de arquivo morto** nem `schema-manifest.json`/`schema-catalog.json` |
| `scripts/` | `ai-context/`, `regras_negocio/`, `supabase_snapshot/`, `types-sync/` (com README) · `ci/` e `inventario/` (sem README) · soltos na raiz, contra a convenção: `rls-audit.ts`, `realtime-audit.ts`, `db-explain-analyze.ts`, `stress-test.ts`, `validate-bridge.ts`, `squash-migrations.sh` |
| `tests-e2e/` | 9 arquivos Playwright (7 `*.spec.ts` + `fixtures.ts` + `global-setup.ts`) |
| `tests-rls/` | `rls-isolation.test.ts` — **bate no Supabase real por HTTP** (ver `docs/agentes/banco.md` antes de rodar) |
| `src/tests/` · `src/**/__tests__/` | 101 arquivos de teste Vitest em 50 pastas `__tests__/`, mais contratos (`src/tests/contracts*.test.ts`), fuzzing, integração e carga (`src/tests/load/backend-stress.yml`, Artillery) |
| `docs/` | `agentes/` (esta pasta), `contexto/regras/manual/` (regras humanas, **na main**), `conventions/` |
| `DOCS/` (maiúsculo) | documentação escrita à mão: `ARCHITECTURE_GUIDE.md`, `ENGINEERING_EXCELLENCE.md`, `SECURITY.md`, `BACKUP_STRATEGY.md`, `ESTADO/` (16 arquivos), `CODEBASE_ATLAS/` (12), `ADR/` (2), `RUNBOOKS/` (1) |
| `inventario/estado/` | `rotas.json` e `edges.json` gerados; **`banco.json` não existe ainda** (falta o secret `SUPABASE_ACCESS_TOKEN` — `inventario/README.md`) |

`DOCS/conventions/pages-directory.md` e `docs/conventions/pages-directory.md` são **o mesmo arquivo duplicado**;
`docs/` (minúsculo) é a pasta de infraestrutura para agentes, `DOCS/` é a documentação humana.

Lixo comitado na raiz, a apagar (não é fonte de nada): dois `C:UsersTI-01AppData…txt` (dumps de resposta MCP
com dado pessoal de produção) e `System.Drawing.Drawing2D.GraphicsPath` (um PNG 512×512 sem extensão).

## Automações (`scripts/`)

Automação vive em `scripts/<nome>/`, um subdiretório por automação, cada um com `README.md` dizendo o que faz,
como rodar e que secrets usa. **Leia o README da automação antes de alterar.** Scripts em `scripts/`; a saída
deles em `docs/` (ou numa branch gerada) — nunca misturar os dois. Não use `supabase/scripts` (o CLI do
Supabase é dono de `supabase/`) nem `src/scripts` (entra no bundle). Seis scripts na raiz de `scripts/`
e as pastas `ci/`/`inventario/` sem README são dívida conhecida, não exemplo a seguir.

## Comandos

O repo tem **três** lockfiles (`bun.lock`, `bun.lockb`, `package-lock.json`) e todo CI instala com **bun**
(`bun install`, sem `--frozen-lockfile`, em `main.yml`; `types-sync.yml` tenta `--frozen-lockfile` e cai para
`bun install --ignore-scripts`). Não há `engines`, `packageManager` nem `.nvmrc` — a Vercel lê `.nvmrc` e criar
o arquivo mudaria o build (motivo registrado em `.github/workflows/inventario-estado-semanal.yml`); o Node dos
workflows vem inline (`22`).

- testes unitários só do que você tocou: `npx vitest run <caminho>` (a suíte inteira são 101 arquivos);
- typecheck: `npm run typecheck` (`tsc --noEmit`);
- lint dos arquivos tocados: `npx eslint <arquivos>` (o CI roda `eslint .`);
- E2E: `npm run test:e2e` (Playwright; `baseURL` `http://localhost:8080`, `testDir` `tests-e2e/`);
- edges (Deno), como no CI: `deno test --allow-net --allow-env --allow-read supabase/functions/`;
- RLS: `npm run test:rls` — **lê o banco oficial por HTTP**; exige as env vars de `docs/agentes/banco.md`;
- guardas antes da PR: `npm run guards` — `npm run test:scripts`
  (`node --test scripts/ci/*.unit.mjs scripts/lib/*.test.mjs`), `check-test-inventory.mjs` e o `--check` de
  `render-workflow-docs.mjs` e `gerar-matriz-edge-tabela.mjs`; é o mesmo conjunto do job `suites` do
  `guards.yml` e roda em node puro (não precisa de `bun install`);
- `node scripts/ci/check-agents-md-integrity.mjs` (vigia `AGENTS.md` + `docs/agentes/`) — **o CI já roda isto em PR** (`main.yml`, job `quality-gate`, com `AGENTS_MD_BASE=origin/<base>`); à mão serve para ver o resultado antes do push, e sem a variável a comparação é HEAD×HEAD, logo no-op;
- docs geradas, se você mexeu na fonte delas: `npm run docs:ci` (bloco `# docs:` dos workflows →
  `docs/ci/README.md`) e `npm run docs:matriz-edge` (`.from()` das edges → `docs/mapa/MATRIZ_EDGE_TABELA.md`).

**Não há hook de git neste repo:** não existe `.husky/`, `package.json` tem `"prepare": ""` e não há
`commitlint`. **Nada roda localmente no commit** — a convenção de commit é responsabilidade de quem escreve
(`.claude/skills/promo-supply-v2/SKILL.md`). Depois do push, quem cobra a mensagem é o job `commits` do
`guards.yml`: ele roda `scripts/ci/commit-msg-lint.mjs` em cada commit do intervalo da PR e falha o check
(`<tipo>(<escopo>): <assunto ≥10 caracteres, sem ponto final>`; `Merge`/`Revert`/`fixup!` passam direto).
Para conferir antes do push: `git log -1 --format=%B > /tmp/msg && node scripts/ci/commit-msg-lint.mjs /tmp/msg`.
