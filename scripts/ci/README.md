# `scripts/ci/` — guards e geradores de documentação

Scripts de **node puro** (sem `bun install`, sem dependência de npm) que o CI executa. Dois papéis:
**gerar** documentação a partir do estado real do repo, e **reprovar** quando o repo e a documentação
divergem. Leia este arquivo antes de alterar qualquer um deles — a coluna "quem chama" diz o que quebra.

Rodar tudo que não precisa de rede: `npm run guards`.

## Geradores (escrevem arquivo; `--check` reprova divergência)

| Script | Gera | Quem chama |
|---|---|---|
| `render-workflow-docs.mjs` | `docs/ci/README.md`, projeção do bloco `# docs:`/`# nao-e-bug:` de cada workflow. Cada campo/item ocupa **uma** linha: continuação, campo repetido, `kpi.json` que não é JSON e pasta sem workflow reprovam | `guards.yml` (job `suites`, com `--check`) · `npm run docs:ci` |
| `gerar-matriz-edge-tabela.mjs` | `docs/mapa/MATRIZ_EDGE_TABELA.md`, matriz edge function × tabela por `.from()` (sem `*.test.ts`/`*_test.ts`/`*.spec.ts`) | `guards.yml` (job `suites`, com `--check`) · `npm run docs:matriz-edge` |

Os dois são **determinísticos** (nenhuma data no conteúdo) — é o que permite o `--check` ser um guard
em vez de um gerador de ruído. Não edite os `.md`: mude a fonte e regere. O único argumento aceito é
`--check`; qualquer outro sai `2` **sem escrever** (um `--chek` digitado errado regerava e saía 0).

## Guards de PR (só validam; comunicam por exit code)

| Script | O que reprova | Quem chama |
|---|---|---|
| `check-test-inventory.mjs` | suíte Node de `scripts/` (`.test.mjs`/`.unit.mjs`/`.integration.mjs`) ou teste Deno das edges (`*.test.ts`/`*_test.ts`) sem passo que a execute em algum workflow. Só conta o que está em bloco `run:`, fora de comentário (linha inteira **ou** fim de linha) | `guards.yml` (job `suites`) |
| `commit-msg-lint.mjs` | mensagem de commit fora de `<tipo>(<escopo>): <assunto>`. Passam direto só as formas que o git/GitHub geram (`Merge branch/tag/commit/pull request …`, `Revert "…"`, `Reapply "…"`, `fixup!`/`squash!`/`amend!`) | `guards.yml` (job `commits`), um commit por vez |
| `audit-prod.mjs` | advisory HIGH/CRITICAL alcançável por `dependencies` (dev não bloqueia). Lê o texto do `bun audit` 1.4.0 (`pacote@versão`, cadeia ` > `, `(direct dependency)`); sai `1` = advisory, `2` = relatório/argumento/status inválido | `guards.yml` (job `dependencias`) |
| `check-bundle-secrets.mjs` | JWT `service_role` ou chave `sb_secret_…` nos `.js`/`.mjs`/`.cjs`/`.html` de `dist/` ou no arquivo de ambiente versionado | `guards.yml` (job `bundle`, só em push/dispatch) |
| `check-agents-md-integrity.mjs` | `AGENTS.md`/`docs/agentes/` apagados ou encolhidos >30% vs a base (>50% por arquivo); `AGENTS_MD_BASE` que não resolve para um commit também reprova | `main.yml` (job `quality-gate`, só em PR) · `agents-docs-baseline.unit.mjs` no `guards.yml` |

## Auditoria semanal (somente leitura; publica em issue)

| Script | O que publica | Quem chama |
|---|---|---|
| `actions-kpi.mjs` | issue `[kpi-actions]`: runs, taxa de falha e **minutos** por workflow (7 d) | `branch-hygiene-audit.yml` |
| `branch-podaveis.mjs` | bloco `git push origin --delete refs/heads/<branch>` revisável (ref completa: nome curto pode acertar uma tag) — **nunca apaga nada** | idem |
| `bump-toolchain.mjs` | versões novas das ferramentas de `.github/toolchain.json` (informativo, sai 0 até com o arquivo ilegível; pin parcial como `22` é faixa; chave sem mapeamento sai em "não foi possível verificar") | idem |
| `sla-code-scanning.mjs` | SLA dos alertas de code scanning (14 d alto / 30 d baixo) | idem |

