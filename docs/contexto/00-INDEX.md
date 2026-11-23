# CONTEXTO PARA AGENTES DE IA — ÍNDICE ÚNICO

> Gerado automaticamente por indice.py · 2026-11-23 20:21 UTC · HEAD `294d385c21` · Não edite à mão.

Um sistema, três fontes de verdade, três produtores independentes. **Leia este arquivo e vá direto à fonte certa.** Cada fato tem um dono: se duas fontes discordarem, vale o dono.

## Onde está cada coisa

| Preciso de… | Fonte (dona do fato) | Onde ler | Estado |
|---|---|---|---|
| Regras que não podem ser quebradas: RLS por operação, estados e transições, validações, fórmulas, prazos, erros de negócio, testes como especificação, inconsistências código×schema (NÃO VERIFICADO) e regras humanas (`manual/`) | **regras de negócio** | `docs/contexto/regras/07-REGRAS-DE-NEGOCIO.md` | ok · 1 min atrás |
| Tabelas, colunas, RLS/políticas, funções, triggers, cron, storage, lints — **como está em produção agora** | **banco real** | `docs/contexto/supabase/README.md` | ok · 9 min atrás |
| Rotas, telas, módulos, hooks, edge functions, grafo de dependências, testes, scripts, convenções | **código** | `docs/contexto/codigo/INDEX.md` | ok · 0 min atrás |

## Ordem de leitura antes de qualquer tarefa ou planejamento

1. **regras de negócio** — Qualquer mudança de comportamento · Antes de criar status/valor/validação · Antes de planejar.
2. **banco real** — Vou tocar tabela/coluna/política/função SQL · Quero saber se algo existe de verdade no banco.
3. **código** — Vou mexer em tela/rota/hook/edge · Preciso saber onde uma coisa vive e quem a usa.

## Regras do protocolo

- Tabela/coluna/política existe? → **banco real**. Migrations do repo são histórico, não estado.
- Onde fica, quem chama, o que importa o quê? → **código**.
- Pode fazer isso? Qual estado vem depois? Qual o limite? → **regras de negócio** (inclui `manual/`, escrito por humanos, prioridade máxima).
- Item listado como **NÃO VERIFICADO** ou **inconsistência** em qualquer fonte: confirme na fonte dona antes de assumir.
- Nada aqui é editado à mão. Para registrar uma regra que só o negócio sabe, escreva em `manual/` da fonte de regras.

<details><summary>Arquivos de <b>banco real</b> (`docs/contexto/supabase/`)</summary>

