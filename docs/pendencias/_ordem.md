# Ordem de execucao (Fase 2) - vertical slices, um PR por item

Criterio: fundacao runtime/API primeiro, depois impacto no negocio, depois seguranca, estetica por ultimo.

## T1 - fundacao que destrava tudo (validar runtime)
1. `seg-fio-entrada` - CONCLUIDO na PR #171: edge `process-solicitacao-neural` criado (JWT + rate limit + fallback), front consome `data.fields`, deploy confirmado.
2. `fio-1` selecao de fornecedor na cotacao (backend trigger ja existe - diff front minimo; estende agendamento).
3. `fio-3` Kanban -> usePedidos().updateStatus (front puro).
4. `fio-2` aprovar workflow -> promover solicitacoes.status (migration + edge/RPC + trigger; requer chamada dono? additive, pode ir direto).

## T2 - seguranca
5. `seg-passkey` desabilitar botao passkey em Auth.tsx (fail-closed) ate reescrever assinatura COSE.
6. `seg-scim` add NO_JWT + verify_jwt=false em config.toml (CI/workflow - regra 8: deixar PR aberta p/ dono).
7. `seg-punchout` validar shared_secret_encrypted no receive.

## T3 - fachadas que mentem
8. `fake-invoice` rotular [documentacao/anexo] em process-invoice-idp.
9. `fake-ai-guided` ligar callAIGateway ou desmontar assistente do MainLayout.
10. `fake-*` dashboards/SLA/kpi-targets - esconder cards ou puxar de RPC real.

## T4 - edge/pecas menores, docs, mortos
11. edge-alert-sev, edge-sla-reve, edge-xbz-cron, edge-ai-risk, etc.
12. docs (A7), mortos L07/L09 (limpeza sem risco).

Cada item: branch proprio `claude/feat-<slug>-<AAMMDD-HHMM>`, battery verde, PR, squash-merge (regra 7) exceto CI/workflow/migration-prod (regra 8: deixar aberta p/ o dono).