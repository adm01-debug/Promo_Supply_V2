# L05 — components/compras (Parte 2)

> Auditoria por MEDIÇÃO. Nada aqui vem de README/DOCS/comentário. Toda linha citada foi lida
> diretamente no código nesta sessão. Sem acesso a banco: toda afirmação sobre conteúdo de
> tabela/linha em runtime está marcada `NAO_VERIFICADO (runtime)`.

## Corte do lote

Comando executado: `find src/components/compras -type f | sort` + `wc -l` por arquivo, acumulado.

| | Arquivo | Acumulado |
|---|---|---|
| Último do L04 (não li) | `src/components/compras/ReceivingModal.tsx` | 13.426 |
| **PRIMEIRO do meu escopo** | **`src/components/compras/RiskHeatMap.tsx`** | **13.694** (cruza os ~13.500) |
| ÚLTIMO do meu escopo | `src/components/compras/visual-comparador/ComparadorCharts.tsx` | 27.134 |

- **Arquivos no escopo: 69** (13.708 linhas — 27.134 menos 13.426).
- Total do diretório medido: **27.134 linhas em 121 arquivos** (o enunciado dizia 27.134 — bateu).
- Nenhum arquivo anterior a `RiskHeatMap.tsx` foi lido.

## Resumo

Denominador = **57 unidades funcionais** (componentes/hooks/módulos de dados exportados no escopo).
Os 12 arquivos `__tests__/*` do escopo não entram no denominador; são listados à parte.

| Classificação | Qtd | % |
|---|---|---|
| ✅ IMPLEMENTADO_TOTAL | 26 | 45,6% |
| 🟨 IMPLEMENTADO_PARCIAL | 20 | 35,1% |
| 🟦 SUGERIDO_OU_INICIADO | 5 | 8,8% |
| ⬛ MORTO_OU_ABANDONADO | 6 | 10,5% |

Arquivos de teste no escopo: 12 (`PipelineChart.test.tsx`, `kanbanTypeGuards.test.ts`,
`bulkOperationsTypes.test.ts`, `deliveryCalendarHelpers.test.ts`, `signatureHelpers.test.ts`,
`colorClasses.test.ts`, `executiveDashboardData.test.ts`, `deadlineFallback.test.ts`,
`pendingApprovalsData.test.ts`, `priceComparatorHelpers.test.ts`, `priceHistoryHelpers.test.ts`,
`kpiMockData.test.ts`, `supplierScorecardData.test.ts`, `slaAnalysisData.test.ts`,
`timelineConfig.test.ts` — 15 arquivos de teste, contados fora do denominador).
Observação metodológica: **quase todos esses testes testam constantes/mocks**, não fluxo de dados
real. `deadlineFallback.test.ts` é a exceção — testa lógica de negócio com regressão declarada.

---

## Tabela de evidências

