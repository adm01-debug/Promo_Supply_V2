# GitHub (perímetro, CI, workflows) — referência para agentes

Ler quando mexer em settings do repo, branch protection, `.github/workflows/`, ou quando um merge ou um
workflow falhar de forma estranha.

## Escrita no GitHub

- Repo `adm01-debug/Promo_Supply_V2`, branch `main`, **privado**.
- **Escrita: somente MCP `GITHUB - MCP - FOREVER`** (`github_push_files`). O MCP padrão do GitHub retorna
  403 em write. `github_push_files` sobrescreve o arquivo — mande o conteúdo integral com apenas a mudança
  semântica e confira depois que o arquivo remoto bate com o que você testou. Ele aceita `files` e `delete`
  no mesmo commit (1 commit atômico).
- Commits: `<tipo>(<escopo>): <assunto>` com assunto ≥ 10 caracteres e sem ponto final; tipos
  `feat fix docs style refactor perf test build ci chore security revert`. **Não há hook `commit-msg`
  neste repo** (sem `.husky/`, `"prepare": ""`, sem `commitlint`): a convenção não é cobrada por máquina
  em lugar nenhum — siga mesmo assim. `infra` não é tipo de commit; para mudança de CI/infra use `ci:` ou `chore:`.
- Repo privado: `raw.githubusercontent.com` só responde com token, e `git push` da sessão em nuvem volta 403
  do proxy quando o repo não está entre as fontes autorizadas da sessão — escreva pelo MCP.
- Para listar PRs abertas com os arquivos que tocam numa chamada só, use `github_graphql`
  (`pullRequests(states:OPEN){ nodes { number isDraft files { nodes { path } } } }`):
  `github_list_pull_requests` devolve o repositório inteiro em cada nó e estoura o contexto (já estourou:
  ~100 KB para 5 PRs).

## Perímetro do GitHub — estado medido

| Campo | Estado | Como foi verificado |
|---|---|---|
| Branch protection em `main` | **nenhuma** — `GET /repos/.../branches/main/protection` responde `404 Branch not protected` | MCP, 2026-11-08 |
| Required status checks | **nenhum** — consequência do acima: nada impede merge com CI vermelha | idem |
| Review obrigatório | nenhum | idem |
| Merge | `allow_squash_merge=true` · `allow_merge_commit=true` · `allow_rebase_merge=true` · `delete_branch_on_merge=**false**` | `github_graphql`, 2026-11-08 |
| Visibilidade | privado (minuto de Actions é cobrado — ver custo do `contexto.yml`) | idem |
| `.github/` | só `workflows/` — **não existe** `copilot-instructions.md`, `CODEOWNERS`, `dependabot.yml` nem template de PR/issue | `ls .github/` |

Consequências práticas, não opinião:

- **Nada bloqueia um merge ruim.** Sem branch protection, quem mergeia é responsável por ler o resultado do
  `main.yml` antes. Depois do merge, confira o deploy (`docs/agentes/deploy.md`).
- **`delete_branch_on_merge=false`:** apague a branch à mão depois do squash, senão o repo acumula branches
  de agente.
- Mudar qualquer linha da tabela acima é mudança de perímetro: **PR aberta, chamando o dono** (regra do
  `AGENTS.md`), e atualize esta tabela no mesmo PR.

## Workflows

Quatro arquivos em `.github/workflows/`:

| Workflow | Gatilho | O que faz |
|---|---|---|
| `main.yml` (nome interno **"Freight Quest CI/CD"**, herdado de outro projeto) | push em `main`/`develop`, PR para `main` | `quality-gate` (`bun run lint`, `bun run typecheck`, `bun run scripts/rls-audit.ts` se o arquivo existir) · `unit-integration-tests` (`bun run test` + `deno test --allow-net --allow-env --allow-read supabase/functions/`) · `e2e-tests` (Playwright chromium, depende do gate) |
| `contexto.yml` | push em `main` nos paths de código/banco/scripts/`manual/`; `schedule` a cada 10 min (minuto 3); dispatch | gera `docs/contexto/{codigo,supabase,regras}` + `00-INDEX.md` e publica na branch **`contexto`**. Detalhe em `docs/agentes/contexto-ia.md` |
| `types-sync.yml` | a cada 10 min (minuto 7), push em `supabase/migrations/` ou `scripts/types-sync/`, dispatch | gera `src/integrations/supabase/types.ts` do banco oficial, compara com o commitado e abre PR `automation/types-sync` ou issue `[types-sync]`; nunca faz push direto em `main` |
| `inventario-estado-semanal.yml` | segunda 10:41 UTC, dispatch | regenera `inventario/estado/` e abre PR em `automation/inventario-estado`; sem `SUPABASE_ACCESS_TOKEN` pula o `banco.json` com `::warning::` |

Fatos que já custaram retrabalho:

- **`scripts/ci/*.unit.mjs` não roda em nenhum workflow.** `npm run test:scripts` existe e os testes existem,
  mas o único `node --test` do CI é `scripts/ai-context/gerar.unit.mjs`, dentro do `contexto.yml`. O
  comentário "O CI obrigatório executa scripts/ci/*.unit.mjs" em `scripts/ci/ai-context-generator.unit.mjs`
  está **falso hoje**. Rode os guards à mão antes da PR.
- **Comentários de workflow desatualizados sobre o banco:** `types-sync.yml` e
  `inventario-estado-semanal.yml` (e `inventario/README.md`) afirmam que `supabase/config.toml` aponta
  `trwgmplubeqxrxpncdgf` e divergiria do `.env`. Desde o commit `0bdc3cb` o `config.toml` aponta o ref
  oficial; os comentários ficaram para trás. Fonte de verdade do ref: `docs/agentes/banco.md`.
- **`main.yml` não tem passo de migration nem de deploy de edge function** — nenhum workflow publica edge;
  ver `docs/agentes/deploy.md`.
- **Custo:** o repo é privado e o `contexto.yml` roda a cada 10 min. Antes de propor outro agendamento,
  confira se um dos quatro workflows já cobre o que você quer.

## Guards que você pode rodar antes do PR

- `npm run test:scripts` → `node --test scripts/ci/*.unit.mjs` (geradores de contexto, snapshot do banco,
  regras de negócio e o baseline das instruções para agentes);
- `node scripts/ci/check-agents-md-integrity.mjs` (GA02; se mexer em `AGENTS.md` ou `docs/agentes/`: exige os
  cabeçalhos do `AGENTS.md` e barra o conjunto `AGENTS.md` + `CLAUDE.md` + `docs/agentes/*.md` encolher >30%,
  ou qualquer arquivo vigiado encolher >50%). No CI, aponte a base com `AGENTS_MD_BASE=origin/main`;
- `npx eslint <arquivos tocados>` e `npm run typecheck` — é o que o `quality-gate` vai rodar.

Arquivos com contrato verificado por teste — ao mexer, rode o teste junto: `AGENTS.md`, `CLAUDE.md` e
`docs/agentes/*.md` (`scripts/ci/agents-docs-baseline.unit.mjs`).
