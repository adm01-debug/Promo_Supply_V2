# `scripts/lib/` — biblioteca compartilhada dos scripts

Nenhum efeito colateral: importar não executa nada.

## `seguranca-processo.mjs`

| Export | Para que serve |
|---|---|
| `RAIZ_REPO` | raiz do repositório, derivada da posição do próprio arquivo (duas pastas acima) |
| `RAIZES_PERMITIDAS` | raízes onde os scripts legitimamente leem/escrevem: o repo e os diretórios temporários |
| `resolverExecutavel(cmd)` | caminho **absoluto** do binário antes de criar processo filho; lança se não existir no `PATH`. Como o shell: só **arquivo** executável conta (diretório homônimo é pulado), entrada relativa do `PATH` vira caminho absoluto, e nome vazio ou com `/` é recusado (não passa pela busca) |
| `resolverCaminhoPermitido(valor, rotulo)` | recusa caminho vindo de `argv`/env que escape das raízes permitidas (path traversal); **fail-closed**: lança. Segue link simbólico inclusive quando o alvo ainda não existe (link pendurado) e lança em ciclo de links |
| `estaDentro(raiz, candidato)` | verdadeiro quando `candidato` está dentro de `raiz` |

**Quem importa:** `scripts/ci/check-test-inventory.mjs` e `scripts/ci/audit-prod.mjs`
(`resolverExecutavel`, antes de chamar `git` e `bun`).

**Por que existe:** passar `env: { PATH: '<fixo>' }` para `spawnSync` não resolve o problema — e piora,
porque troca o binário resolvido e pode pular um shim de guarda do ambiente. Resolver o caminho absoluto
pelo `PATH` de quem chamou preserva exatamente o binário que o shell resolveria.

**Teste:** `seguranca-processo.test.mjs`, executado por `guards.yml` → `node --test scripts/lib/*.test.mjs`.
Uma das asserções confere `package.json#name` para provar que `RAIZ_REPO` resolveu a raiz certa; o valor
esperado é o **medido** (`vite_react_shadcn_ts`, nome do template Lovable que o repo ainda carrega), não o
desejado — se o pacote for renomeado, atualize a asserção junto.

Veio do `Zapp_Web_V2`; a única diferença é esse nome de pacote.

## `psql-leitura.mjs`

SQL somente leitura via `psql`, para os scripts que precisam do catálogo do Postgres
(`pg_policies`, `pg_class`) ou de `EXPLAIN ANALYZE` — o PostgREST deste projeto **não** expõe
`pg_catalog` (`406 PGRST106`, medido em 2026-11-09), então a única leitura que funciona é a conexão
direta (`SUPABASE_DB_URL`, o mesmo secret do `types-sync.yml`).

| Export | Para que serve |
|---|---|
| `REF_OFICIAL` | project-ref do Supabase oficial (`lmypcdfsrgfftzhxawao`); único destino não-loopback aceito |
| `montarAmbientePsql(connectionString, { refEsperado })` | valida o destino (loopback de teste ou o projeto oficial) e devolve `{ env, local, mascarar }` — a senha vai em `PGPASSWORD` do ambiente do filho, nunca em argv |
| `criarMascara(senha)` | função que troca a senha (crua e url-encoded) por `***` em qualquer texto |
| `exigirComandoUnico(sql)` | recusa SQL com mais de um comando ou que não comece por `SELECT/WITH/EXPLAIN/SHOW/VALUES/TABLE` — defesa em profundidade, não é o que impede escrita |
| `executarSqlLeitura(sql, ambiente, opcoes)` | roda **um** comando dentro de `BEGIN TRANSACTION READ ONLY ... ROLLBACK` com `statement_timeout`; é a transação, não um regex, que recusa qualquer escrita (inclusive CTE com `DELETE`/`UPDATE`) |
| `consultarJson(sql, ambiente, opcoes)` | `executarSqlLeitura` + `JSON.parse` |

**Quem importa:** `scripts/rls-audit.ts` e `scripts/db-explain-analyze.ts`.

**Teste:** `psql-leitura.test.mjs` (`node --test scripts/lib/*.test.mjs`); a suíte de uso real dos dois
scripts está em `scripts/ci/scripts-operacionais.unit.mjs`, com um `psql` falso no PATH.
