# AGENTS.md — Promo Supply V2

Regras do dono para qualquer agente de IA; vencem `DOCS/` e `.lovable/` (histórico). Detalhe em
`docs/agentes/<tema>.md`; divergiu da realidade → corrija no mesmo PR do fix. Responda sempre em PT-BR.

## Postura
- O dono não é dev: decide negócio; o agente executa a engenharia inteira via MCP. Nunca passo manual do
  dono nem pedir que ele revise diff.
- Qualidade + velocidade, mínimo de tokens. Decida como dev sênior; pergunte só com custo, arquitetura,
  dado destrutivo em produção, trade-off de negócio ou item "chame o dono". Para ler, não peça permissão.
- Verdade acima de validação: não sabe → diga; falhou → diga. Afirmação sobre código cita evidência
  (arquivo:linha, diff, saída de comando); sem evidência = "NÃO VERIFICADO" + motivo; nunca "testado" sem
  ter rodado. Branch/commit/PR não provam nada — leia o código.
- Diff mínimo, zero churn: causa raiz, não reescrita; não refatore, renomeie ou comente o que não foi pedido;
  não reescreva arquivo inteiro para mudar 3 linhas. Dependência nova ou bump major só se indispensável (avise na PR).
- `APROVADO` = execute o plano como descrito, sem reconfirmar.
- Uma tarefa por vez, cada uma com sua branch/PR. Outro bug → "Próximos passos". Travou → reporte o erro
  exato e pare; não contorne regra. Releia o pedido antes de concluir.
- Tokens: leia só o trecho necessário; `inventario/estado/` e o contexto gerado antes de buscar por texto;
  exploração ampla → subagente; nenhuma tool "por garantia"; não gere código que não será aplicado.
- Segredos nunca em código, commit ou resposta — só em env/secret do serviço (edge: `supabase secrets set`
  ou painel; workflow: secret do GitHub). PAT exposto em chat → rotacionar na hora. Nunca imprima nem
  commite token, `service_role` ou `SUPABASE_DB_URL`. O `.env` **não** é versionado (`.gitignore` linhas 49-52,
  com `!.env.example` de propósito): nunca crie arquivo de ambiente versionado — este repo é **público**
  e todo commit é leitura de qualquer um.

## Bugs e funcionalidades
- Diagnóstico antes de patch: logs e estado real, ponto exato (arquivo:linha), causa; várias causas → liste
  todas, corrija a pedida.
- Antes da PR: `npm run typecheck`, `npx eslint <arquivos tocados>` e `npx vitest run <caminho>` do que tocou
  (edge em Deno → `deno test --allow-net --allow-env --allow-read supabase/functions/<pasta>`). **Não há hook
  de git neste repo** (sem `.husky/`, `"prepare": ""`, sem `commitlint`): nada roda sozinho no commit. Só erro
  seu conta; erro herdado da `main` → "Próximos passos".
- "Pronto" = PR mergeada + deploy confirmado + comportamento verificado (log, query ou request real); faltou
  um → diga onde parou. Merge em `main` = deploy de produção na Vercel. A proteção de `main` exige **um** check
  obrigatório (`Contratos da automação local`) e nenhuma revisão; os outros checks (Quality Gate, E2E, guards)
  não bloqueiam, então ler o resultado do CI antes de mergear continua sendo obrigação de quem mergeia
  (`gh api /repos/adm01-debug/Promo_Supply_V2/branches/main/protection`).
- Funcionalidade pronta = integrada ponta a ponta (rota em `src/routes/AppRoutes.tsx`, entrada na UI,
  hook/edge chamados, tabela com RLS, estados erro/loading/vazio, submit), sem mock, hardcode ou TODO. Pela
  metade não é pronto; não cabe na sessão → entregue o funcional e liste o que falta, em ordem, com arquivos.
  Nunca deixe código morto ou feature "quase" sem dizer — o snapshot de 22/11 tem 160 tabelas em `public` e
    código existir não prova fluxo em uso (`docs/agentes/regras-dominio.md`).

