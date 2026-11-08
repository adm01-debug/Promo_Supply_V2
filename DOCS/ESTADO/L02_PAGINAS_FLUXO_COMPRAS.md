# L02 — Páginas do Fluxo de Compras

> Auditoria de estado por leitura de código. Nada aqui vem de README, DOCS ou comentários.
> **Sem acesso ao banco**: qualquer afirmação sobre conteúdo de tabelas, execução em produção
> ou triggers efetivamente instalados está marcada `NAO_VERIFICADO (runtime)`.
> Escopo lido integralmente: 39 arquivos em `src/pages/{solicitacoes,cotacao,aprovacoes,pedidos,acompanhamento,gerar-ordem,recebimento,devolucoes,historico,kanban,orcamentos}`.
> Hooks/serviços/componentes fora do escopo foram lidos apenas como *camada de dados* das telas auditadas (citados com caminho:linha).

---

## Resumo

| Classificação | Qtd | Denominador |
|---|---|---|
| ✅ IMPLEMENTADO_TOTAL | 15 | 43 |
| 🟨 IMPLEMENTADO_PARCIAL | 12 | 43 |
| 🟦 SUGERIDO_OU_INICIADO | 13 | 43 |
| ⬛ MORTO_OU_ABANDONADO | 3 | 43 |

**Leitura honesta**: o esqueleto CRUD do fluxo (criar solicitação → gerar ordem → receber → devolver)
está real e persistido. O que está quebrado é o **miolo decisório**: a seleção de fornecedor na
cotação não persiste nada, a aprovação não mexe no status da solicitação, e o acompanhamento é
puramente visual. Toda a camada "IA/Neural" é teatro de UI.

---

## O fio do processo (solicitação → ... → devolução)

| # | Transição | Existe código que muda estado no banco? | Objeto de banco | Evidência | Veredito |
|---|---|---|---|---|---|
| 1 | (nada) → **solicitação criada** | **SIM** | `INSERT solicitacoes` + RPC `generate_sequential_number` + RPC `check_budget_availability` + `createWorkflow` | `src/features/solicitacoes/hooks/useSolicitacoes.ts:157` (insert), `:154` (RPC numero), `:134` (RPC orçamento), `:187` (workflow) | ✅ real |
| 2 | **solicitação → em_cotacao** (manual, Kanban/bulk) | **SIM** | `UPDATE solicitacoes.status` | `useSolicitacoes.ts:212` via `updateStatus` `:224`; disparado em `src/pages/solicitacoes/Solicitacoes.tsx:140` e `src/pages/kanban/KanbanWorkflow.tsx:52` | ✅ real |
| 3 | **cotação adicionada** (manual) | **SIM** | `INSERT cotacoes` | `src/features/cotacoes/hooks/useCotacoes.ts:92`; chamada em `src/pages/cotacao/Cotacao.tsx:356` | ✅ real |
| 4 | **cotação → fornecedor selecionado** | **NÃO** | nenhum | `src/pages/cotacao/Cotacao.tsx:276` passa `onSelecionar={setFornecedorSelecionado}` (um `useState`, declarado em `:65`). O ranking chama `onSelecionar(id, justificativa)` em `src/components/compras/RankingCotacoes.tsx:73` e `:82` — a justificativa é **descartada**. | ⬛ **FIO CORTADO — só estado local do React** |
| 4b | (mesmo passo, caminho alternativo) | código existe mas **sem chamador** | `UPDATE cotacoes.selecionada/status` | `useCotacoes.ts:144` `selectCotacao`. `grep -rn "selectCotacao" src/` retorna **apenas** a definição (`:144`) e o export (`:208`). Zero consumidores. | ⬛ morto |
| 5 | **aprovação (approval_steps) → solicitação liberada** | **PARCIAL** | `UPDATE approval_steps`, `UPDATE approval_workflows`, `INSERT approval_history` | `src/hooks/useApprovalWorkflow.ts:200` (step), `:213` (workflow), `:225` (history); UI em `src/components/compras/PendingApprovalsList.tsx:206`/`:221`, renderizada por `src/pages/aprovacoes/Aprovacoes.tsx:116` | 🟨 **grava o workflow mas NUNCA toca `solicitacoes.status`** — nenhum `from('solicitacoes').update` em todo o arquivo |
| 6 | **cotação selecionada → solicitação em_andamento** | só por trigger SQL do repo | trigger `trg_cotacao_approved_status` em `cotacoes` | `supabase/migrations/20260317213152_...sql:19-24` | 🟨 o trigger existe no repo, mas como (4) nunca grava `selecionada=true`, ele **nunca dispara pelo front**. Instalação no banco: `NAO_VERIFICADO (runtime)` |
| 7 | **solicitação/cotação → pedido (OC)** | **SIM** | `INSERT pedidos` + `INSERT pedido_itens` + `UPDATE solicitacoes.status='em_andamento'` | `src/pages/gerar-ordem/GerarOrdem.tsx:179` (createPedido), `src/features/pedidos/hooks/usePedidos.ts:143` (insert pedido), `:177` (insert itens), `GerarOrdem.tsx:198-201` (update solicitação) | ✅ real |
| 8 | **pedido → mudança de status (Central de Pedidos)** | **SIM** | `UPDATE pedidos.status` (+`data_entrega`) | `usePedidos.ts:196` via `updateStatus` `:213`; UI em `src/pages/pedidos/PedidoDetailsDialog.tsx:59` e bulk em `src/pages/pedidos/Pedidos.tsx:76` | ✅ real |
| 9 | **pedido → status de produção do item** | **SIM** | `UPDATE pedido_itens.status_producao` | `src/pages/pedidos/PedidoDetailsDialog.tsx:70`; clique em `:361` | ✅ real |
| 10 | **acompanhamento → mudança de status (Kanban/lista)** | **NÃO** | nenhum | `src/pages/acompanhamento/Acompanhamento.tsx:144-146`: `handleStatusChange` faz **apenas** `toast.success(...)`. É passado ao `KanbanBoard` em `:313`, que o chama no drop (`src/components/compras/KanbanBoard.tsx:147`) | ⬛ **FIO CORTADO — otimista/visual** |
| 11 | **pedido → recebimento (conferência)** | **SIM** | `UPDATE pedido_itens.quantidade_recebida` + `UPDATE pedidos.status` ('entregue'/'parcial') | `src/pages/recebimento/RecebimentoOffline.tsx:187` (itens), `:195` (pedido); sync offline em `:234`/`:242` | ✅ real |
| 12 | **pedido entregue → solicitação concluída + pagamento** | só por trigger SQL do repo | trigger `trg_pedido_entregue_status` em `pedidos` | `supabase/migrations/20260317213152_...sql:71-75` (UPDATE solicitacoes `:43`, INSERT pagamentos `:52`) | 🟨 código do trigger presente no repo; instalação/execução: `NAO_VERIFICADO (runtime)` |
| 13 | **recebimento → devolução** | **SIM para criar devolução, NÃO para vincular ao pedido** | `INSERT devolucoes` + `INSERT devolucao_itens` | `src/hooks/useDevolucoes.ts:113` (insert), `:132` (itens); form em `src/pages/devolucoes/DevolucoesModals.tsx:58-67` | 🟨 `CreateDevolucaoInput.pedido_id` existe (`useDevolucoes.ts:25`) mas o formulário **não tem campo de pedido** — nunca é preenchido, então `devolucoes.pedido_id` fica nulo e a rastreabilidade pedido↔devolução se perde |
| 14 | **devolução → transições de status** | **SIM** | `UPDATE devolucoes` (+ datas) | `src/hooks/useDevolucoes.ts:163`; botões em `src/pages/devolucoes/DevolucoesModals.tsx:290` | ✅ real |
| 15 | **devolução → crédito de fornecedor** | **SIM** | `INSERT creditos_fornecedor` | `src/hooks/useDevolucoes.ts:168` (quando `newStatus === 'credito_emitido'`) | ✅ real |

