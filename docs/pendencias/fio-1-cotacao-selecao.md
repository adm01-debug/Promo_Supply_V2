# fio-1 ? Sele??o de cota??o vencedora n?o persistia

- **Estado:** CONCLUIDO
- **Data:** 2026-11-26
- **Camadas:** UI + persist?ncia (cotacoes)
- **Causa raiz:** em `src/pages/cotacao/Cotacao.tsx`, os callbacks `onSelecionar` de
  `RankingCotacoes` / `ComparadorCotacoes` / `VisualComparadorCotacoes` eram ligados
  diretamente a `setFornecedorSelecionado` (estado local). Selecionar um fornecedor
  pintava a UI mas nunca persistia em `cotacoes` ? recarregar a p?gina perdia a sele??o.
- **Corre??o:** o componente agora destrutura `selectCotacao` do hook `useCotacoes` e usa
  um handler `handleSelecionar(id, justificativa?)` que:
  1. atualiza o estado local `fornecedorSelecionado` (feedback imediato na UI);
  2. se o id for uma cota??o real (uuid), chama `selectCotacao(id, justificativa)` ?
     o hook desmarca as demais da mesma solicita??o, marca `selecionada=true`/
     `status='aprovada'`, grava `justificativa_selecao` e audita via `auditHelpers`;
  3. cota??es simuladas (ids `api-`/`manual-`) seguem UI-only, sem persistir.
- **Regra de neg?cio:** `selectCotacao` foi adicionado no hook `useCotacoes` mas nunca
  exposto ao consumidor da tela de cota??o ? o contrato existia, faltava a liga??o da UI.
- **Valida??o (real):** `npx tsc --noEmit` (exit 0), `npx eslint Cotacao.tsx` (exit 0),
  `npx vitest run src/pages/cotacao` (28/28 passou).
- **Raio de impacto:** tela de cota??o. N?o altera contrato de outros componentes.
- **Arquivos tocados:** `src/pages/cotacao/Cotacao.tsx`.