## Comunicação
- Resultado primeiro, só o que muda decisão do dono. Sem introdução, recapitulação, narração, hedging,
  disclaimer, lição de moral ou cortesia. Efeito no negócio; técnica só se perguntarem. Resposta e plano
  proporcionais ao tamanho do fix; não despeje log — cite a linha que importa. Caminhos, comandos e links
  completos. Destrutivo de verdade: uma linha ("isso apaga X, sem volta — confirma?").
- Toda execução fecha com exatamente 3 "Próximos passos" (`N. [título] — [por quê] · [arquivo]`), por
  impacto, do que você viu, executáveis via MCP, para não-dev; nada de genérico ("adicionar testes",
  "melhorar documentação", "revisar segurança"). É um menu: `1`, `1 e 3`, `APROVADO 2`, "todos" ou o bloco
  devolvido = executar na ordem, sem reconfirmar. Só consulta, já rejeitadas ou nada pendente →
  `Próximos passos: nada pendente neste escopo.`

## Fluxo Git — detalhe em `docs/agentes/github-ci.md`
- Repo `adm01-debug/Promo_Supply_V2`, `main`, **público**. Escrita no GitHub: MCP **`GITHUB - MCP - FOREVER`**
  (`github_push_files`: `files` + `delete` num commit); o MCP padrão do GitHub dá 403 em write. `git push`/`gh`
  só em repo autorizado na sessão.
- Nunca commite em `main`. Só escreva em branch que **você** criou nesta sessão; branch alheia ou já
  existente é somente leitura. Antes do push, confira que o último commit é seu.
- PR aberta nos mesmos arquivos → pare e avise o dono (liste via `github_graphql`; `github_list_pull_requests`
  estoura o contexto).
- Branch de `main` atualizado: `claude/<fix|feat|chore|ci>-<slug>-<AAMMDD-HHMM>`.
- Commit PT-BR, 1 atômico, `<tipo>(<escopo>): <assunto ≥10 chars, sem ponto>`; tipos
  `feat fix docs style refactor perf test build ci chore security revert` (não há `infra:` — branch `infra`
  → `ci:`/`chore:`). Nada cobra isso por máquina aqui; siga mesmo assim.
- PR sempre: título = o que muda; corpo = causa + o que foi verificado, com evidência.
- Mergeie sem aprovação (squash, **apague a branch à mão** — `delete_branch_on_merge=false`) PR sua pronta:
  CI verde, sem conflito, escopo comum (front, edge, config). **Deixe aberta e chame o dono**: DDL/migration
  em produção; CI/workflows, segredos, Dockerfile, infra; deleção de dado, arquitetura ou custo; conflito com
  PR de outro agente.
- Conflito: rebase em `main`; `--force-with-lease` só na sua branch.
- Merge = produção: confira o deploy na Vercel e reporte. CI vermelha → leia o resumo da falha antes de
  qualquer patch; do seu merge → `fix:` em branch nova na mesma sessão.
- Fim: link da PR + estado.

## Banco — ler `docs/agentes/banco.md` antes de SQL, migration ou teste que fale com o Supabase
- Oficial: Supabase Cloud **`lmypcdfsrgfftzhxawao`** ("Promo Supply - V2"); SQL pelo MCP apontado para esse
  ref — **confira o ref antes do primeiro comando**.
- NÃO escrever em `trwgmplubeqxrxpncdgf` nem `apuzcrkeqodktmpwobnz` (refs errados que o código apontou até o
  commit `0bdc3cb`; ainda citados em migrations antigas e em comentários desatualizados de workflow).
  `pgxfvjmuubtbowutlide` (MCP "GESTÃO DE CLIENTES"/CRM) e `doufsxqlfjyuvxuezpln` (MCP "GESTÃO DE PRODUTOS")
  são outros projetos: só leitura.
- **Não existe banco local nem desvio:** o `.env` local aponta para **produção** e `.env`/`.env.*` são
  ignorados (`.gitignore:49-52`, com `!.env.example` de propósito), então `npm run dev`, `npm run test:rls` e o
  E2E falam com **produção**. Diagnóstico = só leitura. `npm run test:rls` com `RLS_TEST_USER_A/B` faz login
  real. O passo `Security RLS Audit` do CI roda de verdade (`bun run scripts/rls-audit.ts --strict`, job
  `quality-gate` de `main.yml`): com `--strict` a auditoria **sai 1** quando falta `SUPABASE_DB_URL`
  (`scripts/rls-audit.ts:247,273`), e o job está verde — logo o secret existe e a RLS é auditada no CI.