**Conclusão do fio**: dos 15 saltos, **3 estão cortados** (4, 4b, 10), **1 grava só metade** (5),
**2 dependem exclusivamente de triggers SQL** cuja instalação não pude verificar (6, 12) e
**1 grava mas perde o vínculo** (13).

---

## Tabela de evidências

| Funcionalidade | Classificação | Evidência (arquivo:linha) | Camada de dados | O que falta |
|---|---|---|---|---|
| **Solicitações — listagem/filtros/busca** | ✅ IMPLEMENTADO_TOTAL | UI `src/pages/solicitacoes/Solicitacoes.tsx:309`; hook `:92`; query `src/features/solicitacoes/hooks/useSolicitacoes.ts:59` | `SELECT solicitacoes` (+joins `fornecedores`,`categorias`,`cost_centers`), filtro por `organization_id` | — |
| **Solicitações — criar (NovaSolicitacaoModal)** | ✅ IMPLEMENTADO_TOTAL | UI `Solicitacoes.tsx:270`; submit `src/components/compras/NovaSolicitacaoModal.tsx:185`; insert `:215`; storage `:242` | `INSERT solicitacoes`, RPC `generate_sequential_number`, RPC `check_budget_availability`, Storage | — |
| **Solicitações — mudar status (Kanban drag)** | ✅ IMPLEMENTADO_TOTAL | `Solicitacoes.tsx:138-141` → `useSolicitacoes.ts:224` → `:212`; drop em `src/components/compras/SolicitacaoKanban.tsx:265` | `UPDATE solicitacoes.status` com guarda de transição (`useSolicitacoes.ts:41`) | — |
| **Solicitações — ações em massa (status/delete)** | ✅ IMPLEMENTADO_TOTAL | `Solicitacoes.tsx:160-174`; `useSolicitacoes.ts:250` (delete) e `:264` (status); barra `src/components/compras/EnhancedBulkActionsBar.tsx:92` | `DELETE/UPDATE solicitacoes .in('id', ids)` | — |
| **Solicitações — persistência de filtros por conta** | ✅ IMPLEMENTADO_TOTAL | `Solicitacoes.tsx:72,78-90` via `useAccountFilters` | hook `useAccountFilters` (fora de escopo, existe e é chamado) | — |
| **Solicitações — Realtime** | ✅ IMPLEMENTADO_TOTAL | `Solicitacoes.tsx:97-101` | canal realtime tabela `solicitacoes` | efeito em runtime `NAO_VERIFICADO (runtime)` |
| **Solicitações — KPIs do topo (total/pendentes/valor)** | 🟨 IMPLEMENTADO_PARCIAL | `Solicitacoes.tsx:127-136` | calculado em memória sobre `filteredSolicitacoes` | existe RPC dedicada `get_solicitacoes_kpis` (`useSolicitacoes.ts:335`) que **esta tela não usa**; os KPIs refletem só a página carregada (`pageSize` default 100, `useSolicitacoes.ts:55`) |
| **Solicitações — "Matriz de Prioridade Neural" (scatter)** | 🟦 SUGERIDO_OU_INICIADO | `Solicitacoes.tsx:389-401` | nenhuma | eixo X é `left: ${(i*7)+10}%` — **posição pelo índice do array**, não por "impacto financeiro". Gráfico decorativo. |
| **Solicitações — IAAdvisor** | 🟦 SUGERIDO_OU_INICIADO | `Solicitacoes.tsx:297`; componente `src/components/compras/IAAdvisor.tsx:33-36` | nenhuma | texto é template string com `stats.pending`. Botões "Ver Insights" (`:40`) e "Ação Rápida" (`:43`) **sem `onClick`** |
| **Solicitações — BulkPlanningConsole ("Disparar Cotações")** | 🟦 SUGERIDO_OU_INICIADO | `Solicitacoes.tsx:299`; dados `src/components/compras/BulkPlanningConsole.tsx:23` (`mockPlanningData`), frete `:64` (objeto literal) | nenhuma | 100% mock hardcoded ("Brindes Premium", "Insumos TI"). Botão "Disparar Cotações" (`:105`) **sem `onClick`** |
| **Solicitações — FiltrosAvancados `onApply`** | 🟦 SUGERIDO_OU_INICIADO | `Solicitacoes.tsx:344` — `onApply={() => {}}` | nenhuma | callback vazio (os filtros funcionam via `onFiltersChange`, mas `onApply` é no-op) |
| **Cotação — carregar solicitação + cotações do banco** | ✅ IMPLEMENTADO_TOTAL | `src/pages/cotacao/Cotacao.tsx:53-57`; query `src/features/cotacoes/hooks/useCotacoes.ts:40` | `SELECT cotacoes` (+joins), `SELECT solicitacoes` | — |
| **Cotação — adicionar cotação manual** | ✅ IMPLEMENTADO_TOTAL | `Cotacao.tsx:355-364`; `useCotacoes.ts:92` | `INSERT cotacoes` + RPC `generate_sequential_number` + `auditHelpers.logCreate` (`:110`) | — |
| **Cotação — SELECIONAR FORNECEDOR VENCEDOR** | ⬛ MORTO_OU_ABANDONADO | `Cotacao.tsx:276` (`onSelecionar={setFornecedorSelecionado}`), state em `:65`; hook não usado `useCotacoes.ts:144` | **nenhuma** | é o passo mais importante do módulo e não persiste nada. `selectCotacao` (que gravaria `selecionada`, `status='aprovada'`, `justificativa_selecao` e dispararia o trigger) **não tem nenhum chamador em todo `src/`** (grep confirmado) |
| **Cotação — "START AUTO SEARCH" (busca automática)** | 🟦 SUGERIDO_OU_INICIADO | `Cotacao.tsx:97-107` → `src/pages/cotacao/cotacaoHelpers.ts:123` | consulta real a `produto_fornecedores` em `:134`, **mas o resultado é ignorado** (`:139-144` só tem comentário) | preços/prazos/estoque gerados por `Math.random()` (`cotacaoHelpers.ts:150,152,153,160,161,164`). Resultados vivem só em `useState` (`Cotacao.tsx:63`), nunca gravados |
| **Cotação — análise de IA ("Strategic Insight")** | 🟦 SUGERIDO_OU_INICIADO | `Cotacao.tsx:76-91` | nenhuma | `setTimeout(2000)` (`:80`) + string literal com **"15% savings"** e "zero delivery delays in the last 6 months" hardcoded (`:84-85`) |
| **Cotação — FOLLOW-UP (botão)** | 🟦 SUGERIDO_OU_INICIADO | `Cotacao.tsx:109-122` | nenhuma | só `toast.info` + `setTimeout(1500)` + `toast.success`. Nenhum e-mail/WhatsApp/edge function |
| **Cotação — NeuralFollowUpMonitor** | 🟦 SUGERIDO_OU_INICIADO | `Cotacao.tsx:310`; `src/components/compras/NeuralFollowUpMonitor.tsx:18-32` | nenhuma | encadeamento de `setTimeout` gerando logs de texto. Nada sai do navegador |
| **Cotação — AISupplierSuggestion** | 🟦 SUGERIDO_OU_INICIADO | `Cotacao.tsx:335`; `src/components/compras/AISupplierSuggestion.tsx:33,42-43` | nenhuma | "Target: Aluminum Mug", "12 qualified suppliers", "AluTech Indústria 98%" — literais. Botão `:60` sem `onClick` |
| **Cotação — StrategicQuoteTable (3 estratégias)** | 🟨 IMPLEMENTADO_PARCIAL | `Cotacao.tsx:254`; cálculo real `src/components/compras/StrategicQuoteTable.tsx:83-88` | lê `cotacoes` reais em memória | o cálculo (mais barato/mais rápido/melhor nota) é real, mas o clique `handleSelectStrategy` (`:93-96`) faz **só `toast.success`** — não persiste seleção |
| **Cotação — SupplierEcosystemSection** | ✅ IMPLEMENTADO_TOTAL | `Cotacao.tsx:304`; `src/components/compras/SupplierEcosystemSection.tsx:16-19` | `SELECT produto_fornecedores` | conteúdo do banco `NAO_VERIFICADO (runtime)` |
| **Cotação — PriceHistoryModal** | ✅ IMPLEMENTADO_TOTAL | `Cotacao.tsx:367`; `src/components/compras/PriceHistoryModal.tsx:37,47,54` | `SELECT cotacoes/fornecedores/solicitacoes` | — |
| **Cotação — BuscaAutomatica (lista de fornecedores integrados)** | 🟦 SUGERIDO_OU_INICIADO | `Cotacao.tsx:300`; `src/components/compras/BuscaAutomatica.tsx:18-23` | nenhuma | array literal `fornecedoresAPI` com "XBZ Brindes / 10.172 produtos" etc. Números fixos no código |
| **Aprovações — lista de pendentes + aprovar/rejeitar** | 🟨 IMPLEMENTADO_PARCIAL | `src/pages/aprovacoes/Aprovacoes.tsx:116`; `src/components/compras/PendingApprovalsList.tsx:206,221`; `src/hooks/useApprovalWorkflow.ts:200,213,225,241-256` | `UPDATE approval_steps`, `UPDATE approval_workflows`, `INSERT approval_history` | **não propaga para `solicitacoes.status`** — nenhum `.from('solicitacoes').update(` em `useApprovalWorkflow.ts`. A solicitação continua `pendente` depois de aprovada |
| **Aprovações — escalonamento automático (polling)** | ✅ IMPLEMENTADO_TOTAL | `Aprovacoes.tsx:37-39`; `useApprovalWorkflow.ts:271-296` (update workflow, insert step, insert history), intervalo `:305` | `UPDATE approval_workflows`, `INSERT approval_steps`, `INSERT approval_history` | — |
| **Aprovações — cards de KPI do topo (5 cards)** | 🟦 SUGERIDO_OU_INICIADO | `Aprovacoes.tsx:74,78,82,86,90,99` lendo `approvalStats` | **nenhuma** — objeto literal em `src/pages/aprovacoes/aprovacoesData.ts:61-67` | Pendentes=3, Aprovadas=28, Rejeitadas=2, Tempo Médio="4.2h", Escalações=1 são **constantes hardcoded**. Nunca mudam |
| **Aprovações — aba Métricas (gráficos + KPIs)** | 🟦 SUGERIDO_OU_INICIADO | `Aprovacoes.tsx:196,199,200,204`; métricas derivadas de mock em `:45-59` | **nenhuma** — `aprovacoesData.ts:69-105` (`approvalTrendData`, `statusDistribution`, `bottleneckData`) | dados de Jul–Dez fictícios. O seletor de período (`Aprovacoes.tsx:183`) altera `periodo` mas **nada consome esse state** |
| **Aprovações — aba Histórico** | 🟨 IMPLEMENTADO_PARCIAL | `Aprovacoes.tsx:130-139` | `SELECT approval_history` via `fetchAllHistory` (`useApprovalWorkflow.ts` → `useApprovalHistory`) | usa dado real **mas cai em fallback de mock** quando vazio: `: (approvalHistory as ApprovalHistoryItem[])` em `:139` — banco vazio exibe "SOL-2024-150 / Você / 2024-12-15" como se fosse real |
| **Aprovações — aba Config (DynamicApprovalMatrix)** | ✅ IMPLEMENTADO_TOTAL | `Aprovacoes.tsx:120`; regras via `useApprovalRules` (`saveRule`/`deleteRule` expostos em `useApprovalWorkflow.ts:342-345`) | `approval_rules`, `approval_delegations` | leitura do componente fora do escopo; wiring confirmado pela cadeia de exports |
| **Pedidos — listagem/filtros/ordenação/export CSV** | ✅ IMPLEMENTADO_TOTAL | `src/pages/pedidos/Pedidos.tsx:56,89-104,116-123`; query `src/features/pedidos/hooks/usePedidos.ts:75` | `SELECT pedidos` (+joins `fornecedores`,`solicitacoes`); export via `exportToCSV` | — |
| **Pedidos — KPIs (5 cards)** | ✅ IMPLEMENTADO_TOTAL | `Pedidos.tsx:57,172`; `src/pages/pedidos/PedidosKPIs.tsx:14-50`; RPC `usePedidos.ts:314` | RPC `get_pedidos_kpis` | existência da RPC no banco `NAO_VERIFICADO (runtime)`; em erro os KPIs viram 0 (`:309`) |
| **Pedidos — coluna "Saúde do SLA"** | 🟦 SUGERIDO_OU_INICIADO | `Pedidos.tsx:294,297,303,305` | **nenhuma** | barra e rótulo derivam de `index % 3 === 0` → "ATENÇÃO"/"NO PRAZO" e 40%/85%. É **a posição na tabela**, não a data de previsão. Métrica falsa |
| **Pedidos — badge "4 Novas Movimentações"** | 🟦 SUGERIDO_OU_INICIADO | `Pedidos.tsx:155` | nenhuma | literal `4` no JSX |
| **Pedidos — ações em massa** | ✅ IMPLEMENTADO_TOTAL | `Pedidos.tsx:72-87`; `usePedidos.ts:232` (status) e `:249` (delete) | `UPDATE/DELETE pedidos .in('id', ids)` | — |
| **Pedidos — detalhe: alterar status + timeline** | ✅ IMPLEMENTADO_TOTAL | `src/pages/pedidos/PedidoDetailsDialog.tsx:50-66,145`; `usePedidos.ts:213` | `UPDATE pedidos.status` (+`data_entrega` em 'entregue') | — |
| **Pedidos — detalhe: itens + pipeline de produção** | ✅ IMPLEMENTADO_TOTAL | `PedidoDetailsDialog.tsx:86-101` (query), `:68-84` (update), clique `:361` | `SELECT pedido_itens` (+`produtos`), `UPDATE pedido_itens.status_producao` | — |
| **Pedidos — detalhe: alerta "Auditoria de 1ª Peça"** | 🟦 SUGERIDO_OU_INICIADO | `PedidoDetailsDialog.tsx:337` | nenhuma | condição é `item.descricao?.toLowerCase().includes('boné')` — regra de negócio por *substring do texto livre* |
| **Pedidos — detalhe: aba "LOG DE AUDITORIA"** | 🟦 SUGERIDO_OU_INICIADO | `PedidoDetailsDialog.tsx:416-422` | nenhuma | card fixo: "Inicializando vetores de log de auditoria histórica..." — sem query, sem lista |
| **Pedidos — detalhe: botões E-MAIL / HUB COMUNICAÇÃO / AUTORIZAR REDESPACHO** | 🟦 SUGERIDO_OU_INICIADO | `PedidoDetailsDialog.tsx:193,196,430` | nenhuma | os três `<Button>` **não têm `onClick`** |
| **Pedidos — detalhe: SupplierInteractionLog** | 🟦 SUGERIDO_OU_INICIADO | `PedidoDetailsDialog.tsx:203`; `src/components/compras/SupplierInteractionLog.tsx:16-37` | nenhuma | `mockInteractions` — 3 mensagens fixas ("aguardando a chegada da matéria-prima") exibidas para **qualquer** fornecedor |
| **Pedidos — detalhe: SourcingIntelligenceBanner** | ✅ IMPLEMENTADO_TOTAL | `PedidoDetailsDialog.tsx:202`; `src/components/compras/ProductionRoutingEngine.tsx:120-138` | `SELECT produto_fornecedores` com `count: 'exact'` | botões "LISTAR"/"CONECTAR" (`:178`) sem `onClick` |
| **Acompanhamento — carregar pipeline + SLA + KPIs** | ✅ IMPLEMENTADO_TOTAL | `src/pages/acompanhamento/Acompanhamento.tsx:80-105` (3 queries), montagem `:107-121`, SLA `:123` via `src/pages/acompanhamento/AcompanhamentoHelpers.ts:61` | `SELECT pedidos`, `SELECT solicitacoes`, `SELECT fornecedores` | queries **não filtram por `organization_id`/`tenant_id`** (`:83,:92,:101`) — dependem inteiramente de RLS. Risco de vazamento entre tenants se RLS falhar: `NAO_VERIFICADO (runtime)` |
| **Acompanhamento — mudar status (Kanban drop)** | ⬛ MORTO_OU_ABANDONADO | `Acompanhamento.tsx:144-146` (corpo = só `toast.success`); wiring `:313`; drop `src/components/compras/KanbanBoard.tsx:141-147` | **nenhuma** | usuário arrasta o card, vê "Pedido #X atualizado", recarrega e o card volta. Zero persistência |
| **Acompanhamento — botões NOVA ATUALIZAÇÃO / FILTROS AVANÇADOS / VISUALIZAR NF-E / HISTÓRICO DE LOGS** | 🟦 SUGERIDO_OU_INICIADO | `Acompanhamento.tsx:198` (`onClick={() => {}}`), `:298`, `:450`, `:451` (sem `onClick`) | nenhuma | 4 botões inertes |
| **Acompanhamento — timeline de etapas (PedidoTimeline)** | 🟨 IMPLEMENTADO_PARCIAL | `Acompanhamento.tsx:378,445`; `AcompanhamentoHelpers.ts:105-121` | deriva do status real do pedido | as **datas** são fixas: `data: index < etapaAtual ? '15/12/2025' : 'Agora'` (`AcompanhamentoHelpers.ts:119`). Nenhuma data real de etapa |
| **Acompanhamento — `gerarEtapasEnhanced`** | ⬛ MORTO_OU_ABANDONADO | `AcompanhamentoHelpers.ts:123-145` | nenhuma | exportado mas sem consumidor em `Acompanhamento.tsx`; e é 100% sintético: "Cotações solicitadas a 3 fornecedores" (`:133`), datas por `dataBase + 86400000*n`, documentos com `url: '#'` (`:135`) |
| **Gerar Ordem — carregar solicitação + fornecedores + cotação** | 🟨 IMPLEMENTADO_PARCIAL | `src/pages/gerar-ordem/GerarOrdem.tsx:62-89,105` | `SELECT solicitacoes`, `SELECT fornecedores` (status='ativo'), `SELECT cotacoes` | fallback perigoso: se não achar a cotação/fornecedor, usa **`fornecedoresData[0]`** (`:112`) — o primeiro fornecedor ativo qualquer. `frete` já vem com `150` fixo (`:53`) e `valorUnitario` cai para `12` (`:126,:226`) |
| **Gerar Ordem — Finalizar e Salvar OC** | ✅ IMPLEMENTADO_TOTAL | `GerarOrdem.tsx:165-215`; insert `src/features/pedidos/hooks/usePedidos.ts:143`, itens `:177`, update solicitação `GerarOrdem.tsx:198-201` | `INSERT pedidos`, `INSERT pedido_itens`, `UPDATE solicitacoes.status`, RPC `generate_sequential_number`, `auditHelpers.logCreate` | — |
| **Gerar Ordem — mensagens WhatsApp/E-mail** | ✅ IMPLEMENTADO_TOTAL | `GerarOrdem.tsx:129-142` → `src/pages/gerar-ordem/gerarOrdemHelpers.ts:25,56`; envio `GerarOrdem.tsx:154-163` (`wa.me`, `mailto:`) | nenhuma (abre app externo, por design) | número da OC no texto é literalmente `"A DEFINIR"` (`GerarOrdem.tsx:123`) — o `numero` real só existe **depois** do insert, então toda mensagem enviada antes sai sem OC |
| **Gerar Ordem — Visualizar PDF** | ✅ IMPLEMENTADO_TOTAL | `GerarOrdem.tsx:217-235` via `generateOrderPDF` | nenhuma (client-side) | mesmo problema: `numero: "A DEFINIR"` |
| **Recebimento — listar pedidos pendentes + cache offline** | ✅ IMPLEMENTADO_TOTAL | `src/pages/recebimento/RecebimentoOffline.tsx:71-102`; cache `:102`; leitura de cache `:106,:130` | `SELECT pedidos` + `pedido_itens` (+`fornecedores`), `localStorage` | query sem filtro de tenant (`:78`) — depende de RLS: `NAO_VERIFICADO (runtime)` |
| **Recebimento — registrar conferência (online)** | 🟨 IMPLEMENTADO_PARCIAL | `RecebimentoOffline.tsx:167-221`; updates `:187` e `:195` | `UPDATE pedido_itens.quantidade_recebida`, `UPDATE pedidos.status`+`data_entrega` | **as observações não são persistidas**: `itemNotes` e `generalNote` entram só no objeto `entry` (`:177,:179`) e nunca aparecem em nenhum `.update()`. O usuário digita "com avaria" e o dado se perde |
| **Recebimento — fila offline + auto-sync** | 🟨 IMPLEMENTADO_PARCIAL | `RecebimentoOffline.tsx:212-217` (enfileira), `:224-259` (sync), storage `src/pages/recebimento/recebimentoHelpers.ts:31,39` | `localStorage` + os mesmos `UPDATE`s | no sync, `allComplete` é calculado como `every(i => i.quantidade_recebida > 0)` (`:240`) — **ignora a quantidade pedida**, marcando 'entregue' um pedido recebido parcialmente. Diverge da regra usada online (`:193`, que compara com `i.quantidade`) |
| **Recebimento — formulário de conferência** | ✅ IMPLEMENTADO_TOTAL | `src/pages/recebimento/ReceivingFormView.tsx:96,107,117,131` (contadores) e `:170` (save) | via `onSave` do pai | — |
| **Devoluções — listagem + filtros + KPIs** | ✅ IMPLEMENTADO_TOTAL | `src/pages/devolucoes/Devolucoes.tsx:31-33,124`; queries `src/hooks/useDevolucoes.ts:64` (devoluções), `:288` (KPIs) | `SELECT devolucoes` filtrado por `tenant_id`, joins manuais `fornecedores`/`pedidos` (`:84-91`) | — |
| **Devoluções — criar nova devolução** | 🟨 IMPLEMENTADO_PARCIAL | `src/pages/devolucoes/DevolucoesModals.tsx:54-73`; `useDevolucoes.ts:113,132` | `INSERT devolucoes` + `INSERT devolucao_itens` + RPC `generate_sequential_number` | formulário **não permite escolher o pedido de origem** — não há campo para `pedido_id` em todo `DevolucoesModals.tsx` (o input existe no tipo, `useDevolucoes.ts:25`). Devolução nasce órfã do pedido |
| **Devoluções — transições de status (aprovar/trânsito/receber/concluir)** | ✅ IMPLEMENTADO_TOTAL | `DevolucoesModals.tsx:219-232` (mapa) e `:290` (ação); `useDevolucoes.ts:151-163` com guarda `:40` | `UPDATE devolucoes` + carimbo de datas (`:159-161`) | — |
| **Devoluções — emissão automática de crédito** | ✅ IMPLEMENTADO_TOTAL | `useDevolucoes.ts:166-178` | `INSERT creditos_fornecedor` | — |
| **Devoluções — aba Créditos + saldo total** | ✅ IMPLEMENTADO_TOTAL | `Devolucoes.tsx:33,190-202`; `useDevolucoes.ts:216` (query), saldo `:257` | `SELECT creditos_fornecedor` por `tenant_id` | `utilizarCredito` (`useDevolucoes.ts:259`) existe e grava, mas **esta tela não tem botão para usá-lo** — abatimento de crédito só é possível por outro módulo |
| **Histórico — dados agregados (produtos/fornecedores/registros)** | ✅ IMPLEMENTADO_TOTAL | `src/pages/historico/HistoricoCompras.tsx:47`; `src/hooks/usePurchaseHistory.ts:84,100,115,128,142,155,168` (7 queries) | `SELECT pedidos, pedido_itens, fornecedores, produtos, categorias, solicitacoes, cost_centers` por `organization_id` | `avgDeliveryDays` é fixo em 0 com comentário próprio "Would need tracking data" (`usePurchaseHistory.ts:352`) |
| **Histórico — KPIs do topo (6 cards)** | ✅ IMPLEMENTADO_TOTAL | `HistoricoCompras.tsx:158-169` sobre registros reais filtrados | derivado de `usePurchaseHistory` | — |
| **Histórico — export CSV de sourcing** | ✅ IMPLEMENTADO_TOTAL | `HistoricoCompras.tsx:171-192` | `exportToCSV` sobre dados reais | — |
| **Histórico — botão "Desfazer Global" / "Desfazer"** | 🟦 SUGERIDO_OU_INICIADO | `HistoricoCompras.tsx:214`; `src/pages/historico/HistoricoSourcingTab.tsx:61-66,128` | nenhuma | ambos fazem **só `toast.success("Ação desfeita com sucesso")`**. Não há pilha de undo, nem rollback. Mente para o usuário |
| **Histórico — Price Benchmark / Target Price / Economia (aba Sourcing)** | 🟦 SUGERIDO_OU_INICIADO | `HistoricoSourcingTab.tsx:285,290,314,320,323` | nenhuma | "Melhor Histórico" = `unitPrice * 0.88`; "Variação Média" = `+4.2%` literal; fornecedor "Distribuidora Global" literal (`:286`); "Target Price AI" = `*0.92`; "Economia Potencial" = `*0.08`; "8% ROI" literal. **Multiplicadores inventados** |
| **Histórico — botões "Ver Análise Detalhada" / "Gerar Executive Sourcing Report"** | 🟦 SUGERIDO_OU_INICIADO | `HistoricoSourcingTab.tsx:294,329` | nenhuma | sem `onClick` |
| **Histórico — gráfico "Volume de Sourcing por Período"** | 🟨 IMPLEMENTADO_PARCIAL | `HistoricoSourcingTab.tsx:78-96`; dados `:49-59` | dados reais de `purchaseRecords` | o título diz "Volume por Período" mas plota `price` do **registro selecionado** (`priceBenchmarkData`); sem seleção mostra `[{date:'N/A', price:0}]` (`:79`). Rótulo não bate com o dado |
| **Histórico — Benchmark IA na aba Produtos** | 🟦 SUGERIDO_OU_INICIADO | `src/pages/historico/HistoricoProdutosTab.tsx:86` | nenhuma | `selectedProduct.avgPrice * 0.95` apresentado como "Benchmark IA" |
| **Histórico — abas Produtos / Fornecedores / Registros** | ✅ IMPLEMENTADO_TOTAL | `HistoricoProdutosTab.tsx:47,121`; `src/pages/historico/HistoricoFornecedoresTab.tsx:47,114`; `src/pages/historico/HistoricoRegistrosTab.tsx:46` | dados reais via `usePurchaseHistory` | — |
| **Histórico — modal de drilldown** | ⬛ MORTO_OU_ABANDONADO | `HistoricoCompras.tsx:363` (renderizado), `:64-66` (`handleDrilldown` definido) | — | `handleDrilldown` **não é passado para nenhum filho** (grep no arquivo: só a definição, linha 64). `drilldownOpen` nunca vira `true`. `src/pages/historico/HistoricoDrilldownModal.tsx` inteiro é inalcançável |
| **Histórico — estado morto de comparação/filtros avançados** | 🟦 SUGERIDO_OU_INICIADO | `HistoricoCompras.tsx:55` (`showAdvancedFilters`), `:61` (`comparisonEnabled`), `:62` (`comparisonPeriod`), `:33` (`COLORS` importado) | — | 3 `useState` e 1 import declarados e **nunca lidos** no JSX (grep confirmado) |
| **Histórico — aba Analytics** | 🟦 SUGERIDO_OU_INICIADO | `HistoricoCompras.tsx:352-358` | nenhuma | card com "Previsões neurais de demanda futura em desenvolvimento..." — placeholder explícito |
| **Kanban Workflow — board + transição de status** | ✅ IMPLEMENTADO_TOTAL | `src/pages/kanban/KanbanWorkflow.tsx:37-48` (query), `:50-63` (mutation), botão `:165` | `SELECT solicitacoes` (limit 200), `UPDATE solicitacoes.status` com whitelist `:23-31` | query **sem filtro de tenant** (`:40`) — depende de RLS: `NAO_VERIFICADO (runtime)`. Transição é por botão, não drag-and-drop |
| **Kanban Workflow — indicador de SLA** | 🟨 IMPLEMENTADO_PARCIAL | `KanbanWorkflow.tsx:65-71`, uso `:129,136` | `created_at` real | limiar de 48h/72h é **hardcoded para todos os itens** (`:68-69`), ignora `data_necessidade` e `prioridade`. Não é SLA contratual |
| **Orçamentos — listagem + KPIs + gráficos** | ✅ IMPLEMENTADO_TOTAL | `src/pages/orcamentos/Orcamentos.tsx:36,59-66,162-183,257`; `src/hooks/useBudgetManagement.ts:27` | `SELECT department_budgets`, RPC `get_cost_center_performance_report` (`:45`) | — |
| **Orçamentos — criar orçamento** | ✅ IMPLEMENTADO_TOTAL | `Orcamentos.tsx:41-57,153`; `useBudgetManagement.ts:54,63` | `INSERT department_budgets` | validação silenciosa: `if (...) return;` (`Orcamentos.tsx:43`) sem feedback ao usuário |
| **Orçamentos — excluir orçamento** | 🟨 IMPLEMENTADO_PARCIAL | `Orcamentos.tsx:297`; `useBudgetManagement.ts:111` | `DELETE department_budgets` | **sem diálogo de confirmação** — clique único no ícone de lixeira apaga |
| **Orçamentos — editar orçamento** | 🟦 SUGERIDO_OU_INICIADO | `Orcamentos.tsx:36` (`updateBudget` destructurado); implementação `useBudgetManagement.ts:90` | `UPDATE department_budgets` | `updateBudget` é destructurado na página e **nunca chamado** — não há UI de edição |
| **Orçamentos — mês "Anual" no Select** | 🟨 IMPLEMENTADO_PARCIAL | `Orcamentos.tsx:144` | — | `value={m.value \|\| 'anual'}` grava a string `'anual'`, mas `handleCreate` faz `parseInt('anual', 10)` → `NaN` (`:49`). Escolher "Anual" no dropdown produz `mes: NaN` |