| Componente | Classificação | Evidência (arquivo:linha) | Quem consome | Camada de dados | O que falta |
|---|---|---|---|---|---|
| `RiskHeatMap` | 🟨 PARCIAL | `RiskHeatMap.tsx:69`; queries `RiskHeatMap.tsx:72-82` | `src/pages/fornecedores/SupplierPerformance.tsx:14,80`; `src/pages/dashboard/ComprasDashboard.tsx:55,251` (lazy) | REAL: `fornecedores`, `pedidos` via `fetchAllRows` | Os 6 "riscos" são fórmulas inventadas no cliente, não colunas: `financialRisk = 40 - avaliacao*5` (`:97`), `geopoliticalRisk` decidido por string de categoria `'Eletrônicos'/'Tecnologia'` hardcoded (`:99`). Nenhum score é persistido. |
| `SLABySupplierAnalysis` | 🟨 PARCIAL | `SLABySupplierAnalysis.tsx:132`; dados em `:57-58` | `src/pages/relatorios/Relatorios.tsx:34,232` (lazy) | **NENHUMA** — 100% `Math.random()` | Todo o dado vem de `generateSupplierSLAData()` (`sla-analysis/slaAnalysisData.ts:42-70`, 17 `Math.random()`) e `generateHistoricalSLAData()` (`SLABySupplierAnalysis.tsx:48-53`, 6 `Math.random()`). Nomes de fornecedor são literais ("XBZ Brindes", "Asia Import"). Os selects `timeRange` (`:186`) e `selectedSupplier` (`:133`) são estado morto: nunca filtram nada. |
| `SLADistributionChart` | ⬛ MORTO | `SLADistributionChart.tsx:122`; declaração órfã em `src/pages/dashboard/ComprasDashboard.tsx:47` | **NINGUÉM** | REAL: `solicitacoes` (`:139-153`) | `grep -n "SLADistributionChart" src/pages/dashboard/ComprasDashboard.tsx` retorna **só a linha 47** (o `lazy()`). Não existe nenhum `<SLADistributionChart` em `src/`. Componente funcional e ligado ao banco, mas nenhum caminho de execução o renderiza. |
| `SavingsGoalPanel` | 🟨 PARCIAL | `SavingsGoalPanel.tsx:44`; query `:62-77` | `src/pages/relatorio-negociacoes/RelatorioNegociacoes.tsx:25,204`; `ComprasDashboard.tsx:52,248` | REAL para leitura (`solicitacoes.valor_estimado/valor_aprovado`); **localStorage** para config (`:100`) | A meta é salva em `localStorage.setItem("savings-goal-config")` (`:42,100`), não no banco: não é multi-device nem multi-tenant. O rótulo "Dados em tempo real do sistema" (`:214`) é literal fixo. |
| `SolicitacaoCard` | 🟨 PARCIAL | `SolicitacaoCard.tsx:77` | `src/pages/solicitacoes/Solicitacoes.tsx:21,408` (único consumidor) | Recebe `Solicitacao` já hidratada pelo pai | O consumidor **não passa** `onApprove/onReject/onArchive/onDelete/onEdit/onDuplicate` (`Solicitacoes.tsx:408-414` passa só `solicitacao/selectable/selected/onSelectChange`). Logo os gestos de swipe caem nos fallbacks toast-only: `toast.success(...aprovado)` `:111`, `toast.info(...archived)` `:133`, `toast.error(...rejected)` `:143` — **não persistem nada**. Além disso: "Predicted: +2 dias" (`:178`) e "94% Confiança" (`:182`) são cálculo fixo/texto fixo; o popover "Fluxo de Aprovação Neural" (`:198-201`) tem 3 aprovadores hardcoded ("João Silva", "Maria Santos", "Roberto Costa"); o popover "Neural Context Thread" (`:284-297`) tem 2 mensagens hardcoded e o `Input` de nota (`:300`) não tem `onChange` nem handler. |
| `SolicitacaoKanban` | ✅ TOTAL | `SolicitacaoKanban.tsx:225`; `handleDragEnd` `:254-271` | `src/pages/solicitacoes/Solicitacoes.tsx:22,358` | REAL: `onStatusChange` → `handleStatusChange` (`Solicitacoes.tsx:138-141`) → `updateStatus` do hook `useSolicitacoes` (`Solicitacoes.tsx:92`) | Fio completo: drag → callback → mutação. Estado real do banco `NAO_VERIFICADO (runtime)`. |
| `SourcingHistoryConsole` | ⬛ MORTO (ÓRFÃO) | `SourcingHistoryConsole.tsx:49` — **972 linhas** | **NINGUÉM** — ver seção de órfãos | `usePurchaseHistory` (`:50`) — o hook existe mas o componente nunca monta | Zero importadores em `src/`. Ver prova de grep abaixo. |
| `SourcingIntelligenceWidget` | 🟨 PARCIAL | `SourcingIntelligenceWidget.tsx:9`; query `:18-28` | `ComprasDashboard.tsx:58,254` (lazy + render) | REAL: `produto_fornecedores` join `produtos`/`fornecedores`, filtrado por `tenant_id` | Se a query vier vazia, retorna **3 sugestões hardcoded** com fornecedores fictícios "Matrix Brindes"/"AluPromo"/"EcoGift Co." (`:31-35`) marcadas `type: 'IA'` — indistinguíveis para o usuário do caminho real. No caminho real, `saving` é a string literal `'Optimization'` (`:40`), não um número calculado. |
| `SpendAnalytics` | ✅ TOTAL | `SpendAnalytics.tsx:23`; query `:29-31` | `src/pages/relatorios/Relatorios.tsx:39,235` (lazy) | REAL: `pedido_itens` join `unspsc_codes` (tabela existe em `src/integrations/supabase/types.ts`) | O comentário `:27-28` diz "we simulate some data" mas o código **não simula**: a query é real e o agrupamento (`:36-42`) é do dado retornado. Se nenhum item tiver UNSPSC atribuído, tudo cai em "Não Classificado" — `NAO_VERIFICADO (runtime)`. |
| `StatusTimeline` | ✅ TOTAL | `StatusTimeline.tsx:38` | `SolicitacaoCard.tsx:2,270`; `dashboard/UrgencyDetailsSheet.tsx:13,144` | Puro (deriva de `currentStatus`) | Componente de apresentação sem camada de dados por design. Bug menor: a prop `dates` (`:13-20`) é declarada e **nunca usada** no corpo; o ramo `cancelada` (`:42-47`) mapeia com `(s, i)` mas ignora `i` e devolve tudo `upcoming`. |
| `StrategicQuoteTable` | 🟨 PARCIAL | `StrategicQuoteTable.tsx:27` | `PriceComparator.tsx:38,230`; `src/pages/negociacao-ia/NegociacaoIA.tsx:19,225`; `src/pages/cotacao/Cotacao.tsx:33,254` | Recebe `cotacoes` do pai | O CTA principal não persiste: `handleSelectStrategy` (`:40-44`) só chama `toast.success(... "Iniciando processo de solicitação de compra...")`. Os 3 cards inteiros (`:116-185`) disparam esse handler no `onClick` (`:122`). Nenhum insert/update. |
| `SupplierAlertsPanel` | ✅ TOTAL | `SupplierAlertsPanel.tsx:24`; queries `:28-54` | `src/pages/fornecedores/SupplierPerformance.tsx:16,88`; `ComprasDashboard.tsx:49,245` | REAL: `fornecedores` (`limite_credito`, `saldo_comprometido`) + `pedidos` (janela 90d) | Alertas de crédito (`:70-87`) e de SLA (`:90-98`) derivam de colunas reais confirmadas em `types.ts`. Flag `settings.enableSupplierAlerts` (`:102`) vem do store real `slaSettingsStore`. Alertas não são persistidos (só derivados na tela) — aceitável para painel. |
| `SupplierBonificationsPanel` | ✅ TOTAL | `SupplierBonificationsPanel.tsx:42`; mutação `:82-104` | `src/pages/compliance/ComplianceDashboard.tsx:4,373` | REAL: `supabase.from('supplier_bonifications').insert` (`:85`); tabela existe em `types.ts` | Fio UI→lógica→insert completo. Limitação real: não há update nem delete — o badge "Ativa/Inativa" (`:168`) é somente leitura. |
| `SupplierEcosystemSection` | 🟨 PARCIAL | `SupplierEcosystemSection.tsx:15`; query `:19-25` | `src/pages/cotacao/Cotacao.tsx:35,304` | REAL: `produto_fornecedores` join `fornecedores(id, razao_social)` | **Fio quebrado nas estrelas**: o componente lê `fornecedor?.rating` (`:56,74`) mas (a) o `select` só busca `id, razao_social` (`:23`) e (b) a tabela `fornecedores` **não tem coluna `rating`** — só `avaliacao` (verificado em `src/integrations/supabase/types.ts`). Resultado: as 5 estrelas sempre renderizam vazias. |
| `SupplierIntelligenceConsole` | 🟨 PARCIAL | `SupplierIntelligenceConsole.tsx:16` | `src/pages/historico/HistoricoCompras.tsx:39,350` | Recebe `SupplierHistory[]` do pai (`usePurchaseHistory`) | O eixo Y do scatter é confessadamente falso: `costEfficiency: 100 - (averageDiscount > 0 ? averageDiscount*2 : 50)` com o comentário `// (mocked logic for "cost efficiency" vs market)` (`:21`). O bloco "IA Predictive Recommendation" (`:162-176`) é **texto fixo** afirmando "preço de Alumínio deve subir 8% no próximo mês" — não vem de cálculo nenhum. O botão "GERAR PEDIDO PREDITIVO" (`:173`) não tem `onClick`. |
| `SupplierInteractionLog` | 🟦 SUGERIDO | `SupplierInteractionLog.tsx:40` | `src/pages/pedidos/PedidoDetailsDialog.tsx:19,203` | **NENHUMA** | Renderiza `mockInteractions` — 3 mensagens literais hardcoded (`:16-38`). A prop `supplierName` é destruturada em `:40` e **nunca usada no corpo**. "Próxima cobrança: Amanhã às 14:00" (`:92`) é literal. O badge "Intervir Agora" (`:94`) não tem handler. Não existe nenhum agente de follow-up por trás disto. |
| `SupplierRankingPanel` | ✅ TOTAL | `SupplierRankingPanel.tsx:132`; queries `:136-162` | `SupplierPerformance.tsx:15,84`; `ComprasDashboard.tsx:50,246` | REAL: `fornecedores` + `pedidos` filtrado por `periodDays` | Ranking derivado com pesos explícitos (`WEIGHTS` `:25-29`). Ressalva honesta: quando não há pedidos entregues os scores caem em defaults fixos (`deliveryScore=80` `:172`, `slaScore=75` `:174`) — números inventados exibidos como métrica. |
| `SupplierRiskAnalysis` | ✅ TOTAL | `SupplierRiskAnalysis.tsx:72`; invoke `:131` | `src/pages/fornecedores/Fornecedores.tsx:4,199` | REAL: `fornecedores` (`:82-88`) + `pedidos` (`:110-115`) → **edge function `ai-supplier-risk`** (confirmada em `supabase/functions/ai-supplier-risk/`) | Fio completo até a edge function. Ressalvas: `marketData` é **hardcoded** (`:124-129`: `industryAvgDelivery: 92`, `marketGrowth: 5.2`, `priceVolatility: 'medium'`); o resultado fica só em `useState` (`:148`) e **não é persistido** — some ao fechar o modal. |
| `SupplierScorecard` | ✅ TOTAL | `SupplierScorecard.tsx:43`; hook `scorecard/supplierScorecardData.ts:29` | `SupplierPerformance.tsx:13,76` | REAL: 4 queries paralelas — `fornecedores`, `pedidos`, `supplier_qualification_scores`, `devolucoes` (`supplierScorecardData.ts:37-42`); todas as 4 tabelas confirmadas em `types.ts` | Melhor fio de dados do lote. Ressalva: quando `supplier_qualification_scores` não tem linha, `communication=70`, `flexibility=70`, `pricing=75` são **constantes inventadas** (`:77-80`) exibidas como métricas de fornecedor. `certifications: []` (`:127`) é sempre vazio — campo morto na interface. |
| `TrendAnalysisCharts` | ✅ TOTAL | `TrendAnalysisCharts.tsx:28` | `ComprasDashboard.tsx:48,238` | REAL via props: `kpis.charts.monthlyTrends / cotacaoStatus / topCategories` (`ComprasDashboard.tsx:239-241`) | Componente puro de gráficos; a origem do dado é o hook de KPIs do dashboard, fora do meu escopo. |
| `UrgentItemsList` | 🟨 PARCIAL | `UrgentItemsList.tsx:49` | `ComprasDashboard.tsx:27,221` | Recebe `items` do pai; abre `UrgencyDetailsSheet` (que consulta o banco) | O botão "Notificar" **só faz toast**: `handleNotify` (`:64-67`) chama `toast.success(...)` e nada mais — sem insert em notificações, sem edge function, sem e-mail. |
| `VisualComparadorCotacoes` | 🟨 PARCIAL | `VisualComparadorCotacoes.tsx:91`; `onSelecionar` `:429` | `StrategicQuoteTable.tsx:8,95`; `src/pages/cotacao/Cotacao.tsx:31,268` | Recebe `cotacoes` do pai; a persistência fica com o pai | O bloco "IA Decision Support rationale" é **texto fixo em `useState` inicial**: `rationale: "O Fornecedor A apresenta o melhor TCO..."` e `confidence: 94` (`:95-98`). O `setDecisionSupport` nunca é chamado — é um placeholder literal que se apresenta como saída de IA. Cálculo de score (`:112-137`) é real e determinístico. Imports mortos: `RechartsTooltip/Legend/RadarChart/Pie/Cell/...` (`:42-59`) e `Separator/ScrollArea/Tooltip*` foram delegados a `ComparadorCharts` e ficaram sem uso no arquivo. |
| `ApprovalDelegationModal` | 🟨 PARCIAL | `approval/ApprovalDelegationModal.tsx:29` | `DynamicApprovalMatrix.tsx:13,198` | O pai persiste (`onSave`) | **Lista de usuários é mock**: `mockUsers` com 5 pessoas hardcoded ("João Silva", "Maria Santos", "Carlos Lima", "Ana Oliveira", "Roberto Costa") em `:12-18`. Os `Select` de delegante (`:47`) e delegado (`:56`) só oferecem esses IDs fictícios (`user-1`..`user-5`) — o que for salvo aponta para usuários inexistentes. |
| `ApprovalRuleModal` | 🟨 PARCIAL | `approval/ApprovalRuleModal.tsx:41` | `DynamicApprovalMatrix.tsx:12,188` | Misto: `costCenters` REAL via `useSolicitacoes()` (`:42,107`) | Mesmo problema: `mockUsers` (`:14-20`) alimenta os aprovadores (`:129`) e a escalação (`:154`); `mockCategories` (`:22-28`) hardcoded ("Material de Escritório", "Brindes Promocionais"…) alimenta o select de categoria (`:97`) — enquanto o centro de custo ao lado usa dados reais. Inconsistência gritante dentro do mesmo formulário. |
| `bulkOperationsTypes` (`entityConfig`) | ✅ TOTAL | `bulk-operations/bulkOperationsTypes.ts:39` | `BulkOperationsPreview.tsx:61,83` | Config estático por design | — |
| `ContractSLAReadonlyTab` | ✅ TOTAL | `contract/ContractDetailsTabs.tsx:12` | `ContractDetailsModal.tsx:49,308` | REAL: lê campos de `Contract` (`sla_delivery_days`, `penalty_rate_per_day`, `min_supplier_score`…) | Todos os campos têm fallback literal (`?? 30`, `?? 0.5`, `?? 20`, `?? 3.0` em `:21,30,31,39`) — se o contrato não tiver o campo, a tela mostra um número plausível que **não está no banco**. |
| `ContractPenaltiesTab` | ✅ TOTAL | `contract/ContractDetailsTabs.tsx:58` | `ContractDetailsModal.tsx:49,312` | REAL: `ContractPenalty[]` vindo do pai | — |
| `ContractItemsEditor` | ✅ TOTAL | `contract/ContractItemsEditor.tsx:16` | `ContractModal.tsx:3,502` | Editor controlado; persistência no pai | — |
| `ContractSLASection` | ✅ TOTAL | `contract/ContractSLASection.tsx:23` | `ContractModal.tsx:2,487` | Editor controlado; persistência no pai | — |
| `UrgencyDetailsSheet` | 🟨 PARCIAL | `dashboard/UrgencyDetailsSheet.tsx:43`; query `:56-65`; update `:96-99` | `UrgentItemsList.tsx:8,183` | REAL: `select` em `solicitacoes` + `update({status})` (`:97-99`) | Aprovar/Rejeitar persistem de verdade (`:265,272`). Mas: (a) **fio quebrado no solicitante** — lê `item.solicitante?.full_name` (`:228`) sendo que o `select` (`:58-63`) não busca `solicitante`, e a tabela só tem `solicitante_id`; sempre exibe "Desconhecido". (b) 3 botões só fazem toast: "Escalar para Gerência" (`:209`), "Iniciar Cotação Imediata" — texto literal "em desenvolvimento" (`:255`) — e "Alertar Comprador Responsável" (`:283`). (c) O SLA (`:82`) é limiar hardcoded 1/3/5 dias no cliente, não configuração. |
| `deliveryCalendarHelpers` (`useDeliveryEvents` / `useMonthStats` / `useUpcomingDeliveries` / `getEventsForDay`) | 🟨 PARCIAL | `delivery-calendar/deliveryCalendarHelpers.ts:62,158,171,184` | `DeliveryCalendar.tsx:44-47,55-57,64,116` | REAL: `pedidos` + `fornecedores` + `pedido_itens` (`:66-92`) | O campo `type` do evento é **inventado pelo índice do array**: `index % 3 === 0 ? 'pickup' : index % 5 === 0 ? 'partial' : 'delivery'` (`:150`). "Coleta" e "Parcial" no calendário não têm nenhuma relação com o pedido — é decoração determinística. |
| `signatureHelpers` (`mockSignatureRequests`) | 🟦 SUGERIDO | `digital-signature/signatureHelpers.ts:16-47` | `DigitalSignature.tsx:37,46` | **NENHUMA** | 3 solicitações de assinatura hardcoded com datas de dez/2024 e e-mail `carlos@empresa.com`. Consumido como estado inicial (`useState<SignatureRequest[]>(mockSignatureRequests)`) — a feature "assinatura digital" não tem tabela nem edge function neste caminho. |
| `EnhancedKpiHelpers` → `colorClasses` | ✅ TOTAL | `enhanced-kpi/EnhancedKpiHelpers.tsx:9` | `TargetProgressRing` `:97`; usado indiretamente por `EnhancedKpiCard` | Config estático | — |
| `EnhancedKpiHelpers` → `AnimatedCounter` | ✅ TOTAL | `enhanced-kpi/EnhancedKpiHelpers.tsx:25` | `EnhancedKpiCard.tsx:11,120` | Puro | Atenção: existem **4 `AnimatedCounter` distintos** no repo (`ui/page-header-extras.tsx:14`, `ui/indicators/MiscIndicators.tsx:89`, `animations/MotionComponents.tsx:184`, e este). Duplicação, não órfão. |
| `EnhancedKpiHelpers` → `DeltaIndicator` | ✅ TOTAL | `enhanced-kpi/EnhancedKpiHelpers.tsx:58` | `EnhancedKpiCard.tsx:11,110` | Puro | — |
| `EnhancedKpiHelpers` → `TargetProgressRing` | ⬛ MORTO | `enhanced-kpi/EnhancedKpiHelpers.tsx:94` | **Importado e nunca renderizado** | Puro | `grep -n "TargetProgressRing" src/components/compras/EnhancedKpiCard.tsx` → **só a linha 11 (o import)**. Nenhum `<TargetProgressRing` em `src/`. O anel de progresso de meta nunca aparece na tela. |
| `ExecutiveAIInsights` | 🟨 PARCIAL | `executive/ExecutiveAIInsights.tsx:25` | `ExecutiveDashboard.tsx:35,269` | Misto: `metrics` vem do hook REAL `useExecutiveDashboardData` | Não há IA: são 4 `if` sobre limiares fixos (`:32,45,55,68,80`). Os "impactos" são **strings literais**: `'+ R$ 142.500/ano'` (`:38`), `'- R$ 22.000 OPEX'` (`:87`), `'Atraso de 2.4 dias'` (`:61`), "abaixo da média do setor (18%)" (`:37`) — nenhum é calculado. Os botões de ação (`:173`) não têm `onClick`. O pai ainda passa `topSuppliers` com `rating: 4.5` hardcoded (`ExecutiveDashboard.tsx:272`). |
| `ExecutiveChartsRow` | 🟨 PARCIAL | `executive/ExecutiveChartsRow.tsx:64` | `ExecutiveDashboard.tsx:29,275` | **MOCK**: importa `monthlyTrend` e `comparisonTrend` de `./executiveDashboardData` (`:17`) | Pior fio do lote: quando um filtro é aplicado, o componente **fabrica a variação** multiplicando o mock por um fator arbitrário — `const multiplier = (selectedCategory !== 'all' ? 0.4 : 1) * (selectedSupplier !== 'all' ? 0.3 : 1)` (`:77` e `:90`), com o comentário `// For now, we simulate by applying a multiplier ... to show visual change` (`:75-77`). O gráfico "responde" ao filtro sem nunca consultar o banco. |
| `ExecutiveDrillDownModal` | 🟨 PARCIAL | `executive/ExecutiveDrillDownModal.tsx:13` | `ExecutiveDashboard.tsx:32,316` | **MOCK**: importa `pendingItems` de `./executiveDashboardData` (`:5`) e itera direto (`:118`) | Ignora o `drillDown` recebido no caso `pending` e sempre lista os 5 itens fixos do mock. Rodapé afirma "Tendência de crescimento projetada em +8.4% para o próximo trimestre" (`:159`) — literal. Bug de encoding no arquivo: `ExploraÃ§Ã£o`, `AÃ§Ãµes CrÃ­ticas`, `Ciclo MÃ©dio` (`:33,36,99`) — mojibake que chega à tela. |
| `ExecutiveFiltersBar` | 🟨 PARCIAL | `executive/ExecutiveFiltersBar.tsx:30` | `ExecutiveDashboard.tsx:28,205` | **MOCK** nas opções: `allCategories`/`allSuppliers` de `./executiveDashboardData` (`:11`, usados em `:58,73`) | Os favoritos (`FilterFavoritesManager`, `:109`) são reais, mas os valores filtráveis são derivados do mock — o usuário só pode filtrar por "Mochilas/Canetas/XBZ Brindes/Stricker…". O selo "AI Smart Optimization" (`:106`) é decoração sem lógica. |
| `ExecutiveMetricCard` | ✅ TOTAL | `executive/ExecutiveMetricCard.tsx:31` | `ExecutiveDashboard.tsx:27,222/233/245/254`; `components/pagamentos/PagamentoAdvancedKPIs.tsx:15,93-98`; `src/pages/pedidos/PedidosKPIs.tsx:1,14-43`; `src/pages/solicitacoes/Solicitacoes.tsx:48,275-288`; `src/pages/fornecedores/Fornecedores.tsx:34,139-151` | Puro; recebe valores | Componente mais reutilizado do escopo (5 consumidores fora de `compras/`). Nenhuma ressalva. |
| `ExecutivePendingActions` | ✅ TOTAL | `executive/ExecutivePendingActions.tsx:18` | `ExecutiveDashboard.tsx:31,285` | Puro; recebe `items` | O componente está correto; a **fonte** que o pai injeta é mock (`ExecutiveDashboard.tsx:150` usa `pendingItems`). A seta de ação (`:90-95`) é decorativa: não tem `onClick`. |
| `ExecutiveTablesRow` | ✅ TOTAL | `executive/ExecutiveTablesRow.tsx:29` | `ExecutiveDashboard.tsx:30,303` | Puro; recebe `filteredSuppliers`/`filteredBuyers` | Igual: componente correto, fonte mock no pai (`ExecutiveDashboard.tsx:136,143`). |
| `KraljicMatrix` | 🟨 PARCIAL | `executive/KraljicMatrix.tsx:87`; query `:92-98` | `ExecutiveDashboard.tsx:34,312`; `src/pages/relatorios/Relatorios.tsx:35,238` (lazy) | REAL: `category_strategies` join `categorias` (tabela confirmada em `types.ts`) | Fallback silencioso para 4 categorias hardcoded ("Matéria Prima A", "Energia Elétrica", "Material de Escritório", "Hardware/TI") quando a query vem vazia (`:103-108`) — sem nenhum aviso visual de que é exemplo. O "AI Strategic Advisory" (`:220-226`) é um ternário sobre um `some()`, não IA. |
| `PriceVarianceAnalysis` | 🟦 SUGERIDO | `executive/PriceVarianceAnalysis.tsx:18` | `ExecutiveDashboard.tsx:33,282` | **NENHUMA** | Todo o gráfico vem de `priceVarianceData` — 5 linhas hardcoded ("Notebook Dell", "Cadeira Ergonômica", "Papel A4 (Cx)"…) em `:10-16`. Nenhuma query. A "Opportunity" no rodapé (`:85`) cita a "Cadeira Ergonômica" do próprio mock e promete "15%" fixo. |
| `executiveDashboardData` (módulo) | 🟦 SUGERIDO | `executive/executiveDashboardData.ts:1` (`// Mock data constants for the Executive Dashboard`) | `ExecutiveDashboard.tsx:24-26`; `ExecutiveChartsRow.tsx:17`; `ExecutiveDrillDownModal.tsx:5`; `ExecutiveFiltersBar.tsx:11`; `ExecutiveMetricCard.tsx:6` | **NENHUMA** — 193 linhas de constantes | Números fixos apresentados como resultado corporativo: `totalSpend: 12.450.000` (`:4`), `savings: 1.845.000` (`:5`), 7 categorias (`:122-130`), 5 fornecedores (`:132-138`), 4 compradores nominais (`:140-145`), 5 pendências com IDs "APR-001"/"PAY-001" (`:147-153`). Único export com fio real é `formatNumber` (`:190`). |
| `ApprovalModals` → `RejectModal` | ✅ TOTAL | `pending-approvals/ApprovalModals.tsx:25` | `PendingApprovalsList.tsx:58,446` | Persistência no pai | — |
| `ApprovalModals` → `DetailsModal` | 🟨 PARCIAL | `pending-approvals/ApprovalModals.tsx:95` | `PendingApprovalsList.tsx:58,456` | Persistência no pai | O bloco "IA Decision Support Active" (`:155-158`) é um badge estático com `animate-pulse` — não há IA nem chamada alguma associada. |
| `deadlineFallback` (`resolveApprovalDeadline`) | ✅ TOTAL | `pending-approvals/deadlineFallback.ts:15` | `PendingApprovalsList.tsx:59,90` | Lógica pura, sem dado fictício | Melhor peça do lote: prioridade explícita, fallback +24h, e teste de regressão real em `__tests__/deadlineFallback.test.ts:218` ("aprovação criada agora sem prazo_limite NÃO aparece como vencida"). |
| `pendingApprovalsData` → `getTimeStatus` / `getTimeProgress` | ✅ TOTAL | `pending-approvals/pendingApprovalsData.ts:76,106` | `PendingApprovalsList.tsx` (via `resolveApprovalDeadline`); `__tests__/deadlineFallback.test.ts:3` | Puro | — |
| `pendingApprovalsData` → `mockPendingApprovals` | ⬛ MORTO | `pending-approvals/pendingApprovalsData.ts:22-74` | **Só testes** — `__tests__/pendingApprovalsData.test.ts:3` | **NENHUMA** | 3 aprovações hardcoded ("SOL-2024-156", "Maria Santos", R$ 75.000). `grep` confirma: a única referência fora da definição está em `__tests__/pendingApprovalsData.test.ts`. Ver seção de órfãos. |
| `priceComparatorHelpers` (`generateQuotesFromSuppliers`) | 🟨 PARCIAL | `price-comparator/priceComparatorHelpers.ts:45` | `PriceComparator.tsx:37,111` | Misto: usa `preco_custo`/`lead_time_estimado` reais quando existem | Quando não há vínculo em `produto_fornecedores`, **fabrica a cotação com `Math.random()`**: preço unitário (`:58`), prazo (`:70`), condição de pagamento sorteada de 4 strings (`:71`), estoque (`:72`), rating (`:73`), pontualidade (`:74`). A cotação aleatória é exibida lado a lado com a real, diferenciada apenas pelo texto do `pros[0]` ("Preço estimado sob demanda" vs "Preço contratado em sistema", `:79`). O `avgPrice` "de mercado" é `unitPrice * 1.2` (`:61`) — a "economia" exibida é sempre ~16,7% por construção. |
| `priceHistoryHelpers` (`usePriceHistoryAnalysis`, `formatBRL`, `CHART_COLORS`) | ✅ TOTAL | `price-history/priceHistoryHelpers.ts:40,37,28` | `PriceHistoryModal.tsx:24,85` | REAL: agrega `CotacaoRecord[]` vindos do modal | Agregação honesta (média/min/max por mês, comparação por fornecedor). Sem `Math.random`, sem literal fabricado. |
| `procurement-kpis/kpiMockData` (`kpiData`) | 🟦 SUGERIDO | `procurement-kpis/kpiMockData.ts:1` (`// Mock data and helper types`) | `AdvancedProcurementKPIs.tsx:47` e ~40 usos (`:83-458`) | **NENHUMA** | O painel "Advanced Procurement KPIs" inteiro é alimentado por 80 linhas de constantes: ROI 4.2x (`:4`), maverick spend R$ 187.500 (`:17`), compliance 78% (`:23`), concentração top5 68% com "XBZ Brindes 32%" (`:53`). Nenhuma query. |
| `scorecard/supplierScorecardData` (`useSupplierScorecardData`, `getScoreColor`, `getScoreBg`, `getRiskBadge`) | ✅ TOTAL | `scorecard/supplierScorecardData.ts:29,138,145,152` | `SupplierScorecard.tsx:31,48` | REAL: 4 tabelas (`:37-42`) | Ver ressalva de defaults em `SupplierScorecard`. Bug de UX medido: `getScoreColor` devolve `text-warning` tanto para 50-69 quanto para 70-84 (`:139-142`) — a faixa "alto risco" é visualmente idêntica à "médio"; o próprio teste documenta isso (`__tests__/supplierScorecardData.test.ts:27`). |
| `sla-analysis/slaAnalysisData` (`generateSupplierSLAData`, `SUPPLIER_COLORS`, `getSLAColor`, `getSLABgColor`) | 🟦 SUGERIDO | `sla-analysis/slaAnalysisData.ts:1` (`// Mock SLA data per supplier`), gerador `:31-74` | `SLABySupplierAnalysis.tsx:41,57` | **NENHUMA** | 17 `Math.random()` (linhas 42,43,44,51,52,53,54,55,56,57,58,61,62,66,67,68,69). Cada render/import produz números diferentes — o "ranking de fornecedores" muda sozinho. `getSLAColor`/`getSLABgColor` são puros e corretos. |
| `SolicitacaoFormSteps` → `Step1Identification` | 🟨 PARCIAL | `solicitacao/SolicitacaoFormSteps.tsx:69` | `NovaSolicitacaoModal.tsx:31,397` | **MOCK**: `empresasMock` e `vendedoresMock` (`:47-48`) | Os dois selects obrigatórios do passo 1 — "Entidade Solicitante" (`:84`) e "Gestor Responsável" (`:107`) — só oferecem 5 strings hardcoded cada ("Promo Supply", "Gift Solutions" / "João Silva", "Maria Santos"). O badge "Score: 9.8" ao lado de cada empresa (`:88`) é literal fixo. |
| `SolicitacaoFormSteps` → `Step2Specifications` | ✅ TOTAL | `solicitacao/SolicitacaoFormSteps.tsx:133` | `NovaSolicitacaoModal.tsx:31,398` | REAL: `useProdutos()` (`:134`) alimenta catálogo e categorias | Fio real (produto selecionado preenche preço e categoria, `:148-157`). Ressalva: a etiqueta "Prazo Seguro (Histórico)" / "Risco de Atraso (Neural)" (`:143-145`) é só `diffDays < 3 / < 7` — não consulta histórico nenhum apesar do rótulo. |
| `SolicitacaoFormSteps` → `Step3Values` | ✅ TOTAL | `solicitacao/SolicitacaoFormSteps.tsx:316` | `NovaSolicitacaoModal.tsx:31,399` | REAL: `costCenters` de `useSolicitacoes()` (`:317`); `checkBudget` vem do pai | Verificação de orçamento é fio real via callback do pai. Ressalva: o card "Fast Track Habilitado / Aprovação Automática ativada" (`:398-408`) dispara com `valorEstimado < 1000` hardcoded no cliente, sem qualquer regra vinda de `approval_rules`. |
| `SolicitacaoReviewStep` | 🟨 PARCIAL | `solicitacao/SolicitacaoReviewStep.tsx:33` | `NovaSolicitacaoModal.tsx:3,404` | Puro; espelha `formData` | Repete o limiar hardcoded de "Fast Track" `< 1000` (`:139`) — duplicação da mesma regra fictícia em dois arquivos. |
| `timeline/timelineConfig` (`iconesPorEtapa`, `statusColors`) | ✅ TOTAL | `timeline/timelineConfig.ts:16,29` | `EnhancedPedidoTimeline.tsx:22-23,159-160,374-375` | Config estático | Duplicação medida: `PedidoTimeline.tsx:17` define um `iconesPorEtapa` **local próprio** em vez de importar deste módulo; `HistoricoComprasModal.tsx:24` define outro `statusColors` local. Três definições concorrentes no mesmo diretório. |
| `visual-comparador/ComparadorCharts` (`RadarTab`, `BarsTab`, `PrazoTab`, `ScoresTab`, `TableTab`) | ✅ TOTAL | `visual-comparador/ComparadorCharts.tsx:71,101,130,158,221` | `VisualComparadorCotacoes.tsx:61,355,358,361,364,386` | Puro; recebe dados calculados | Todos os 5 exports têm consumidor real e renderizado. |