- **O ledger de migration foi reconciliado pela #448 (mergeada em 25/11/2026 10:46); o estado pós-merge não foi
  conferido por query** — medido em 25/11/2026, antes dela: `supabase_migrations.schema_migrations` com 14 linhas
  para 336 arquivos. A #448 entrega `supabase/migrations/20261127000000_reconcilia_ledger_migrations.sql`, que
  registra no ledger as 322 versões já aplicadas; **NÃO VERIFICADO** se esse arquivo já rodou no banco oficial.
  O canal oficial de apply é o workflow `aplicar-migration-prod.yml` (dispatch manual, 1 arquivo, transação
  única), que **não grava no ledger**. Enquanto ledger e banco divergirem, `supabase db push` tentaria reexecutar
  arquivos destrutivos (361 migrations hoje: 94 `CREATE TABLE` sem `IF NOT EXISTS`, 51 `DELETE FROM`, 8 `DROP
  TABLE`). Ordem obrigatória: arquivo → PR → merge → deploy do código → apply, e **pergunte ao dono qual é o  caminho do apply** antes do primeiro DDL. Destrutivo, segredos e rotação: só com o dono.
- `src/integrations/supabase/types.ts` é gerado pelo `types-sync.yml` — nunca editar à mão.## Serviços- **Deploy** — ler `docs/agentes/deploy.md` ao confirmar deploy ou mexer em env/domínio. Front na **Vercel**  (projeto `promo-supply-v2`, team `juca1`): merge em `main` = produção. **Edge: o workflow  `deploy-edge-functions.yml` publica** no push da `main` que toque `supabase/functions/**` (e no dispatch manual,
  por função, lista ou todas); o script `deploy_edge_functions_promo_supply.sh` publica à mão as **31** funções
  da lista `FUNCTIONS=(`. São **43** pastas em `supabase/functions/` (41 com `index.ts`), então nenhum dos dois
  caminhos publica tudo. Nunca segredo de servidor na Vercel; `VITE_*` é público.
- **Serviços externos** — ler `docs/agentes/servicos-externos.md` ao mexer em edge que fale com fora (XBZ,
  Spot Gifts, AI Gateway da Lovable, SEFAZ, Resend/Slack, `external-db-bridge`, punchout, `erp-sync`, SCIM,
  WebAuthn). CORS/auth/tenant vêm de `supabase/functions/_shared/security.ts`.
- **GitHub/CI** — ler `docs/agentes/github-ci.md` ao mexer em settings ou `.github/workflows/`. São **15**
  workflows (`ls .github/workflows/*.yml`); `main.yml` ainda se chama "Freight Quest CI/CD". A lista completa e o
  que cada um prova é **gerada** em `docs/ci/README.md` a partir do bloco `# docs:` do YAML — não edite o README.
  As suítes de `scripts/` rodam no `guards.yml`, e `check-test-inventory.mjs` reprova suíte nova sem passo em
  workflow. O que foi portado do Zapp e o que faltou (com motivo) está no fim do `docs/agentes/github-ci.md`.
- **Regras de domínio** — ler `docs/agentes/regras-dominio.md` antes de mexer em solicitação, cotação,
  aprovação, acompanhamento ou login/passkey.

## Catálogo e fornecedores — ler `docs/agentes/catalogo-e-fornecedores.md` antes de tocar em produto, estoque ou preço
- **Promo Supply V2 é compras. Produto, estoque e preço aparecem aqui, mas nascem no Promo Gifts V4**
  (PIM, Supabase `doufsxqlfjyuvxuezpln`, repo `adm01-debug/Promo_Gifts_V4`). Compras consome por
  leitura; **não** cadastra, **não** sincroniza, **não** espelha.
- Vale para **todos** os fornecedores — XBZ, SPOT/Stricker, Asia Import, Só Marcas e os próximos. O PIM
  já tem pipeline e cron de cada um; fornecedor novo é trabalho **no PIM**, não aqui.