---

## Achados graves

1. **A seleção de fornecedor na cotação não existe no banco.**
   `src/pages/cotacao/Cotacao.tsx:276` liga o ranking a `setFornecedorSelecionado` (um `useState`, `:65`).
   O único código que persistiria — `selectCotacao` em `src/features/cotacoes/hooks/useCotacoes.ts:144`,
   que gravaria `selecionada=true`, `status='aprovada'` e `justificativa_selecao` — **não tem
   nenhum chamador em `src/`** (grep exaustivo retorna só a definição `:144` e o export `:208`).
   Consequência em cadeia: o trigger `trg_cotacao_approved_status`
   (`supabase/migrations/20260317213152_...sql:19-24`), que promoveria a solicitação para
   `em_andamento`, nunca é acionado pelo front. **O coração do módulo de cotação é um mockup.**
   A justificativa que o usuário digita em `src/components/compras/RankingCotacoes.tsx:70` é
   descartada no caminho (`:73` passa 2 argumentos para um setter que aceita 1).

2. **Aprovar não desbloqueia a solicitação.**
   `src/hooks/useApprovalWorkflow.ts:200-256` grava `approval_steps`, `approval_workflows` e
   `approval_history`, mas **não há nenhum `from('solicitacoes').update(`** no arquivo inteiro.
   Uma solicitação aprovada continua com `status='pendente'` na tabela `solicitacoes`, portanto
   continua aparecendo como pendente em Solicitações, Kanban e KPIs.

