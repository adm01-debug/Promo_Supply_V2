# scripts/types-sync

Automação que mantém `src/integrations/supabase/types.ts` igual ao schema do banco oficial.
Quem orquestra é `.github/workflows/types-sync.yml`; aqui ficam só os executáveis.

Portado de `Zapp_Web_V2` (`scripts/ci/` + `scripts/db-audit/`), reduzido ao que este repositório tem.
Leia este README antes de alterar qualquer arquivo desta pasta.

## Secrets necessários

| Secret | Obrigatório | O que é |
|---|---|---|
| `SUPABASE_ACCESS_TOKEN` | sim | Personal access token (`sbp_...`) da Management API. É o que o `gen types --project-id` usa para pedir os types ao endpoint oficial — o mesmo que gerou o `types.ts` commitado. Sem ele o workflow sai verde com aviso no agendamento e no push, e falha no `workflow_dispatch`. |
| `SUPABASE_DB_URL` | só no modo legado | Usado apenas quando `SUPABASE_ACCESS_TOKEN` **não** existe: cai em `gen types --db-url`, atrás do pgbouncer local. Esse caminho introspecta o Postgres direto e produz um arquivo **diferente** do oficial (ver "Por que Management API"). |
| `VITE_SUPABASE_PROJECT_ID` | já existe | Project-ref esperado. É conferido contra o `project_id` de `supabase/config.toml`; se divergirem, nada é proposto. Também serve de fallback para `SUPABASE_PROJECT_REF`. |
| `TYPES_SYNC_PR_TOKEN` | não | PAT fine-grained (`contents:write`, `pull_requests:write`). Sem ele o workflow usa `GITHUB_TOKEN` e aprova os próprios checks com `actions:write`. |

Project-ref: até o commit `0bdc3cb` o repo divergia (`supabase/config.toml` dizia `trwgmplubeqxrxpncdgf`
e o `.env`, `lmypcdfsrgfftzhxawao`); hoje os dois dizem `lmypcdfsrgfftzhxawao`. A automação segue sem
ref escrito no código — ela confia nos secrets e falha se os dois discordarem.

## Arquivos

| Arquivo | Papel |
|---|---|
| `identidade-banco.mjs` | Extrai o project-ref da connection string sem exibir a credencial, confere contra `VITE_SUPABASE_PROJECT_ID`, força `sslmode=verify-full` com a CA pinada e decompõe a URL para o pgbouncer. |
| `certs/supabase-prod-ca-2021.crt` | CA raiz do Supabase Cloud, pinada por SHA-256 e por fingerprint em `identidade-banco.mjs`. Trocar o arquivo sem trocar o pin reprova a execução. |
| `gen-types.sh` | `supabase gen types typescript --project-id` contra a Management API (caminho canônico). Sem `SUPABASE_ACCESS_TOKEN` no ambiente cai no modo legado `--db-url`, atrás do pgbouncer local (esse caminho exige `pg_isready`). Aceita `--local` para introspectar um `supabase db start`. Só grava a saída se ela tiver `export type Database = {`: CLI que sai 0 com saída vazia ou com texto de erro termina em exit 1 e o arquivo de destino fica como estava. `SIGINT`/`SIGTERM`/`SIGHUP` encerram o script (exit 130/143/129) em vez de cair na próxima tentativa. |
| `local-pg-proxy.mjs` | Escreve a config do pgbouncer loopback. Existe porque a CLI entrega a `--db-url` em texto puro a um container Docker, onde a credencial ficaria visível via `/proc` a processos irmãos do mesmo job. |
| `install-postgresql-client.sh` | Instala `psql`/`pg_isready` dos repositórios oficiais do Ubuntu (ignora espelhos de terceiros do runner). |
| `install-pgbouncer.sh` | Idem para o `pgbouncer`. |
| `typecheck-ratchet.mjs` | **Gate 1**: roda `tsc --noEmit -p tsconfig.app.json` com o `types.ts` commitado e com o candidato; reprova só se o candidato introduzir erro novo. Erro que a `main` já tem nunca bloqueia o sync. Se o `tsc` não concluir a medição (morto por sinal/OOM, exit fora de 0–2, exit ≠ 0 sem nenhuma linha `error TS`) ou se o tsconfig/`types.ts` do repo não existir, sai com `2` — nunca aprova sem ter medido. Para medir ele troca o conteúdo de `src/integrations/supabase/types.ts` em disco e **restaura o conteúdo que encontrou** em qualquer saída, inclusive interrupção. |
| `check-remocoes-destrutivas.mjs` | **Gate 2**: compara o inventário de objetos (`Tables`, `Views`, `Functions`, `Enums`, `CompositeTypes`) dos dois `types.ts` e bloqueia a remoção de objeto que `src/` ainda consome (`.from()`, `.rpc()`, `Tables<'x'>`, acesso indexado, realtime com `table: 'x'`). Remoção sem consumidor passa com aviso. Não olha coluna nem valor de enum (isso é do Gate 1) nem `supabase/functions/`. |

## Uso manual

```bash
# gerar o candidato pela Management API (precisa de supabase CLI + token)
SUPABASE_ACCESS_TOKEN="sbp_..." SUPABASE_PROJECT_REF=lmypcdfsrgfftzhxawao \
  sh scripts/types-sync/gen-types.sh /tmp/types.new.ts

# modo legado, a partir do banco (precisa de supabase CLI + pgbouncer + pg_isready)
SUPABASE_DB_URL="postgresql://..." sh scripts/types-sync/gen-types.sh /tmp/types.new.ts

# Gate 1 (precisa de node_modules; devolve o types.ts como estava, sempre)
node scripts/types-sync/typecheck-ratchet.mjs src/integrations/supabase/types.ts /tmp/types.new.ts

# Gate 2 (não precisa de dependências)
node scripts/types-sync/check-remocoes-destrutivas.mjs src/integrations/supabase/types.ts /tmp/types.new.ts
```

Exit codes dos gates: `0` aprovado, `1` reprovado, `2` uso inválido ou ambiente incompleto.

## Por que Management API e não `--db-url`

São **motores de introspecção diferentes**, não versões diferentes da CLI. O endpoint oficial
`GET /v1/projects/{ref}/types/typescript` (o que `--project-id` consulta) emite o bloco
`__InternalSupabase` e os parênteses de `X extends (DefaultSchema... = {`; a leitura direta do Postgres
pela `postgres-meta` (o que `--db-url` faz) não emite nenhum dos dois. Como o `types.ts` commitado veio
do endpoint, gerar por `--db-url` produz um diff permanente (+10/−15 em 11 hunks) a cada execução — e
um PR `automation/types-sync` por hora. Medido byte a byte: endpoint e `--project-id` devolvem os
mesmos 316989 bytes do arquivo commitado; `--db-url` devolve 316772.

## O que NÃO foi portado do Zapp

`supabase-usage-guard.mjs` (Gate 2 de lá), `check-catalog-fresh.mjs`, `check-manifest-fresh.mjs`,
`check-grants-fresh.mjs` e `lote-pendente.mjs` dependem de artefatos que este repositório não tem
(`supabase/schema-catalog.json`, `supabase/schema-manifest.json`, `scripts/db-audit/grants-baseline.json`,
`known-violations.json` e o ledger de migrations). Por isso o sync aqui cobre só o `types.ts`.