- `docs/contexto/supabase/CHANGELOG.md`
- `docs/contexto/supabase/README.md`
- `docs/contexto/supabase/auth.md`
- `docs/contexto/supabase/cron-runs.md`
- `docs/contexto/supabase/cron.md`
- `docs/contexto/supabase/edge-functions.md`
- `docs/contexto/supabase/errors.md`
- `docs/contexto/supabase/extensions.md`
- `docs/contexto/supabase/foreign-servers.md`
- `docs/contexto/supabase/functions.md`
- `docs/contexto/supabase/grants.md`
- `docs/contexto/supabase/indexes.md`
- `docs/contexto/supabase/lints.md`
- `docs/contexto/supabase/manifest.json`
- `docs/contexto/supabase/migrations.md`
- `docs/contexto/supabase/policies.md`
- `docs/contexto/supabase/project-config.md`
- `docs/contexto/supabase/queues.md`
- `docs/contexto/supabase/realtime.md`
- `docs/contexto/supabase/relationships.md`
- `docs/contexto/supabase/roles.md`
- `docs/contexto/supabase/schemas.md`
- `docs/contexto/supabase/sequences.md`
- `docs/contexto/supabase/snapshot.json`
- `docs/contexto/supabase/stats.json`
- `docs/contexto/supabase/stats.md`
- `docs/contexto/supabase/storage.md`
- `docs/contexto/supabase/tables.md`
- `docs/contexto/supabase/tables/_supabase_internal_triggers.md`
- `docs/contexto/supabase/tables/public/account_lockouts.md`
- `docs/contexto/supabase/tables/public/active_sessions.md`
- `docs/contexto/supabase/tables/public/alert_subscriptions.md`
- `docs/contexto/supabase/tables/public/aliquotas_tributarias.md`
- `docs/contexto/supabase/tables/public/allowed_countries.md`
- `docs/contexto/supabase/tables/public/approval_delegations.md`
- `docs/contexto/supabase/tables/public/approval_hierarchy.md`
- `docs/contexto/supabase/tables/public/approval_history.md`
- `docs/contexto/supabase/tables/public/approval_rules.md`
- `docs/contexto/supabase/tables/public/approval_steps.md`
- `docs/contexto/supabase/tables/public/approval_workflows.md`
- `docs/contexto/supabase/tables/public/auction_bids.md`
- `docs/contexto/supabase/tables/public/audit_logs.md`
- `docs/contexto/supabase/tables/public/audit_logs_202605.md`
- `docs/contexto/supabase/tables/public/audit_logs_202606.md`
- `docs/contexto/supabase/tables/public/audit_logs_202607.md`
- `docs/contexto/supabase/tables/public/audit_logs_202608.md`
- `docs/contexto/supabase/tables/public/audit_logs_202609.md`
- `docs/contexto/supabase/tables/public/audit_logs_legacy_20260712.md`
- `docs/contexto/supabase/tables/public/blocked_countries.md`
- `docs/contexto/supabase/tables/public/blocked_ips.md`
- `docs/contexto/supabase/tables/public/budget_audit_logs.md`
- `docs/contexto/supabase/tables/public/budget_transactions.md`
- `docs/contexto/supabase/tables/public/categorias.md`
- `docs/contexto/supabase/tables/public/category_strategies.md`
- `docs/contexto/supabase/tables/public/checkpoint_snapshots.md`
- `docs/contexto/supabase/tables/public/contact_notes.md`
- `docs/contexto/supabase/tables/public/contract_documents.md`
- `docs/contexto/supabase/tables/public/contract_history.md`
- `docs/contexto/supabase/tables/public/contract_items.md`
- `docs/contexto/supabase/tables/public/contract_penalties.md`
- `docs/contexto/supabase/tables/public/contracts.md`
- `docs/contexto/supabase/tables/public/cost_centers.md`
- `docs/contexto/supabase/tables/public/cotacoes.md`
- `docs/contexto/supabase/tables/public/creditos_fornecedor.md`
- `docs/contexto/supabase/tables/public/cron_heartbeats.md`
- `docs/contexto/supabase/tables/public/cron_watchdog_seen.md`
- `docs/contexto/supabase/tables/public/currencies.md`
- `docs/contexto/supabase/tables/public/dashboard_filter_favorites.md`
- `docs/contexto/supabase/tables/public/dashboard_layouts.md`
- `docs/contexto/supabase/tables/public/deadlock_snapshots.md`
- `docs/contexto/supabase/tables/public/department_budgets.md`
- `docs/contexto/supabase/tables/public/dependency_health.md`
- `docs/contexto/supabase/tables/public/dependency_health_history.md`
- `docs/contexto/supabase/tables/public/devolucao_itens.md`
- `docs/contexto/supabase/tables/public/devolucoes.md`
- `docs/contexto/supabase/tables/public/entity_versions.md`
- `docs/contexto/supabase/tables/public/erp_connections.md`
- `docs/contexto/supabase/tables/public/erp_field_mappings.md`
- `docs/contexto/supabase/tables/public/erp_sync_log.md`
- `docs/contexto/supabase/tables/public/estoque.md`
- … +114

</details>

<details><summary>Arquivos de <b>código</b> (`docs/contexto/codigo/`)</summary>

- `docs/contexto/codigo/INDEX.md`
- `docs/contexto/codigo/banco.json`
- `docs/contexto/codigo/baseline.json`
- `docs/contexto/codigo/componentes.json`
- `docs/contexto/codigo/convencoes.json`
- `docs/contexto/codigo/edge-functions.json`
- `docs/contexto/codigo/ferramentas.json`
- `docs/contexto/codigo/grafo-arestas.json`
- `docs/contexto/codigo/grafo-graphify.json`
- `docs/contexto/codigo/grafo.json`
- `docs/contexto/codigo/hooks.json`
- `docs/contexto/codigo/logica.json`
- `docs/contexto/codigo/manifest.json`
- `docs/contexto/codigo/modulos.json`
- `docs/contexto/codigo/rotas.json`
- `docs/contexto/codigo/scripts.json`
- `docs/contexto/codigo/testes.json`

</details>

<details><summary>Arquivos de <b>regras de negócio</b> (`docs/contexto/regras/`)</summary>

- `docs/contexto/regras/07-REGRAS-DE-NEGOCIO.md`
- `docs/contexto/regras/10-ACESSO-E-SEGURANCA.md`
- `docs/contexto/regras/11-GLOSSARIO-E-LACUNAS.md`
- `docs/contexto/regras/context.json`
- `docs/contexto/regras/manifest.json`
- `docs/contexto/regras/manual/README.md`
- `docs/contexto/regras/manual/TEMPLATE-regras-de-negocio.md`

</details>