3. **O Kanban de Acompanhamento é ilusório.**
   `src/pages/acompanhamento/Acompanhamento.tsx:144-146`: `handleStatusChange` tem duas linhas e
   a única delas é `toast.success(...)`. É passado ao board em `:313` e chamado no drop
   (`src/components/compras/KanbanBoard.tsx:147`). O usuário arrasta, recebe confirmação de
   sucesso, e nada muda. É o pior tipo de falso positivo: **confirma uma escrita que não ocorreu.**

4. **KPIs da tela de Aprovações são constantes literais.**
   `src/pages/aprovacoes/aprovacoesData.ts:61-67` — "Pendentes: 3", "Aprovadas: 28",
   "Tempo Médio: 4.2h" renderizados em `Aprovacoes.tsx:74-90` como se fossem métricas.
   Pior: o histórico real **cai em fallback para mock** quando a query volta vazia
   (`Aprovacoes.tsx:139`), então um ambiente sem dados exibe registros de "SOL-2024-150" como reais.

5. **Botões "Desfazer" que não desfazem nada.**
   `src/pages/historico/HistoricoCompras.tsx:214` e `src/pages/historico/HistoricoSourcingTab.tsx:61-66`
   exibem "Ação desfeita com sucesso (Neural Undo)". Não existe pilha de undo, transação ou rollback
   em lugar nenhum do código.

