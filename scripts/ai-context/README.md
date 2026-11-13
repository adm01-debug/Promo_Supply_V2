# ai-context — contexto de código para agentes de IA

**O que faz:** `gerar.mjs` lê o repositório (zero dependências, Node ≥ 18) e escreve JSONs + `INDEX.md`
com rotas, menu, módulos, componentes, hooks, edge functions, banco (migrations/types), testes, CI, scripts,
convenções e baseline. Genérico: React/Next/Vue/Svelte/Nuxt/Remix/Astro, Express/Hono/Fastify/Nest,
FastAPI/Flask/Django, Supabase/Prisma/Drizzle/TypeORM/SQL. Saída determinística: só `manifest.json` tem data;
mesmo commit + mesma árvore = mesmos bytes em qualquer máquina, locale (`LANG`/`LC_ALL`) ou dia — as janelas
"últimos 7/30/90 dias" do `baseline.json` contam a partir da data do commit HEAD, não do relógio.

**Como rodar:** `node scripts/ai-context/gerar.mjs [--root <dir>] [--out <dir>] [--quiet]`
(padrão de saída `inventario/ia`, ou `ai-context.config.json → out`, ou env `AI_CONTEXT_DIR`; `--out` relativo
resolve contra `--root`). **Exit code:** `0` = gerou (seção que falhou fica em `manifest.json → erros` e no
topo do `INDEX.md`); `2` = uso inválido, **nada é escrito** — argumento desconhecido, `--out`/`--root` sem
valor, raiz que não é diretório ou `--out` igual à raiz do repo; `1` = erro de escrita (ex.: `--out` é um arquivo).
Testes: `node --test scripts/ai-context/gerar.unit.mjs`. Cenários (217 repositórios sintéticos + fuzz, ~45 s,
fora do CI): `node scripts/ai-context/cenarios.mjs [--only <trecho>] [--keep]` — sai `1` se algum falhar ou se
`--only` não casar nenhum cenário.
O job `codigo` do `contexto.yml` executa a suíte `gerar.unit.mjs`; `npm run test:scripts` roda os três adaptadores de `scripts/ci/`.

**Config opcional** (`ai-context.config.json` na raiz): `out`, `skipDirs`, `srcDirs`, `menuFiles`,
`routeFiles`, `aliases`, `typesFile`, `maxFileMB`, `publicacao` (texto do rodapé do `INDEX.md` dizendo
onde o contexto é publicado neste repo; env `AI_CONTEXT_PUBLICACAO` tem precedência). Config com JSON inválido
não derruba a geração: usa os padrões e registra `secao: "config"` em `erros`.

**Neste repo:** o workflow `.github/workflows/contexto.yml` roda o gerador a cada push em `main` e a cada
hora e publica em `docs/contexto/codigo/` na branch `contexto` (índice único em `docs/contexto/00-INDEX.md`).

**Secrets:** nenhum (lê só arquivos do repo e `git log`).

## Alcance dos alertas

- O schema reconstruído ignora os diretórios `_foreign/` e `_superseded/`: são histórico, não migrations
  vigentes. Os demais SQLs e diretórios de migrations continuam sendo considerados.
- Alertas de tabela/RPC/edge inexistente e o mapa de chamadores da aplicação excluem testes, stories e
  raízes de ferramentas/documentação (`scripts/`, `bin/`, `tools/`, `.github/`, `docs/`, `inventario/`,
  `analise/`, `examples/`, `samples/`, inclusive sob pacotes de monorepo). Esses arquivos continuam nos
  inventários próprios. Uma raiz desse tipo que contenha aplicação pode ser declarada em `srcDirs`.
- A mesma regra vale para tudo que descreve a **aplicação**: `rotas_http_backend`, `hooks.json`, tabelas de
  ORM (Drizzle/TypeORM/modelos Python), feature flags, papéis, hosts externos, canais realtime e buckets só
  saem de arquivos de aplicação; `env.usadas_no_front`/`usadas_nas_edges` ignoram arquivos de teste. Um script
  com trechos de código em string (como `cenarios.mjs`) não vira fato do sistema.
- São teste: `*.test|spec|unit|e2e|contract|fixture.*`, `*_test.ts` (convenção do `deno test`), pastas
  `__tests__/`, `tests/`, `e2e/`, `fixtures/`… em qualquer nível e `tests-<algo>/` na raiz (`tests-e2e/`).
- Rotas: a proteção é herdada pela pilha de `<Route>`, inclusive de rota-layout sem `path`
  (`<Route element={<ProtectedRoute>…}>`); `fallback={…}` e `errorElement={…}` não contam como tela nem como
  guarda; a tag mais interna (a tela) só marca proteção se tiver nome de guarda (`RequireAuth`, `AdminRoute`…).
- Edge functions: `functions.invoke<T>('nome')`, `'nome?x=1'` e `` `nome?id=${id}` `` contam como chamada;
  nome montado só por variável (`${endpoint}`) continua invisível. Pasta em `functions/` sem arquivo de
  entrada e sem código (só suítes) não é listada. `storage.from('bucket')` é bucket, nunca tabela.
- Workflows: linhas só de comentário são ignoradas; `secrets` só conta como `${{ secrets.NOME }}` (não o
  nome de um arquivo `*-secrets.mjs`); script usado via `bun run scripts/x.ts` ou `import … from './scripts/x.mjs'`
  entra em `scripts_usados`.
- `convencoes.alias_imports` lista só alias declarado (tsconfig/jsconfig, inclusive JSONC, ou `aliases` da
  config) ou presumido **e usado** por algum import; `MODE/DEV/PROD/SSR/BASE_URL` do Vite não são env.
- `baseline.alertas.arquivos_nao_lidos_por_tamanho`: arquivos acima de `maxFileMB` (padrão 8) que foram
  contados mas não analisados.
- As relações são extraídas estaticamente: referência encontrada não prova execução; ausência de
  chamador no mapa não prova que uma edge não tenha consumidor externo. Marcadores `TODO` também são
  candidatos para revisão — texto em português sem pontuação pode ser ambíguo.
