# Regras de domínio que o código não deixa óbvio — referência para agentes

Ler antes de mexer em solicitação, cotação, aprovação ou acompanhamento de pedido. A prova de cada
afirmação está em `DOCS/ESTADO/` (auditoria de 2026-08-16, toda linha com `arquivo:linha`); o resumo
executivo é `ESTADO_ATUAL.md`.

## O estado real do produto (não é opinião, é medição)

- Medido em **16/08/2026** (e não reconferido desde então): 99 das 162 tabelas de produção estavam vazias e
  73% do volume do banco era telemetria do próprio sistema. Dado de negócio real naquele dia: 11
  solicitações, 61 cotações, 34 pedidos, 3 pagamentos. Código existir neste repo **não** significa fluxo em
  uso — e número de tabela no documento também não: o snapshot de 22/11 já mede 160 tabelas em `public`.
- Por isso, aqui "pronto" nunca é "o componente existe": é o fio fechado **e** rodando com dado real.
  Os percentuais de `ESTADO_ATUAL.md` ("48,5% implementado") contam unidades incomparáveis (telas,
  componentes, hooks, edges) e estão inflados — a própria meta-auditoria (`DOCS/ESTADO/L15_META_AUDITORIA.md`)
  diz isso. Não cite esse número como progresso.

## Os três fios cortados (fechados — a lição fica)

Os três fios que a auditoria de 16/08/2026 mediu cortados **hoje estão ligados**, cada um com prova:
`selectCotacao` é chamado em `src/pages/cotacao/Cotacao.tsx:111`; aprovar workflow promove a solicitação pelo
trigger `trg_workflow_approved_promotes_solicitacao` (função `auto_transition_solicitacao_on_workflow_approved`,
estado `enabled` no snapshot de produção); e o Kanban de acompanhamento grava de verdade, em
`src/pages/acompanhamento/Acompanhamento.tsx:232`. O registro de cada fio, com o que o fechou, está em
`docs/pendencias/_indice.md` (fio-1, fio-2, fio-3).

A lição segue valendo ao mexer em qualquer um deles: verifique o efeito **no banco** (`SELECT` no registro
depois da ação), não na UI — o sintoma original era a interface confirmar o que o banco não recebia.

## Segurança com data marcada

- **Passkey** (`webauthn-*`): a auditoria de 16/08/2026 dizia que o bypass "se arma sozinho no primeiro
  registro"; hoje a autenticação é fail-closed explícito
  (`supabase/functions/webauthn-authenticate/index.ts:178`). Mexeu em login/MFA → releia esse trecho antes.
- **KPIs do Dashboard** deixaram de ser literais: `src/hooks/useDashboardKPIs.ts:141` usa
  `Number(sla.avgSla ?? 0)` da RPC de SLA (migration `20261123093000_sla_real_no_dashboard.sql`). A regra
  geral continua: número na tela não prova query — confira a origem antes de "corrigir" um KPI.

## Armadilhas de implementação

- `src/features/` é migração **parcial** (ADR `DOCS/ADR/0001-feature-based-architecture.md`): hook de
  domínio que já tem feature vai na feature; não crie o 62º arquivo solto em `src/hooks/`.
- Rota nova só existe se entrar em `src/routes/AppRoutes.tsx` **e** tiver entrada de menu — fluxo sem
  porta de entrada conta como não entregue (`AGENTS.md`, "Bugs e funcionalidades").
- `src/integrations/supabase/types.ts` é gerado; tipo que falta vem de DDL + `types-sync`, não de edição
  à mão.
- `DOCS/CODEBASE_ATLAS/` tem números defasados (fala de 123 tabelas e 32 funções Deno; medido em
  25/11/2026, `supabase/functions/` tem 41 edge functions, todas com `index.ts`, em 43 pastas — as outras
  duas são `_shared` e `tests`) — use para entender arquitetura, não para contar.