6. **Observações do recebimento são digitadas e jogadas fora.**
   `src/pages/recebimento/ReceivingFormView.tsx:140-145` (por item) e `:156-161` (geral) coletam texto;
   `RecebimentoOffline.tsx:177,179` o guardam num objeto local; os `UPDATE`s em `:187` e `:195`
   gravam **apenas** `quantidade_recebida` e `status`. Um "produto chegou com avaria" nunca chega ao banco.

7. **Divergência de regra entre recebimento online e sync offline.**
   Online: `isComplete` compara com a quantidade pedida (`RecebimentoOffline.tsx:165,193`).
   No sync: `allComplete = entry.items.every(i => i.quantidade_recebida > 0)` (`:240`) — **1 unidade
   de 500 marca o pedido como 'entregue'**, o que ainda dispara o trigger de conclusão/pagamento
   (`supabase/migrations/20260317213152_...sql:71`). Risco financeiro real.

8. **Devolução nasce sem vínculo com o pedido.**
   `src/hooks/useDevolucoes.ts:25` prevê `pedido_id`, mas o formulário
   (`src/pages/devolucoes/DevolucoesModals.tsx:38-46`, `:58-66`) não tem esse campo.
   Toda devolução criada pela UI fica com `pedido_id` nulo — a coluna "Pedido" do detalhe
   (`DevolucoesModals.tsx:251`) sempre mostrará "—".

