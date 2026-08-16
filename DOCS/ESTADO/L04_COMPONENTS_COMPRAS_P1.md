# L04 — components/compras (Parte 1)

> Auditoria por medição direta do código. Nada aqui vem de README, DOCS/*.md ou comentários.
> Sem acesso a banco: toda afirmação sobre conteúdo de tabelas é `NAO_VERIFICADO (runtime)`.

## Corte do lote

Lista completa: `find src/components/compras -type f | sort` → 119 arquivos, **27.134 linhas** (`wc -l` total).
Ordenação lexicográfica de caminho completo. Como ASCII coloca maiúsculas (65–90) antes de `_` (95) e de minúsculas (97+), a metade inicial cai **inteiramente** sobre os arquivos `.tsx` de primeiro nível com nome capitalizado, antes de `__tests__/` e das subpastas minúsculas (`approval/`, `bulk-operations/`, …).

- **PRIMEIRO arquivo do meu escopo:** `src/components/compras/AISupplierSuggestion.tsx` (68 linhas)
- **ÚLTIMO arquivo do meu escopo (o corte):** `src/components/compras/ReceivingModal.tsx` (306 linhas)
- **Acumulado no corte:** 13.426 linhas de 27.134 (49,5%). O arquivo seguinte, `RiskHeatMap.tsx` (268 linhas), levaria a 13.694 — acima da metade.

**O lote irmão (L05) começa em `src/components/compras/RiskHeatMap.tsx`** e segue até `visual-comparador/ComparadorCharts.tsx`, incluindo `__tests__/` e todas as subpastas minúsculas.

**Escopo formal auditado:** 48 arquivos (`AISupplierSuggestion.tsx` … `ReceivingModal.tsx`).
**Leitura de apoio (fora do meu escopo, lida só para julgar a camada de dados dos 48):** 9 arquivos de helpers/stores/hooks — listados na seção ARQUIVOS LIDOS com a marcação `[apoio]`. Não emito classificação sobre eles; ficam para o L05 / outros lotes.

## Resumo

Denominador: **48 componentes/arquivos** do escopo formal.

| Classificação | Contagem | % |
|---|---|---|
| ✅ IMPLEMENTADO_TOTAL | 14 | 29,2% |
| 🟨 IMPLEMENTADO_PARCIAL | 22 | 45,8% |
| 🟦 SUGERIDO_OU_INICIADO | 7 | 14,6% |
| ⬛ MORTO_OU_ABANDONADO | 5 | 10,4% |

Órfãos (subconjunto de ⬛ + um caso especial): **4 componentes exportados sem nenhum consumidor** + 1 arquivo de re-export morto. Detalhe na seção própria.

## Tabela de evidências

| Componente | Classificação | Evidência (arquivo:linha) | Quem consome | Camada de dados | O que falta |
|---|---|---|---|---|---|
| AISupplierSuggestion | 🟦 SUGERIDO_OU_INICIADO | `AISupplierSuggestion.tsx:41-42` lista de fornecedores literal no JSX; `:32` "Target: Aluminum Mug" fixo; `:35` "12 qualified suppliers" fixo; `:59-64` botão "Open Sourcing Panel" sem `onClick`; `:9` `isExpanding` declarado e nunca usado | `pages/cotacao/Cotacao.tsx:335`, `pages/fornecedores/Fornecedores.tsx:131` | Nenhuma — zero import de supabase/hook | Toda a camada de dados e o handler do botão. É uma maquete renderizada em 2 páginas de produção |
| ActiveSourcingWidget | ✅ IMPLEMENTADO_TOTAL | `ActiveSourcingWidget.tsx:12` `useSourcingEvents()`; hook faz `supabase.from('sourcing_events')` em `hooks/useLicitacoes.ts:190`; `:62,71,82` navegação real para `/sourcing` | `pages/dashboard/ComprasDashboard.tsx:57` (lazy) e `:253` | Supabase, tabela `sourcing_events` | — (conteúdo da tabela `NAO_VERIFICADO (runtime)`) |
| AdvancedProcurementKPIs | 🟨 PARCIAL | `AdvancedProcurementKPIs.tsx:47` importa `kpiData` de `procurement-kpis/kpiMockData.ts:1` ("Mock data…"); todos os 8 KPIs (`:83-90`) leem desse mock. Metas vêm de `stores/kpiTargetsStore.ts:1-2` (zustand + `persist` → localStorage, não banco) | `pages/relatorios/Relatorios.tsx:36` (lazy), `:236` | Mock estático + localStorage | Os valores dos KPIs não vêm de lugar nenhum. A lógica de alerta (`:95-114`) funciona, mas avalia números inventados |
| BulkOperationsPreview | 🟨 PARCIAL | `BulkOperationsPreview.tsx:173` delega a `onExecute` (prop) — a persistência é do chamador; `hooks/useBulkOperations.ts:22-45` roteia para callbacks reais. Porém `:189` botão "Desfazer" → `toast.info('Funcionalidade de desfazer em desenvolvimento')`; `:238` texto de IA com número inventado ("reduzir o tempo de ciclo em até 22%") | `EnhancedBulkActionsBar.tsx:273`; tipos em `pages/pedidos/Pedidos.tsx:24`, `pages/solicitacoes/Solicitacoes.tsx:33`, `hooks/useBulkOperations.ts:3` | Indireta (callbacks do chamador → Supabase) | Undo real; o insight de IA é texto fixo |
| BulkPlanningConsole | 🟦 SUGERIDO_OU_INICIADO | `BulkPlanningConsole.tsx:23-57` `mockPlanningData` inteiro literal; `:62-66` `freightAnalysis` inicializado com constantes; `:105-115` botão "Disparar Cotações" sem `onClick`; `:242,257` botões "VALIDAR"/"REVISAR FILA" sem `onClick`; `:200` "correlação de 94%" e "R$ 4.2k" fixos; `:213` "98.2%" fixo | `ExecutiveDashboard.tsx:274`, `pages/solicitacoes/Solicitacoes.tsx:299` | Nenhuma | Tudo: dados, disparo de cotação, validação. Renderiza em 2 telas como se fosse operacional |
| BuscaAutomatica | 🟨 PARCIAL | `BuscaAutomatica.tsx:18-23` `fornecedoresAPI` hardcoded com contagens fixas ("10.172 produtos"); `:71,80-86,91` durante `status==='searching'` o progresso é simulado por índice (`index < 2` = encontrado), não por resposta real. O ramo `done` (`:97`) usa `resultados` reais da prop | `pages/cotacao/Cotacao.tsx:300` (recebe `cotacoesAPI`) | Prop (dados reais no estado final) | A tela de "busca em andamento" é encenação por índice; a lista de fornecedores integrados é literal |
| BuyerDrilldownModal | ✅ IMPLEMENTADO_TOTAL | `BuyerDrilldownModal.tsx:18` tipa por `BuyerData` de `hooks/useBuyerPerformanceData.ts`, que consulta `profiles/cotacoes/solicitacoes/pedidos/fornecedores/categorias` (`useBuyerPerformanceData.ts:52,68,85,101,117,132`); renderiza vazio honesto em `:144,171,216` | `pages/relatorio-negociacoes/RelatorioNegociacoes.tsx:26,382` | Supabase (6 tabelas) | — |
| BuyerPerformanceAlerts | 🟨 PARCIAL | `BuyerPerformanceAlerts.tsx:40` usa `useBuyerPerformanceData(6)` (real) e compara com metas; mas as metas vêm de `stores/buyerAlertsStore` (zustand). Os alertas gerados em `:62-72` vivem só no store do cliente | `pages/buyer/BuyerPerformanceDashboard.tsx:32,213` | Supabase (leitura) + zustand (alertas) | Alertas não são persistidos nem notificam ninguém fora da aba aberta |
| BuyerPerformancePanel | ✅ IMPLEMENTADO_TOTAL | `BuyerPerformancePanel.tsx:17` `supabase.from('cotacoes')`, `:30` `supabase.from('solicitacoes')`; agregações em `:39-80`; empty state honesto em `:168` | `pages/dashboard/ComprasDashboard.tsx:51` (lazy), `:247` | Supabase (`cotacoes`, `solicitacoes`) | — |
| ComparadorCotacoes | 🟨 PARCIAL | `ComparadorCotacoes.tsx:101-121` scoring real sobre as cotações recebidas; `:588` `onSelecionar(id)` — mas o consumidor liga isso a `setFornecedorSelecionado` (`pages/cotacao/Cotacao.tsx:267`), estado local. `:470,473` "Menor tempo de resposta histórico" e "Qualidade garantida (ISO 9001)" são bullets fixos, exibidos sob o rótulo "Escolha da IA" | `pages/cotacao/Cotacao.tsx:30,267` | Prop (cotações reais) — sem escrita | Seleção não persiste; os selos de qualidade da "IA" são literais |
| ContractDetailsModal | 🟨 PARCIAL | `ContractDetailsModal.tsx:86-92` busca real em `contract_items`, `contract_history`, `order_contracts`, `contract_penalties`, `contract_documents`; `:145` invoca edge function `generate-contract-pdf`. **Porém** `TabsList` declara 6 abas (`:220-233`) e só existem 4 `TabsContent`: general (`:236`), sla (`:307`), penalties (`:311`), history (`:315`) — **as abas "Itens" e "Docs" abrem em branco**. E `handleUploadDocument` (`:112-140`) nunca é chamado: não há `<input type="file">` renderizado | `pages/contratos/Contratos.tsx:49,271` | Supabase (5 tabelas) + edge function | Conteúdo das abas Itens/Docs e o gatilho de upload. O código de upload existe e está inalcançável |
| ContractModal | ✅ IMPLEMENTADO_TOTAL | `ContractModal.tsx:213-221` update em `contracts` + `contract_items`; `:250-270` insert; `:242,275` grava `contract_history`; `:107` lê itens; `onSuccess` recarrega em `pages/contratos/Contratos.tsx:269-270` | `pages/contratos/Contratos.tsx:48,269,270` | Supabase (`contracts`, `contract_items`, `contract_history`) | — |
| CostCenterPerformanceAnalysis | 🟨 PARCIAL | `CostCenterPerformanceAnalysis.tsx:29` `supabase.rpc('get_cost_center_performance_report')` — fio de leitura completo. Mas `:183-185` botão "Exportar" sem `onClick` | `pages/relatorios/Relatorios.tsx:38` (lazy), `:237` | Supabase RPC | Exportação. Existência da RPC `NAO_VERIFICADO (runtime)` |
| CotacaoManualModal | 🟨 PARCIAL | `CotacaoManualModal.tsx:67-76` `onSave(...)` **não inclui** `observacoes` nem `validade`, embora ambos sejam capturados em `:47-57` e editados em `:204-221`. `:224-231` a área "Anexar Cotação (PDF/Imagem)" é uma `<div>` decorativa — não há `<input type="file">` nem handler | `pages/cotacao/Cotacao.tsx:28,351` | Prop `onSave` (persistência do chamador) | Dois campos preenchidos pelo usuário são silenciosamente descartados; o anexo não anexa nada |
| CriticalAlertsBar | ✅ IMPLEMENTADO_TOTAL | `CriticalAlertsBar.tsx:20,33,46` três queries reais (`solicitacoes`, `pedidos`, `approval_workflows`); cálculo de SLA em `:68-94` usando `settings.criticalThresholdDays` do store; `:180` link real para `/solicitacoes` | `pages/dashboard/ComprasDashboard.tsx:28,262` | Supabase (3 tabelas) | — |
| DashboardInsights | 🟨 PARCIAL | `DashboardInsights.tsx:33` `useDashboardKPIs()` real alimenta 3 dos 4 insights (`:42,57,73`). O 4º (`:99-108`) é literal: "98% dos fornecedores ativos estão com documentação em dia" — número inventado. `:186-189` botão de ação (`insight.action`) sem `onClick`. `:170` badge "Impacto Alto/Médio" derivado do índice do array, não de cálculo | `pages/dashboard/ComprasDashboard.tsx:56` (lazy), `:252` | Supabase via `useDashboardKPIs` (3 de 4 cards) | Insight de compliance é fake; nenhuma ação é acionável |
| DeliveryCalendar | 🟨 PARCIAL | `DeliveryCalendar.tsx:55` `useDeliveryEvents()` → `delivery-calendar/deliveryCalendarHelpers.ts:67` `supabase.from('pedidos')` + `:87` `fornecedores` + `:90` `pedido_itens`. **Mas** `deliveryCalendarHelpers.ts:150` define o tipo do evento por `index % 3 === 0 ? 'pickup' : index % 5 === 0 ? 'partial' : 'delivery'` — entrega/coleta/parcial é decidido pela posição no array. `DeliveryCalendar.tsx:313-314` botões "Ver Pedido" e "Rastrear Entrega" sem `onClick` | `pages/dashboard/ComprasDashboard.tsx:53` (lazy), `:249` | Supabase (3 tabelas) | Campo `type` é fabricado; dois botões inertes no modal de detalhe |
| DemandPredictionPanel | ✅ IMPLEMENTADO_TOTAL | `DemandPredictionPanel.tsx:97` `fetchAllRows('pedidos', …)`; `:139` `supabase.functions.invoke('ai-demand-prediction')` com histórico real; `:126-133` recusa honestamente quando não há dados. Ressalva: `:120` `totalQuantity: monthPedidos.length * 10` com comentário "Simulated quantity if not in DB" | `pages/relatorios/Relatorios.tsx:37` e `:239`; `pages/dashboard/ComprasDashboard.tsx:54` e `:250` | Supabase + edge function `ai-demand-prediction` | Fio completo. A quantidade enviada à IA é uma proxy (×10), não a quantidade real |
| DigitalSignature | 🟦 SUGERIDO_OU_INICIADO | `DigitalSignature.tsx:46` estado inicial = `mockSignatureRequests` (`digital-signature/signatureHelpers.ts:16-47`, 3 registros fixos com datas de dez/2024). `:124` `await new Promise(r => setTimeout(r, 1500))` no lugar da API; `:136` novo pedido só entra em `useState`. `:149` toast "Email enviado para …" sem envio algum. `:164-170` assinatura só muda estado local. `:341-342` promete "criptografada… válida juridicamente conforme MP 2.200-2/2001" | `pages/contratos/Contratos.tsx:8,135` | Nenhuma — zero supabase | Persistência, envio de e-mail, carimbo de tempo, criptografia. Nada sobrevive a um refresh |
| DraggableDashboard | ✅ IMPLEMENTADO_TOTAL | `DraggableDashboard.tsx:219` usa `saveToDb` do `stores/dashboardLayoutStore.ts:142-154` → `supabase.from('dashboard_layouts').upsert(...)`; chamado em `:226,232,384,417` | `pages/dashboard/ComprasDashboard.tsx:30` | Supabase (`dashboard_layouts`) | — |
| DynamicApprovalMatrix | 🟨 PARCIAL | `DynamicApprovalMatrix.tsx:29` `useApprovalWorkflow()` → escritas reais em `approval_workflows`/`approval_steps`/`approval_history` (`hooks/useApprovalWorkflow.ts:114,161,165,201`). **Mas** `:15-21` `mockUsers` e `:23-26` `mockCategories` são literais, e `:41-42` `getUserName`/`getCategoryName` resolvem nomes só contra esses mocks — para qualquer usuário real a UI mostra o UUID cru (`|| userId`) em `:96,101,132,134,161,162` | `pages/aprovacoes/Aprovacoes.tsx:4,120`; `pages/solicitacoes/Solicitacoes.tsx:49,243` | Supabase (regras/delegações) + literais (nomes) | Resolução de nomes de aprovadores e categorias contra o banco |
| EnhancedBulkActionsBar | 🟨 PARCIAL | `EnhancedBulkActionsBar.tsx:92` delega `onExecute` real. **Mas** `:94-98` promete "Você tem 8 segundos para desfazer" e o botão "Desfazer Ação Neural" em `:124` faz apenas `setShowUndo(false)` + `toast.info("Ação desfeita com sucesso.")` — **nada é revertido, e o usuário é informado do contrário**. `:174` "Previsão de Saving" = `totalValue * 0.15`, constante inventada | `pages/pedidos/Pedidos.tsx:23,333`; `pages/solicitacoes/Solicitacoes.tsx:32,422` | Indireta (callbacks) | Undo real; a previsão de saving é uma multiplicação fixa |
| EnhancedKpiCard | ✅ IMPLEMENTADO_TOTAL | `EnhancedKpiCard.tsx:33` componente de apresentação puro; recebe valores já calculados. Consumido com dados reais em `pages/dashboard/ComprasDashboard.tsx:137,153,169,185` e `pages/devolucoes/Devolucoes.tsx:60-65` | `ComprasDashboard.tsx:25`, `Devolucoes.tsx:21` | N/A (apresentação) — os pais fornecem dados de Supabase | — |
| EnhancedPedidoTimeline | ⬛ MORTO_OU_ABANDONADO | `EnhancedPedidoTimeline.tsx:27` exporta o componente (519 linhas, duas orientações completas). `grep -rn "EnhancedPedidoTimeline" src/` retorna apenas: a própria definição, `timeline/timelineConfig.ts:64` (o tipo de props) e `pages/acompanhamento/AcompanhamentoHelpers.ts:10` — que importa **só o tipo `TimelineStep`**, não o componente. Nenhum `<EnhancedPedidoTimeline` em lugar algum | Ninguém (só o tipo é reaproveitado) | Prop | Nenhum caminho de render. A tela usa o `PedidoTimeline` antigo (`Acompanhamento.tsx:378,445`) |
| ExecutiveDashboard | 🟨 PARCIAL | `ExecutiveDashboard.tsx:50` `useExecutiveDashboardData()` alimenta os 4 cards de topo (`:57-93`). **Mas** `:23-26` importa `categorySpend`, `topSuppliers`, `buyerPerformance`, `pendingItems` de `executive/executiveDashboardData.ts:1` ("Mock data constants for the Executive Dashboard") e são esses mocks que alimentam gráficos e tabelas (`:129,136,143,150`). `:53` no loading injeta `savingsPercent: 10.0` fixo. `:199` botão "EXPORT REPORT" com `onClick={() => {}}`. `:298` botão "VER MATRIZ KRALJIC" sem `onClick`. `:272` rating dos fornecedores forçado a `4.5` para a IA | `pages/dashboard/DashboardExecutivo.tsx:1,12` | Supabase (4 KPIs) + mock estático (gráficos/tabelas) | Metade inferior do dashboard é mock; export e navegação Kraljic não fazem nada |
| FilterFavoritesManager | ✅ IMPLEMENTADO_TOTAL | `FilterFavoritesManager.tsx:52` `onSave`, `:207` `onSetDefault`, `:223` `onDelete` — todos vindos de `hooks/useDashboardFilters` e ligados em `ExecutiveDashboard.tsx:214-216` | `executive/ExecutiveFiltersBar.tsx:9,109`; `pages/dashboard/ComprasDashboard.tsx:33` | Supabase via `useDashboardFilters` | Persistência real `NAO_VERIFICADO (runtime)`, mas o fio de código está fechado |
| FiltrosAvancados | 🟨 PARCIAL | Declara 9 dimensões de filtro (`FiltrosAvancados.tsx:35-45`), mas o painel só renderiza 4 acordeões: período, valor, empresas, prioridades (`:157,191,222,245`) — vendedores/fornecedores/tipos/status não têm UI. `:59-61` `empresasOptions`/`vendedoresOptions`/`fornecedoresOptions` são literais fictícios ("ABC Ltda", "João Silva"). No consumidor, apenas `dateRange` e `valorMin/Max` são efetivamente aplicados (`pages/solicitacoes/Solicitacoes.tsx:116-121`); `onApply={() => {}}` em `:344` | `pages/solicitacoes/Solicitacoes.tsx:25,344` | Estado local; opções são literais | 5 das 9 dimensões não filtram nada; listas de opções não vêm do banco |
| FornecedorModal | ✅ IMPLEMENTADO_TOTAL | `FornecedorModal.tsx:82` `onSave(dataToSave)`; formatação de CNPJ/telefone em `:86-105`; ligado ao fluxo de persistência em `pages/fornecedores/Fornecedores.tsx:277` | `pages/fornecedores/Fornecedores.tsx:2,277` | Prop `onSave` (persistência do chamador) | `ramosDisponiveis` (`:18-22`) é lista fixa, mas é taxonomia de domínio, não dado de negócio |
| HistoricoComprasModal | ⬛ MORTO_OU_ABANDONADO (órfão) | `HistoricoComprasModal.tsx:33` exportado; `:40-44` query real em `pedidos` + `pedido_itens`. `grep -rn "HistoricoComprasModal" src/` → **só 2 hits, ambos dentro do próprio arquivo** (`:9` interface, `:33` export) | Ninguém | Supabase (`pedidos`, `pedido_itens`) — funcional, mas inalcançável | Um consumidor. O componente está pronto |
| IAAdvisor | 🟨 PARCIAL | `IAAdvisor.tsx:33-35` o texto é derivado de `stats.pending` (prop real vinda de `pages/solicitacoes/Solicitacoes.tsx:297`). Mas os dois botões — "Ver Insights" (`:40`) e "Ação Rápida" (`:43`) — não têm `onClick` | `pages/solicitacoes/Solicitacoes.tsx:24,297` | Prop (stats reais) | Ambas as ações são inertes |
| KPITargetsConfig | 🟨 PARCIAL | `KPITargetsConfig.tsx:49` `updateTarget` → `stores/kpiTargetsStore.ts` (zustand + `persist`, localStorage). `:51-54` toast "salvas com sucesso" — mas salvo apenas no navegador. `:58-60` "Resetar" na verdade recarrega dos targets atuais, não dos padrões | `AdvancedProcurementKPIs.tsx:43,164` | localStorage (zustand persist) | Persistência server-side; metas não são compartilhadas entre usuários nem sobrevivem a outro dispositivo |
| KanbanBoard | ✅ IMPLEMENTADO_TOTAL | `KanbanBoard.tsx:112` componente; `:139-152` drag-and-drop chama `onStatusChange`, ligado a `handleStatusChange` em `pages/acompanhamento/Acompanhamento.tsx:313`. Type guards `:44,48` cobertos por teste em `__tests__/kanbanTypeGuards.test.ts:24` | `pages/acompanhamento/Acompanhamento.tsx:32,313` | Prop + callback do chamador | — |
| MainLayout (compras/) | ⬛ MORTO_OU_ABANDONADO | `MainLayout.tsx:1` é o arquivo inteiro: `export { MainLayout } from "@/features/layout/components/MainLayout";`. `grep -rn "compras/MainLayout" src/` → **zero resultados**. Todos os consumidores importam direto de `@/features/layout/components/MainLayout` (ex.: `pages/seguranca/Seguranca.tsx:3`, `pages/qualificacao/QualificacaoFornecedores.tsx:2`) | Ninguém | N/A | Nada. É um shim de re-export sem uso — resíduo de refatoração |
| NeuralFollowUpMonitor | 🟦 SUGERIDO_OU_INICIADO | `NeuralFollowUpMonitor.tsx:18-32` `runNeuralProcess` é uma sequência de `setTimeout` que empilha strings; `:31` escreve `[OK] Message delivered via Promo AI Gateway.` **sem qualquer chamada de rede**; `:27` a "mensagem" é template string local; `:102` "+48h Overdue" é literal | `pages/cotacao/Cotacao.tsx:34,310` | Nenhuma | Tudo. Declara ter entregado uma mensagem a um fornecedor real e não envia nada |
| NovaSolicitacaoModal | ✅ IMPLEMENTADO_TOTAL | `NovaSolicitacaoModal.tsx:215-235` insert real em `solicitacoes`; `:196` RPC `generate_sequential_number`; `:156` RPC `check_budget_availability`; `:242-244` upload de anexos ao bucket `documentos`; `:108` edge function `process-solicitacao-neural`; `:193-194` sanitização DOMPurify; validação Zod em `:133` | `pages/solicitacoes/Solicitacoes.tsx:23,270` | Supabase (tabela + 2 RPCs + storage) + edge function | — |
| OrderPreviewModal | ⬛ MORTO_OU_ABANDONADO (órfão) | `OrderPreviewModal.tsx:16` exportado, 164 linhas, layout de pedido de compra completo com impressão (`:19-21`). `grep -rn "OrderPreviewModal" src/` → **só 2 hits, ambos internos** (`:9` interface, `:16` export) | Ninguém | Prop `Pedido` (de `@/features/pedidos`) | Um consumidor |
| PedidoTimeline | ✅ IMPLEMENTADO_TOTAL | `PedidoTimeline.tsx:27` renderizado em duas orientações por `pages/acompanhamento/Acompanhamento.tsx:378` (horizontal) e `:445` (vertical), com etapas derivadas de `gerarEtapasPipeline(pedido.status)` | `pages/acompanhamento/Acompanhamento.tsx:31,378,445`; tipo em `AcompanhamentoHelpers.ts:9` | Prop derivada do status real do pedido | — |
| PenaltyEscalationConfigPanel | ✅ IMPLEMENTADO_TOTAL | `PenaltyEscalationConfigPanel.tsx:52-55` select em `penalty_escalation_config`; `:64-72` insert; `:85` delete; invalidação de cache em `:76,89`; gate por `isAdmin` em `:111,134,152` | `pages/compliance/ComplianceDashboard.tsx:3,376` | Supabase (`penalty_escalation_config`) | — |
| PendingApprovalsList | 🟨 PARCIAL | `PendingApprovalsList.tsx:62` `useApprovalWorkflow()`; `:206` `approveStep` e `:221` `rejectStep` gravam em `approval_steps`/`approval_workflows`/`approval_history` (`hooks/useApprovalWorkflow.ts:201,226,248,252`). **Mas** o item de menu "Ver Histórico" (`:433-435`) não tem `onClick`. `mockPendingApprovals` existe em `pending-approvals/pendingApprovalsData.ts:22` e **não é importado pelo componente** — só por `__tests__/pendingApprovalsData.test.ts:3` | `pages/aprovacoes/Aprovacoes.tsx:5,116` | Supabase (3 tabelas de aprovação) | Ação "Ver Histórico" |
| PipelineChart | ✅ IMPLEMENTADO_TOTAL | `PipelineChart.tsx:104` recebe `data` real de `pages/dashboard/ComprasDashboard.tsx:205` (`<PipelineChart data={pipeline} />`); conversões calculadas em `:40-43,113`; coberto por `__tests__/PipelineChart.test.tsx:38` | `pages/dashboard/ComprasDashboard.tsx:26,205` | Prop (dados do dashboard) | Ressalva: `previousData` cai em `defaultPreviousData` zerado (`:31-38`) quando não passado — e o consumidor **não passa**, então todas as setas de tendência comparam contra zero |
| PriceComparator | 🟨 PARCIAL — **preços fabricados** | `PriceComparator.tsx:53,67` lê fornecedores e produtos reais; `:96-99` lê `produto_fornecedores`. **Mas** `price-comparator/priceComparatorHelpers.ts:58` — quando não há preço vinculado, o preço unitário vira `(25 + Math.random() * 50) * (0.85 + Math.random() * 0.3)`; idem `deliveryDays` (`:70`), `paymentTerms` (`:71`), `stock` (`:72`), `rating` (`:73`), `onTimeDelivery` (`:74`). O resultado é apresentado como "Comparação concluída" (`PriceComparator.tsx:113`) e "Melhor Preço" (`:288`). Botões "Gerar Plano Final" (`:266-270`) e "Disparar RFQ" (`:371-376`) só emitem toast | `pages/fornecedores/Fornecedores.tsx:5,200` | Supabase (fornecedores/produtos/vínculos) + **`Math.random()` para os preços** | Preço real quando não há vínculo; disparo de RFQ; geração do plano |
| PriceHistoryModal | 🟨 PARCIAL | `PriceHistoryModal.tsx:40,50,57` três `fetchAllRows` reais (`cotacoes`, `fornecedores`, `solicitacoes`); toda a análise em `price-history/priceHistoryHelpers.ts:47-133` é cálculo sobre dados reais; empty states honestos em `:312,382,428`. Ressalva: `:227` "Confiança da análise: 94%" é literal, e `:224` "Volatilidade Neural" é só `Math.abs(change) > 10` rotulado como IA | `pages/cotacao/Cotacao.tsx:32,367` | Supabase (3 tabelas) | A métrica de confiança é fixa; rótulo "Neural" não corresponde a modelo algum |
| ProductSupplierManager | ✅ IMPLEMENTADO_TOTAL | `ProductSupplierManager.tsx:44` `useProdutoFornecedores(produtoId)`; `:69-75` `linkFornecedor.mutateAsync` (insert em `produto_fornecedores`); `:218` `removeLink.mutate`; `:57-61` lista fornecedores do tenant | `pages/catalogo-produtos/CatalogoProdutos.tsx:27,362` | Supabase (`produto_fornecedores`, `fornecedores`) | — |
| ProductionRoutingEngine | 🟨 PARCIAL | `ProductionRoutingEngine.tsx:24-26` a detecção de rotina é heurística de string sobre itens reais (`'boné'`, `'personalizado'`, `lead_time_dias > 15`). **Mas** os passos e seus estados são literais: `:36-38`, `:48-50`, `:60-62` fixam `completed/pending/upcoming` — o progresso mostrado nunca reflete a produção real | `pages/pedidos/PedidoDetailsDialog.tsx:18,175` | Prop (itens reais) para a detecção; estados fabricados | Ligação dos passos a um estado de produção persistido |
| SourcingIntelligenceBanner (mesmo arquivo) | 🟨 PARCIAL | `ProductionRoutingEngine.tsx:126-129` contagem real em `produto_fornecedores`. Mas os botões "LISTAR"/"CONECTAR" (`:174-181`) não têm `onClick` | `pages/pedidos/PedidoDetailsDialog.tsx:18,202` | Supabase (`produto_fornecedores`) | Ambas as ações são inertes |
| PurchaseClimateWidget | 🟨 PARCIAL | `PurchaseClimateWidget.tsx:62-66` três queries reais (`solicitacoes`, `pedidos`, `pagamentos`); score ponderado calculado em `:100-117`. **Mas** `:120` `trendValue` é escolhido de três constantes (`5.2` / `-3.8` / `0.5`) conforme a faixa do score — e é exibido como variação percentual em `:178` | `ExecutiveDashboard.tsx:9,286`; `pages/dashboard/ComprasDashboard.tsx:29,284` | Supabase (3 tabelas) | Tendência real (comparação com período anterior) |
| QualificationHistoryTimeline | ✅ IMPLEMENTADO_TOTAL | `QualificationHistoryTimeline.tsx:37-39` query em `qualification_history` com join em `fornecedores`; filtro opcional por fornecedor em `:43`; empty state honesto em `:67` | `pages/qualificacao/QualificacaoFornecedores.tsx:12,261` | Supabase (`qualification_history`) | — |
| RankingCotacoes | 🟨 PARCIAL — **justificativa de auditoria descartada** | `RankingCotacoes.tsx:101-114` scoring ponderado real e configurável (`:61-65`). `:376-414` abre modal "Selection Variance" exigindo justificativa "for audit tracking" e `:73` chama `onSelecionar(id, justificativa)`. **Porém o consumidor liga `onSelecionar={setFornecedorSelecionado}`** (`pages/cotacao/Cotacao.tsx:276`), um `useState<string\|null>` (`:65`) — o segundo argumento é descartado e nada é auditado. `:240` `score_qualidade \|\| 80` usa 80 fixo como fallback | `pages/cotacao/Cotacao.tsx:27,273` | Prop (cotações reais); **sem escrita** | Persistência da seleção e da justificativa de desvio |
| ReceivingModal | ⬛ MORTO_OU_ABANDONADO (órfão) | `ReceivingModal.tsx:37` exportado. Implementação **completa**: `:81-85` update de `quantidade_recebida` em `pedido_itens`; `:90-97` update de status do pedido; `:124-154` geração automática de pedido complementar (RPC `generate_sequential_number` + insert em `pedidos` e `pedido_itens`). `grep -rn "ReceivingModal" src/` → **só 3 hits, todos internos** (`:28`, `:37`, `:44`) | Ninguém | Supabase (`pedido_itens`, `pedidos`) + RPC — tudo escrito, nada alcançável | Um consumidor. É o achado mais caro do lote: 306 linhas de lógica de negócio funcional e órfã |

## Componentes órfãos (com prova de grep)

Critério: `grep -rn "<Símbolo>" src/` cobrindo `import X`, `<X `, `lazy(() => import(`, e uso em genéricos (`Parameters<typeof X>`). Órfão = hits apenas na própria definição.

### 1. `ReceivingModal` — `src/components/compras/ReceivingModal.tsx:37`
```
$ grep -rn "ReceivingModal" src/
src/components/compras/ReceivingModal.tsx:28:interface ReceivingModalProps {
src/components/compras/ReceivingModal.tsx:37:export function ReceivingModal({
src/components/compras/ReceivingModal.tsx:44:}: ReceivingModalProps) {
```
3 hits, todos no próprio arquivo. **Nenhuma referência em teste tampouco.** Gravidade máxima: o componente escreve em `pedido_itens`, muda status de `pedidos` e cria pedido complementar (`:130-154`). Conferência de recebimento e geração de saldo estão implementadas e inacessíveis pela UI.

### 2. `OrderPreviewModal` — `src/components/compras/OrderPreviewModal.tsx:16`
```
$ grep -rn "OrderPreviewModal" src/
src/components/compras/OrderPreviewModal.tsx:9:interface OrderPreviewModalProps {
src/components/compras/OrderPreviewModal.tsx:16:export const OrderPreviewModal = ({ pedido, open, onOpenChange, onConfirmSend }: OrderPreviewModalProps) => {
```
2 hits, ambos internos. Sem referência em teste. Inclui `onConfirmSend` (`:155-158`) — "Confirmar e Enviar ao Fornecedor" — que nunca é ligado a nada.

### 3. `HistoricoComprasModal` — `src/components/compras/HistoricoComprasModal.tsx:33`
```
$ grep -rn "HistoricoComprasModal" src/
src/components/compras/HistoricoComprasModal.tsx:9:interface HistoricoComprasModalProps {
src/components/compras/HistoricoComprasModal.tsx:33:export const HistoricoComprasModal = ({ open, onOpenChange, fornecedor }: HistoricoComprasModalProps) => {
```
2 hits, ambos internos. Sem referência em teste. Faz query real (`:40-44`) e calcula KPIs de fornecedor (`:53-55`).

### 4. `EnhancedPedidoTimeline` (componente) — `src/components/compras/EnhancedPedidoTimeline.tsx:27`
```
$ grep -rn "EnhancedPedidoTimeline" src/
src/components/compras/timeline/timelineConfig.ts:64:export interface EnhancedPedidoTimelineProps {
src/components/compras/EnhancedPedidoTimeline.tsx:21:  type EnhancedPedidoTimelineProps,
src/components/compras/EnhancedPedidoTimeline.tsx:27:export const EnhancedPedidoTimeline = ({
src/components/compras/EnhancedPedidoTimeline.tsx:35:}: EnhancedPedidoTimelineProps) => {
src/pages/acompanhamento/AcompanhamentoHelpers.ts:10:import { TimelineStep } from "@/components/compras/EnhancedPedidoTimeline";
```
Órfão **parcial e honesto**: o único hit externo (`AcompanhamentoHelpers.ts:10`) importa exclusivamente o **tipo** `TimelineStep`, reexportado em `EnhancedPedidoTimeline.tsx:26`. Não existe nenhum `<EnhancedPedidoTimeline` em `src/`. São 519 linhas de componente sem caminho de render — a tela de acompanhamento usa o `PedidoTimeline` de 154 linhas (`Acompanhamento.tsx:378,445`).

### 5. `src/components/compras/MainLayout.tsx` — arquivo de re-export morto
```
$ cat src/components/compras/MainLayout.tsx
export { MainLayout } from "@/features/layout/components/MainLayout";

$ grep -rn "compras/MainLayout" src/
(zero resultados)
```
Nenhum arquivo importa por esse caminho. Todos os consumidores usam `@/features/layout/components/MainLayout` diretamente (`pages/seguranca/Seguranca.tsx:3`, `pages/qualificacao/QualificacaoFornecedores.tsx:2`, `pages/catalogo-spot/CatalogoSpot.tsx:2`, `pages/portal-fornecedor/PortalFornecedor.tsx:9`, `pages/configuracoes/ConfiguracoesCentroCusto.tsx:2`). Resíduo de refatoração.

### Não-órfãos que poderiam parecer órfãos (falso-positivo evitado)
- `ActiveSourcingWidget`, `BuyerPerformancePanel`, `DashboardInsights`, `DeliveryCalendar`, `DemandPredictionPanel`, `AdvancedProcurementKPIs`, `CostCenterPerformanceAnalysis` — consumidos via `lazy(() => import(...))` em `ComprasDashboard.tsx:51-57` e `Relatorios.tsx:36-38`. Um grep por `<Componente` isolado não os pegaria.
- `SourcingIntelligenceBanner` e `ProductionRoutingEngine` — usados via `Parameters<typeof X>[0]['items']` em `pages/pedidos/PedidoDetailsDialog.tsx:175,202`.
- `BulkOperationsPreview` — o componente é usado só em `EnhancedBulkActionsBar.tsx:273`, mas seus **tipos** são importados em 3 outros lugares (`useBulkOperations.ts:3`, `Pedidos.tsx:24`, `Solicitacoes.tsx:33`).

## Achados graves

1. **`ReceivingModal` órfão com lógica de escrita completa** — `ReceivingModal.tsx:81-154`. Atualiza quantidade recebida, muda status do pedido para `entregue`/`parcial` e gera pedido complementar do saldo. Zero consumidores. Se a conferência de recebimento é um requisito, ela não existe operacionalmente apesar de estar escrita.

2. **Botão "Desfazer" que mente ao usuário** — `EnhancedBulkActionsBar.tsx:94-98` anuncia "Você tem 8 segundos para desfazer" e `:124` executa `setShowUndo(false); toast.info("Ação desfeita com sucesso.")`. Nenhuma reversão ocorre. O mesmo padrão aparece em `BulkOperationsPreview.tsx:189`, que ao menos é honesto ("em desenvolvimento"). Após uma exclusão em massa o usuário é informado de que desfez, e não desfez.

3. **Preços de cotação gerados por `Math.random()` e apresentados como comparação real** — `price-comparator/priceComparatorHelpers.ts:58,70,71,72,73,74`. Sem vínculo `produto_fornecedores`, preço unitário, prazo, condição de pagamento, estoque, rating e pontualidade são todos aleatórios. `PriceComparator.tsx:113` chama isso de "Comparação concluída" e `:288-293` exibe "Melhor Preço" com valor. Decisão de compra sobre número inventado.

4. **Justificativa de desvio de recomendação é coletada e descartada** — `RankingCotacoes.tsx:73` passa `justificativa` como 2º argumento de `onSelecionar`, e o modal (`:386`) diz explicitamente "for audit tracking". O consumidor liga `onSelecionar={setFornecedorSelecionado}` (`pages/cotacao/Cotacao.tsx:276`), um setter de `useState<string|null>`. A trilha de auditoria não existe.

5. **`ContractDetailsModal` com duas abas vazias e código de upload inalcançável** — `ContractDetailsModal.tsx:220-233` declara 6 abas; só 4 têm `TabsContent` (`:236,307,311,315`). "Itens (n)" e "Docs (n)" mostram a contagem e abrem em branco. `handleUploadDocument` (`:112-140`) faz upload para storage e insert em `contract_documents`, e nunca é invocado — não há input de arquivo renderizado.

6. **`DigitalSignature` é teatro completo em página de produção** — `DigitalSignature.tsx:46` parte de mock; `:124,164` `setTimeout` no lugar de API; `:149` afirma ter enviado e-mail; `:341-342` invoca a MP 2.200-2/2001. Renderizado em `pages/contratos/Contratos.tsx:135`. Nada persiste; um refresh apaga "assinaturas".

7. **`NeuralFollowUpMonitor` declara ter enviado mensagem a fornecedor** — `NeuralFollowUpMonitor.tsx:31` escreve `[OK] Message delivered via Promo AI Gateway.` após três `setTimeout`. Zero chamadas de rede no arquivo. Está em `pages/cotacao/Cotacao.tsx:310`.

8. **Nomes de aprovadores exibidos como UUID** — `DynamicApprovalMatrix.tsx:41` `getUserName` resolve apenas contra `mockUsers` (`:15-21`, 5 usuários fictícios); para qualquer `user_id` real cai no fallback `|| userId`, imprimindo o UUID cru nas colunas de aprovadores, escalação e delegação (`:96,101,132,134,161,162`). O restante do componente grava de verdade via `useApprovalWorkflow`.

9. **`ExecutiveDashboard`: metade real, metade mock, sem distinção visual** — 4 KPIs de topo vêm de `useExecutiveDashboardData` (`:50`); gráficos de categoria, tabelas de fornecedores/compradores e ações pendentes vêm de `executive/executiveDashboardData.ts` (`:23-26`), arquivo cujo cabeçalho é "Mock data constants". O rótulo na tela é "Real-time Intelligence" (`ExecutiveDashboard.tsx:171`).

10. **Campos de formulário silenciosamente descartados** — `CotacaoManualModal.tsx:67-76`: `observacoes` e `validade` são editáveis (`:204-221`) e não entram no payload de `onSave`. A área de anexo (`:224-231`) é uma div sem `input[type=file]`.

11. **`PipelineChart` compara tendência contra zero** — `PipelineChart.tsx:31-38` define `defaultPreviousData` com todos os campos em `0`; o consumidor `ComprasDashboard.tsx:205` não passa `previousData`. Portanto todo `TrendIndicator` (`:178,223`) e todo cálculo de `pctChange` (`:83`) operam contra zero, produzindo setas de alta sistemáticas.

12. **Metas de KPI e alertas de comprador só existem no navegador** — `KPITargetsConfig.tsx:49` → `stores/kpiTargetsStore.ts:1-2` (zustand `persist`/localStorage). O toast em `:51-54` diz "salvas com sucesso" sem qualificar que é local. Mesmo padrão em `BuyerPerformanceAlerts.tsx:62`.

## Dados fictícios encontrados

| Onde | Evidência | Natureza |
|---|---|---|
| `price-comparator/priceComparatorHelpers.ts:58,70,71,72,73,74` | `Math.random()` em preço, prazo, pagamento, estoque, rating, pontualidade | **Aleatório em runtime**, exibido como cotação |
| `procurement-kpis/kpiMockData.ts:1-80` | `// Mock data and helper types` — os 8 KPIs inteiros | Mock estático servindo `AdvancedProcurementKPIs` |
| `executive/executiveDashboardData.ts:1-…` | `// Mock data constants for the Executive Dashboard`; `currentPeriodMetrics`/`previousPeriodMetrics` literais | Mock estático servindo gráficos e tabelas do `ExecutiveDashboard` |
| `digital-signature/signatureHelpers.ts:16-47` | `mockSignatureRequests`, 3 registros com datas de dez/2024 | Estado inicial de `DigitalSignature` |
| `BulkPlanningConsole.tsx:23-57,62-66` | `mockPlanningData` + `freightAnalysis` literais | Todo o painel |
| `DynamicApprovalMatrix.tsx:15-26` | `mockUsers` (5), `mockCategories` (5) | Resolução de nomes |
| `FiltrosAvancados.tsx:59-61` | `empresasOptions`, `vendedoresOptions`, `fornecedoresOptions` ("ABC Ltda", "João Silva", "Importadora 123") | Opções de filtro |
| `BuscaAutomatica.tsx:18-23` | `fornecedoresAPI` com contagens fixas ("10.172 produtos", "393 produtos") | Lista de integrações |
| `AISupplierSuggestion.tsx:32,35,41-42` | "Aluminum Mug", "12 qualified suppliers", AluTech 98% / Brindes Prime Sul 94% | Componente inteiro |
| `deliveryCalendarHelpers.ts:150` | `index % 3 === 0 ? 'pickup' : index % 5 === 0 ? 'partial' : 'delivery'` | Tipo de entrega derivado da posição no array |
| `PurchaseClimateWidget.tsx:120` | `trendValue = 5.2 / -3.8 / 0.5` conforme faixa | Variação percentual fabricada |
| `EnhancedBulkActionsBar.tsx:174` | `totalValue * 0.15` rotulado "Previsão de Saving" | Constante disfarçada de previsão |
| `DashboardInsights.tsx:103` | "98% dos fornecedores ativos estão com documentação em dia" | Insight literal entre 3 reais |
| `BulkPlanningConsole.tsx:200,213` | "correlação de 94%", "R$ 4.2k", "98.2%" | Números de IA inventados |
| `PriceHistoryModal.tsx:227` | "Confiança da análise: 94%" | Literal sob rótulo "Neural" |
| `RankingCotacoes.tsx:240` | `cotacao.score_qualidade \|\| 80` | Fallback 80 exibido como "Quality & Risk" |
| `ProductionRoutingEngine.tsx:36-38,48-50,60-62` | `status: "completed"/"pending"/"upcoming"` literais | Progresso de produção |
| `ExecutiveDashboard.tsx:53,272` | `savingsPercent: 10.0`; `rating: 4.5` para todos os fornecedores | Injetados na camada de IA |
| `ComparadorCotacoes.tsx:470,473` | "Menor tempo de resposta histórico", "Qualidade garantida (ISO 9001)" | Bullets fixos sob "Escolha da IA" |
| `NeuralFollowUpMonitor.tsx:102` | "+48h Overdue" | Literal |
| `DemandPredictionPanel.tsx:120` | `monthPedidos.length * 10 // Simulated quantity if not in DB` | Proxy enviada à edge function de IA |
| `pending-approvals/pendingApprovalsData.ts:22-74` | `mockPendingApprovals` (3 registros) | **Não usado em produção** — só por `__tests__/pendingApprovalsData.test.ts:3`. Registrado por completude |

## Limites desta auditoria

- Sem acesso ao banco: existência de tabelas (`sourcing_events`, `dashboard_layouts`, `penalty_escalation_config`, `qualification_history`, `contract_documents`, …), de RPCs (`get_cost_center_performance_report`, `check_budget_availability`, `generate_sequential_number`) e de edge functions (`ai-demand-prediction`, `process-solicitacao-neural`, `generate-contract-pdf`) é `NAO_VERIFICADO (runtime)`. Classifiquei como ✅ quando o **fio de código** está fechado, não quando o objeto de banco está confirmado.
- Não executei a aplicação. "Aba abre em branco" (`ContractDetailsModal`) é inferência de leitura estrutural do JSX — `TabsList` com 6 `TabsTrigger` e apenas 4 `TabsContent` correspondentes — não observação de runtime.
- Não li nada além do corte em `ReceivingModal.tsx`. Os 9 arquivos `[apoio]` foram lidos apenas para determinar a camada de dados dos 48 do escopo e **não** receberam classificação; pertencem ao L05.

## ARQUIVOS LIDOS

### Escopo formal (48 arquivos, `AISupplierSuggestion.tsx` … `ReceivingModal.tsx`)
/home/user/promo-supply-v2/src/components/compras/AISupplierSuggestion.tsx
/home/user/promo-supply-v2/src/components/compras/ActiveSourcingWidget.tsx
/home/user/promo-supply-v2/src/components/compras/AdvancedProcurementKPIs.tsx
/home/user/promo-supply-v2/src/components/compras/BulkOperationsPreview.tsx
/home/user/promo-supply-v2/src/components/compras/BulkPlanningConsole.tsx
/home/user/promo-supply-v2/src/components/compras/BuscaAutomatica.tsx
/home/user/promo-supply-v2/src/components/compras/BuyerDrilldownModal.tsx
/home/user/promo-supply-v2/src/components/compras/BuyerPerformanceAlerts.tsx
/home/user/promo-supply-v2/src/components/compras/BuyerPerformancePanel.tsx
/home/user/promo-supply-v2/src/components/compras/ComparadorCotacoes.tsx
/home/user/promo-supply-v2/src/components/compras/ContractDetailsModal.tsx
/home/user/promo-supply-v2/src/components/compras/ContractModal.tsx
/home/user/promo-supply-v2/src/components/compras/CostCenterPerformanceAnalysis.tsx
/home/user/promo-supply-v2/src/components/compras/CotacaoManualModal.tsx
/home/user/promo-supply-v2/src/components/compras/CriticalAlertsBar.tsx
/home/user/promo-supply-v2/src/components/compras/DashboardInsights.tsx
/home/user/promo-supply-v2/src/components/compras/DeliveryCalendar.tsx
/home/user/promo-supply-v2/src/components/compras/DemandPredictionPanel.tsx
/home/user/promo-supply-v2/src/components/compras/DigitalSignature.tsx
/home/user/promo-supply-v2/src/components/compras/DraggableDashboard.tsx
/home/user/promo-supply-v2/src/components/compras/DynamicApprovalMatrix.tsx
/home/user/promo-supply-v2/src/components/compras/EnhancedBulkActionsBar.tsx
/home/user/promo-supply-v2/src/components/compras/EnhancedKpiCard.tsx
/home/user/promo-supply-v2/src/components/compras/EnhancedPedidoTimeline.tsx
/home/user/promo-supply-v2/src/components/compras/ExecutiveDashboard.tsx
/home/user/promo-supply-v2/src/components/compras/FilterFavoritesManager.tsx
/home/user/promo-supply-v2/src/components/compras/FiltrosAvancados.tsx
/home/user/promo-supply-v2/src/components/compras/FornecedorModal.tsx
/home/user/promo-supply-v2/src/components/compras/HistoricoComprasModal.tsx
/home/user/promo-supply-v2/src/components/compras/IAAdvisor.tsx
/home/user/promo-supply-v2/src/components/compras/KPITargetsConfig.tsx
/home/user/promo-supply-v2/src/components/compras/KanbanBoard.tsx
/home/user/promo-supply-v2/src/components/compras/MainLayout.tsx
/home/user/promo-supply-v2/src/components/compras/NeuralFollowUpMonitor.tsx
/home/user/promo-supply-v2/src/components/compras/NovaSolicitacaoModal.tsx
/home/user/promo-supply-v2/src/components/compras/OrderPreviewModal.tsx
/home/user/promo-supply-v2/src/components/compras/PedidoTimeline.tsx
/home/user/promo-supply-v2/src/components/compras/PenaltyEscalationConfigPanel.tsx
/home/user/promo-supply-v2/src/components/compras/PendingApprovalsList.tsx
/home/user/promo-supply-v2/src/components/compras/PipelineChart.tsx
/home/user/promo-supply-v2/src/components/compras/PriceComparator.tsx
/home/user/promo-supply-v2/src/components/compras/PriceHistoryModal.tsx
/home/user/promo-supply-v2/src/components/compras/ProductSupplierManager.tsx
/home/user/promo-supply-v2/src/components/compras/ProductionRoutingEngine.tsx
/home/user/promo-supply-v2/src/components/compras/PurchaseClimateWidget.tsx
/home/user/promo-supply-v2/src/components/compras/QualificationHistoryTimeline.tsx
/home/user/promo-supply-v2/src/components/compras/RankingCotacoes.tsx
/home/user/promo-supply-v2/src/components/compras/ReceivingModal.tsx

### [apoio] — lidos para determinar a camada de dados; sem classificação, pertencem ao L05 ou a outros lotes
/home/user/promo-supply-v2/src/components/compras/procurement-kpis/kpiMockData.ts
/home/user/promo-supply-v2/src/components/compras/delivery-calendar/deliveryCalendarHelpers.ts
/home/user/promo-supply-v2/src/components/compras/digital-signature/signatureHelpers.ts
/home/user/promo-supply-v2/src/components/compras/pending-approvals/pendingApprovalsData.ts
/home/user/promo-supply-v2/src/components/compras/price-comparator/priceComparatorHelpers.ts
/home/user/promo-supply-v2/src/components/compras/price-history/priceHistoryHelpers.ts
/home/user/promo-supply-v2/src/components/compras/executive/executiveDashboardData.ts (parcial: linhas 1-60)
/home/user/promo-supply-v2/src/hooks/useBulkOperations.ts
/home/user/promo-supply-v2/src/hooks/useLicitacoes.ts (parcial: linhas 1-60 e 182-207)
/home/user/promo-supply-v2/src/hooks/useBuyerPerformanceData.ts (parcial: linhas 1-50 + grep de chamadas supabase)
/home/user/promo-supply-v2/src/stores/kpiTargetsStore.ts (parcial: linhas 1-80 + cauda)
/home/user/promo-supply-v2/src/stores/dashboardLayoutStore.ts (parcial: grep de `saveToDb`)
/home/user/promo-supply-v2/src/hooks/useApprovalWorkflow.ts (parcial: grep de chamadas supabase)