---

## Componentes órfãos (com prova de grep)

### 1. `SourcingHistoryConsole` — ⬛ ÓRFÃO TOTAL, 972 linhas (o maior arquivo do diretório)

```
$ grep -rn "SourcingHistoryConsole" src/
src/components/compras/SourcingHistoryConsole.tsx:49:export const SourcingHistoryConsole = () => {
```

Uma única ocorrência em todo o `src/`: a própria definição. Não há `import`, não há `<SourcingHistoryConsole`,
não há `lazy(() => import(...))`. Fora do `src/` só aparece em `DOCS/AUDITORIA_QA_2026Q3.md` e
`DOCS/AUDITORIA_CODIGO_2026Q3.md` — documentos, não código; por regra do lote, não contam como prova de uso.

Agravante: além de órfão, o arquivo é quase todo dado fictício — "Health Index Global 94.2/100"
(`:480`), "Savings Acumulado R$ 142k" (`:489`), matriz geográfica com percentuais fixos
(`:518-521`), radar de performance hardcoded (`:566-571`), tabela competitiva hardcoded
(`:633-636`), predições de recompra de "Cimento CP II 50kg" / "Vergalhão CA-50" (`:682-684`)
— itens de construção civil num sistema de brindes promocionais. **972 linhas mortas.**

