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
  commite token, `service_role` ou `SUPABASE_DB_URL`. O `.env` deste repo está comitado e o `.gitignore` não
  tem entrada de env: não acrescente nada sensível a ele.

## Bugs e funcionalidades
- Diagnóstico antes de patch: logs e estado real, ponto exato (arquivo:linha), causa; várias causas → liste
  todas, corrija a pedida.
- Antes da PR: `npm run typecheck`, `npx eslint <arquivos tocados>` e `npx vitest run <caminho>` do que tocou
  (edge em Deno → `deno test --allow-net --allow-env --allow-read supabase/functions/<pasta>`). **Não há hook
  de git neste repo** (sem `.husky/`, `"prepare": ""`, sem `commitlint`): nada roda sozinho no commit. Só erro
  seu conta; erro herdado da `main` → "Próximos passos".
- "Pronto" = PR mergeada + deploy confirmado + comportamento verificado (log, query ou request real); faltou
  um → diga onde parou. Merge em `main` = deploy de produção na Vercel, e **não há branch protection**:
  conferir o resultado do CI antes de mergear é obrigação de quem mergeia.
- Funcionalidade pronta = integrada ponta a ponta (rota em `src/routes/AppRoutes.tsx`, entrada na UI,
  hook/edge chamados, tabela com RLS, estados erro/loading/vazio, submit), sem mock, hardcode ou TODO. Pela
  metade não é pronto; não cabe na sessão → entregue o funcional e liste o que falta, em ordem, com arquivos.
  Nunca deixe código morto ou feature "quase" sem dizer — aqui 99 das 162 tabelas de produção estão vazias e
  três fluxos têm o fio cortado (`docs/agentes/regras-dominio.md`).

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
- Repo `adm01-debug/Promo_Supply_V2`, `main`, **privado**. Escrita no GitHub: MCP **`GITHUB - MCP - FOREVER`**
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
- **Não existe banco local nem desvio:** `.env` está comitado e aponta para produção, então `npm run dev`,
  `npm run test:rls` e o E2E falam com **produção**. Diagnóstico = só leitura. `npm run test:rls` com
  `RLS_TEST_USER_A/B` faz login real. O passo "RLS Audit" do CI é **no-op** (sai `exit 0` sem os secrets).
- **Não há ledger de migration** (`supabase_migrations.schema_migrations` ausente) e nenhum workflow aplica
  DDL: 279 arquivos sem registro do que rodou. Ordem obrigatória: arquivo → PR → merge → deploy do código →
  apply, e **pergunte ao dono qual é o caminho do apply** antes do primeiro DDL. Destrutivo, segredos e
  rotação: só com o dono.
- `src/integrations/supabase/types.ts` é gerado pelo `types-sync.yml` — nunca editar à mão.

## Serviços
- **Deploy** — ler `docs/agentes/deploy.md` ao confirmar deploy ou mexer em env/domínio. Front na **Vercel**
  (projeto `promo-supply-v2`, team `juca1`): merge em `main` = produção. **Edge: deploy manual** por
  `deploy_edge_functions_promo_supply.sh` (31 das 39); nenhum workflow publica edge. Nunca segredo de servidor
  na Vercel; `VITE_*` é público.
- **Serviços externos** — ler `docs/agentes/servicos-externos.md` ao mexer em edge que fale com fora (XBZ,
  Spot Gifts, AI Gateway da Lovable, SEFAZ, Resend/Slack, `external-db-bridge`, punchout, `erp-sync`, SCIM,
  WebAuthn). CORS/auth/tenant vêm de `supabase/functions/_shared/security.ts`.
- **GitHub/CI** — ler `docs/agentes/github-ci.md` ao mexer em settings ou `.github/workflows/`. São 7
  workflows (`main`, `contexto`, `types-sync`, `inventario-estado-semanal`, `guards`,
  `branch-hygiene-audit`, `notifica-falha-main`); `main.yml` ainda se chama "Freight Quest CI/CD". A tabela
  do que cada um prova é **gerada** em `docs/ci/README.md` a partir do bloco `# docs:` do YAML — não edite
  o README. As suítes de `scripts/` rodam no `guards.yml`, e `check-test-inventory.mjs` reprova suíte nova
  sem passo em workflow. O que foi portado do Zapp e o que faltou (com motivo) está no fim do
  `docs/agentes/github-ci.md`.
- **Regras de domínio** — ler `docs/agentes/regras-dominio.md` antes de mexer em solicitação, cotação,
  aprovação, acompanhamento ou login/passkey.

## Stack e comandos — detalhe em `docs/agentes/mapa-repo.md`
- Vite + React + TS (`src/`), Supabase (`supabase/functions/` Deno, `supabase/migrations/`), Playwright
  (`tests-e2e/`), Vitest (`src/**/__tests__/`, `tests-rls/`), i18next (pt/en/es), Zustand, TanStack Query.
- CI instala com **bun** (`bun install`); o repo tem `bun.lock`, `bun.lockb` **e** `package-lock.json` e não
  declara `engines`/`packageManager`/`.nvmrc` (a Vercel lê `.nvmrc`; criar o arquivo mudaria o build).
- `npm run typecheck` (`tsc --noEmit`) · `npx eslint <arquivos>` · `npx vitest run <caminho>` ·
  `npm run test:rls` (produção!) · `npm run test:e2e` · `deno test --allow-net --allow-env --allow-read supabase/functions/` ·
  guards: `npm run guards` (suítes de `scripts/` + inventário de testes + `--check` das docs geradas) e
  `node scripts/ci/check-agents-md-integrity.mjs`.
- Automação em `scripts/<nome>/` com README (leia antes de alterar); nunca em `supabase/` nem `src/`.
- `inventario/estado/*.json` (gerado) antes de grep. `ESTADO_ATUAL.md` + `DOCS/ESTADO/` = o que está quebrado
  e onde fica cada prova.

## Contexto gerado
Antes de qualquer tarefa ou planejamento: `git fetch origin contexto && git show origin/contexto:docs/contexto/00-INDEX.md`
— diz qual fonte é dona de cada fato (banco ao vivo, código, regras de negócio) e a ordem de leitura.
Regerado a cada hora pelo `contexto.yml` na branch **`contexto`**; nunca editar, nunca abrir PR dela.
Regra que só o negócio sabe → `docs/contexto/regras/manual/*.md` na `main`. Como funciona, secrets e
diagnóstico: `docs/agentes/contexto-ia.md`.
