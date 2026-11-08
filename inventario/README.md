# Estado real do projeto — inventário gerado

Pasta de **dados gerados por script**, não de relatórios escritos à mão. É a fonte de consulta dos
agentes para "o que existe hoje" no banco e no código. Se um número aqui divergir do que você mediu,
regere o arquivo (comandos abaixo) em vez de corrigir à mão. Os arquivos ficam em
`inventario/estado/`; quem os entrega em `main` é o PR de `.github/workflows/inventario-estado-semanal.yml`
(segunda, 10:41 UTC), nunca push direto — a Vercel faz deploy de produção a cada push em `main`.

| Arquivo | Como gerar | O que tem |
|---|---|---|
| `estado/banco.json` | `SUPABASE_ACCESS_TOKEN=... SUPABASE_PROJECT_REF=... node scripts/inventario/gerar-banco.mjs` (Management API: `/database/query/read-only` + `/functions`, só leitura) **ou**, sem token, rodar `scripts/inventario/banco.sql` no MCP do projeto (`db_query`/`execute_sql`), salvar a resposta e `node scripts/inventario/gerar-banco.mjs --entrada <arquivo>` | banco do projeto, só leitura: cada tabela (RLS, policies, triggers, linhas, tamanho, se é citada em função/view e quantos `.from()` e `/rest/v1/<tabela>` tem em `src/` e `supabase/functions/`), tabelas órfãs, cada cron job (agenda, funções chamadas, falhas e taxa em 24 h/7 d, duração máxima), horas em que o cron ficou parado, tamanho do histórico do cron, edge functions publicadas × pastas do repo (só com token; sem token fica `publicadas: null`), e a lista `alertas` |
| `estado/rotas.json` | `node scripts/inventario/gerar-rotas.mjs` (`--check` só confere se está em dia) | as URLs de `src/routes/AppRoutes.tsx` (caminho, página, se é protegida e por quais papéis, redirecionamento) e, por URL, os hooks, tabelas, RPCs, buckets e edge functions alcançados pelos imports da página (`functions.invoke`, `invokeEdge` e `fetch` em `/functions/v1/<edge>`), mais a lista `problemas` (URL sem arquivo, import quebrado) |
| `estado/edges.json` | `node scripts/inventario/gerar-repo.mjs` | as edge functions: linhas, segredos lidos (`Deno.env.get`) e quem invoca cada uma (src, migrations, outras edges, `tests-e2e/`, CI) |
| `estado/tabelas-uso.json` (não gerado pelo CI) | `node scripts/inventario/gerar-repo.mjs < lista-de-tabelas.txt` | quantos `.from('tabela')` cada tabela tem — hoje também sai em `banco.json` → `tabelas[].uso_no_codigo` |

## Secrets que o workflow precisa

- **`SUPABASE_ACCESS_TOKEN`** — ainda **não existe** neste repositório. É um token de usuário da
  Supabase e aqui só serve para ler (`POST /database/query/read-only` e `GET /functions`). Enquanto
  não existir, a execução agendada pula o `banco.json` com `::warning::` e continua entregando
  rotas e edges; `workflow_dispatch` sem o secret falha de propósito.
- **`VITE_SUPABASE_PROJECT_ID`** / **`VITE_SUPABASE_URL`** — já existem; é de onde sai o ref do
  projeto em runtime. Nenhum ref está escrito no código: `supabase/config.toml` diz
  `trwgmplubeqxrxpncdgf` e o `.env` aponta `lmypcdfsrgfftzhxawao`, divergência que não foi
  resolvida aqui. O secret é quem manda, e a resposta ainda passa pela conferência de origem
  (abaixo) antes de ser gravada.
- `SUPABASE_DB_URL` **não** é usado por este workflow (é só conexão direta ao Postgres).

## Como ler `banco.json`

