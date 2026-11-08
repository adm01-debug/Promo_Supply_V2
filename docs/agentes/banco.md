# Banco de dados — referência para agentes

Ler **antes** de rodar SQL, criar/aplicar migration ou rodar qualquer teste que fale com o Supabase.
Resumo das regras no `AGENTS.md`; aqui está o detalhe. Errar o banco aqui é fácil: não há ledger de
migration, não há banco local e o `.env` do repo aponta para produção.

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
   O `.env` **está comitado no repo** e aponta para a produção, e o `.gitignore` não tem entrada de env —
   portanto `npm run dev`, `npm run test:rls` e o E2E usam **produção** por padrão.
2. **`npm run test:rls` bate em produção.** `tests-rls/rls-isolation.test.ts:20-28` exige
   `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` e aborta sem elas (o fallback hardcoded foi
   removido em `0bdc3cb`). A suíte é de leitura anônima (espera 0 linhas), mas com
   `RLS_TEST_USER_A`/`RLS_TEST_USER_B` (`:103-104`) ela **faz login real** no projeto oficial.
3. **`scripts/rls-audit.ts` é no-op no CI.** Sem `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` ele faz
   `process.exit(0)` com aviso (`scripts/rls-audit.ts:13-16`), e o `main.yml` não injeta esses secrets:
   o passo "Security RLS Audit" do Quality Gate passa verde **sem auditar nada**. Não confie nele como prova.
4. **`.env.example:8` declara `VITE_SUPABASE_ANON_KEY`, um nome que o código não lê.** Quem copiar o
   exemplo sobe um front sem chave. O nome correto é `VITE_SUPABASE_PUBLISHABLE_KEY`.

## Banco OFICIAL

| O que | Valor |
|---|---|
| Projeto Supabase | **`lmypcdfsrgfftzhxawao`** ("Promo Supply - V2", Supabase Cloud) |
| URL | `https://lmypcdfsrgfftzhxawao.supabase.co` |
| Dashboard | https://supabase.com/dashboard/project/lmypcdfsrgfftzhxawao |
| Onde está escrito | `supabase/config.toml:1` · `supabase/.temp/linked-project.json` · `.env` · `vite.config.ts:90,106,121` · `index.html:13-14` · `deploy_edge_functions_promo_supply.sh:4,9` |
| MCP para SQL | o MCP Supabase apontado para este ref. **Confira o ref antes do primeiro comando** — há MCPs de outros projetos carregados na mesma sessão (abaixo) |
| Ledger de migration | **não existe** (`supabase_migrations.schema_migrations` ausente, conforme `DOCS/ESTADO/L12_BANCO_E_RUNTIME.md:35`; não reverificado no banco ao vivo) |

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
2. **NÃO VERIFICADO: como o DDL entra em produção hoje.** Não há workflow de migration
   (grep por `supabase db|functions deploy` em `.github/workflows/` = zero), não há script de registro e
   não há ledger. O indício é aplicação pelo painel/Lovable (279 arquivos, maioria com nome UUID gerado
   pela Lovable). **Antes de aplicar qualquer DDL, pergunte ao dono qual é o caminho** — aplicar por fora
   e não registrar é como o repo chegou a 279 arquivos sem saber o que rodou.
3. **Sem ledger, "aplicado" não é verificável por arquivo.** Confirme o estado real no banco
   (`pg_get_functiondef`, `pg_indexes`, `pg_policies`, `information_schema.columns`) antes de afirmar que
   uma migration está em produção. `inventario/estado/banco.json` — que cruzaria isso — **não existe**
   ainda (falta o secret `SUPABASE_ACCESS_TOKEN`; `inventario/README.md`).
4. **Versão sem colisão:** antes de criar o arquivo, `ls supabase/migrations | tail` **e** busca de PRs
   abertas tocando `supabase/migrations/` (`github_graphql`; há PRs abertas de outros agentes).
   Padrão do nome: `AAAAMMDDHHMMSS_<slug>.sql` para arquivo novo escrito à mão.
5. `CREATE INDEX CONCURRENTLY` e `VACUUM` não rodam pelo MCP (o gateway envolve em transação) — use
   `CREATE INDEX` simples.
6. **`scripts/squash-migrations.sh` é destrutivo e nunca foi executado:** concatena tudo antes de um
   cutoff em `<CUTOFF>_squashed_baseline.sql` e **apaga os originais** (`:157-160`). Só com o dono, e só
   depois de existir ledger.
7. Mexeu em RLS, função, trigger ou índice → leia antes
   `git show origin/contexto:docs/contexto/supabase/lints.md` (fonte dona do schema ao vivo) e rode
   `npm run test:rls` ciente de que ele fala com produção.
8. `src/integrations/supabase/types.ts` é **gerado** pelo `types-sync.yml` a partir do banco oficial —
   nunca edite à mão; mexeu em DDL, espere o PR `automation/types-sync` ou rode `scripts/types-sync/gen-types.sh`.

Sessões paralelas commitam no mesmo repo e falam com o mesmo banco: re-sync antes de editar e confira
PRs abertas antes de tocar `supabase/`.
