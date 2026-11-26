# CONTEXTO PARA AGENTES DE IA — ÍNDICE ÚNICO

> Gerado automaticamente por indice.py · 2026-11-26 17:20 UTC · HEAD `1de90788dd` · Não edite à mão.

Um sistema, três fontes de verdade, três produtores independentes. **Leia este arquivo e vá direto à fonte certa.** Cada fato tem um dono: se duas fontes discordarem, vale o dono.

## Onde está cada coisa

| Preciso de… | Fonte (dona do fato) | Onde ler | Estado |
|---|---|---|---|
| Regras que não podem ser quebradas: RLS por operação, estados e transições, validações, fórmulas, prazos, erros de negócio, testes como especificação, inconsistências código×schema (NÃO VERIFICADO) e regras humanas (`manual/`) | **regras de negócio** | `docs/contexto/regras/07-REGRAS-DE-NEGOCIO.md` | ok · 5 min atrás |
| Tabelas, colunas, RLS/políticas, funções, triggers, cron, storage, lints — **como está em produção agora** | **banco real** | `docs/contexto/supabase/README.md` | parcial · 8 min atrás · ⚠️ 1 erro(s) de coleta no manifest (erros); 1 seção(ões) com erro em errors.md |
| Rotas, telas, módulos, hooks, edge functions, grafo de dependências, testes, scripts, convenções | **código** | `docs/contexto/codigo/INDEX.md` | ok · 4 min atrás |

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
- `docs/contexto/supabase/edge-functions/ai-demand-prediction/README.md`
- `docs/contexto/supabase/edge-functions/ai-negotiation/README.md`
- `docs/contexto/supabase/edge-functions/ai-supplier-risk/README.md`
- `docs/contexto/supabase/edge-functions/ai-supplier-suggestion/README.md`
- `docs/contexto/supabase/edge-functions/alert-dispatcher/README.md`
- `docs/contexto/supabase/edge-functions/check-approval-escalations/README.md`
- `docs/contexto/supabase/edge-functions/check-cotacao-followup/README.md`
- `docs/contexto/supabase/edge-functions/check-expiry-alerts/README.md`
- `docs/contexto/supabase/edge-functions/check-sla-alerts/README.md`
- `docs/contexto/supabase/edge-functions/dependency-health/README.md`
- `docs/contexto/supabase/edge-functions/erp-credential-encrypt/README.md`
- `docs/contexto/supabase/edge-functions/erp-sync/README.md`
- `docs/contexto/supabase/edge-functions/escalate-solicitacao/README.md`
- `docs/contexto/supabase/edge-functions/external-db-bridge/README.md`
- `docs/contexto/supabase/edge-functions/fiscal-orchestrator/README.md`
- `docs/contexto/supabase/edge-functions/generate-contract-pdf/README.md`
- `docs/contexto/supabase/edge-functions/guided-buying-ai/README.md`
- `docs/contexto/supabase/edge-functions/health-dashboard/README.md`
- `docs/contexto/supabase/edge-functions/maintain-partitions/README.md`
- `docs/contexto/supabase/edge-functions/migrate-storage-paths/README.md`
- `docs/contexto/supabase/edge-functions/process-invoice-idp/README.md`
- `docs/contexto/supabase/edge-functions/process-outbox/README.md`
- `docs/contexto/supabase/edge-functions/process-solicitacao-neural/README.md`
- `docs/contexto/supabase/edge-functions/punchout-encrypt/README.md`
- `docs/contexto/supabase/edge-functions/punchout-receive/README.md`
- `docs/contexto/supabase/edge-functions/punchout-setup/README.md`
- `docs/contexto/supabase/edge-functions/receive-os-sync/README.md`
- `docs/contexto/supabase/edge-functions/run-audit/README.md`
- `docs/contexto/supabase/edge-functions/scim-v2/README.md`
- `docs/contexto/supabase/edge-functions/send-push-notification/README.md`
- `docs/contexto/supabase/edge-functions/spot-api/README.md`
- `docs/contexto/supabase/edge-functions/spot-proxy/README.md`
- `docs/contexto/supabase/edge-functions/system-simulation/README.md`
- `docs/contexto/supabase/edge-functions/telemetry/README.md`
- `docs/contexto/supabase/edge-functions/webauthn-authenticate/README.md`
- `docs/contexto/supabase/edge-functions/webauthn-register/README.md`
- `docs/contexto/supabase/edge-functions/weekly-report/README.md`
- `docs/contexto/supabase/edge-functions/weekly-summary-report/README.md`
- `docs/contexto/supabase/edge-functions/workflow-engine/README.md`
- `docs/contexto/supabase/edge-functions/xbz-proxy/README.md`
- `docs/contexto/supabase/edge-functions/xbz-sync-pedidos/README.md`
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
- … +156

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