- Compras **usa** estoque e preço: exibe na busca, aplica mínimo/múltiplo, crédito, aprovação, cotação,
  pedido e acompanhamento de liberação/entrega — e **congela** no documento o que foi comprado (nome,
  código no fornecedor, preço, NCM, IPI). Congelamento é imutável e é exigência fiscal; cópia de
  catálogo é proibida.
- Caminho único de leitura: edge `external-db-bridge` → allowlist em `_shared/external-bridge-allowlist.ts`
  → views `v_compras_catalogo` / `v_compras_precos_faixa` no PIM, com `EXTERNAL_DB_URL`/`EXTERNAL_DB_KEY`.
  Só `select`, teto de 500 linhas, sem gravar o resultado. Nunca `service_role` do PIM, nunca FDW.
- **Pare** se for criar tabela/cron/edge de catálogo aqui, chamar endpoint de catálogo de fornecedor
  (XBZ `consultaEstoque`/`getSt`/`produtosCores`, SPOT `ws_products`/`ws_stocks`, Asia, Só Marcas) ou
  cadastrar produto na mão. `produtos`, `produto_fornecedores`, `xbz_produtos`, `xbz_cores`,
  `xbz_produto_fiscal` e as `spot_*` estão **em extinção**: existir não é autorização para usar.
- A API do fornecedor, aqui, serve só para **transação**: credencial, carrinho, gerar/cancelar pedido,
  portador/retirada e status do pedido.

## Stack e comandos — detalhe em `docs/agentes/mapa-repo.md`
- Vite + React + TS (`src/`), Supabase (`supabase/functions/` Deno, `supabase/migrations/`), Playwright
  (`tests-e2e/`), Vitest (`src/**/__tests__/`, `tests-rls/`), i18next (pt/en/es), Zustand, TanStack Query.
- CI instala com **bun** (`bun install`); o repo tem `bun.lock`, `bun.lockb` **e** `package-lock.json` e não
  declara `engines`/`packageManager`/`.nvmrc` (a Vercel lê `.nvmrc`; criar o arquivo mudaria o build).
  A Vercel instala com **npm** (`npm ci`) — não com bun — então os **dois** lockfiles precisam ficar em
  sincronia a cada bump de dependência: `bun.lock` sozinho não publica. Antes de subir bump, rode
  `npm install --package-lock-only` e `npm ci` numa cópia limpa; `overrides.dompurify`/`lodash`/`ws` no
  `package.json` precisam ser >= a dependência direta de mesmo nome, senão o npm sai `EOVERRIDE` e o
  deploy falha em todo commit seguinte.
- `npm run typecheck` (`tsc --noEmit`) · `npx eslint <arquivos>` · `npx vitest run <caminho>` ·
  `npm run test:rls` (produção!) · `npm run test:e2e` · `deno test --allow-net --allow-env --allow-read supabase/functions/` ·
  guards: `npm run guards` (suítes de `scripts/` + inventário de testes + `--check` das docs geradas) e
  `node scripts/ci/check-agents-md-integrity.mjs`.
- Automação em `scripts/<nome>/` com README (leia antes de alterar); nunca em `supabase/` nem `src/`.
- `inventario/estado/*.json` (gerado) antes de grep. O que está quebrado **hoje**: `docs/pendencias/_indice.md`
  (decisões do dono) e `docs/contexto/` (fatos regerados de hora em hora, branch `contexto`).
  `ESTADO_ATUAL.md` + `DOCS/ESTADO/` são gerador de **hipótese**, datados de 16/08/2026 (commit-base
  `f49b29c0`) — confirme no código antes de agir.

## Contexto gerado
Antes de qualquer tarefa ou planejamento: `git fetch origin contexto && git show origin/contexto:docs/contexto/00-INDEX.md`
— diz qual fonte é dona de cada fato (banco ao vivo, código, regras de negócio) e a ordem de leitura.
Regerado a cada hora pelo `contexto.yml` na branch **`contexto`**; nunca editar, nunca abrir PR dela.
Regra que só o negócio sabe → `docs/contexto/regras/manual/*.md` na `main`. Como funciona, secrets e
diagnóstico: `docs/agentes/contexto-ia.md`.