### 2. `SLADistributionChart` — ⬛ importado com `lazy()` e nunca renderizado

```
$ grep -n "SLADistributionChart" src/pages/dashboard/ComprasDashboard.tsx
47:const SLADistributionChart = lazy(() => import("@/components/compras/SLADistributionChart").then(m => ({ default: m.SLADistributionChart })));
```

Única referência fora do arquivo de definição. Não existe `<SLADistributionChart` em lugar nenhum
(o `switch` de painéis em `ComprasDashboard.tsx:245-254` não tem `case` para ele). Componente
funcional, com query real em `solicitacoes` — inalcançável.

### 3. `TargetProgressRing` — ⬛ importado e nunca usado

```
$ grep -n "TargetProgressRing" src/components/compras/EnhancedKpiCard.tsx
11:  AnimatedCounter, DeltaIndicator, TargetProgressRing
```

Só o import. Nenhum `<TargetProgressRing` em `src/`.

### 4. `mockPendingApprovals` — ⬛ referência única é teste

```
$ grep -rn "mockPendingApprovals" src/
src/components/compras/pending-approvals/pendingApprovalsData.ts:22:export const mockPendingApprovals: PendingApprovalItem[] = [
src/components/compras/pending-approvals/__tests__/pendingApprovalsData.test.ts:3:  mockPendingApprovals,
```

