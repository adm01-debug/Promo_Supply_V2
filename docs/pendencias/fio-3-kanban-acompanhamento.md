# fio-3 — Kanban de acompanhamento era no-op (toast)

- **Estado:** CONCLUIDO
- **Data:** 2026-11-26
- **Camadas:** UI
- **Causa raiz:** `handleStatusChange` em `src/pages/acompanhamento/Acompanhamento.tsx`
  (linhas 144-146 antes) só emitia `toast.success` — arrastar um cartão no Kanban
  (`KanbanBoard`) não persistia nenhuma alteração em `pedidos.status`.
- **Correção:** o handler agora:
  1. mapeia o status legacy do Kanban → status real do banco (`KANBAN_TO_DB_STATUS`);
  2. resolve o pedido real pelo uuid (o id exibido no Kanban é `numero` ou prefixo do uuid);
  3. executa `supabase.from('pedidos').update({ status }).eq('id', <uuid>)`;
  4. invalida as queries `acompanhamento-pedidos` e `pedidos` para refletir na tela;
  5. emite toast de sucesso/erro correto.
- **Regra de negócio:** o status do pedido deve caminhar pela sequência
  `pendente → aprovado → enviado → em_transito → entregue` (constraint em
  `20251220181110_c3da115e...: pedidos.status CHECK`). O Kanban mapeia colunas
  legacy (`PEDIDO_GERADO`, `AGUARDANDO_PAGAMENTO`, `PAGO`, `EM_TRANSITO`, `ENTREGUE`)
  para essa sequência.
- **Validação (real):** `npm run typecheck` (exit 0), `npx eslint Acompanhamento.tsx`
  (exit 0), `npx vitest run src/pages/acompanhamento` (46/46 passou).
- **Raio de impacto:** seletor/tela `Acompanhamento` (lista/Kanban). Não altera
  contrato de outros componentes.
- **Arquivos tocados:** `src/pages/acompanhamento/Acompanhamento.tsx`.
