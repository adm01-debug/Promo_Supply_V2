# GitHub (perímetro, CI, workflows) — referência para agentes

Ler quando mexer em settings do repo, branch protection, `.github/workflows/`, ou quando um merge ou um
workflow falhar de forma estranha.

## Escrita no GitHub

- Repo `adm01-debug/Promo_Supply_V2`, branch `main`, **público**.
- **Escrita:** `gh` autenticado faz branch, push, PR e merge (medido em 25/11/2026: `git push` de branch
  próprio, `gh pr create` e `gh pr merge --squash` funcionaram neste repo). O MCP
  `GITHUB - MCP - FOREVER` (`github_push_files`) é o caminho quando o `gh` não está autenticado — o MCP
  padrão do GitHub retorna 403 em write. `github_push_files` **sobrescreve** o arquivo: mande o conteúdo
  integral com apenas a mudança semântica e confira depois que o arquivo remoto bate com o que você
  testou; ele aceita `files` e `delete` no mesmo commit (1 commit atômico).
- Commits: `<tipo>(<escopo>): <assunto>` com assunto ≥ 10 caracteres e sem ponto final; tipos
  `feat fix docs style refactor perf test build ci chore security revert`. **Não há hook local de
  `commit-msg`** (sem `.husky/`, `"prepare": ""`, sem `commitlint`), mas a convenção **é cobrada no CI**:
  o passo `Mensagens de commit da PR` do `guards.yml` (`:96,128`) roda `scripts/ci/commit-msg-lint.mjs`
  commit a commit. `infra` não é tipo de commit; para mudança de CI/infra use `ci:` ou `chore:`.
- Repo público: `raw.githubusercontent.com` responde sem token. `git push` só funciona onde a credencial
  alcança: no clone local/WSL sim; em sessão de nuvem cujo repo não está entre as fontes autorizadas o
  proxy devolve 403 — aí escreva pelo MCP.
- Para listar PRs abertas com os arquivos que tocam numa chamada só, use `github_graphql`
  (`pullRequests(states:OPEN){ nodes { number isDraft files { nodes { path } } } }`):
  `github_list_pull_requests` devolve o repositório inteiro em cada nó e estoura o contexto (já estourou:
  ~100 KB para 5 PRs).

### Clone WSL com hooks de automação — use `wsl git`, não git Windows

O repo também está clonado em `\wsl.localhost\Ubuntu-24.04\home\joaquim_ataides\projetos\Promo_Supply_V2`
(no WSL: `/home/joaquim_ataides/projetos/Promo_Supply_V2`), com `core.hooksPath` apontando
`.tools/repo-automation/hooks` (stubs que chamam `scripts/automation.mjs`). Consequência medível
(2026-11-14): `git checkout -b` *via git Windows* nesse clone trava com `update aborted by the
reference-transaction hook` e não cria a branch — o hook sobe na violação do caminho UNC.

Regra prática: **toda operação `git` no clone WSL roda dentro do WSL**, nunca com o executável Windows
apontando para o caminho UNC:

```text
wsl -d Ubuntu-24.04 -- bash -lc "cd /home/joaquim_ataides/projetos/Promo_Supply_V2 && git status"
wsl -d Ubuntu-24.04 -- bash -lc "cd /home/joaquim_ataides/projetos/Promo_Supply_V2 && git branch claude/fix-xyz-20261114-0000"
wsl -d Ubuntu-24.04 -- bash -lc "cd /home/joaquim_ataides/projetos/Promo_Supply_V2 && git push origin HEAD"
```

Idem para `git fetch`/`git pull`/`git merge`/`git rebase` no clone. Se estiver só lendo, `\wsl.localhost\...`
funciona; escrita de branch/commit/push exige `wsl git` (ou o MCP, que escreve no remoto direto).

**PATH do `node` dos hooks:** o hook `pre-push` roda suite via `scripts/automation.mjs`, e o isolamento
de rede usa `unshare` que herda o PATH do shell. Em shell não-interativo (`bash -c`, CI de agente), se
`~/.local/opt/node/bin` (e `~/.nvm/versions/node/<v>/bin`) não estiver no PATH, o hook aborta o push com
`unshare: failed to execute node: No such file or directory` e o teste
`scripts/maintenance/maintenance.unit.mjs` falha com `blocked_baseline` (linha ~1038). Exporte antes do
push:

```text
export PATH="$HOME/.local/opt/node/bin:$HOME/.nvm/versions/node/v24.22.2/bin:$PATH"
wsl -d Ubuntu-24.04 -- bash -lc "cd /home/joaquim_ataides/projetos/Promo_Supply_V2 && export PATH=\"\$HOME/.local/opt/node/bin:\$HOME/.nvm/versions/node/v24.22.2/bin:\$PATH\" && git push origin HEAD"
```

## Perímetro do GitHub — estado medido

| Campo | Estado | Como foi verificado |
|---|---|---|
| Branch protection em `main` | **existe** — `required_status_checks.strict=false`, `enforce_admins=false` | `gh api /repos/.../branches/main/protection`, 2026-11-26 |
| Required status checks | **um**: `Contratos da automação local` (job homônimo do `automation-local.yml`). Quality Gate, Unit, E2E, CodeQL, Dependency Review e mensagens de commit rodam mas **não** bloqueiam merge | `gh api /branches/main/protection/required_status_checks`, 2026-11-26 |
| Review obrigatório | nenhum (`required_pull_request_reviews` ausente) | idem |
| Merge | `allow_squash_merge=true` · `allow_merge_commit=true` · `allow_rebase_merge=true` · `delete_branch_on_merge=**false**` · `allow_auto_merge=false` | `GET /repos/...`, 2026-11-26 |
| Visibilidade | **público** (minuto de Actions é grátis em repo público; o `contexto.yml` ocupa um runner por hora) | `GET /repos/adm01-debug/Promo_Supply_V2`, 2026-11-25 |
| Varredura de segredo | `secret_scanning` e `secret_scanning_push_protection` **ligados** (2026-11-25); `validity_checks` e `non_provider_patterns` exigem GitHub Secret Protection pago e seguem desligados | `GET /repos/adm01-debug/Promo_Supply_V2` |
| `.github/` | `workflows/` (15 arquivos), `dependabot.yml` e `toolchain.json`; **não existe** `copilot-instructions.md`, `CODEOWNERS` nem template de PR/issue | `ls .github/`, 2026-11-26 |

Consequências práticas, não opinião:

- **Um check bloqueia, o resto não.** Só `Contratos da automação local` é obrigatório: um commit que
  quebra `main.yml`, `guards.yml` ou o E2E pode ser mergeado assim que a automação local passar. Quem
  mergeia continua responsável por ler os outros checks. Depois do merge, confira o deploy
  (`docs/agentes/deploy.md`).
- **`delete_branch_on_merge=false`:** apague a branch à mão depois do squash, senão o repo acumula branches
  de agente.
- Mudar qualquer linha da tabela acima é mudança de perímetro: **PR aberta, chamando o dono** (regra do
  `AGENTS.md`), e atualize esta tabela no mesmo PR.

## Workflows

**Quinze** arquivos em `.github/workflows/` (medido em 25/11/2026). A tabela gerada (gatilho, prova,
falha, quem avisa, custo) fica em `docs/ci/README.md` — ela é a projeção do bloco `# docs:` do topo de
cada YAML (todos têm o bloco), feita por
`node scripts/ci/render-workflow-docs.mjs`; o `guards.yml` roda `--check` e reprova se divergir — e reprova
também workflow novo sem o bloco, campo desconhecido e item malformado em `# nao-e-bug:`. Não edite
aquele README à mão: mude o bloco no YAML e regere.

