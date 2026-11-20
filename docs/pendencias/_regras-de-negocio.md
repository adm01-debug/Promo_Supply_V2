# Regras de negocio que amarram o backlog

Nao implementar feature no escuro: estas sao as intencoes de negocio que o dono (nao-dev) precisa validar
so quando a implementacao pedir. Cada uma tem arquivo:fonte.

1. **Fio 1 - Selecao de fornecedor na cotacao**: quando o comprador escolhe um fornecedor em uma cotacao
   lancada, deve chamar `selectCotacao(id, justificativa)` que audita (`logApprove`) e dispara o trigger
   `trg_cotacao_approved_status` para promover `cotacoes.status`. Hoje o botao nao chama nada.
   Fonte: `src/features/cotacoes/hooks/useCotacoes.ts:144`; trigger `20261113122616:91`.
2. **Fio 2 - Aprovar workflow - promove `solicitacoes.status`**: a aprovacao escreve
   `approval_steps/approval_workflows/approval_history` mas jamais promove `solicitacoes.status`; falta
   trigger/RPC que transicione quando todos os steps aprovam.
   Fonte: `useApprovalWorkflow.ts:201-226`.
3. **Fio 3 - Kanban de acompanhamento**: `handleStatusChange` em `Acompanhamento.tsx:144` e so toast;
   deve chamar `usePedidos().updateStatus` (ja valida `VALID_PEDIDO_TRANSITIONS`).
4. **Decisao de seguranca - passkey (S-1)**: `webauthn-authenticate` valida so `challenge`/`type`, nao
   assinatura COSE/counter/origin -> bypass. Enquanto nao reescrever com verificacao real, DESABILITAR o
   botao passkey em `Auth.tsx:45` (fail-closed).
   Fonte: edge `webauthn-authenticate/index.ts:155-175`; `useWebAuthn.ts:248-261`.
5. **Dado fiscal fabricado (ALTA)**: `process-invoice-idp` devolve NF por `Math.random` como extracao real
   para `/documentos-fiscais`. Parar de mentir: rotular claramente "anexar/documentacao" ate OCR/IA real.
   Fonte: `process-invoice-idp/index.ts:53-72`.
6. **IA de fachada (ALTA)**: `guided-buying-ai` responde por if/else com literais, mas esta montado em todo
   o app em `MainLayout.tsx`. Ou ligar `callAIGateway` de verdade ou desmontar.
   Fonte: `guided-buying-ai/index.ts:74-104`.
7. **Tabelas/metas ficticias (MEDIA)**: `kpiTargetsStore.ts` metas fixas, `slaSettingsStore.ts:37` e-mail fixo
   multi-tenant, `useDashboardKPIs`/`useExecutiveDashboardData` com literais e `Math.random`. A UI mente.
   Tratar por baixo impacto.

## Ordem de prioridade (impacto no negocio)
Fluxo de compra central (Fios 1-3) > seguranca (S-1, fio de entrada neural' did error) > dado fiscal falso >
fachadas de IA > mortos/estetica.