`sla-code-scanning.mjs` hoje sempre avisa "não foi possível consultar": **não há code scanning ligado
neste repositório** (a API responde 403). O passo fica no lugar para o dia em que for ligado.

## Suítes e baselines

- Toda `*.unit.mjs` daqui roda em `guards.yml` → `node --test scripts/ci/*.unit.mjs scripts/lib/*.test.mjs`.
  **Suíte nova sem passo em workflow reprova** no `check-test-inventory.mjs` — é de propósito.
- `scripts-operacionais.unit.mjs` cobre os scripts da raiz de `scripts/` (`rls-audit`, `db-explain-analyze`,
  `realtime-audit`, `stress-test`, `validate-bridge`, `squash-migrations.sh`) e o
  `deploy_edge_functions_promo_supply.sh`. Tudo offline: servidor HTTP em 127.0.0.1, `psql`/`supabase`/`curl`
  de mentira no PATH e repositório git descartável em `os.tmpdir()`.
- `inventario-types.unit.mjs` é um **agregador**: importa as suítes de `inventario-types/` (que testam
  `scripts/inventario/*` e `scripts/types-sync/*`). Elas ficam em subpasta de propósito — o glob
  `scripts/ci/*.unit.mjs` não desce nela, então cada caso roda uma vez, e o `check-test-inventory` as
  considera cobertas por import estático. Suíte nova ali precisa entrar na lista de imports do agregador.
  Recurso externo ausente (`rg`, `typescript`, Postgres, pgbouncer) vira `skip` com o motivo; o Postgres
  efêmero só sobe com `INVENTARIO_TEST_PG_BIN` (ver `inventario-types/pg.mjs`). Variáveis opt-in:
  `INVENTARIO_TEST_PG_BIN` (pasta com `initdb`/`pg_ctl`/`postgres`/`psql`; liga o Postgres efêmero),
  `INVENTARIO_TEST_PG_USER` (obrigatória como root: o Postgres recusa subir; exige `setpriv`),
  `INVENTARIO_TEST_PGBOUNCER` (caminho do `pgbouncer`; sem ele só os casos de proxy real ficam em skip) e
  `INVENTARIO_TEST_TYPESCRIPT` (pasta do pacote `typescript`; padrão `node_modules/typescript`).
  **Limitação no CI:** o job `suites` do `guards.yml` não instala dependências, então os 22 casos do Gate 1
  que compilam com `tsc` de verdade ficam sempre em skip lá (os com `tsc` falso rodam). Alguns casos leem o
  texto de `.github/workflows/types-sync.yml` e as rotas de `src/routes/AppRoutes.tsx`: mudar esse workflow
  reprova a suíte de propósito.
- `workflow-test-support.mjs` é biblioteca das suítes (lê job/step/permissão de um YAML de workflow em
  blocos); não é parser YAML geral e não roda sozinho.
- `scripts/ci/*.json` são baselines lidos pelos scripts, não configuração para editar à mão.

## Convenções

- Node puro: nenhum `import` de pacote npm, para o job mais barato do CI não precisar de `bun install`.
- Fail-closed: varredura que não conseguiu ler nada sai `!= 0` em vez de se declarar OK.
- Guarda de módulo principal por **caminho real** (`realpathSync` dos dois lados): comparando texto, o
  script chamado por link simbólico (ou de pasta com espaço/acento) não rodava `main` e saía 0 calado.
- Nenhum script imprime valor de segredo — só caminho, linha e o claim que motivou a reprovação.
- Vieram do `Zapp_Web_V2`. Onde o comportamento diferiu, a adaptação está comentada no próprio arquivo,
  com o que foi **medido** aqui. O inventário do que foi portado (e do que não foi, com o motivo) está
  no fim de `docs/agentes/github-ci.md`.
