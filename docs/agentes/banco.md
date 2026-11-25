# Banco de dados — referência para agentes

Ler **antes** de rodar SQL, criar/aplicar migration ou rodar qualquer teste que fale com o Supabase.
Resumo das regras no `AGENTS.md`; aqui está o detalhe. Errar o banco aqui é fácil: o ledger de
migration só foi reconciliado em 25/11/2026 (PR #448, 321 versões de uma vez; são **338** arquivos em
`supabase/migrations/` em 25/11/2026), não há banco local e o `.env` de quem roda — fora do git, ver
item 1 — aponta para produção.

## Onde se trabalha

| Situação | Banco | Como |
|---|---|---|
| Diagnóstico | **produção, só leitura** | `SELECT` pelo MCP do projeto; nunca escrita para "testar" |
| Migration nova | arquivo em `supabase/migrations/` | PR → merge → apply (ver "Regras de migration") |
| Teste de comportamento de banco | **Postgres descartável** | não existe infraestrutura para isso neste repo hoje; se precisar, monte um e diga na PR |
| Migration destrutiva, segredos, rotação de chaves | **só com o dono do projeto** | — |

1. **Não existe desvio para banco local.** Diferente do Zapp, não há `VITE_*_LOCAL_SUPABASE_*`:
   `src/integrations/supabase/client.ts:4-5` lê `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`
   direto, **sem fallback e sem validação** (variável ausente ⇒ `createClient(undefined, undefined)`).
   O `.gitignore:49-52` bloqueia `.env`/`.env.*` e libera só `.env.example` — medido em 25/11/2026 com
   `git ls-files`: o único arquivo de env versionado é `.env.example`. O `.env` **da máquina** aponta para
   a produção, então `npm run dev`, `npm run test:rls` e o E2E usam **produção** por padrão.
2. **`npm run test:rls` bate em produção.** `tests-rls/rls-isolation.test.ts:20-28` exige
   `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` e aborta sem elas (o fallback hardcoded foi
   removido em `0bdc3cb`). A suíte é de leitura anônima (espera 0 linhas), mas com
   `RLS_TEST_USER_A`/`RLS_TEST_USER_B` (`:103-104`) ela **faz login real** no projeto oficial.
3. **`scripts/rls-audit.ts` roda de verdade no CI.** O `main.yml:51-58` injeta `secrets.SUPABASE_DB_URL`
   e chama `bun run scripts/rls-audit.ts --strict`; com `--strict` o script **sai 1** quando não consegue
   auditar (`scripts/rls-audit.ts:247,273`), logo o passo "Security RLS Audit" verde do Quality Gate é
   prova de que o secret existe e a auditoria rodou. Rodado à mão **sem** `SUPABASE_DB_URL` ele apenas
   avisa (`::warning::RLS Audit NÃO EXECUTADA`) e sai 0 — nesse caso não serve de prova. A leitura é por `psql` em transação somente leitura (`scripts/lib/psql-leitura.mjs`): o
   PostgREST deste projeto **não** expõe `pg_catalog` (`406 PGRST106`, medido em 2026-11-09), então
   `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` não servem para isso. Exceção aceita pelo dono vai em
   `scripts/rls-audit.allowlist.json`. `scripts/db-explain-analyze.ts` usa o mesmo caminho.
4. **`.env.example:8` declara o nome certo, `VITE_SUPABASE_PUBLISHABLE_KEY`** (medido em 25/11/2026:
   `VITE_SUPABASE_ANON_KEY` tem 0 ocorrências no arquivo; só `src/tests/integration/supabase-db.test.ts`
   usa esse nome, via `process.env`). Não reintroduza o nome antigo: o código de front não o lê.

## Banco OFICIAL

| O que | Valor |
|---|---|
| Projeto Supabase | **`lmypcdfsrgfftzhxawao`** ("Promo Supply - V2", Supabase Cloud) |
| URL | `https://lmypcdfsrgfftzhxawao.supabase.co` |
| Dashboard | https://supabase.com/dashboard/project/lmypcdfsrgfftzhxawao |
| Onde está escrito | `supabase/config.toml:1` · `supabase/.temp/linked-project.json` · `.env` · `vite.config.ts:90,106,121` · `index.html:13-14` · `deploy_edge_functions_promo_supply.sh:4,9` |
| MCP para SQL | o MCP Supabase apontado para este ref. **Confira o ref antes do primeiro comando** — há MCPs de outros projetos carregados na mesma sessão (abaixo) |
| Ledger de migration | **reconciliado pela PR #448** — `supabase_migrations.schema_migrations` tinha 14 linhas para 336 arquivos (medido no banco ao vivo em 25/11/2026); a #448 (mergeada em 25/11/2026) trouxe `20261127000000_reconcilia_ledger_migrations.sql`, que registra as 321 versões com `ON CONFLICT (version) DO NOTHING`. **NÃO VERIFICADO** se o arquivo já foi aplicado no projeto oficial — confira o `count(*)` antes de tratar "aplicado" como certo |

### Bancos que NÃO são deste projeto (não escrever neles)