9. **"Saúde do SLA" da Central de Pedidos é o índice da linha.**
   `src/pages/pedidos/Pedidos.tsx:294,303,305`: `index % 3 === 0 ? "ATENÇÃO" : "NO PRAZO"`,
   barra em 40% ou 85%. Reordenar a tabela muda o "SLA" dos pedidos.

10. **Ordem de Compra é enviada ao fornecedor com número "A DEFINIR".**
    `src/pages/gerar-ordem/GerarOrdem.tsx:123` fixa `ordemNumero = "A DEFINIR"`; esse valor entra no
    WhatsApp (`gerarOrdemHelpers.ts:38`), no e-mail (`:71`) e no PDF (`GerarOrdem.tsx:219`).
    O número real só é gerado no insert (`usePedidos.ts:138`), depois do envio.

11. **Fallback silencioso de fornecedor na Gerar Ordem.**
    `GerarOrdem.tsx:112`: sem cotação selecionada, usa `fornecedoresData[0]` — o primeiro fornecedor
    ativo retornado pelo banco. Combinado com o achado #1 (nada nunca fica `selecionada=true`),
    esse é o **caminho padrão**, não a exceção. A OC pode ser emitida contra o fornecedor errado.

12. **Três telas consultam sem filtro de tenant.**
    `Acompanhamento.tsx:83,92,101`, `RecebimentoOffline.tsx:78` e `KanbanWorkflow.tsx:40` fazem
    `select` sem `.eq('organization_id'/'tenant_id', ...)`, ao contrário dos hooks de features
    (`usePedidos.ts:86`, `useSolicitacoes.ts:72`). Dependem 100% de RLS. Eficácia:
    `NAO_VERIFICADO (runtime)`.