- **`alertas`** é o que um agente precisa saber antes de mexer: `tabela_sem_rls`, `rls_sem_policy`
  (RLS ligado sem nenhuma policy nega tudo para `authenticated`/`anon`), `cron_falhando`
  (taxa ≥ 5 % em 7 dias), `cron_parado` (hora com mais da metade das execuções falhando),
  `cron_sem_execucao` (job ativo que roda todo dia sem nenhuma execução em 24 h — o cron 100 %
  parado não grava falha, então só aparece aqui), `historico_cron_sem_limpeza` (> 50 mil linhas com
  mais de 7 dias), `edge_sem_deploy` e `edge_publicada_sem_codigo`. Os limiares estão em `LIMIARES`
  no script.
- **`tabelas_orfas`**: 0 linhas + não citada em função/view do banco + nenhum `.from()` nem
  `/rest/v1/` no código (`.from(variavel)` não é resolvido). Candidata a limpeza, não prova de que
  pode apagar (pode ser usada por RPC com outro nome ou por sistema externo).
- **`linhas`** é `count(*)` exato quando a tabela tem menos de 200 mil linhas (`linhas_exatas: true`);
  acima disso, a estimativa do planner. Não confie em `pg_stat_user_tables.n_live_tup`: zera quando
  o banco reinicia.
- Contagens rodam com o papel da conexão. Com `service_role` (MCP) e com
  `supabase_read_only_user` (endpoint read-only da Management API) o RLS não filtra; com outro
  papel, tabelas com RLS e `cron.job` podem vir incompletas.
- **Conferência de origem**: a resposta só é gravada se o ledger bater com `supabase/migrations/` —
  maior versão aplicada entre as 20 migrations mais recentes do repo (ou à frente) e quantidade de
  registros a até 10 % da de arquivos. Isso barra resposta colada de outro banco (MCP ou ref
  errado). A conferência extra por `supabase/schema-manifest.json` (≥ 90 % das tabelas em comum,
  nos dois sentidos) fica desligada enquanto esse arquivo não existir no repo; quando o types-sync
  passar a gravá-lo, ela liga sozinha.
- O PR semanal só abre quando algo estrutural mudou de verdade: tabela nova/apagada, alerta novo,
  RLS/policy, contagem real de linhas, rota, edge etc. `medido_em`/`gerado_em` sozinhos não abrem
  PR, e a telemetria viva do cron também não (`execucoes_24h`, `taxa_falha_7d_pct`,
  `horas_paradas_7d`, `cron.historico.linhas/bytes`): esses números rolam toda semana só pela
  janela de 7 dias, sem mudança real, e abrir PR por isso era ruído. Como só esses campos mudarem
  nunca abre PR sozinho, o commitado pode ficar atrasado neles por tempo indefinido; confie nesses
  campos só depois de regenerar à mão.
- Nada de segredo sai do banco: de `cron.job` só o nome das funções chamadas (nunca o comando, que
  pode ter URL/cabeçalho), e o script se recusa a gravar saída com cara de credencial (Bearer, JWT,
  `sb_secret_`).

## Diferenças em relação ao Zapp_Web_V2 (de onde os scripts vieram)

- `banco.sql` não tem o bloco `whatsapp`: aqui não existem `public.whatsapp_connections` nem
  `public.messages`, e os alertas de WhatsApp saíram junto.
- `gerar-rotas.mjs` lê só `src/routes/AppRoutes.tsx`. Este front é react-router puro: não há
  `ViewRouter.tsx`, `lazyViews.ts` nem `navigation.service.ts`, então não existem as telas
  `?view=<id>` nem o cruzamento com o menu. Em troca, o parser entende as rotas **aninhadas**
  (o `<Route element={<ProtectedRoute><Shell /></ProtectedRoute>}>` protege os filhos) e as duas
  formas de papel deste repo (`requiredRole="admin"` e `requiredRole={['supplier', 'admin']}`).
- `gerar-repo.mjs` procura os testes E2E em `tests-e2e/` (no Zapp é `e2e/`) e ignora caminho
  inexistente em vez de derrubar o inventário.
- O ref do projeto Supabase não está escrito em lugar nenhum: sai do ambiente
  (`SUPABASE_PROJECT_REF`, `VITE_SUPABASE_PROJECT_ID` ou o subdomínio de `VITE_SUPABASE_URL`).