- **`trwgmplubeqxrxpncdgf`** e **`apuzcrkeqodktmpwobnz`** — refs **errados** que o código apontou até o
  commit `0bdc3cb` (2026-11-08): `config.toml`, `vite.config.ts`, `index.html`, `SSOConfig.tsx`,
  `src/tests/load/backend-stress.yml` e `tests-rls/`. Corrigidos no código ativo. **Ainda aparecem** em
  migrations antigas que gravaram URL de cron/função no banco —
  `supabase/migrations/20260507194402_*.sql:9` (cron `weekly-summary-report` → `apuzcrkeqodktmpwobnz`),
  `20260711153258_*.sql:18` e `20260726150655_*.sql:61` (`v_url` → `trwgmplubeqxrxpncdgf`). **NÃO VERIFICADO:**
  se os jobs/funções no banco vivo ainda chamam esses hosts — exige `SELECT` em `cron.job` e
  `pg_get_functiondef` na produção. Se estiverem, os cron jobs disparam contra projetos alheios.
- Comentários que descrevem a divergência antiga **como se fosse atual** (desatualizados, não são fonte):
  `.github/workflows/contexto.yml:30`, `types-sync.yml:20`, `inventario-estado-semanal.yml:23`,
  `scripts/types-sync/README.md:17`, `scripts/supabase_snapshot/README.md:7`,
  `scripts/inventario/gerar-banco.mjs:11`, `inventario/README.md:24`.
- `pgxfvjmuubtbowutlide` (MCP "SUPABASE - GESTÃO DE CLIENTES", CRM) e `doufsxqlfjyuvxuezpln`
  (MCP "SUPABASE - GESTÃO DE PRODUTOS", catálogo) — **outros projetos**, carregados na mesma sessão de
  agente. São de **leitura** para este repo; nunca aplique migration neles a partir daqui.
- `cbrlzjdoqdynorjnmmrg` não é projeto: é o `organization_id` em `supabase/.temp/linked-project.json`.

## Regras de migration

1. **Ordem obrigatória: arquivo → PR → merge em `main` → deploy do código → apply.** Nunca DDL a partir
   de branch aberta. `REVOKE`, `DROP`, rename ou mudança de contrato de função usada pelo front/edges:
   **nunca** antes do deploy do código correspondente.
2. **Caminho oficial de apply: workflow `aplicar-migration-prod.yml`** (dispatch manual, exige o nome exato
   do arquivo em `supabase/migrations/` e a confirmação `APLICAR`; transação única — migration não roda em
   pedaços). Ele **não grava no ledger**: quem aplica por ele precisa registrar a versão depois (ou a
   próxima migration pelo caminho padrão tenta reexecutar o arquivo). Origem dos 338 arquivos: painel/
   Lovable e aplicações manuais, maioria com nome UUID gerado pela Lovable. **Antes de aplicar qualquer
   DDL, pergunte ao dono qual é o caminho.**
3. **Sem ledger completo, "aplicado" não é verificável por arquivo.** A paridade de objetos
   (`paridade-banco.yml`; os runs de 24/11 e de 25/11/2026 terminaram em success) prova que o conjunto de
   objetos declarado nas migrations bate com o banco vivo, mas 50 dos arquivos não declaram objeto (só
   `DML`/`GRANT`). Confirme o estado real no banco (`pg_get_functiondef`, `pg_indexes`, `pg_policies`,
   `information_schema.columns`) antes de afirmar que uma migration está em produção.
   A PR #448 (mergeada em 25/11/2026) é a evidência de "já rodou": registra as 321 versões aplicadas (321
   + a própria) com `ON CONFLICT (version) DO NOTHING` — **NÃO VERIFICADO** se o SQL já foi aplicado.
   `inventario/estado/banco.json` — que cruzaria isso — **não existe** ainda (falta o secret
   `SUPABASE_ACCESS_TOKEN`; `inventario/README.md`).
4. **Versão sem colisão:** antes de criar o arquivo, `ls supabase/migrations | tail` **e** busca de PRs
   abertas tocando `supabase/migrations/` (`github_graphql`; há PRs abertas de outros agentes).
   Padrão do nome: `AAAAMMDDHHMMSS_<slug>.sql` para arquivo novo escrito à mão.
5. `CREATE INDEX CONCURRENTLY` e `VACUUM` não rodam pelo MCP (o gateway envolve em transação) — use
   `CREATE INDEX` simples.
6. **`scripts/squash-migrations.sh` é destrutivo e nunca foi executado:** concatena tudo antes de um
   cutoff em `<última migration consolidada>_squashed_baseline.sql` e **apaga os originais**. Só com o
   dono, e só depois de o ledger estar reconciliado (#448 mergeada em 25/11/2026; ver "Regras de
   migration", item 3). `--dry-run` mostra o plano sem tocar em nada.
7. Mexeu em RLS, função, trigger ou índice → leia antes
   `git show origin/contexto:docs/contexto/supabase/lints.md` (fonte dona do schema ao vivo) e rode
   `npm run test:rls` ciente de que ele fala com produção.
8. `src/integrations/supabase/types.ts` é **gerado** pelo `types-sync.yml` a partir do banco oficial —
   nunca edite à mão; mexeu em DDL, espere o PR `automation/types-sync` ou rode `scripts/types-sync/gen-types.sh`
   com `SUPABASE_ACCESS_TOKEN` + `SUPABASE_PROJECT_REF` (Management API, o mesmo motor que gerou o arquivo).
   Sem o token o script cai em `--db-url`, que introspecta o Postgres direto e gera um arquivo diferente —
   é a causa do PR de types reaparecendo toda hora.

Sessões paralelas commitam no mesmo repo e falam com o mesmo banco: re-sync antes de editar e confira
PRs abertas antes de tocar `supabase/`.