13. **A suíte de testes valida os mocks.**
    `src/pages/aprovacoes/__tests__/aprovacoesData.test.ts:30-32` afirma "has 4 items",
    `:56` "pendentes é inteiro não-negativo", `:130` "percentuais somam 100". São 210 linhas
    testando que dados fictícios continuam fictícios. Nenhum teste do escopo cobre persistência.

---

## Dados fictícios encontrados

| Local | O que é fingido |
|---|---|
| `src/pages/cotacao/cotacaoHelpers.ts:150,152,153,160,161,164` | `Math.random()` gera disponibilidade, preço unitário (20–35), frete, estoque, prazo e condição de pagamento das "cotações da API" |
| `src/pages/cotacao/cotacaoHelpers.ts:139-144` | consulta real a `produto_fornecedores` cujo resultado é descartado (bloco só com comentários) |
| `src/pages/cotacao/Cotacao.tsx:84-85` | "**15%** savings vs. market average", "Gold-level compliance", "zero delivery delays in the last 6 months" — literais na análise de IA |
| `src/pages/aprovacoes/aprovacoesData.ts:54-59` | `approvalHistory`: SOL-2024-150/148/145/142, datas de dez/2024 |
| `src/pages/aprovacoes/aprovacoesData.ts:61-67` | `approvalStats`: 3 / 28 / 2 / "4.2h" / 1 — os 5 cards do topo |
| `src/pages/aprovacoes/aprovacoesData.ts:69-76` | `approvalTrendData`: Jul–Dez inventados |
| `src/pages/aprovacoes/aprovacoesData.ts:78-91` | `approvalByValueRange`, `approvalByApprover` ("Carlos Diretor", "Ana Coordenadora") |
| `src/pages/aprovacoes/aprovacoesData.ts:93-105` | `bottleneckData`, `statusDistribution` |
| `src/pages/aprovacoes/aprovacoesData.ts:107-113` | `weeklyTrend` Seg–Sex |
| `src/pages/pedidos/Pedidos.tsx:155` | badge "4 Novas Movimentações" |
| `src/pages/pedidos/Pedidos.tsx:294,297,303,305` | SLA por `index % 3` |
| `src/pages/pedidos/PedidoDetailsDialog.tsx:420` | "Inicializando vetores de log de auditoria histórica..." |
| `src/pages/acompanhamento/AcompanhamentoHelpers.ts:119` | data da etapa concluída fixa em `'15/12/2025'` |
| `src/pages/acompanhamento/AcompanhamentoHelpers.ts:133-137` | "Cotações solicitadas a 3 fornecedores", "1-3 dias", documentos com `url: '#'` |
| `src/pages/gerar-ordem/GerarOrdem.tsx:53,123,126` | frete inicial `150`, `ordemNumero = "A DEFINIR"`, valor unitário fallback `12` |
| `src/pages/gerar-ordem/gerarOrdemHelpers.ts:42,48,80,87,92` | "À vista via PIX" fixo, `\|\| 12` no valor unitário, "[Endereço da empresa]" |
| `src/pages/historico/HistoricoSourcingTab.tsx:285,286,290,291` | "Melhor Histórico" = `preço*0.88`, fornecedor "Distribuidora Global", "+4.2% Acima do Target" |
| `src/pages/historico/HistoricoSourcingTab.tsx:314,320,323` | "Target Price AI" = `*0.92`, "Economia Potencial" = `*0.08`, "8% ROI" |
| `src/pages/historico/HistoricoProdutosTab.tsx:86` | "Benchmark IA" = `avgPrice * 0.95` |
| `src/pages/historico/HistoricoCompras.tsx:355` | "Previsões neurais de demanda futura em desenvolvimento..." |
| `src/hooks/usePurchaseHistory.ts:352` | `avgDeliveryDays: 0, // Would need tracking data` — métrica sempre zero |
| `src/components/compras/BulkPlanningConsole.tsx:23-58` | `mockPlanningData` completo (categorias, preços, riscos) exibido em `/solicitacoes` |
| `src/components/compras/BulkPlanningConsole.tsx:64` | `freightAnalysis` com custos e % de otimização fixos |
| `src/components/compras/SupplierInteractionLog.tsx:16-37` | 3 mensagens de "IA Follow-up Agent" fixas, exibidas em todo detalhe de pedido |
| `src/components/compras/AISupplierSuggestion.tsx:33,42-43` | "Aluminum Mug", "12 qualified suppliers", "AluTech Indústria 98% Match" |
| `src/components/compras/BuscaAutomatica.tsx:18-23` | "XBZ Brindes — 10.172 produtos" e 3 outros, contagens literais |
| `src/components/compras/NeuralFollowUpMonitor.tsx:18-32` | pipeline de IA simulado com `setTimeout` |
| `src/components/compras/IAAdvisor.tsx:33-36` | recomendação por template string, botões inertes |