**A única referência é teste.** `PendingApprovalsList.tsx` importa deste módulo apenas
`PendingApprovalItem` (tipo) e as funções `getTimeStatus`/`getTimeProgress` — nunca o array mock.
53 linhas de dado fictício mantidas vivas só pelo próprio teste que as valida.

### Falsos-positivos verificados (NÃO são órfãos)

- `AnimatedCounter` — o grep casa em 4 arquivos diferentes; são **4 implementações homônimas
  independentes** (`ui/page-header-extras.tsx:14`, `ui/indicators/MiscIndicators.tsx:89`,
  `animations/MotionComponents.tsx:184`, `enhanced-kpi/EnhancedKpiHelpers.tsx:25`). A versão do
  escopo tem consumidor real em `EnhancedKpiCard.tsx:120`.
- `iconesPorEtapa` / `statusColors` — casam com definições locais concorrentes em
  `PedidoTimeline.tsx:17` e `HistoricoComprasModal.tsx:24`. As versões de `timeline/timelineConfig.ts`
  têm consumidor real em `EnhancedPedidoTimeline.tsx:159,375`.
- `SpendAnalytics`, `SLABySupplierAnalysis`, `KraljicMatrix`, `SourcingIntelligenceWidget` — o grep
  só acha `lazy(() => import(...))`; verifiquei o render JSX de cada um
  (`Relatorios.tsx:232,235,238`, `ComprasDashboard.tsx:254`). Todos vivos.

