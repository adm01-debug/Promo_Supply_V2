# Ordem de execucao (Fase 2) - vertical slices, um PR por item

Criterio: fundacao runtime/API primeiro, depois impacto no negocio, depois seguranca, estetica por ultimo.

## T1 - fundacao que destrava tudo (validar runtime)
1. `seg-fio-entrada` - CONCLUIDO na PR #171: edge `process-solicitacao-neural` criado (JWT + rate limit + fallback), front consome `data.fields`, deploy confirmado.
2. `fio-1` selecao de fornecedor na cotacao (backend trigger ja existe - diff front minimo; estende agendamento).
3. `fio-3` Kanban -> usePedidos().updateStatus (front puro).
4. `fio-2` - CONCLUIDO na PR #173 (merge) + DDL APLICADO em prod via Management API (2026-11-28): trigger `trg_workflow_approved_promotes_solicitacao` + funcao `auto_transition_solicitacao_on_workflow_approved` ativos, testado (aprovada=2, pendente=1). Paridade-banco verde (funcoes 168/0). Migracoes 17/11 registradas como applied (schema_migrations 14 registros).

## T2 - seguranca
5. `seg-passkey` CONCLUIDO na PR #177: botao passkey desabilitado em `Auth.tsx` (fail-closed) + finish da edge `webauthn-authenticate` rejeita ate reescrever assinatura COSE.
6. `seg-scim` CONCLUIDO na PR #180 (merge 2026-11-20 + deploy): `[functions.scim-v2] verify_jwt=false` em config.toml; edged prod scim-v2 verify_jwt=False v14.
7. `seg-punchout` CONCLUIDO na PR #180 (merge 2026-11-20 + deploy): `punchout-receive/index.ts:155-176` valida `shared_secret_encrypted` de `punchout_catalogs`; edged prod v17 verify_jwt=False.

## T3 - fachadas que mentem
8. `fake-invoice` CONCLUIDO na PR #177: process-invoice-idp agora determinístico (hash do arquivo) + campo `fonte=simulacao` + toast honesto no front.
9. `fake-ai-guided` CONCLUIDO na PR #177: guided-buying-ai ligado ao `callAIGateway` (OpenRouter) real com fallback determinístico; historico incluido.
10. `fake-*` dashboards - CONCLUIDO na PR #181 (branch claude/fix-honest-dashboard-261120-1450): dashboard Executivo e KPIs passam a usar dados reais - maverick/tail spend derivados de pedidos off-contract, concentracao top-5 de spend real, compliance de contratos ativos, e-mail de SLA do tenant; `kpiTargetsStore` continua como metas (objetivos), não como dados simulados.

## T4 - edge/pecas menores, docs, mortos
11. edge-alert-sev, edge-sla-reve, edge-xbz-cron, edge-ai-risk, etc.
12. docs (A7), mortos L07/L09: L07 hooks -> ARQUIVADOS (nao remover; tree-shaken, ver hk-dead-mortos.md); L09 lib/stores -> PARCIAL, terminar cada um; nao ha "limpeza sem risco" a fazer.

Cada item: branch proprio `claude/feat-<slug>-<AAMMDD-HHMM>`, battery verde, PR, squash-merge (regra 7) exceto CI/workflow/migration-prod (regra 8: deixar aberta p/ o dono).