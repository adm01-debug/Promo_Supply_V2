# 06. UI Components — Design System e botões críticos

## Design system (recap)

- **Tokens semânticos** em `src/styles/tokens.css` — sempre use `bg-primary`, `text-foreground`, `border-border`. Cores literais (`bg-blue-500`, `#fff`) são proibidas.
- **Camadas CSS** (importadas em `src/index.css`): `tokens.css` → `base.css` → `components.css` → `animations.css` → `utilities.css`.
- **Dark mode** automático via `next-themes` (`attribute="class"`); tokens já se adaptam.
- **Mobile-first**: grids começam `grid-cols-1` → `md:grid-cols-2` → `lg:grid-cols-3`.
- **Motion**: tokens custom `celebrate`, `glow-pulse`; presets em `src/features/layout/transitions/presets.ts`.
- **Espaçamento denso ERP**: máximo `space-y-4` / `gap-4`.

## Camadas de composição

| Camada | Onde | Exemplos |
|---|---|---|
| Primitives | `src/components/ui/*` (shadcn/radix) | `button`, `card`, `dialog`, `form`, `table`, `sidebar`, `chart`, `sparkline`, `celebration*`, `status-indicators`, `undo-toast`, `contextual-skeletons` |
| Atoms | `src/components/atoms/*` | `Atom.tsx:8` (motion.div genérico), `EliteButton`, `EliteImage`, `PreloadLink` |
| Molecules | `src/components/molecules/*` | `Molecule.tsx:11` (card com header), `EliteFormField` |
| Organisms | `src/components/organisms/*` | `Organism.tsx:11` (grid header/main/footer), `EliteCardGrid`, `ElitePageWrapper` |

## Botões / ações críticas — o que disparam

| Ação (rótulo) | Componente | Handler → efeito |
|---|---|---|
| **Entrar** | `pages/auth/Auth.tsx` | `useAuth().signIn(email, password)` → sessão Supabase → redirect `/compras` |
| **Sair** | `HeaderActions` (topbar) | `useAuth().signOut()` → limpa `queryClient` → `Navigate to="/auth"` |
| **Trocar empresa** | `features/empresas/EmpresaSelector` | `setSelectedEmpresa(empresaId)` → persiste em `localStorage['selectedEmpresaId']` → invalida queries |
| **Nova solicitação** | `pages/solicitacoes/Solicitacoes.tsx` | `useSolicitacoes.createSolicitacao` → valida Zod → checa orçamento (RPC) → cria workflow |
| **Aprovar / Rejeitar** | `features/aprovacoes` + `pages/aprovacoes` | Edge `workflow-engine` (`submit_decision`) → RPC `check_workflow_sod` → atualiza `approval_steps` |
| **Selecionar cotação vencedora** | `pages/cotacao/Cotacao.tsx` | `useCotacoes.selectCotacao` → desmarca outras + marca vencedora + audit log |
| **Gerar pedido** | `pages/gerar-ordem/GerarOrdem.tsx` | `usePedidos.createPedido` → insere `pedidos` + `pedido_itens` |
| **Atualizar status pedido** | `pages/pedidos/Pedidos.tsx` | `usePedidos.updateStatus` → valida `VALID_PEDIDO_TRANSITIONS` → triggers (pagamento, penalty, score) |
| **Baixa/Confirmar pagamento** | `pages/pagamentos/Pagamentos.tsx` | `usePagamentos` → trigger `sync_budget_on_payment` |
| **Registrar recebimento** | `pages/recebimento/RecebimentoOffline.tsx` | Insert `receiving_checklists`; three-way match (`ThreeWayMatchPanel`) |
| **Gerar PDF de pedido** | `PedidoDetailsDialog` | `src/lib/pdfGenerator.ts:24` `generateOrderPDF` (jsPDF + autotable) |
| **Exportar CSV** | Toolbar em cada listagem | `src/lib/exportData.ts:40` `exportToCSV` (BOM UTF-8, colunas predefinidas por módulo) |
| **Iniciar PunchOut** | `pages/admin/PunchOutCatalogs.tsx` | Edge `punchout-setup` → recebe cXML → abre portal fornecedor |
| **Registrar passkey** | `pages/seguranca/Seguranca.tsx` (via `useWebAuthn`) | Edge `webauthn-register` (start/finish) |
| **Ativar MFA** | `pages/seguranca/Seguranca.tsx` (via `useMFA`) | Grava `mfa_settings` |
| **Undo / Redo** | Atalhos globais `Ctrl/Cmd+Z` / `Ctrl+Shift+Z` | `useGlobalUndo` → `undoStore.undo()/redo()` → toast |
| **Chat guiado** | `pages/negociacao-ia/NegociacaoIA.tsx` | `useGuidedBuying.sendMessage` → edge `guided-buying-ai` |
| **Rodar simulação** | `pages/admin/DeveloperDocs.tsx` (admin) | Edge `system-simulation` |
| **Aplicar sugestão de IA (fornecedor)** | `NegociacaoIA` / componentes de negociação | Edge `ai-supplier-suggestion` / `ai-negotiation` |

## Feedback ao usuário
- **Toasts:** `src/lib/feedbackToast.ts` (wrapper de `sonner`) — `.success/.error/.warning/.info`, com haptics + som opcional (`useFeedbackPreferences`).
- **Undo toast:** `useUndoableAction().registerAction(descricao, undoFn, redoFn?)` → `UndoToastContainer` mostra CTA "Desfazer".
- **Celebração:** `components/ui/celebration*` em milestones (aprovação, entrega).
- **Erros de módulo:** `ModuleErrorBoundary` (`MainLayout` envolve cada rota) com mensagem específica por módulo em `moduleMessages` (`:10`).

## Acessibilidade
- `SkipToContent` no topo (`src/components/accessibility/SkipLinks.tsx`).
- `AccessibilityPanel` para ajustes (contraste, tamanho de fonte).
- WCAG 2.2 AAA como meta; `aria-label` obrigatório em ícones/botões sem texto.