---

## Achados graves

1. **972 linhas órfãs** — `SourcingHistoryConsole.tsx:49`. Nenhum caminho de execução. É 3,6% do
   diretório inteiro sendo transpilado, tipado e versionado sem função.

2. **O Dashboard Executivo é majoritariamente ficção.** A rota `/dashboard-executivo`
   (`src/routes/AppRoutes.tsx:98`) → `DashboardExecutivo.tsx:12` → `ExecutiveDashboard` alimenta
   `ExecutiveChartsRow`, `ExecutiveTablesRow`, `ExecutivePendingActions` e `ExecutiveDrillDownModal`
   com `categorySpend`/`topSuppliers`/`buyerPerformance`/`pendingItems` importados de
   `executive/executiveDashboardData.ts` (`ExecutiveDashboard.tsx:24-26,129,136,143,150`) — 193
   linhas de constantes. Um executivo vê "R$ 12.450.000 de spend" e "Ana Silva — 45 pedidos" que não
   existem em lugar nenhum.

3. **Filtro que simula resposta.** `executive/ExecutiveChartsRow.tsx:77` e `:90`:
   `const multiplier = (selectedCategory !== 'all' ? 0.4 : 1) * (selectedSupplier !== 'all' ? 0.3 : 1)`
   — ao filtrar, o gráfico multiplica o mock por 0.4/0.3 para "mostrar mudança visual"
   (comentário no próprio código, `:75-77`). Isso é pior que dado estático: convence o usuário de
   que o filtro funciona.

4. **Cotações fabricadas com `Math.random()` misturadas a cotações reais.**
   `price-comparator/priceComparatorHelpers.ts:58,70-74` — quando não há vínculo
   `produto_fornecedores`, preço, prazo, estoque, rating e pontualidade são sorteados. Alimenta
   `PriceComparator.tsx:111`, que alimenta `StrategicQuoteTable.tsx:230`, que exibe "X% abaixo da
   média" (`StrategicQuoteTable.tsx:57`). Decisão de compra sobre número sorteado.

5. **Ranking de fornecedores que muda sozinho.** `sla-analysis/slaAnalysisData.ts:42-70` — 17
   `Math.random()` executados em nível de módulo (`SLABySupplierAnalysis.tsx:57`). Cada recarga
   reordena o "Ranking de Performance SLA" (`SLABySupplierAnalysis.tsx:331`) e troca quem é o
   "Melhor Performance" (`:208`) e quem "Requer Atenção" (`:234`).

6. **Três fios de dados quebrados por coluna inexistente / não selecionada:**
   - `SupplierEcosystemSection.tsx:74` lê `fornecedor?.rating`; a tabela `fornecedores` **não tem
     `rating`** (só `avaliacao`, verificado em `src/integrations/supabase/types.ts`) e o `select`
     (`:23`) nem busca. Estrelas sempre vazias.
   - `dashboard/UrgencyDetailsSheet.tsx:228` lê `item.solicitante?.full_name`; o `select` (`:58-63`)
     não traz `solicitante`. Sempre "Desconhecido".
   - `delivery-calendar/deliveryCalendarHelpers.ts:150` define o tipo do evento
     (`pickup`/`partial`/`delivery`) por `index % 3` / `index % 5`. O calendário mostra "Coleta"
     onde não há coleta.

7. **Botões que só fazem toast (sem persistência):**
   - `UrgentItemsList.tsx:66` — "Notificar" comprador.
   - `StrategicQuoteTable.tsx:41` — o CTA central "selecionar estratégia de compra".
   - `SolicitacaoCard.tsx:111,133,143` — aprovar / arquivar / rejeitar por swipe (fallbacks ativos,
     pois `Solicitacoes.tsx:408-414` não passa os handlers).
   - `dashboard/UrgencyDetailsSheet.tsx:209,255,283` — escalar, cotar ("em desenvolvimento" literal
     na própria mensagem), alertar comprador.
   - `SourcingHistoryConsole.tsx:131,246,247` — exportar dossiê, seleção em massa (irrelevante:
     órfão).

8. **Usuários e categorias mockados dentro do motor de aprovação.**
   `approval/ApprovalRuleModal.tsx:14-20,22-28` e `approval/ApprovalDelegationModal.tsx:12-18` —
   `mockUsers` (`user-1`..`user-5`) e `mockCategories` (`cat-1`..`cat-5`). São os selects que
   definem **quem aprova compras** e são salvos via `onSave` do pai
   (`DynamicApprovalMatrix.tsx:188,198`). Ou seja: regras de aprovação persistidas apontando para
   IDs de usuário que não existem. Ironia medida: no mesmo formulário, o select de centro de custo
   (`ApprovalRuleModal.tsx:107`) usa dados reais.

