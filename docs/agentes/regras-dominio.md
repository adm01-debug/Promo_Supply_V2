# Regras de domínio que o código não deixa óbvio — referência para agentes

Ler antes de mexer em solicitação, cotação, aprovação ou acompanhamento de pedido. A prova de cada
afirmação está em `DOCS/ESTADO/` (auditoria de 2026-08-16, toda linha com `arquivo:linha`); o resumo
executivo é `ESTADO_ATUAL.md`.

## O estado real do produto (não é opinião, é medição)

- **99 das 162 tabelas de produção estão vazias** e 73% do volume do banco é telemetria do próprio
  sistema. Dado de negócio real: 11 solicitações, 61 cotações, 34 pedidos, 3 pagamentos. Código existir
  neste repo **não** significa fluxo em uso.
- Por isso, aqui "pronto" nunca é "o componente existe": é o fio fechado **e** rodando com dado real.
  Os percentuais de `ESTADO_ATUAL.md` ("48,5% implementado") contam unidades incomparáveis (telas,
  componentes, hooks, edges) e estão inflados — a própria meta-auditoria (`DOCS/ESTADO/L15_META_AUDITORIA.md`)
  diz isso. Não cite esse número como progresso.

## Os três fios cortados (causa de o processo não andar)

1. **Seleção de fornecedor na cotação não grava nada** — a função que gravaria não tem chamador.
2. **Aprovar um workflow não muda o status da solicitação** — nem por código, nem por trigger.
3. **O Kanban de acompanhamento confirma uma escrita que não acontece** — o handler é só um `toast`.

O banco está mais pronto que a aplicação: os triggers que promoveriam a solicitação existem e estão
corretos; a interface não os aciona. Ao mexer em qualquer um dos três, verifique o efeito **no banco**
(`SELECT` no registro depois da ação), não na UI.

## Segurança com data marcada

- **Bypass de autenticação por passkey** (`webauthn-*`): hoje não explorável porque nenhum usuário
  registrou passkey; arma-se sozinho no primeiro registro. Mexeu em login/MFA → leia
  `DOCS/ESTADO/` sobre passkey antes.
- KPIs do Dashboard têm valores **hardcoded** no hook (`avgSla: 1.8`, `taxaSlaReal: 85`). Número na tela
  não prova query; confira a origem antes de "corrigir" um KPI.

## Armadilhas de implementação

- `src/features/` é migração **parcial** (ADR `DOCS/ADR/0001-feature-based-architecture.md`): hook de
  domínio que já tem feature vai na feature; não crie o 62º arquivo solto em `src/hooks/`.
- Rota nova só existe se entrar em `src/routes/AppRoutes.tsx` **e** tiver entrada de menu — fluxo sem
  porta de entrada conta como não entregue (`AGENTS.md`, "Bugs e funcionalidades").
- `src/integrations/supabase/types.ts` é gerado; tipo que falta vem de DDL + `types-sync`, não de edição
  à mão.
- `DOCS/CODEBASE_ATLAS/` tem números defasados (fala de 123 tabelas e 32 funções Deno; hoje são 39 pastas
  de edge) — use para entender arquitetura, não para contar.