---

## Limites desta auditoria

- **Sem acesso ao banco.** Não posso afirmar que qualquer tabela contém linhas, que as RPCs
  (`get_pedidos_kpis`, `get_solicitacoes_kpis`, `check_budget_availability`,
  `generate_sequential_number`, `get_cost_center_performance_report`) existem no projeto remoto,
  nem que os triggers de `supabase/migrations/20260317213152_...sql` estão instalados. Tudo isso é
  `NAO_VERIFICADO (runtime)`.
- **Sem execução.** Não rodei build, testes nem navegador. Erros de runtime, falhas de RLS e
  regressões de tipos não seriam detectados por leitura.
- **Escopo lateral.** Componentes em `src/components/compras/` e hooks em `src/hooks/` foram lidos
  **apenas** no que a tela auditada consome. Um componente pode ter caminhos que não inspecionei.
- **Declaração ⬛ MORTO.** Os 3 casos foram confirmados por grep do símbolo em todo `src/`
  (`selectCotacao`, `gerarEtapasEnhanced`, `handleDrilldown`), incluindo busca por imports
  dinâmicos. Ainda assim, um consumidor via string dinâmica escaparia dessa checagem.

---

## ARQUIVOS LIDOS

src/pages/solicitacoes/Solicitacoes.tsx
src/pages/solicitacoes/solicitacoesHelpers.ts
src/pages/solicitacoes/__tests__/solicitacoesHelpers.test.ts
src/pages/cotacao/Cotacao.tsx
src/pages/cotacao/cotacaoHelpers.ts
src/pages/cotacao/__tests__/cotacaoHelpers.test.ts
src/pages/aprovacoes/Aprovacoes.tsx
src/pages/aprovacoes/aprovacoesData.ts
src/pages/aprovacoes/__tests__/aprovacoesData.test.ts
src/pages/pedidos/Pedidos.tsx
src/pages/pedidos/PedidosKPIs.tsx
src/pages/pedidos/PedidoDetailsDialog.tsx
src/pages/acompanhamento/Acompanhamento.tsx
src/pages/acompanhamento/AcompanhamentoHelpers.ts
src/pages/acompanhamento/__tests__/AcompanhamentoHelpers.test.ts
src/pages/gerar-ordem/GerarOrdem.tsx
src/pages/gerar-ordem/gerarOrdemHelpers.ts
src/pages/gerar-ordem/__tests__/gerarOrdemHelpers.test.ts
src/pages/recebimento/RecebimentoOffline.tsx
src/pages/recebimento/ReceivingFormView.tsx
src/pages/recebimento/recebimentoHelpers.ts
src/pages/recebimento/__tests__/recebimentoHelpers.test.ts
src/pages/devolucoes/Devolucoes.tsx
src/pages/devolucoes/DevolucoesModals.tsx
src/pages/devolucoes/devolucoesData.ts
src/pages/devolucoes/__tests__/devolucoesData.test.ts
src/pages/devolucoes/__tests__/devolucoesModals.test.ts
src/pages/historico/HistoricoCompras.tsx
src/pages/historico/HistoricoDrilldownModal.tsx
src/pages/historico/HistoricoFornecedoresTab.tsx
src/pages/historico/HistoricoHelpers.tsx
src/pages/historico/HistoricoProdutosTab.tsx
src/pages/historico/HistoricoRegistrosTab.tsx
src/pages/historico/HistoricoSourcingTab.tsx
src/pages/historico/__tests__/historicoColors.test.ts
src/pages/historico/__tests__/historicoHelpers.test.ts
src/pages/kanban/KanbanWorkflow.tsx
src/pages/orcamentos/Orcamentos.tsx

### Arquivos fora do escopo lidos como camada de dados (parcial ou integralmente)

src/features/solicitacoes/hooks/useSolicitacoes.ts
src/features/cotacoes/hooks/useCotacoes.ts
src/features/pedidos/hooks/usePedidos.ts
src/hooks/useApprovalWorkflow.ts
src/hooks/useDevolucoes.ts
src/hooks/usePurchaseHistory.ts
src/hooks/useBudgetManagement.ts (parcial — grep de camada de dados)
src/components/compras/IAAdvisor.tsx
src/components/compras/AISupplierSuggestion.tsx
src/components/compras/BulkPlanningConsole.tsx (parcial)
src/components/compras/BuscaAutomatica.tsx (parcial)
src/components/compras/NeuralFollowUpMonitor.tsx (parcial)
src/components/compras/SupplierInteractionLog.tsx (parcial)
src/components/compras/StrategicQuoteTable.tsx (parcial)
src/components/compras/RankingCotacoes.tsx (parcial)
src/components/compras/ProductionRoutingEngine.tsx (parcial)
src/components/compras/PendingApprovalsList.tsx (parcial)
src/components/compras/SolicitacaoKanban.tsx (parcial — grep)
src/components/compras/KanbanBoard.tsx (parcial — grep)
src/components/compras/EnhancedBulkActionsBar.tsx (parcial — grep)
src/components/compras/NovaSolicitacaoModal.tsx (parcial — grep)
src/routes/AppRoutes.tsx (parcial — rotas do escopo)
src/lib/routePrefetch.ts (parcial)
supabase/migrations/20260317213152_359c9d54-2f8b-4d82-a969-f8075e3fbd29.sql