9. **"IA" que é `if` ou string literal.** Rotulado como IA/Neural mas sem nenhuma chamada:
   `ExecutiveAIInsights.tsx:32-90` (4 `if` sobre limiares), `VisualComparadorCotacoes.tsx:95-98`
   (rationale e "CONFIDENCE: 94%" fixos em `useState`), `SupplierIntelligenceConsole.tsx:167-172`,
   `KraljicMatrix.tsx:220-226` (ternário), `ApprovalModals.tsx:155-158` (badge estático),
   `SolicitacaoCard.tsx:182` ("94% Confiança"), `SolicitacaoFormSteps.tsx:143-145`,
   `SupplierInteractionLog.tsx:16-38`. **Único caminho de IA real no escopo:**
   `SupplierRiskAnalysis.tsx:131` → edge function `ai-supplier-risk` (existe em
   `supabase/functions/ai-supplier-risk/`).

10. **Mojibake em produção.** `executive/ExecutiveDrillDownModal.tsx:33,36,99,158` contém
    `ExploraÃ§Ã£o`, `AÃ§Ãµes CrÃ­ticas`, `Ciclo MÃ©dio`, `anÃ¡lise ... Ãºltimos 6 meses` —
    UTF-8 duplamente codificado, renderizado direto no título do modal.

11. **Prop declarada e nunca usada** (contrato falso com o consumidor):
    `SupplierInteractionLog.tsx:40` (`supplierName`, recebido de `PedidoDetailsDialog.tsx:203`) e
    `StatusTimeline.tsx:13-20` (`dates`).

---

## Dados fictícios encontrados

### `Math.random()` — 23 ocorrências no escopo

| Arquivo:linha | Uso |
|---|---|
| `sla-analysis/slaAnalysisData.ts:42,43,44` | base de compliance / pontualidade / lead time |
| `sla-analysis/slaAnalysisData.ts:51,52,53,54,55,56,57,58` | pedidos, atrasos, críticos, atrasados, tempo de resposta, qualidade, tendência (`> 0.5 ? 'up':'down'`), valor da tendência |
| `sla-analysis/slaAnalysisData.ts:61,62` | tendência mensal (6 meses × 6 fornecedores) |
| `sla-analysis/slaAnalysisData.ts:66,67,68,69` | radar: qualidade, comunicação, flexibilidade, custo-benefício |
| `SLABySupplierAnalysis.tsx:48,49,50,51,52,53` | série histórica de 6 meses para 6 fornecedores nominais |
| `price-comparator/priceComparatorHelpers.ts:58` | **preço unitário da cotação** |
| `price-comparator/priceComparatorHelpers.ts:70` | prazo de entrega |
| `price-comparator/priceComparatorHelpers.ts:71` | condição de pagamento (sorteia entre 4 strings) |
| `price-comparator/priceComparatorHelpers.ts:72` | estoque disponível |
| `price-comparator/priceComparatorHelpers.ts:73` | rating do fornecedor |
| `price-comparator/priceComparatorHelpers.ts:74` | % de entrega no prazo |

### Módulos 100% hardcoded (sem nenhuma query)

| Arquivo | Linhas | O que finge ser |
|---|---|---|
| `executive/executiveDashboardData.ts` | 193 (`:1` diz `// Mock data constants`) | Spend R$ 12,45M, savings R$ 1,845M, 7 categorias, 5 fornecedores, 4 compradores, 5 pendências, séries de 6 meses |
| `procurement-kpis/kpiMockData.ts` | 80 (`:1` diz `// Mock data and helper types`) | 8 KPIs de procurement: ROI, maverick spend, compliance, cost avoidance, cycle time, concentração, match rate, savings realization |
| `executive/PriceVarianceAnalysis.tsx:10-16` | 7 | Variação de preço de 5 SKUs ("Notebook Dell", "Cadeira Ergonômica"…) |
| `digital-signature/signatureHelpers.ts:16-47` | 32 | 3 solicitações de assinatura, datas de dez/2024 |
| `pending-approvals/pendingApprovalsData.ts:22-74` | 53 | 3 aprovações pendentes — **usadas só por teste** |
| `SupplierInteractionLog.tsx:16-38` | 23 | Conversa de 3 mensagens do "IA Follow-up Agent" |
| `approval/ApprovalRuleModal.tsx:14-28` | 15 | 5 usuários + 5 categorias do motor de aprovação |
| `approval/ApprovalDelegationModal.tsx:12-18` | 7 | 5 usuários delegáveis |
| `solicitacao/SolicitacaoFormSteps.tsx:47-48` | 2 | 5 empresas + 5 vendedores do formulário de solicitação |

### Literais apresentados como métrica calculada (amostra medida)

`SourcingHistoryConsole.tsx:147-150` (Kraljic: 12/8/24/156), `:480` (94.2/100), `:489` (R$ 142k),
`:496` (12.5%), `:518-521` (matriz geográfica 65/20/10/5%), `:566-571` (radar), `:633-636` (tabela
competitiva), `:682-684` (predições), `:744` (14.2%), `:749` (9.8/10), `:770-772`, `:904` (R$ 12.4k),
`:942` (88.5%), `:954-956` (spend por categoria 65/25/10%) —
`SolicitacaoCard.tsx:178,182,199-201,286-296` —
`ExecutiveAIInsights.tsx:37,38,51,61,87` —
`ExecutiveDrillDownModal.tsx:159` —
`ExecutiveChartsRow.tsx:216` ("+12.4% vs LTM") —
`SupplierIntelligenceConsole.tsx:167-172` —
`VisualComparadorCotacoes.tsx:96-97` —
`SourcingIntelligenceWidget.tsx:32-34` —
`solicitacao/SolicitacaoFormSteps.tsx:88` ("Score: 9.8") —
`SupplierRiskAnalysis.tsx:124-129` (`marketData` enviado à edge function) —
`ExecutiveDashboard.tsx:272` (`rating: 4.5` injetado em todo fornecedor real).

### Constantes de fallback que viram "dado" na tela

`RiskHeatMap.tsx:93` (`onTimeRate = 90` quando não há entrega), `:95` (`avaliacao || 4.5`),
`:97` (`avaliacao || 4`) — `SupplierRankingPanel.tsx:172` (`deliveryScore = 80`), `:174`
(`slaScore = 75`) — `scorecard/supplierScorecardData.ts:66` (`slaCompliance = 80`), `:73`
(`prazo_medio_entrega || 10`), `:77` (`communication = 70`), `:78` (`flexibility = 70`), `:80`
(`pricing = 75`) — `contract/ContractDetailsTabs.tsx:21,30,31,39,49,50` — `KraljicMatrix.tsx:103-108`
(4 categorias de exemplo) — `SourcingIntelligenceWidget.tsx:31-35` (3 fornecedores de exemplo).

---

## Limites desta auditoria (honestidade)

- **Sem runtime e sem banco.** Toda afirmação sobre o que a query devolve na prática está marcada
  `NAO_VERIFICADO (runtime)`. Confirmei apenas a **existência** das tabelas
  (`supplier_bonifications`, `category_strategies`, `unspsc_codes`, `supplier_qualification_scores`,
  `devolucoes`, `produto_fornecedores`, `pedido_itens`) em `src/integrations/supabase/types.ts`, e a
  existência da edge function `ai-supplier-risk` em `supabase/functions/`. Não verifiquei RLS,
  volume de linhas, nem se as tabelas estão populadas.