| Workflow | Gatilho | O que faz |
|---|---|---|
| `main.yml` (nome interno **"Freight Quest CI/CD"**, herdado de outro projeto) | push em `main`/`develop`, PR para `main` | `quality-gate` (`bun run lint`, `bun run typecheck`, `bun run scripts/rls-audit.ts --strict` com `secrets.SUPABASE_DB_URL` — sem o secret o passo **falha**, é fail-closed (`main.yml:51-58`) — e, **só em PR**, `node scripts/ci/check-agents-md-integrity.mjs` com `AGENTS_MD_BASE=origin/<base>`) · `unit-integration-tests` (`bun run test` + `deno test --allow-net --allow-env --allow-read supabase/functions/`) · `e2e-tests` (Playwright chromium, depende do gate) |
| `contexto.yml` | push em `main` nos paths de código/banco/scripts/`manual/`; `schedule` a cada hora (minuto 3); dispatch | gera `docs/contexto/{codigo,supabase,regras}` + `00-INDEX.md` e publica na branch **`contexto`**. Detalhe em `docs/agentes/contexto-ia.md` |
| `types-sync.yml` | a cada hora (minuto 7), push em `supabase/migrations/` ou `scripts/types-sync/`, dispatch | gera `src/integrations/supabase/types.ts` do banco oficial, compara com o commitado e abre PR `automation/types-sync` ou issue `[types-sync]`; nunca faz push direto em `main` |
| `inventario-estado-semanal.yml` | segunda 10:41 UTC, dispatch | regenera `inventario/estado/` e abre PR em `automation/inventario-estado`; sem `SUPABASE_ACCESS_TOKEN` pula o `banco.json` com `::warning::` |
| `guards.yml` | PR e push em `main`; job do bundle só em push/dispatch | guards offline portados do Zapp: suítes de `scripts/`, inventário de testes, `--check` das duas docs geradas, mensagem de commit de cada commit da PR, `bun audit` em dependência de produção e varredura de `service_role` no bundle |
| `branch-hygiene-audit.yml` | segunda 09:34 UTC, dispatch | somente leitura: branches patch-equivalentes a `main`, branches paradas >30 d, PRs paradas >7 d, versões novas da toolchain, SLA de code scanning. Publica nas issues `[branch-hygiene]` e `[kpi-actions]`; **nunca apaga branch** |
| `notifica-falha-main.yml` | `workflow_run` dos **oito** workflows vigiados (os seis acima + `Paridade migrations x banco (semanal)` + `Deploy das edge functions`), na `main` | abre (ou comenta, no máximo 1×/6 h) a issue `[falha-main] <workflow> falhou na main`. Sem ele, um agendado pode falhar por semanas sem ninguém ver |
| `automation-local.yml` ("Automação local") | PR e push em `main`, dispatch | **única checagem obrigatória** da branch protection (`Contratos da automação local`): valida perfis, aliases e encadeamentos da automação e roda as suítes registradas em fixtures isoladas |
| `deploy-edge-functions.yml` ("Deploy das edge functions") | push em `main` nos paths `supabase/functions/**` ou o próprio YAML; dispatch (`functions=`, `remove=`) | **publica as edge functions** no projeto oficial; as isenções de `verify_jwt` vêm de `supabase/config.toml` (ver `deploy.md`) |
| `paridade-banco.yml` ("Paridade migrations x banco") | segunda 09:00 UTC, dispatch, push em `scripts/ci/paridade-migrations-banco.*` | compara os objetos declarados nas migrations com o banco vivo; allowlist em `scripts/ci/paridade-migrations-banco.allowlist.json` |
| `aplicar-migration-prod.yml` ("Aplicar migration no banco de producao") | dispatch manual (`migration=`, `confirmacao=APLICAR`) | único canal oficial de apply: um arquivo versionado por vez, em transação única, fail-closed sem `SUPABASE_DB_URL` (ver `banco.md`) |
| `dependency-review.yml` ("Dependency Review") | PR para `main` | barra dependência nova com advisory na própria PR |
| `provisionar-secret-champions-webhook.yml` | dispatch (`confirmacao=APLICAR`) | publica `PROMO_CHAMPIONS_WEBHOOK_SECRET` no projeto oficial |
| `provisionar-secret-design-sync.yml` | dispatch (`confirmacao=APLICAR`) | publica `PROMO_DESIGN_WEBHOOK_SECRET` no projeto oficial |
| `provisionar-vapid.yml` | dispatch (`confirmacao=APLICAR`) | publica as chaves VAPID (push) no projeto oficial |

Fatos que já custaram retrabalho:

- **Quem roda as suítes de `scripts/`:** o `guards.yml`, no passo "Suites de scripts/"
  (`node --test scripts/ci/*.unit.mjs scripts/lib/*.test.mjs`). O `check-test-inventory.mjs` do mesmo job
  reprova qualquer suíte nova no disco que não tenha passo em algum workflow — é o que impede a situação
  anterior, em que `npm run test:scripts` existia e nada o executava. A PR
  [#22](https://github.com/adm01-debug/Promo_Supply_V2/pull/22) havia ligado a mesma suíte no `main.yml`;
  o passo de lá foi removido quando ela mergeou, para o mesmo minuto de Actions não ser pago duas vezes
  por PR. O guard do `AGENTS.md` continua no `main.yml`, que é quem tem o `github.base_ref` da PR.
- **Comentários de workflow desatualizados sobre o banco:** `types-sync.yml` e
  `inventario-estado-semanal.yml` (e `inventario/README.md`) afirmam que `supabase/config.toml` aponta
  `trwgmplubeqxrxpncdgf` e divergiria do `.env`. Desde o commit `0bdc3cb` o `config.toml` aponta o ref
  oficial; os comentários ficaram para trás. Fonte de verdade do ref: `docs/agentes/banco.md`.
- **`main.yml` não tem passo de migration nem de deploy de edge function** — quem publica edge é o
  `deploy-edge-functions.yml` (automático em `supabase/functions/**`) e quem aplica migration é o
  `aplicar-migration-prod.yml` (dispatch manual); ver `docs/agentes/deploy.md`.
- **Custo:** o `contexto.yml` roda a cada hora e ocupa um runner (em repo público o minuto de Actions é
  grátis). Antes de propor outro agendamento,
  confira se um dos quinze workflows já cobre o que você quer. A issue `[kpi-actions]`, atualizada toda
  segunda pelo `branch-hygiene-audit.yml`, diz quantos minutos cada workflow consumiu nos últimos 7 dias —
  consulte ela antes de discutir custo de chute.

## Guards que você pode rodar antes do PR

- `npm run guards` → roda de uma vez o que o job `suites` do `guards.yml` roda: `npm run test:scripts`
  (`node --test scripts/ci/*.unit.mjs scripts/lib/*.test.mjs`), `check-test-inventory.mjs` e o `--check` de
  `render-workflow-docs.mjs` e `gerar-matriz-edge-tabela.mjs`. Node puro: não precisa de `bun install`;
- `node scripts/ci/check-agents-md-integrity.mjs` — **o CI já roda este guard em PR** (`main.yml`, job
  `quality-gate`), e a suíte `agents-docs-baseline.unit.mjs` o invoca no `guards.yml` com
  `AGENTS_MD_BASE` apontado para a base real; rode à mão se quiser o resultado antes do push (se mexer em
  `AGENTS.md` ou `docs/agentes/`: exige os
  cabeçalhos do `AGENTS.md` e barra o conjunto `AGENTS.md` + `CLAUDE.md` + `docs/agentes/*.md` encolher >30%,
  ou qualquer arquivo vigiado encolher >50%). No CI, aponte a base com `AGENTS_MD_BASE=origin/main`;
- `npx eslint <arquivos tocados>` e `npm run typecheck` — é o que o `quality-gate` vai rodar.

Arquivos com contrato verificado por teste — ao mexer, rode o teste junto: `AGENTS.md`, `CLAUDE.md` e
`docs/agentes/*.md` (`scripts/ci/agents-docs-baseline.unit.mjs`).

## Automação portada do Zapp_Web_V2 — o que já existe aqui

O Zapp_Web_V2 tem 21 workflows e 733 arquivos em `scripts/`. Esta tabela existe para você **não procurar
de novo**: ela diz o que foi portado, o que é do domínio do Zapp e o que ficou de fora com o motivo medido.

| Script | O que mantém atualizado | Como rodar |
|---|---|---|
| `scripts/ai-context/gerar.mjs` | `docs/contexto/codigo/` (rotas, módulos, hooks, edges, testes, convenções) | `npm run contexto:codigo` |
| `scripts/supabase_snapshot/snapshot.py` | `docs/contexto/supabase/` (banco ao vivo) | `npm run contexto:banco` |
| `scripts/regras_negocio/generate.py` + `indice.py` | `docs/contexto/regras/` e `docs/contexto/00-INDEX.md` | `npm run contexto:regras`, `npm run contexto:indice` |
| `scripts/inventario/gerar-{banco,rotas,repo}.mjs` + `mudou-conteudo.mjs` | `inventario/estado/*.json` | ver `inventario/README.md` |
| `scripts/types-sync/` | `src/integrations/supabase/types.ts` | `types-sync.yml` |
| `scripts/ci/render-workflow-docs.mjs` | `docs/ci/README.md` (projeção dos blocos `# docs:`) | `npm run docs:ci` · `--check` no CI |
| `scripts/ci/gerar-matriz-edge-tabela.mjs` | `docs/mapa/MATRIZ_EDGE_TABELA.md` (edge × tabela, por `.from()`) | `npm run docs:matriz-edge` · `--check` no CI |
| `scripts/ci/check-test-inventory.mjs` | nada — reprova suíte de `scripts/` sem passo em workflow | `node scripts/ci/check-test-inventory.mjs` |
| `scripts/ci/commit-msg-lint.mjs` | nada — cobra `<tipo>(<escopo>): <assunto>` em cada commit da PR | `node scripts/ci/commit-msg-lint.mjs <arquivo>` |
| `scripts/ci/audit-prod.mjs` | nada — bloqueia advisory HIGH/CRITICAL alcançável por `dependencies` | `guards.yml` |
| `scripts/ci/check-bundle-secrets.mjs` | nada — reprova JWT `service_role` em `dist/` e em `.env` | `bun run build && node scripts/ci/check-bundle-secrets.mjs --dist dist --env .env` (sem `dist/` sai 2, fail-closed) |
| `scripts/ci/actions-kpi.mjs` | issue `[kpi-actions]` (minutos e taxa de falha por workflow, 7 d) | `branch-hygiene-audit.yml` |
| `scripts/ci/branch-podaveis.mjs` | bloco `git push origin --delete` revisável (nunca apaga) | idem |
| `scripts/ci/bump-toolchain.mjs` | compara `.github/toolchain.json` com os releases | idem |
| `scripts/ci/sla-code-scanning.mjs` | SLA de alerta de code scanning (14 d alto / 30 d baixo) | idem — o CodeQL está ligado em **default setup** (languages `actions`, `javascript-typescript`, `python`; `schedule=weekly`, medido em 25/11/2026), então o script tem o que consultar |
| `scripts/lib/seguranca-processo.mjs` | biblioteca: resolve executável por caminho absoluto e barra path traversal | importada pelos guards |

**Fora de escopo por serem do domínio do Zapp** (não procure portar): `scripts/db-audit/` (209 testes de
contrato de banco em shell, Talk X/Evolution/telefonia), `scripts/e2e-isolated/`, `scripts/talkx/`,
`scripts/edge-deploy/`, `scripts/ui-audit/`, `scripts/qa/`, `scripts/ia/ensaio-provisionamento.mjs`,
`scripts/docs/verificar-docs-realtime.mjs`, `scripts/ci/vercel-env-cleanup.mjs`.

**Genéricos que NÃO foram portados ainda, com o motivo medido** (candidatos reais, não lista de desejos):

- `lint-ratchet.mjs` e `implicit-any-ratchet.mjs` (ratchets de ESLint e `noImplicitAny`): o baseline tem de
  ser **medido neste repo** e commitado. Exige `bun install` completo, que a sessão de nuvem não consegue
  fazer (o `bun.lock` aponta pacotes para `europe-west4-npm.pkg.dev`, que o proxy da sessão recusa com 403).
  Medir no CI e commitar o baseline na mesma PR.
- `github-settings-guard.mjs` + baseline (confere e restaura o perímetro do GitHub): a branch protection
  **existe** hoje com um check obrigatório (`Contratos da automação local`), então o guard passa a ter o
  que vigiar — mudar o perímetro é decisão do dono.
- `check-workflow-pins.mjs` (exige SHA de 40 caracteres em toda action): as 8 actions de `main.yml` mais
  as de `aplicar-migration-prod.yml` e `paridade-banco.yml` foram pinadas em 25/11/2026 (`actions/checkout`,
  `oven-sh/setup-bun`, `denoland/setup-deno`, `actions/upload-artifact`, `actions/setup-node`), então o
  guard tem o que vigiar — falta só o script e o baseline.
- `bundle-budget.mjs` + `performance-budget.json`: o orçamento do Zapp não serve aqui, e o teste lê o bloco
  `codeSplitting.groups` do `vite.config.ts` — este repo usa `manualChunks: (id) => …`. Precisa medir o
  bundle e o dono decidir o teto.
- `redigir-relatorio.mjs` (apaga segredos do relatório Playwright antes do artifact): o `main.yml` sobe
  `playwright-report/` como artifact sem redigir nada; o passo entra junto com a próxima edição do `main.yml`.
- `codeql.yml` (SAST diário): **já não é preciso** — o repo usa o default setup do CodeQL (weekly + PRs,
  medido em 25/11/2026); um workflow próprio passaria a duplicar a varredura.
- `fila-merge.mjs` / `auto-update-pr-branch.yml` e `reuso-arvore.mjs`: pressupõem `strict=true` e auto-merge
  ligados. Aqui `allow_auto_merge=false` (medido em 2026-11-08).
