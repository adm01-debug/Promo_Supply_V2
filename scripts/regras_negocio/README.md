# regras_negocio — regras de negócio para agentes de IA

Produtor da fonte **regras de negócio** do contexto para agentes. Lê código, migrations/`types.ts` e
`docs/contexto/regras/manual/` (texto humano) e publica, na branch derivada `contexto`:

| Arquivo | Conteúdo |
|---|---|
| `docs/contexto/regras/07-REGRAS-DE-NEGOCIO.md` | regras manuais · RLS por operação · constraints/CHECK/FK/colunas calculadas · triggers + `RAISE EXCEPTION` · máquinas de estado (colunas de status, mapas de transição, valores usados no código) · validações (Zod + refine, react-hook-form, inputs) · fórmulas · parâmetros e prazos · mensagens de erro · testes como especificação · eventos de webhook · efeitos colaterais |
| `docs/contexto/regras/10-ACESSO-E-SEGURANCA.md` | perfis, matriz tabela × operação → quem pode, onde o RLS é ignorado (service_role, SECURITY DEFINER), edge functions públicas, rotas protegidas, multi-tenancy, soft delete, PII, colunas de dinheiro |
| `docs/contexto/regras/11-GLOSSARIO-E-LACUNAS.md` | glossário, seed, inconsistências código × schema (NÃO VERIFICADO) e lacunas que só o dono do negócio responde |
| `docs/contexto/regras/manifest.json` | `gerado_em`, `commit`, `entrada`, `arquivos` — lido pelo `indice.py` |
| `docs/contexto/00-INDEX.md` | índice único das três fontes (banco real, código, regras), gerado por `indice.py` |

O que **não** é daqui (cada fato tem um dono): schema real → snapshot do banco (`docs/contexto/supabase/`,
`scripts/supabase_snapshot/`); rotas/módulos/hooks/edges/grafo → `docs/contexto/codigo/` (`scripts/ai-context/gerar.mjs`). Tudo na branch `contexto`, job a job em `.github/workflows/contexto.yml`.

## Arquivos

- `generate.py` — gerador (stdlib, alguns segundos neste repo). `--profile regras` escreve só 07/10/11; `--schema-snapshot` faz o 06 apontar para o snapshot em vez de reconstruir. Sai com 2, sem escrever nada, se `--repo` não for um diretório ou o perfil (flag ou `AI_CONTEXT_PROFILE`) for inválido.
- `indice.py` — monta `00-INDEX.md` lendo o `manifest.json` de cada fonte (`--fonte "NOME=CAMINHO[@BRANCH]"`); fonte que vive em outra branch entra como "como ler" (git show / raw), sem inventar conteúdo. `--fonte` sem nome ou sem caminho e `--repo` inexistente saem com 2.
- `publish.sh` — publicação genérica (push / PR / branch derivada) para uso standalone em outros repos; **neste repo não é usado**: o job `publicar` do `contexto.yml` monta a branch `contexto` e o índice. Recusa (exit 2) `MODE` desconhecido e HEAD destacado sem `BRANCH`; assina os commits como bot por variável de ambiente, sem gravar identidade no `.git/config`; no modo `branch` devolve o checkout na branch de origem sem nada staged, mesmo em falha.
- Workflow: job `regras` (+ `publicar`, que monta o índice) em `.github/workflows/contexto.yml`.

O índice distingue `ok`, `parcial` (falha de coleta ou reaproveitamento), `não verificável` (manifest/relatório ilegível, data de geração ausente/ilegível ou mais de 5 min no futuro), `desatualizado` e fonte ausente.
Código/regras com commit igual ao HEAD continuam atuais apesar da idade da coleta; banco real e fontes sem commit confirmado seguem o limite de idade configurado.

## Fontes SQL

Arquivos `.sql` em diretórios chamados exatamente `_foreign` ou `_superseded` são históricos:
continuam no inventário de arquivos, mas não entram na reconstrução do schema nem na extração
de regras do código. Outras pastas de migrations e fontes SQL, Prisma e tipos gerados mantêm
a seleção existente. A reconstrução é estática; só o snapshot descreve o banco em produção.

O que a reconstrução segue, na ordem dos nomes dos arquivos:

- `DROP TABLE` leva junto políticas, triggers, índices e o estado de RLS; `DROP VIEW`, `ALTER POLICY`
  (expressão, roles, nome), `ALTER FUNCTION … SET search_path` / `SECURITY DEFINER|INVOKER` e
  `DROP FUNCTION f(tipos)` (só a sobrecarga de mesma aridade) são aplicados;
  `CREATE TABLE IF NOT EXISTS` sobre tabela que já existe não muda nada; `ALTER TABLE` com várias ações
  aplica todas.
- DDL dentro de bloco `DO $$ … $$`: estático (`IF … THEN CREATE POLICY …`), `EXECUTE 'literal'`,
  `EXECUTE format('…%I…', …)` em `FOREACH … IN ARRAY` de literais e helper chamado por `SELECT fn('x')`.
  `IF [NOT] EXISTS (…)` sobre `information_schema.tables/columns` e `pg_policies` é avaliado contra o
  schema reconstruído até aquele ponto; o ramo falso é pulado. DDL dinâmico só vale para tabela que
  uma migration criou.
- O que só o banco sabe — `EXECUTE` montado a partir do catálogo (`FOR r IN SELECT … FROM pg_policies`),
  ou política sob condição não avaliável — **não é adivinhado**: vai para `schema.dynamic_ddl` no
  `context.json`, vira item `ddl dinâmico` no 11 e aviso **NÃO VERIFICADO** no topo da tabela de RLS do
  07 e da matriz do 10. Neste repo isso inclui a migration que reescreve as políticas de tenant
  (`current_tenant_id()` → `tenant_in_my_group(tenant_id)`): as expressões listadas para essas políticas
  são as do `CREATE POLICY` original.
- Na matriz do 10, `?` = nenhuma migration liga/desliga RLS na tabela (ex.: tabela conhecida só pelo
  `types.ts`); `sem RLS` só aparece quando uma migration desliga. Views do bloco `Views:` do `types.ts`
  não entram como tabela.
- Enquanto o snapshot do banco não existir (pasta ausente ou vazia), 07 e 10 dizem isso no lugar de
  apontar para um `06` que o perfil `regras` não escreve, e `schema_real_em` fica vazio no manifest.

## Regras humanas

`docs/contexto/regras/manual/*.md` (exceto README e TEMPLATE) entram na seção A do 07 com prioridade
máxima e nunca são sobrescritos. Comece copiando `TEMPLATE-regras-de-negocio.md` (criado na 1ª execução)
para `regras.md`. Editar `manual/` em main dispara o workflow.

## Rodar local

```bash
python3 scripts/regras_negocio/generate.py --repo . --out docs/contexto/regras --profile regras --schema-snapshot docs/contexto/supabase --no-pointer
python3 scripts/regras_negocio/indice.py --repo . --out docs/contexto/00-INDEX.md \
  --fonte "banco real=docs/contexto/supabase" --fonte "código=docs/contexto/codigo" --fonte "regras de negócio=docs/contexto/regras"
```

Ler o resultado: `git fetch origin contexto && git show origin/contexto:docs/contexto/00-INDEX.md`.

## Testes de regressão

```bash
python3 scripts/regras_negocio/test_generate.py -v
node --test scripts/ci/regras-negocio.unit.mjs
```

A suíte usa fixtures locais e cobre SQL ativo versus histórico, objetos do schema, fontes
Prisma/tipos, a saída do perfil `regras`, DDL embutido (bloco `DO`, `EXECUTE`, DROP em cascata, ALTER
composto), extração do código (constantes com o valor inteiro, checagens de perfil, mapas de transição,
comentários), o que os `.md` afirmam (RLS desconhecido, perfis não confirmados, auditoria sem fixtures
de `scripts/`) e o `indice.py` (fonte malformada, manifest ruim, data ausente/futura, commit × idade).
O adaptador Node cobre o `publish.sh` com remoto bare descartável (corridas, MODE inválido, HEAD
destacado, identidade git, falha no meio do modo `branch`). O job `regras` do `contexto.yml` roda a
suíte Python e `npm run test:scripts` roda o adaptador; nenhum teste acessa banco ou API de LLM.

Origem e testes (430 cenários sintéticos + simulação git de 3 produtores na mesma branch): pacote
`ai-context-sync` no Project "SCRIPTS | AUTÔNOMOS | REPOSITÓRIO".