- **Não auditei os pais fora do escopo.** `ExecutiveDashboard.tsx`, `PriceComparator.tsx`,
  `PendingApprovalsList.tsx`, `AdvancedProcurementKPIs.tsx`, `DigitalSignature.tsx`,
  `DeliveryCalendar.tsx`, `NovaSolicitacaoModal.tsx`, `DynamicApprovalMatrix.tsx`,
  `EnhancedKpiCard.tsx` e `BulkOperationsPreview.tsx` pertencem ao L04. Li deles apenas as linhas
  citadas como prova de consumo (via `grep -n`), não o arquivo inteiro. Os achados sobre
  `ExecutiveDashboard` (item 2) baseiam-se em `grep` das linhas 24-26, 129-150 e 272 — suficiente
  para a afirmação feita, mas o L04 deve confirmar o restante.
- **A contagem de "unidades funcionais" (57) é um julgamento meu** sobre o que conta como
  funcionalidade auditável (componente exportado, hook exportado, ou módulo de dados). Um critério
  diferente muda os percentuais, não as classificações individuais.
- **`SLADistributionChart` classificado ⬛ e não 🟨** porque a regra do lote é caminho de execução:
  o componente é bom e conectado, mas nada o renderiza. Se o L04 encontrar um `case` que eu não vi
  em `ComprasDashboard.tsx`, sobe para ✅.
- Não executei build, lint, testes nem type-check. Não sei se os testes deste diretório passam.

---

## ARQUIVOS LIDOS

Todos os 69 arquivos do escopo, lidos integralmente com `Read`.

```
src/components/compras/RiskHeatMap.tsx
src/components/compras/SLABySupplierAnalysis.tsx
src/components/compras/SLADistributionChart.tsx
src/components/compras/SavingsGoalPanel.tsx
src/components/compras/SolicitacaoCard.tsx
src/components/compras/SolicitacaoKanban.tsx
src/components/compras/SourcingHistoryConsole.tsx
src/components/compras/SourcingIntelligenceWidget.tsx
src/components/compras/SpendAnalytics.tsx
src/components/compras/StatusTimeline.tsx
src/components/compras/StrategicQuoteTable.tsx
src/components/compras/SupplierAlertsPanel.tsx
src/components/compras/SupplierBonificationsPanel.tsx
src/components/compras/SupplierEcosystemSection.tsx
src/components/compras/SupplierIntelligenceConsole.tsx
src/components/compras/SupplierInteractionLog.tsx
src/components/compras/SupplierRankingPanel.tsx
src/components/compras/SupplierRiskAnalysis.tsx
src/components/compras/SupplierScorecard.tsx
src/components/compras/TrendAnalysisCharts.tsx
src/components/compras/UrgentItemsList.tsx
src/components/compras/VisualComparadorCotacoes.tsx
src/components/compras/__tests__/PipelineChart.test.tsx
src/components/compras/__tests__/kanbanTypeGuards.test.ts
src/components/compras/approval/ApprovalDelegationModal.tsx
src/components/compras/approval/ApprovalRuleModal.tsx
src/components/compras/bulk-operations/__tests__/bulkOperationsTypes.test.ts
src/components/compras/bulk-operations/bulkOperationsTypes.ts
src/components/compras/contract/ContractDetailsTabs.tsx
src/components/compras/contract/ContractItemsEditor.tsx
src/components/compras/contract/ContractSLASection.tsx
src/components/compras/dashboard/UrgencyDetailsSheet.tsx
src/components/compras/delivery-calendar/__tests__/deliveryCalendarHelpers.test.ts
src/components/compras/delivery-calendar/deliveryCalendarHelpers.ts
src/components/compras/digital-signature/__tests__/signatureHelpers.test.ts
src/components/compras/digital-signature/signatureHelpers.ts
src/components/compras/enhanced-kpi/EnhancedKpiHelpers.tsx
src/components/compras/enhanced-kpi/__tests__/colorClasses.test.ts
src/components/compras/executive/ExecutiveAIInsights.tsx
src/components/compras/executive/ExecutiveChartsRow.tsx
src/components/compras/executive/ExecutiveDrillDownModal.tsx
src/components/compras/executive/ExecutiveFiltersBar.tsx
src/components/compras/executive/ExecutiveMetricCard.tsx
src/components/compras/executive/ExecutivePendingActions.tsx
src/components/compras/executive/ExecutiveTablesRow.tsx
src/components/compras/executive/KraljicMatrix.tsx
src/components/compras/executive/PriceVarianceAnalysis.tsx
src/components/compras/executive/__tests__/executiveDashboardData.test.ts
src/components/compras/executive/executiveDashboardData.ts
src/components/compras/pending-approvals/ApprovalModals.tsx
src/components/compras/pending-approvals/__tests__/deadlineFallback.test.ts
src/components/compras/pending-approvals/__tests__/pendingApprovalsData.test.ts
src/components/compras/pending-approvals/deadlineFallback.ts
src/components/compras/pending-approvals/pendingApprovalsData.ts
src/components/compras/price-comparator/__tests__/priceComparatorHelpers.test.ts
src/components/compras/price-comparator/priceComparatorHelpers.ts
src/components/compras/price-history/__tests__/priceHistoryHelpers.test.ts
src/components/compras/price-history/priceHistoryHelpers.ts
src/components/compras/procurement-kpis/__tests__/kpiMockData.test.ts
src/components/compras/procurement-kpis/kpiMockData.ts
src/components/compras/scorecard/__tests__/supplierScorecardData.test.ts
src/components/compras/scorecard/supplierScorecardData.ts
src/components/compras/sla-analysis/__tests__/slaAnalysisData.test.ts
src/components/compras/sla-analysis/slaAnalysisData.ts
src/components/compras/solicitacao/SolicitacaoFormSteps.tsx
src/components/compras/solicitacao/SolicitacaoReviewStep.tsx
src/components/compras/timeline/__tests__/timelineConfig.test.ts
src/components/compras/timeline/timelineConfig.ts
src/components/compras/visual-comparador/ComparadorCharts.tsx
```

### Arquivos fora do escopo consultados apenas por `grep -n` (prova de consumo/ausência)

Não foram lidos por inteiro; usados só para as linhas citadas nas colunas "Quem consome" e "Achados".

```
src/routes/AppRoutes.tsx
src/pages/dashboard/ComprasDashboard.tsx
src/pages/dashboard/DashboardExecutivo.tsx
src/pages/relatorios/Relatorios.tsx
src/pages/relatorio-negociacoes/RelatorioNegociacoes.tsx
src/pages/solicitacoes/Solicitacoes.tsx   (lido trecho 350-420)
src/pages/fornecedores/SupplierPerformance.tsx
src/pages/fornecedores/Fornecedores.tsx
src/pages/compliance/ComplianceDashboard.tsx
src/pages/cotacao/Cotacao.tsx
src/pages/negociacao-ia/NegociacaoIA.tsx
src/pages/historico/HistoricoCompras.tsx
src/pages/pedidos/PedidoDetailsDialog.tsx
src/pages/pedidos/PedidosKPIs.tsx
src/components/compras/ExecutiveDashboard.tsx
src/components/compras/EnhancedKpiCard.tsx
src/components/compras/PendingApprovalsList.tsx
src/components/compras/PriceComparator.tsx
src/components/compras/PriceHistoryModal.tsx
src/components/compras/AdvancedProcurementKPIs.tsx
src/components/compras/DynamicApprovalMatrix.tsx
src/components/compras/NovaSolicitacaoModal.tsx
src/components/compras/DeliveryCalendar.tsx
src/components/compras/DigitalSignature.tsx
src/components/compras/BulkOperationsPreview.tsx
src/components/compras/ContractModal.tsx
src/components/compras/ContractDetailsModal.tsx
src/components/compras/EnhancedPedidoTimeline.tsx
src/components/compras/PedidoTimeline.tsx
src/components/compras/HistoricoComprasModal.tsx
src/components/pagamentos/PagamentoAdvancedKPIs.tsx
src/integrations/supabase/types.ts   (trechos: solicitacoes, fornecedores, lista de tabelas)
supabase/functions/   (listagem de diretórios)
```
