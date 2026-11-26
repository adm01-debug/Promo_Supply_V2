# L03 — Páginas de Catálogo, IA e Relatórios

> Auditoria por leitura de código (Read) de **todos** os 50 arquivos dos 18 diretórios do escopo.
> Nenhuma afirmação nesta página vem de README, DOCS ou comentário. Tráfego real de rede/banco:
> `NAO_VERIFICADO (runtime)` — não há acesso a banco nem a APIs externas nesta auditoria.
> Data da medição: 2026-08-16. Commit: working tree de `/home/user/promo-supply-v2`.

## Resumo

| Classificação | Qtde | Denominador |
|---|---|---|
| ✅ IMPLEMENTADO_TOTAL | 24 | 56 |
| 🟨 IMPLEMENTADO_PARCIAL | 21 | 56 |
| 🟦 SUGERIDO_OU_INICIADO | 9 | 56 |
| ⬛ MORTO_OU_ABANDONADO | 2 | 56 |

Observações de calibragem:
- 18/18 páginas do escopo estão **roteadas** (`src/routes/AppRoutes.tsx:90-143`). Nenhuma página inteira é morta.
- O que é morto/parcial está no **nível de funcionalidade** dentro das páginas (abas sem conteúdo, botões sem handler, números constantes).
- 5 erros de TypeScript (de 8 no projeto inteiro) estão dentro deste lote, todos em `useRelatorioNegociacoes.ts` — ver Achados graves.

## Integrações externas

| Integração | Classificação | Edge function / endpoint invocado | Evidência (arquivo:linha) | Real ou mock? |
|---|---|---|---|---|
| **XBZ (portal MinhaXBZ)** | ✅ IMPLEMENTADO_TOTAL | `functions.invoke('xbz-proxy')` → `https://api.minhaxbz.com.br:5001` | `src/hooks/useXbzIntegration.ts:178`; edge `supabase/functions/xbz-proxy/index.ts:1-60`; host em `supabase/functions/_shared/xbz_client.ts:18` | **Real no código** (proxy servidor→XBZ com credencial cifrada). Tráfego: `NAO_VERIFICADO (runtime)` |
| **XBZ — espelho local (fallback stale)** | ✅ IMPLEMENTADO_TOTAL | tabela `xbz_produtos` via `readCatalogoCacheWithMeta`/`mirrorCatalogo` | `supabase/functions/_shared/xbz_catalog_cache.ts:110,133`; consumo do flag `stale` em `src/hooks/useXbzIntegration.ts:341,522`; UI em `src/pages/catalogo-xbz/XbzCatalogoTab.tsx:79-106` | Real (tabela Supabase). `NAO_VERIFICADO (runtime)` |
| **SPOT / Stricker — portal (scraping)** | ✅ IMPLEMENTADO_TOTAL | `functions.invoke('spot-proxy')` → `https://www.spotgifts.com.br` | `src/hooks/useSpotIntegration.ts:51`; edge `supabase/functions/spot-proxy/index.ts:10,148,166,237` | **Real no código**. `NAO_VERIFICADO (runtime)` |
| **SPOT — API oficial (catálogo/preço/estoque)** | 🟨 IMPLEMENTADO_PARCIAL | Front **não** invoca `spot-api`. Lê só as tabelas `spot_produtos`, `spot_skus`, `spot_estoque`, `spot_api_sync_log` | `src/pages/catalogo-spot/useSpotCatalog.ts:63,96,112,127`; edge existente `supabase/functions/spot-api/index.ts:34,134,180,261` (`https://ws.spotgifts.com.br/api/v1SSL`) | Real, mas **fio quebrado no front**: nenhuma tela dispara a sincronização; só existe leitura de cache. Se o job agendado não rodar, a tela fica vazia (`SpotCatalogTab.tsx:136-141`). `NAO_VERIFICADO (runtime)` |
| **IA — Negociação (`negociacao-ia`)** | ✅ IMPLEMENTADO_TOTAL | `functions.invoke("ai-negotiation")` → AI Gateway, `model: "google/gemini-3-flash-preview"` | `src/pages/negociacao-ia/NegociacaoIA.tsx:92`; edge `supabase/functions/ai-negotiation/index.ts:53,68,70` (usa `LOVABLE_API_KEY` + `callAIGateway`) | **Provedor real**. Persiste em `negotiation_analyses` (`NegociacaoIA.tsx:101`). `NAO_VERIFICADO (runtime)` |
| **IA — IDP de nota fiscal (PDF)** | 🟨 IMPLEMENTADO_PARCIAL (**dado fabricado**) | `functions.invoke('process-invoice-idp')` — a edge function **não chama nenhum provedor**; devolve objeto fixo com `Math.random()` | `src/pages/documentos/DocumentosFiscais.tsx:135`; edge `supabase/functions/process-invoice-idp/index.ts:53-70` (`"simulando extração IA"`, `mockExtractedData`, `numero_nf: PDF-${Math.floor(Math.random()*100000)}`, `valor_total: 1250.50`, chave de acesso com 44 zeros) | **MOCK no backend**. O front insere esse dado em `fiscal_documents` com `status: "validada"` (`DocumentosFiscais.tsx:142-155`). Ver Achados graves. |
| **IA — Sugestão de fornecedor / Risco (na tela `/fornecedores`)** | ✅ IMPLEMENTADO_TOTAL (edge real) | `ai-supplier-suggestion` (`google/gemini-2.0-flash`), `ai-supplier-risk` (`google/gemini-2.5-flash`) | Montagem na página: `src/pages/fornecedores/Fornecedores.tsx:131,199`; edges `supabase/functions/ai-supplier-suggestion/index.ts:38,87` e `ai-supplier-risk/index.ts:46,90` | Provedor real via `callAIGatewayWithFallback`. Os componentes `AISupplierSuggestion`/`SupplierRiskAnalysis` estão fora do meu escopo de leitura (`src/components/compras/`) — só verifiquei a montagem e a edge. `NAO_VERIFICADO (runtime)` |
| **IA — "Sentimento de Mercado" (negociacao-ia)** | 🟦 SUGERIDO_OU_INICIADO | nenhum | `src/pages/negociacao-ia/NegociacaoIA.tsx:489-520` | **Fabricado no front**: "Dólar (USD) R$ 5,24 -0.2%", "Energia / Frete Estável +1.5%" e o texto de "Insight de Timing" são literais no JSX. Nenhuma chamada de cotação. |
| **IA — "Análise de IA" em RFxDetails** | 🟦 SUGERIDO_OU_INICIADO | nenhum | `src/pages/sourcing/RFxDetails.tsx:294-305` | **Template de string local**: monta `Identificamos que o fornecedor X possui a melhor oferta…` com `reduce`/`toFixed`. Rotulado como "Análise de IA" mas não invoca nada. |
| **Realtime de leilão (Supabase Realtime)** | ✅ IMPLEMENTADO_TOTAL | `supabase.channel('licitacao-bids-<id>')` | `src/pages/sourcing/AuctionRoom.tsx:39`; `src/hooks/useLicitacoes.ts:331-343` | Canal real do Supabase. `NAO_VERIFICADO (runtime)` |

## Tabela de evidências

### `src/pages/catalogo-xbz/` — Catálogo XBZ

| Funcionalidade | Classificação | Evidência (arquivo:linha) | Camada de dados | O que falta |
|---|---|---|---|---|
| Status de credencial + badge Conectado | ✅ | UI `CatalogoXbz.tsx:57-59`; lógica `CatalogoXbz.tsx:23-30`; rede `useXbzIntegration.ts:453` → `run('credentialsStatus')` → `functions.invoke('xbz-proxy')` `:178` | edge `xbz-proxy` action `credentialsStatus` | — |
| Testar conexão + dashboard XBZ | ✅ | UI `CatalogoXbz.tsx:60-63,92-107`; handler `:37-44`; `useXbzIntegration.ts:469,475` (`testConnection`, `dashboard`) | edge `xbz-proxy` actions `testConnection`/`dashboard` | — |
| Salvar credenciais XBZ (cifradas) | ✅ | UI `XbzCredenciaisDialog.tsx:100-107`; handler `:32-39`; `useXbzIntegration.ts:462` action `saveCredentials`; cifra em `supabase/functions/_shared/xbz_crypto.ts` (importada em `xbz-proxy/index.ts:26`) | edge `xbz-proxy` + tabela de credenciais | — |
| Busca de produtos no catálogo XBZ | ✅ | UI `XbzCatalogoTab.tsx:66-77,117-167`; handler `:29-35`; `useXbzIntegration.ts:513-528` action `catalogo` | edge `xbz-proxy` → XBZ `consultaEstoque`; fallback `xbz_produtos` | — |
| Aviso "Dados em cache" (XBZ fora do ar) | ✅ | UI `XbzCatalogoTab.tsx:79-106`; flag `stale`/`syncedAt` `useXbzIntegration.ts:522-523`; origem `xbz_catalog_cache.ts:133` | tabela `xbz_produtos` | — |
| Adicionar item ao carrinho XBZ | ✅ | UI `XbzCatalogoTab.tsx:152-160`; handler `:47-53`; `useXbzIntegration.ts:545-552` action `itemLancar` | edge `xbz-proxy` (WRITE_ACTIONS, `xbz-proxy/index.ts:55`) + auditoria `xbz_carrinho_log` (`xbz-proxy/index.ts:9`) | — |
| Listar/remover itens do carrinho | ✅ | UI `XbzCarrinhoTab.tsx:82-114,100-108`; `useXbzIntegration.ts:542,543,559-566` (`carrinhoResumo`, `carrinhoListar`, `itemRemover`) | edge `xbz-proxy` | — |
| Gerar pedidos reais na XBZ (+ cooldown 30s) | ✅ | UI `XbzCarrinhoTab.tsx:127-152`; handler `:42-49`; `useXbzIntegration.ts:579-586` action `gerarPedidos` (ORDER_ACTIONS `xbz-proxy/index.ts:58`) | edge `xbz-proxy` | — |
| Listagem/filtros de pedidos XBZ | ✅ | UI `XbzPedidosTab.tsx:54-123`; `useXbzIntegration.ts:488-495` action `pedidos`; mapeamentos `xbzHelpers.ts:65-114` | edge `xbz-proxy` | — |
| Gating por permissão do portal (preço/carrinho/pedido) | ✅ | `CatalogoXbz.tsx:31-34` lendo `status.permissions`; contrato `xbzHelpers.ts:9-20`; propagação `:117-129` | edge devolve `permissions` (`useXbzIntegration.ts:82`) | — |
| Retry/backoff + coalescing + cache TTL de ações idempotentes | ✅ | `useXbzIntegration.ts:17-30,235-348` | memória do cliente | — |
| Painel de eficiência de rede XBZ (métricas + tendência) | ✅ | UI `XbzNetworkPanel.tsx:73-144`; cálculo `xbzNetworkHealth.ts:32-73` e `xbzNetworkTrend.ts:50-109`; contadores `useXbzIntegration.ts:255-274`; testes `__tests__/xbzNetworkHealth.test.ts`, `__tests__/xbzNetworkTrend.test.ts` | memória do cliente (por sessão) | Métrica é **de sessão**, não persistida: reinicia a cada reload. Não é falha, é limitação declarada (`XbzNetworkPanel.tsx:81`). |
| `cancelarPedido`, `getFiscal`, `getCores`, `getVendedor`, `getPessoaToken`, `getEntregaTipos`, `getPagamentoTipos`, `alterarQuantidade`, `buscarProdutos`, `login` | ⬛ | Definidos e exportados em `useXbzIntegration.ts:473,477,482,497,531,536,554,568,573,600` | edge `xbz-proxy` (ações existem: `xbz-proxy/index.ts:47-56`) | **Nenhum consumidor**: grep por `cancelarPedido|getFiscal|getCores|getVendedor|getPessoaToken|getEntregaTipos|getPagamentoTipos|alterarQuantidade` em `src/` só retorna a própria definição no hook. As tabelas estáticas `XBZ_ENTREGA_TIPOS`/`XBZ_PAGAMENTO_TIPOS` (`xbzHelpers.ts:89,96`) também não têm importador. |

### `src/pages/catalogo-spot/` — Catálogo SPOT / Stricker

| Funcionalidade | Classificação | Evidência (arquivo:linha) | Camada de dados | O que falta |
|---|---|---|---|---|
| Conectar/reconectar SPOT | ✅ | UI `CatalogoSpot.tsx:96-108`; handler `:79-82`; `useSpotIntegration.ts:172-178` action `login` | edge `spot-proxy` | — |
| Catálogo SPOT (busca, coleção, categoria) | 🟨 | UI `SpotCatalogTab.tsx:64-222`; queries `useSpotCatalog.ts:57-119` sobre `spot_produtos`/`spot_skus`/`spot_estoque` | Supabase (leitura direta de tabela) | Depende inteiramente de sincronização externa que **nenhuma tela dispara**. Sem job, a tela mostra "Nenhum produto no cache" (`SpotCatalogTab.tsx:139`). Página fixa em 60 itens (`useSpotCatalog.ts:48,66`) — não há paginação. |
| Painel de frescor de cache + quota SPOT | 🟨 | UI `SpotSyncPanel.tsx:73-131`; dados `useSpotCatalog.ts:121-135` (`spot_api_sync_log`); frescor `:150-154` | Supabase `spot_api_sync_log` | Limites diários (22/96) e janelas de frescor são **constantes literais** (`SpotSyncPanel.tsx:15-20`), não vêm do backend; o botão só faz `refetch()` do log, não força sincronização. |
| Carrinho SPOT (ver/adicionar/remover) | ✅ | UI `CatalogoSpot.tsx:144-224`; handlers `:64-77`; `useSpotIntegration.ts:118-144` (`addToCart`, `getCart`, `removeFromCart`) | edge `spot-proxy` | — |
| **Finalizar pedido SPOT (checkout)** | 🟦 | `CatalogoSpot.tsx:216` — `onClick={() => toast.info('Checkout SPOT — Em desenvolvimento')}` | nenhuma | Botão existe e não faz nada. Existe `getCheckoutInfo` no hook (`useSpotIntegration.ts:166-170`) **sem nenhum consumidor** (grep em `src/`). |
| Pedidos SPOT por ano | ✅ | UI `CatalogoSpot.tsx:227-324`; handler `:54-57`; `useSpotIntegration.ts:152-157` action `orders` | edge `spot-proxy` | Lista de anos é literal `[2026, 2025, 2024]` (`CatalogoSpot.tsx:245`). |
| Documentos financeiros SPOT | ✅ | UI `SpotFinancialTab.tsx:15-98`; handler `CatalogoSpot.tsx:59-62`; `useSpotIntegration.ts:159-164` action `financial` | edge `spot-proxy` | — |
| Bloqueio de URL externa (anti-open-redirect) | ✅ | `spotHelpers.ts:52-63`; testes `__tests__/spotHelpers.test.ts:98-148` | — | — |
| `searchProducts`, `browseCatalog`, `getProduct`, `checkStock`, `updateCartQuantity`, `getCheckoutInfo` | ⬛ | `useSpotIntegration.ts:86,93,100,107,146,166` | edge `spot-proxy` | Sem consumidor no `src/` — o catálogo migrou para cache local (`SpotCatalogTab`), deixando as ações de scraping órfãs. `extractSpotProductId` (`spotHelpers.ts:65`) idem (só o teste o importa). |
| `MainLayout` importado e não usado | 🟦 | `CatalogoSpot.tsx:2` (import) vs. `:85-86` (retorno começa em `<div>`) | — | Import morto; a página confia no layout da rota. |

### `src/pages/catalogo-produtos/` — Catálogo de Produtos (interno)

| Funcionalidade | Classificação | Evidência (arquivo:linha) | Camada de dados | O que falta |
|---|---|---|---|---|
| Listagem/busca/filtro de produtos, grid+lista | ✅ | UI `CatalogoProdutos.tsx:199-352`; dados `useProdutos()` `:49` | Supabase (via `src/hooks/useProdutos`) | — |
| Criar/editar produto | ✅ | UI `:354-483`; handler `:126-134` (`createProduto.mutate` / `updateProduto.mutate`) | Supabase | — |
| Upload de imagem do produto (compressão + Storage) | ✅ | UI `:393-400`; handler `:65-92`; `supabase.storage.from('product-images').upload` `:75-77` e `getPublicUrl` `:81-83` | Supabase Storage bucket `product-images` | `Math.random()` em `:71` é só geração de nome de arquivo — **não** é dado fictício. |
| Vincular fornecedores ao produto | ✅ | `:362-365` monta `<ProductSupplierManager produtoId=… />` (componente fora do escopo) | — | Só verifiquei a montagem. |
| KPI "Preço médio" | 🟨 | `:105-112` | derivado de `produtos` | Fórmula frágil: `reduce(...)/filter(...).length || 0` sem parênteses — se nenhum produto tiver `preco_medio > 0`, divide por 0 → `NaN`, e o `|| 0` só protege por precedência acidental. Não há teste. |

### `src/pages/sourcing/` — Strategic Sourcing (RFx)

| Funcionalidade | Classificação | Evidência (arquivo:linha) | Camada de dados | O que falta |
|---|---|---|---|---|
| Lista de eventos de sourcing | ✅ | UI `Sourcing.tsx:127-179`; dados `useSourcingEvents()` `:24` → `src/hooks/useLicitacoes.ts:189-190` (`from('sourcing_events')`) | Supabase `sourcing_events` | — |
| **KPIs do topo de Sourcing** | 🟦 | `Sourcing.tsx:72` (`12`), `:81` (`4`), `:90` (`28`), `:99` (`R$ 142k`) | **nenhuma** | Quatro números **literais no JSX**. Não derivam de `events`. |
| Busca e filtros em Sourcing | 🟦 | `Sourcing.tsx:109` (`<Input>` sem `value`/`onChange`), `:112-115` (botão "Filtros" sem `onClick`) | nenhuma | Campo e botão totalmente inertes. |
| Abas RFPs / RFQs / Leilões | 🟦 | `Sourcing.tsx:122-124` declaram os `TabsTrigger`; só existe `TabsContent value="all"` (`:127`) | — | Clicar nas 3 abas deixa a área em branco. `activeTab` é setado (`:25,119`) e **nunca lido** em lugar nenhum do arquivo. |
| Botão "Novo Evento" do empty state | 🟦 | `Sourcing.tsx:173-176` — sem `onClick` (o do header, `:58`, funciona) | — | Handler ausente. |
| Wizard de criação RFx (4 passos) | ✅ | UI `RFxCreate.tsx:189-498`; handler `:120-187`; `createEvent.mutateAsync` → `useLicitacoes.ts:206` (`insert` em `sourcing_events`) | Supabase `sourcing_events` | — |
| Persistência de lotes / critérios / convites | ✅ | `RFxCreate.tsx:143-179` — `insert` em `sourcing_event_lots`, `sourcing_event_criteria`, `sourcing_invitations` (com `token: crypto.randomUUID()`) | Supabase (3 tabelas) | — |
| Busca de fornecedores no passo 4 | 🟦 | `RFxCreate.tsx:436` — `<Input placeholder="Buscar fornecedores na base..." />` sem `value`/`onChange` | — | Campo inerte; a lista `:439-462` não é filtrada por texto. |
| Promessa "E-mail automático será enviado no lançamento" | 🟦 | `RFxCreate.tsx:467` (badge) vs. `handleCreate` `:120-187` — nenhum `functions.invoke`, nenhum insert em fila de e-mail | — | Só grava `sourcing_invitations`; nada dispara envio no fluxo desta página. Não localizei disparo aqui. |
| Validação de soma de pesos = 100% | 🟨 | `RFxCreate.tsx:355-360` — badge fica `destructive` se ≠ 100 | — | É apenas visual: `handleCreate` (`:120-138`) **não bloqueia** o lançamento com pesos inválidos. |
| Detalhe do RFx (visão geral, lotes, respostas, engajamento) | ✅ | UI `RFxDetails.tsx:116-250`; dados `useSourcingEventDetails` `:27` → `useLicitacoes.ts:227-259` (`sourcing_events` + lots/questions/criteria/invitations/responses) | Supabase (6 tabelas) | — |
| Aba "Histórico" do RFx | 🟦 | `RFxDetails.tsx:113` declara o `TabsTrigger`; não existe `TabsContent value="history"` no arquivo | — | Aba em branco. |
| Card "Ações" do RFx (Gerenciar Convites / Chat / Cancelar Evento) | 🟦 | `RFxDetails.tsx:255,259,263` — os três `<Button>` sem `onClick` | — | Nenhum handler. "Cancelar Evento" não cancela nada. |
| "Gerar Tabela Comparativa Automática" e "Cobrar Fornecedores (WhatsApp)" | 🟦 | `RFxDetails.tsx:307,310` — sem `onClick` | — | Nenhum handler. |
| Sala de leilão: cronômetro, melhor lance, curva, ranking | ✅ | UI `AuctionRoom.tsx:110-243`; dados `useLicitacaoLances` `:35` → `useLicitacoes.ts:298-299` (`licitacao_lances`); realtime `:39` → `useLicitacoes.ts:331-343` | Supabase `licitacao_lances` + Realtime | — |
| Aviso "Anti-Sniping Ativo" | 🟦 | `AuctionRoom.tsx:231-241` — card estático prometendo extensão automática de 1 min | — | Não localizei nenhuma lógica de extensão nesta página nem em `useLicitacoes.ts` (nenhum update de `closes_at` disparado por lance). Texto sem implementação verificável no front. |

### `src/pages/buyer/` — Desempenho de Comprador

| Funcionalidade | Classificação | Evidência (arquivo:linha) | Camada de dados | O que falta |
|---|---|---|---|---|
| Dashboard individual de comprador (KPIs, radar, categorias, fornecedores) | ✅ | UI `BuyerPerformanceDashboard.tsx:236-502`; dados `useBuyerPerformanceData(periodMonths)` `:51` → `src/hooks/useBuyerPerformanceData.ts:51,67,84,100,116,131` (`profiles`, `cotacoes`, `solicitacoes`, `pedidos`, `fornecedores`, `categorias`) | Supabase (6 tabelas) | — |
| Modo comparação entre 2 compradores | ✅ | UI `BuyerComparisonView.tsx:75-150`; ativação `BuyerPerformanceDashboard.tsx:160-166,231-232` | mesma origem | — |
| Metas por comprador + semáforo | ✅ | `BuyerPerformanceDashboard.tsx:95-111`; classificação `buyerDashboardHelpers.tsx:11-22`; store `useBuyerAlertsStore` `:48`; testes `__tests__/buyerDashboardHelpers.test.ts:66-120` | store local (zustand) | Metas default são literais (`:95`) — aceitável como fallback, mas a persistência das metas está no store, não verifiquei se ele grava no banco (fora do escopo). |
| Exportar CSV de performance | ✅ | UI `:209-212`; implementação `buyerDashboardHelpers.tsx:54-81` (Blob + `URL.createObjectURL` + `a.click()`) | — | — |
| `comparisonRadarData` / `comparisonHistorico` do arquivo pai | ⬛ | Calculados em `BuyerPerformanceDashboard.tsx:114-125` e **nunca usados** — o modo comparação delega tudo a `BuyerComparisonView`, que recalcula os mesmos dados em `BuyerComparisonView.tsx:62-73` | — | Código duplicado e morto no componente pai. |

### `src/pages/portal-fornecedor/` — Portal do Fornecedor

| Funcionalidade | Classificação | Evidência (arquivo:linha) | Camada de dados | O que falta |
|---|---|---|---|---|
| Seletor/busca de fornecedor | ✅ | UI `PortalFornecedor.tsx:80-124`; query `:35-47` (`fornecedores`) | Supabase `fornecedores` | — |
| KPIs (pedidos abertos, cotações, volume, OTIF) | ✅ | `PortalFornecedor.tsx:52-61,151-188`; dados `portalFornecedorData.ts:39-69` | Supabase `pedidos`, `cotacoes` | OTIF calculado só sobre pedidos com `data_entrega` **e** `data_previsao` (`:56-58`) — sem esses campos preenchidos, exibe 0%. |
| Card de qualificação (scores) | ✅ | UI `:191-223`; query `portalFornecedorData.ts:86-99` (`supplier_qualification_scores`) | Supabase | — |
| Abas Pedidos / Cotações / Contratos | ✅ | UI `:242-370`; queries `portalFornecedorData.ts:39,55,71` (`pedidos`, `cotacoes`, `contracts`) | Supabase (3 tabelas) | — |
| **Aba "Sourcing (RFx)"** | 🟦 | `PortalFornecedor.tsx:372-381` — texto descritivo + `<Button ... disabled>Ver via Magic Link</Button>` | nenhuma | Aba puramente decorativa; botão desabilitado por código. |
| `MainLayout` importado e não usado | 🟦 | `PortalFornecedor.tsx:9` vs. retorno em `:71-73` e `:130-132` | — | Import morto. |

### `src/pages/fornecedores/` — Rede de Parceiros e Intelligence Hub

| Funcionalidade | Classificação | Evidência (arquivo:linha) | Camada de dados | O que falta |
|---|---|---|---|---|
| Lista/busca/filtro de fornecedores | ✅ | UI `Fornecedores.tsx:161-273`; dados `useFornecedores({search})` `:48`; adaptação `fornecedorHelpers.ts:28-45` + testes `__tests__/fornecedorHelpers.test.ts` | Supabase (via `src/hooks/useFornecedores`) | — |
| KPIs de fornecedores | ✅ | `Fornecedores.tsx:139-158`; `useFornecedoresKPIs()` `:49` | Supabase | — |
| Criar/editar fornecedor | ✅ | UI `:277-282`; handler `:73-101` (`createFornecedor`/`updateFornecedor`) | Supabase | — |
| Botão `MoreHorizontal` da linha | 🟦 | `Fornecedores.tsx:262-264` — sem `onClick` | — | Sem handler (a linha inteira já abre o modal em `:226`, então é redundante e inerte). |
| Campos `totalMes` e `ultimaCompra` do adaptador | 🟨 | `fornecedorHelpers.ts:43-44` — hardcoded `0` e `'-'` | — | Constantes fixas. Não são renderizados na tabela atual (`Fornecedores.tsx:207-271`), mas fazem parte do contrato `LegacyFornecedor` e podem enganar consumidores futuros. |
| Intelligence Hub (Scorecard / Risk Map / Ranking / Surveillance) | 🟨 | `SupplierPerformance.tsx:75-89` monta 4 componentes de `@/components/compras/` | — | A página em si é só um contêiner de abas: **zero** query e zero lógica própria. A veracidade dos dados depende de `SupplierScorecard`, `RiskHeatMap`, `SupplierRankingPanel`, `SupplierAlertsPanel` — fora do meu escopo, não auditados. |

### `src/pages/qualificacao/` — Qualificação de Fornecedores

| Funcionalidade | Classificação | Evidência (arquivo:linha) | Camada de dados | O que falta |
|---|---|---|---|---|
| KPIs + lista de scores por fornecedor | ✅ | UI `QualificacaoFornecedores.tsx:94-174`; dados `useSupplierQualification()` `:34` | Supabase (via hook) | — |
| Aprovar/Rejeitar documento | ✅ | UI `:203-218`; `updateDocumentStatus.mutate({docId, status})` `:207,215` | Supabase (mutation do hook) | — |
| Abas Requisitos e Histórico | ✅ | `:230-262`; histórico delega a `QualificationHistoryTimeline` `:261` | Supabase | — |
| `MainLayout` importado e não usado | 🟦 | `:2` vs. retorno em `:68-70` | — | Import morto. |

### `src/pages/licitacoes/` — Licitações

| Funcionalidade | Classificação | Evidência (arquivo:linha) | Camada de dados | O que falta |
|---|---|---|---|---|
| Lista, busca, filtro e KPIs de licitações | ✅ | UI `Licitacoes.tsx:93-175`; dados `useLicitacoes()` `:23` → `useLicitacoes.ts:25-26` (`from('licitacoes')`) | Supabase `licitacoes` | — |
| Criar licitação (com numeração sequencial) | ✅ | UI `:177-212`; handler `:53-66`; `useLicitacoes.ts:44` (`rpc('generate_sequential_number')`) + `:49-50` (`insert`) | Supabase RPC + `licitacoes` | — |
| Excluir licitação | ✅ | UI `:166`; `useLicitacoes.ts:87` (`delete`) | Supabase | — |
| Detalhe: transições de status (Publicar/Iniciar/Encerrar/Cancelar) | ✅ | UI `LicitacaoDetailDialog.tsx:111-132`; `onUpdate` → `useLicitacoes.ts:74` (`update`) | Supabase `licitacoes` | — |
| Adicionar proposta + score de preço | ✅ | UI `LicitacaoDetailDialog.tsx:191-226`; handler `:50-64`; `useLicitacaoPropostas` → `useLicitacoes.ts:130-131` (`licitacao_propostas`) | Supabase | Fórmula de `score_preco` (`:56-58`) é heurística local sem teste; fallback `50` quando não há valor estimado. |
| Homologar vencedor | ✅ | UI `:179-181`; `selectWinner` → `useLicitacoes.ts:149-152` (update em `licitacao_propostas` + `licitacoes`) | Supabase | — |
| Sala de leilão reverso ao vivo | 🟨 | UI `Licitacoes.tsx:85-89` monta `ReverseAuctionRoom` | Supabase (componente fora do escopo) | `userFornecedorId={fornecedores[0]?.id}` com comentário literal `// For demo purposes, use first supplier` (`Licitacoes.tsx:88`) — **identidade do licitante é fabricada**: sempre o primeiro fornecedor da lista, não o usuário logado. |
| `MainLayout` importado e não usado | 🟦 | `Licitacoes.tsx:16` vs. retorno em `:70-73` | — | Import morto. |

### `src/pages/negociacao-ia/` — Negociação Inteligente

| Funcionalidade | Classificação | Evidência (arquivo:linha) | Camada de dados | O que falta |
|---|---|---|---|---|
| Seleção de solicitação + carga de cotações | ✅ | UI `NegociacaoIA.tsx:170-181,186-221`; queries `:47-72` (`solicitacoes`, `cotacoes` com join em `fornecedores`) | Supabase | — |
| Análise de negociação por IA | ✅ | UI `:241-265`; mutation `:89-112`; `functions.invoke("ai-negotiation")` `:92`; persistência em `negotiation_analyses` `:101-108` | edge `ai-negotiation` + Supabase | — |
| Histórico "Logs de Inteligência" | ✅ | UI `:532-576`; query `:75-87` (`negotiation_analyses` + join `solicitacoes`) | Supabase | — |
| Comparativo estratégico de propostas | 🟨 | `:225-234` monta `StrategicQuoteTable` | Supabase (dados de `cotacoes`) | **Rating fabricado**: `rating: fornecedor?.avaliacao || 4.2` (`:231`) — fornecedor sem avaliação vira 4.2 silenciosamente. |
| **KPI "Economia Total: R$ 245.2k"** | 🟦 | `:148` — string literal no JSX | **nenhuma** | Constante. Não deriva de `pastAnalyses` nem de nenhuma query. |
| **Card "Sentimento de Mercado"** | 🟦 | `:489-520` — "R$ 5,24 -0.2%", "Estável +1.5%", texto de insight, todos literais | **nenhuma** | Nenhuma fonte de cotação/índice. |
| Botões "WhatsApp" e "E-mail" por fornecedor | 🟦 | `:441` e `:448` — `onClick={() => toast.info('Preparando script…')}` / `toast.info('Gerando e-mail tático…')` | nenhuma | Só exibem toast; nada é gerado nem enviado. |
| Botão "Saber mais" (Otimização Avançada) | 🟦 | `:590-592` — sem `onClick` | — | Inerte. |
| Campo `modelo_ia` gravado | 🟨 | `NegociacaoIA.tsx:106` grava `"gemini-2.5-flash"`; a edge usa `"google/gemini-3-flash-preview"` (`ai-negotiation/index.ts:70`) | Supabase `negotiation_analyses` | **Metadado incorreto**: o registro de auditoria não reflete o modelo realmente usado. |

### `src/pages/relatorio-negociacoes/` — Relatório de Negociações

| Funcionalidade | Classificação | Evidência (arquivo:linha) | Camada de dados | O que falta |
|---|---|---|---|---|
| Histórico mensal / categoria / fornecedor | 🟨 | UI `RelatorioNegociacoes.tsx:207-380`; dados `useRelatorioNegociacoes.ts:52-121` (`cotacoes`, `fornecedores`, `profiles`, `solicitacoes`, `produtos`, `categorias`) | Supabase (6 tabelas — query real) | A **fórmula de economia** está errada: `Number(c.valor_total) - vu * (desconto/100)` (`useRelatorioNegociacoes.ts:140-144`) mistura valor total com valor unitário. O resultado é ≈ o valor total da cotação, não a economia. O KPI "Economia Total" (`RelatorioNegociacoes.tsx:69,141`) exibe, na prática, o volume. |
| **Performance por comprador** | 🟨 | UI `:251-308`; agregação `useRelatorioNegociacoes.ts:174-209` | Supabase `profiles` | **Fio quebrado, confirmado pelo compilador**: `select("id, full_name, display_name, email")` (`:83`) pede a coluna `display_name`, que **não existe** em `profiles` — `tsc` acusa `SelectQueryError<"column 'display_name' does not exist on 'profiles'.">` (erros em `:134,187`). A query falha → `avaliadores = []` → todo comprador vira `"Usuário"` / avatar `"U"` (`:187,193`). |
| Métrica `melhorPreco` do comprador | 🟨 | `useRelatorioNegociacoes.ts:181,201-203` | Supabase `cotacoes` | `c.score_total` é lido mas **não está no `select`** (`:58`) — `tsc` acusa `Property 'score_total' does not exist` (`:181`). O array `precos` fica sempre vazio e a UI cai no fallback derivado da fórmula de economia já quebrada. |
| Drill-down por comprador | 🟨 | UI `:265-267,382-386` monta `BuyerDrilldownModal` | — | Passa `comprador={selectedBuyer as any}` (`:385`) — o cast desliga a checagem de contrato. Componente fora do escopo. |
| Botão "Exportar" | 🟦 | `RelatorioNegociacoes.tsx:127-130` — sem `onClick` | — | Inerte. |
| Rótulo "+X% vs período anterior" | 🟨 | `:143-146` — exibe `mediaPercentual`, que é a média do período **atual** (`:70-73`) | — | Rótulo mente sobre o que o número é; não há cálculo de período anterior. |
| Meta "12%" no KPI Economia Média | 🟦 | `:161` — literal no JSX | nenhuma | Constante hardcoded, sem origem configurável. |
| **`relatorioNegociacoesData.ts` (dados mock)** | ⬛ | Arquivo inteiro `relatorioNegociacoesData.ts:1-74` — cabeçalho literal `// Mock data for RelatorioNegociacoes`, com nomes fictícios ("Ana Silva", "Carlos Souza"…) e valores inventados | nenhuma | **Sem consumidor de produção**: grep por `relatorioNegociacoesData|historicoMensal|comparativoCompradores|economiaPorCategoria|economiaPorFornecedor` em todo o `src/` só retorna o próprio arquivo e `__tests__/relatorioNegociacoesData.test.ts:8`. A página migrou para o hook real (`RelatorioNegociacoes.tsx:44,62`). **25 testes verdes testam dados mock inertes.** |

### `src/pages/relatorios/` — Analytics

| Funcionalidade | Classificação | Evidência (arquivo:linha) | Camada de dados | O que falta |
|---|---|---|---|---|
| Queries base (pedidos, fornecedores, solicitações) | ✅ | `Relatorios.tsx:66-95` (`from("pedidos")`, `from("fornecedores")`, `from("solicitacoes")`) com filtro de período `:64` | Supabase (3 tabelas) | — |
| KPIs (volume, economia, network) | ✅ | cálculo `Relatorios.tsx:102-108`; UI `RelatoriosCharts.tsx:80-107` | derivado das queries | Economia = `valor_estimado − valor_aprovado` de `solicitacoes` (`:105-107`) — depende de esses campos estarem preenchidos. |
| Gráfico "Fluxo de Capital" (volume mensal) | ✅ | dados `Relatorios.tsx:110-118`; UI `RelatoriosCharts.tsx:110-144` | derivado de `pedidos` | — |
| **Gráfico "Otimização (Saving)"** | 🟨 | `Relatorios.tsx:139` — `economiaMensal: []` com comentário `// Logic simplified for brevity`; UI `RelatoriosCharts.tsx:146-163` | nenhuma | O componente recebe `data` e **nunca o usa**: o corpo do gráfico é a frase estática "Análise de Saving consolidada em tempo real" (`:158-160`). Gráfico inexistente com rótulo de tempo real. |
| **Tabela "Top Performance Partners" — coluna SLA Score** | 🟨 | `Relatorios.tsx:130` — `taxaEntrega: relatedPeds.length > 0 ? 95 : 0, // Mock for now`; renderizado em `RelatoriosCharts.tsx:241-245` | nenhuma | **Constante 95%** para todo fornecedor com ≥1 pedido. As demais colunas da tabela (pedidos, volume, rating) são reais. |
| `distribuicaoTipo` sempre vazio | 🟨 | `Relatorios.tsx:140` — `distribuicaoTipo: []` | nenhuma | Nunca preenchido. |
| **`DistributionCharts`** | ⬛ | Definido em `RelatoriosCharts.tsx:165-193`; importado em `Relatorios.tsx:45` e **nunca renderizado** (grep em todo `src/` retorna só essas duas linhas) | nenhuma | Além de não ter chamador, o próprio componente é oco: os dois gráficos são divs com texto "Gráficos Circulares Indisponíveis" (`:176`) e "Inteligência de Status em Processamento" (`:189`). |
| Botão "CSV" (exportar) | 🟦 | `Relatorios.tsx:176` — `onClick={() => {}}` | — | Handler vazio explícito. |
| Botão "ABRIR CHAMADO" e "FULL REPORT" | 🟦 | `Relatorios.tsx:228`; `RelatoriosCharts.tsx:202` — sem `onClick` | — | Inertes. |
| Abas Spend / KPIs / Centros de Custo / Estratégia / IA Forecast | 🟨 | `Relatorios.tsx:235-239` fazem lazy-import de 5 componentes de `@/components/compras/` (`:34-39`) | — | A página só orquestra o lazy-load; a veracidade dos dados está em componentes fora do escopo (`SpendAnalytics`, `AdvancedProcurementKPIs`, `CostCenterPerformanceAnalysis`, `KraljicMatrix`, `DemandPredictionPanel`) — não auditados. |
| Mojibake em rótulos de UI | 🟨 | `Relatorios.tsx:158,170,186,188,190` — `â€¢`, `Ãšltimo MÃªs`, `VISÃƒO GERAL`, `KPIs AVANÃ‡ADOS`, `ESTRATÃ‰GIA`; idem `RelatoriosCharts` (`Relatórios` em `:225-226`) | — | Corrupção UTF-8 gravada no fonte; texto quebrado em produção. Também em `SupplierPerformance.tsx:39` e `Pagamentos.tsx:128,129,178,195,254`. |

### `src/pages/estoque/` — Gestão de Estoque

| Funcionalidade | Classificação | Evidência (arquivo:linha) | Camada de dados | O que falta |
|---|---|---|---|---|
| Lista, busca, KPIs de estoque | ✅ | UI `GestaoEstoque.tsx:103-262`; dados `useEstoque()` `:27` | Supabase (via hook) | — |
| Vincular produto ao estoque | ✅ | UI `:265-306`; handler `:62-69` (`criarItemEstoque.mutateAsync`) | Supabase | — |
| Movimentação manual (entrada/saída) | ✅ | UI `:309-353`; handler `:71-86` (`movimentar.mutateAsync` com `referencia_tipo: "ajuste_manual"`) | Supabase | — |
| Botão "Filtros Avançados" | 🟦 | `GestaoEstoque.tsx:166-169` — sem `onClick` | — | Inerte. |
| Título "Gestão de Estoque 10/10" e "Monitoramento neural" | 🟨 | `:92-93` | — | Rótulo de marketing no título da página (resíduo de rotulagem interna). |

### `src/pages/documentos/` — Documentos Fiscais

| Funcionalidade | Classificação | Evidência (arquivo:linha) | Camada de dados | O que falta |
|---|---|---|---|---|
| Importar NF-e via XML (parse real) | ✅ | UI `DocumentosFiscais.tsx:252-257`; handler `:59-109` (DOMParser lendo `nNF`, `chNFe`, `vNF`, `vProd`, `vFrete`, `vDesc`); `insert` em `fiscal_documents` `:98` | Supabase `fiscal_documents` | `tenant_id` é a constante `LEGACY_TENANT_ID = "00000000-…"` (`:27,96`) — todos os documentos caem no mesmo tenant fictício. |
| **Importar PDF "via IA"** | 🟨 | UI `:258-267`; handler `:113-169`; upload real para Storage `:128-130`; `functions.invoke('process-invoice-idp')` `:135`; `insert` em `fiscal_documents` com `status: "validada"` `:142-155` | Storage `fiscal-documents` + Supabase | **A edge function é mock**: `supabase/functions/process-invoice-idp/index.ts:53-70` loga `"simulando extração IA"` e devolve `mockExtractedData` com `Math.random()`, `valor_total: 1250.50` e chave de acesso com 44 zeros. O fio está completo — e por isso grava dado fiscal falso. Ver Achados graves. |
| Conciliação NF ↔ pedido | 🟨 | UI `:326-328`; mutation `:171-197` (`update` em `fiscal_documents`) | Supabase `fiscal_documents`, `pedidos` | Heurística é apenas casar valor com tolerância de R$ 0,01 (`:176`) — ignora fornecedor, data e chave. Alto risco de falso positivo. |
| KPIs de documentos | ✅ | `:204-209,225-242` | derivado da query `:33-44` | — |

### `src/pages/contratos/` — Contratos

| Funcionalidade | Classificação | Evidência (arquivo:linha) | Camada de dados | O que falta |
|---|---|---|---|---|
| Lista, busca, filtros e KPIs de contratos | ✅ | UI `Contratos.tsx:142-265`; fetch `:74-83` (`from('contracts')`) | Supabase `contracts` | — |
| Criar contrato | ✅ | UI `:136-138`; `ContractModal` `:269` com `onSuccess` → `fetchContracts()` | Supabase (via componente) | — |
| Detalhe do contrato | ✅ | `:227` abre; `ContractDetailsModal` `:271` | Supabase | — |
| Badge de expiração | ✅ | `:96-102` (`differenceInDays`) | derivado de `contracts` | — |
| **Modal de edição de contrato** | ⬛ | `isEditModalOpen` declarado em `:72`, `ContractModal` de edição em `:270`; `setIsEditModalOpen(true)` **não existe em lugar nenhum** do arquivo (grep: só `:72` e `:270`) | — | Caminho de execução inalcançável: não há como abrir o modal de edição pela UI. |
| Botão `MoreHorizontal` da linha | 🟦 | `:256-258` — sem `onClick` | — | Inerte. |
| Badge "N Ativos" no header | 🟨 | `:128` — exibe `contracts.length` (total), com rótulo "Ativos"; o total de ativos está em `:104` e é usado só no card `:157` | — | Rótulo incorreto. |

### `src/pages/pagamentos/` — Pagamentos

| Funcionalidade | Classificação | Evidência (arquivo:linha) | Camada de dados | O que falta |
|---|---|---|---|---|
| Lista, abas, filtros avançados, seleção múltipla | ✅ | UI `Pagamentos.tsx:171-262`; dados `usePagamentos()` `:52`; filtros `applyAdvancedFilters` `:69` | Supabase (via hook) | — |
| KPIs e dashboard financeiro | ✅ | `:145-159` (`PagamentoNotificationsWidget`, `PagamentoAdvancedKPIs`, `PagamentoFinancialDashboard`) | Supabase | Componentes fora do escopo, não auditados. |
| Confirmar pagamento | ✅ | UI `:266-275`; `markAsPaid(id, val)` `:271` | Supabase (mutation do hook) | — |
| Agendar pagamentos em lote | ✅ | UI `:182-186,276-288`; `bulkUpdateStatus(ids, 'agendado')` `:281` | Supabase | O parâmetro `date` recebido em `:280` é **ignorado** — só o status muda; a data escolhida não é persistida por esta página. |
| Exportar pagamentos | ✅ | `:138` (`PagamentoExportPanel`) | — | Componente fora do escopo. |
| `PagamentoMobileCard`, `isMobile`, `approvePagamento` | ⬛ | Importado/declarado em `:12`, `:51`, `:52` — cada símbolo aparece **1 única vez** no arquivo (grep) | — | Layout mobile e ação de aprovação existem no código mas **nenhum caminho de execução chega neles** nesta página. |
| `DropdownMenu*`, `Tooltip*`, `toast`, `Eye`, `Download`, `Filter`, `QrCode`, `FileText` | 🟦 | Importados em `:20-34`; `TooltipProvider` é o único usado (`:190`) | — | Imports sem uso — resíduo de uma versão anterior da tabela. |

### `src/pages/recompra/` — Recompra Inteligente

| Funcionalidade | Classificação | Evidência (arquivo:linha) | Camada de dados | O que falta |
|---|---|---|---|---|
| Listar sugestões de recompra | ✅ | UI `RecompraInteligente.tsx:258-326`; query `:18-69` (`repurchase_suggestions` + enriquecimento com `produtos`/`fornecedores`) | Supabase `repurchase_suggestions` | — |
| **Gerar sugestões ("Sparkles"/IA)** | ✅ | UI `:212-218`; mutation `:71-169`; lê `pedido_itens` + join `pedidos` `:78-82`; `delete` + `insert` em `repurchase_suggestions` `:155-157` | Supabase | **Não é IA**: é análise estatística local (intervalo médio entre pedidos `:126-134`, quantidade média `:135`, `confianca_score = min(95, 50 + n*10)` `:147`). O fio é completo e o dado é real — mas a fórmula de confiança é arbitrária e o botão tem ícone de IA (`:216`). Classificado ✅ pelo fio; a rotulagem está em Achados. |
| Aceitar / descartar sugestão | ✅ | UI `:305-310`; mutations `:171-197` (`update` de `status`) | Supabase | "Sugestão aceita! Crie a solicitação." (`:195`) — **nenhuma solicitação é criada**; o usuário precisa fazer manualmente em outra tela. |
| KPIs de sugestões | ✅ | `:221-256` | derivado da query | — |
| Limite de 500 itens na análise | 🟨 | `:82` (`.limit(500)`) | Supabase | Sem paginação: com histórico maior que 500 itens, as sugestões são calculadas sobre uma amostra arbitrária (ordem não determinada, sem `order by`). |

### `src/pages/dev/` — Harness

| Funcionalidade | Classificação | Evidência (arquivo:linha) | Camada de dados | O que falta |
|---|---|---|---|---|
| Harness E2E do painel de rede XBZ | ✅ | `XbzNetworkPanelHarness.tsx:38-78`; rota condicional a `import.meta.env.DEV` em `src/routes/AppRoutes.tsx:139-145` | nenhuma (injeta `statsOverride`) | Funciona como projetado: só existe em DEV, injeta contadores. `statsOverride` tem consumidor real (`XbzNetworkPanel.tsx:36-52`), logo não é morto. |

## Achados graves

1. **`process-invoice-idp` fabrica documento fiscal e o sistema o grava como "validada".**
   A edge function `supabase/functions/process-invoice-idp/index.ts:53-70` não chama provedor algum: baixa o arquivo do Storage, loga `"simulando extração IA"` e retorna
   `numero_nf: \`PDF-${Math.floor(Math.random() * 100000)}\``, `chave_acesso: "3523120000…0000"` (44 zeros), `valor_total: 1250.50`, `valor_produtos: 1200.00`, `valor_frete: 50.50`.
   O front (`src/pages/documentos/DocumentosFiscais.tsx:135-155`) confia no retorno e faz `insert` em `fiscal_documents` com `status: "validada"`, e esse registro entra depois na conciliação por valor (`:176`).
   Consequência: **registros fiscais inventados e persistidos**, indistinguíveis dos importados por XML. O botão é rotulado "Importar PDF (IA)" com ícone `BrainCircuit` (`:264`).

2. **`useRelatorioNegociacoes` tem 5 erros de compilação e dois fios de dados quebrados** (5 dos 8 erros de `tsc --noEmit -p tsconfig.app.json` de todo o projeto estão neste arquivo):
   - `useRelatorioNegociacoes.ts:83` faz `select("id, full_name, display_name, email")` em `profiles`; a coluna `display_name` **não existe** (`tsc`: `SelectQueryError<"column 'display_name' does not exist on 'profiles'.">`, erros em `:134,187`). A query falha em runtime → `avaliadores = []` → **todos os compradores aparecem como "Usuário" com avatar "U"** (`:187,193`) no card "Performance por Comprador".
   - `useRelatorioNegociacoes.ts:181` lê `c.score_total`, que não está no `select` de `:58` (`tsc`: `Property 'score_total' does not exist`). O array `precos` fica sempre vazio e `melhorPreco` cai no fallback (`:201-203`).

3. **A "economia" do relatório de negociações não é economia.**
   `useRelatorioNegociacoes.ts:140-144`: `Number(c.valor_total) - vu * (desconto/100)`, onde `vu = valor_unitario`. Subtrai um percentual do preço *unitário* do valor *total* — o resultado é praticamente o próprio `valor_total`. Todos os números derivados propagam o erro: KPI "Economia Total" (`RelatorioNegociacoes.tsx:69,141`), economia mensal, por categoria, por fornecedor e por comprador.

4. **`relatorioNegociacoesData.ts` é dado mock morto coberto por 25 testes verdes.**
   O arquivo (`relatorioNegociacoesData.ts:1-74`, cabeçalho `// Mock data for RelatorioNegociacoes`) não tem nenhum consumidor em `src/` exceto o próprio teste (`__tests__/relatorioNegociacoesData.test.ts:8`). Os 25 testes passam validando "Ana Silva ganhou R$ 8.750" — cobertura que **não testa nada de produção** e mascara a ausência de teste do hook real.

5. **Identidade do licitante é hardcoded na sala de leilão reverso.**
   `src/pages/licitacoes/Licitacoes.tsx:88`: `userFornecedorId={fornecedores[0]?.id} // For demo purposes, use first supplier`. Qualquer lance dado nessa sala é atribuído ao **primeiro fornecedor da lista**, não ao usuário autenticado. Impacto de integridade em processo licitatório.

6. **Duas telas de "Analytics" exibem constantes como métricas operacionais.**
   - `src/pages/sourcing/Sourcing.tsx:72,81,90,99` — "12 eventos ativos", "4 aguardando avaliação", "28 adjudicados no mês", "R$ 142k de saving" são literais no JSX, ao lado de uma lista que **é** real.
   - `src/pages/relatorios/Relatorios.tsx:130` — `taxaEntrega: 95, // Mock for now`, renderizado como "SLA Score 95%" (`RelatoriosCharts.tsx:243`) para todo fornecedor com pelo menos um pedido.
   - `src/pages/negociacao-ia/NegociacaoIA.tsx:148` — "Economia Total: R$ 245.2k".

7. **"IA" sem IA em duas superfícies.**
   - `NegociacaoIA.tsx:489-520` — "Sentimento de Mercado" com dólar, energia/frete e insight de timing literais.
   - `RFxDetails.tsx:294-305` — bloco rotulado "Análise de IA:" que é uma f-string montada com `reduce`/`toFixed`.

8. **`modelo_ia` gravado em auditoria não corresponde ao modelo usado.**
   `NegociacaoIA.tsx:106` persiste `"gemini-2.5-flash"`; a edge function chama `"google/gemini-3-flash-preview"` (`ai-negotiation/index.ts:70`). A tabela `negotiation_analyses` registra o modelo errado.

9. **Conciliação fiscal por valor apenas.**
   `DocumentosFiscais.tsx:176`: `Math.abs(Number(p.valor_total) - Number(doc.valor_total)) < 0.01` — sem checar fornecedor, data ou chave de acesso. Duas NFs de mesmo valor conciliam com o pedido errado. Além disso todos os documentos são gravados com `tenant_id` fixo `"00000000-0000-0000-0000-000000000000"` (`:27,96`).

10. **Catálogo SPOT depende de sincronização que nenhuma tela dispara.**
    O front lê apenas `spot_produtos`/`spot_skus`/`spot_estoque` (`useSpotCatalog.ts:63,96,112`); a edge `spot-api` existe (`supabase/functions/spot-api/index.ts:134`) mas não é invocada em nenhum ponto de `src/`. Se o agendamento estiver parado, o catálogo fica vazio sem nenhum caminho de recuperação pela UI — o botão do `SpotSyncPanel` só faz `refetch()` do log (`SpotSyncPanel.tsx:88`).

11. **Superfície morta relevante nos hooks de integração.**
    12 ações do `useXbzIntegration` (`cancelarPedido`, `getFiscal`, `getCores`, `getVendedor`, `getPessoaToken`, `getEntregaTipos`, `getPagamentoTipos`, `alterarQuantidade`, `buscarProdutos`, `login`) e 6 do `useSpotIntegration` (`searchProducts`, `browseCatalog`, `getProduct`, `checkStock`, `updateCartQuantity`, `getCheckoutInfo`) não têm nenhum chamador em `src/` (grep, incluindo imports dinâmicos). O `xbz-proxy` continua expondo essas ações no servidor (`xbz-proxy/index.ts:47-58`) — superfície de API sem consumidor.

12. **Corrupção de encoding UTF-8 gravada nos fontes.**
    `Relatorios.tsx:158,170,186,188,190` (`â€¢`, `Ãšltimo MÃªs`, `VISÃƒO GERAL`, `KPIs AVANÃ‡ADOS`, `ESTRATÃ‰GIA`), `RelatoriosCharts` via `Relatorios.tsx:225-226` (`RelatÃ³rios Customizados`), `SupplierPerformance.tsx:39`, `Pagamentos.tsx:128,129,178,195,254`. Aparece quebrado para o usuário final.

## Dados fictícios encontrados

| Local (arquivo:linha) | Conteúdo fabricado | Como aparece ao usuário |
|---|---|---|
| `supabase/functions/process-invoice-idp/index.ts:57-70` | `Math.random()`, `valor_total: 1250.50`, `valor_produtos: 1200.00`, `valor_frete: 50.50`, chave de acesso com 44 zeros | Nota fiscal "validada" na tabela de Documentos Fiscais |
| `src/pages/relatorio-negociacoes/relatorioNegociacoesData.ts:1-74` | 6 meses de histórico, 4 compradores ("Ana Silva", "Carlos Souza", "Maria Santos", "Pedro Lima"), 5 categorias, 4 fornecedores | Nada (módulo sem consumidor) — mas 25 testes o validam |
| `src/pages/sourcing/Sourcing.tsx:72,81,90,99` | `12`, `4`, `28`, `R$ 142k` | 4 cards de KPI no topo de Strategic Sourcing |
| `src/pages/negociacao-ia/NegociacaoIA.tsx:148` | `R$ 245.2k` | Chip "Economia Total" no header |
| `src/pages/negociacao-ia/NegociacaoIA.tsx:496,509,518` | `R$ 5,24 -0.2%`, `Estável +1.5%`, texto de "Insight de Timing" | Card "Sentimento de Mercado" |
| `src/pages/negociacao-ia/NegociacaoIA.tsx:231` | `rating: … || 4.2` | Estrelas do fornecedor no comparativo estratégico |
| `src/pages/negociacao-ia/NegociacaoIA.tsx:375,377,380` | `confianca_negociacao || 85`, `tipo_negociacao || 'Tático'` | Barra de confiança e rótulo de tática por fornecedor |
| `src/pages/negociacao-ia/NegociacaoIA.tsx:106` | `modelo_ia: "gemini-2.5-flash"` (a edge usa outro modelo) | Metadado gravado em `negotiation_analyses` |
| `src/pages/relatorios/Relatorios.tsx:130` | `taxaEntrega: 95` (comentário `// Mock for now`) | Coluna "SLA Score" da tabela Top Performance Partners |
| `src/pages/relatorios/Relatorios.tsx:139,140` | `economiaMensal: []`, `distribuicaoTipo: []` | Gráfico de saving vazio com legenda "em tempo real" |
| `src/pages/relatorios/RelatoriosCharts.tsx:158-160,176,189` | Frases estáticas no lugar dos gráficos | "Análise de Saving consolidada em tempo real", "Gráficos Circulares Indisponíveis", "Inteligência de Status em Processamento" |
| `src/pages/relatorio-negociacoes/RelatorioNegociacoes.tsx:161` | Meta `12%` | KPI "Economia Média — Meta: 12%" |
| `src/pages/licitacoes/Licitacoes.tsx:88` | `fornecedores[0]?.id` (`// For demo purposes`) | Identidade do licitante na sala de leilão ao vivo |
| `src/pages/sourcing/RFxDetails.tsx:296-305` | Texto montado localmente sob o rótulo "Análise de IA" | Card "Inteligência de Compras" |
| `src/pages/sourcing/AuctionRoom.tsx:235-238` | "Anti-Sniping Ativo — lances nos últimos 60s estendem o leilão" | Card de aviso; nenhuma lógica de extensão localizada |
| `src/pages/sourcing/RFxCreate.tsx:467` | "E-mail automático será enviado no lançamento" | Badge no passo 4; `handleCreate` não dispara envio |
| `src/pages/fornecedores/fornecedorHelpers.ts:43-44` | `totalMes: 0`, `ultimaCompra: '-'` | Campos constantes do contrato `LegacyFornecedor` (não renderizados hoje) |
| `src/pages/documentos/DocumentosFiscais.tsx:27,96,153` | `LEGACY_TENANT_ID = "00000000-0000-0000-0000-000000000000"` | Todo documento fiscal gravado no mesmo tenant fictício |
| `src/pages/catalogo-spot/CatalogoSpot.tsx:245` | `[2026, 2025, 2024]` | Seletor de ano dos pedidos SPOT |
| `src/pages/catalogo-spot/SpotSyncPanel.tsx:15-20` | Quotas `22`/`96` e janelas de frescor | Cards "Quota hoje: X/22" |
| `src/pages/buyer/BuyerPerformanceDashboard.tsx:95` | `{ economiaMensal: 10000, descontoMedio: 10, cotacoesMinimas: 30 }` | Metas default quando não há meta cadastrada |
| `src/pages/recompra/RecompraInteligente.tsx:147` | `confianca_score: Math.min(95, 50 + sorted.length * 10)` | Badge de "Confiança %" da sugestão |
| `src/pages/licitacoes/LicitacaoDetailDialog.tsx:58` | Fallback `score_preco: 50` | Score de preço quando não há valor estimado |

Nota sobre `Math.random()`: só há **uma** ocorrência no front do escopo — `src/pages/catalogo-produtos/CatalogoProdutos.tsx:71` — e ela é legítima (geração de nome de arquivo para upload). A ocorrência perigosa está no backend (`process-invoice-idp/index.ts:57`).

## ARQUIVOS LIDOS

### Escopo (50 arquivos, 18 diretórios — 100% lidos com Read)
/home/user/promo-supply-v2/src/pages/sourcing/AuctionRoom.tsx
/home/user/promo-supply-v2/src/pages/sourcing/RFxCreate.tsx
/home/user/promo-supply-v2/src/pages/sourcing/RFxDetails.tsx
/home/user/promo-supply-v2/src/pages/sourcing/Sourcing.tsx
/home/user/promo-supply-v2/src/pages/catalogo-xbz/CatalogoXbz.tsx
/home/user/promo-supply-v2/src/pages/catalogo-xbz/XbzCarrinhoTab.tsx
/home/user/promo-supply-v2/src/pages/catalogo-xbz/XbzCatalogoTab.tsx
/home/user/promo-supply-v2/src/pages/catalogo-xbz/XbzCredenciaisDialog.tsx
/home/user/promo-supply-v2/src/pages/catalogo-xbz/XbzNetworkPanel.tsx
/home/user/promo-supply-v2/src/pages/catalogo-xbz/XbzPedidosTab.tsx
/home/user/promo-supply-v2/src/pages/catalogo-xbz/xbzHelpers.ts
/home/user/promo-supply-v2/src/pages/catalogo-xbz/xbzNetworkHealth.ts
/home/user/promo-supply-v2/src/pages/catalogo-xbz/xbzNetworkTrend.ts
/home/user/promo-supply-v2/src/pages/catalogo-xbz/__tests__/xbzNetworkHealth.test.ts
/home/user/promo-supply-v2/src/pages/catalogo-xbz/__tests__/xbzNetworkTrend.test.ts
/home/user/promo-supply-v2/src/pages/catalogo-spot/CatalogoSpot.tsx
/home/user/promo-supply-v2/src/pages/catalogo-spot/SpotCatalogTab.tsx
/home/user/promo-supply-v2/src/pages/catalogo-spot/SpotFinancialTab.tsx
/home/user/promo-supply-v2/src/pages/catalogo-spot/SpotSyncPanel.tsx
/home/user/promo-supply-v2/src/pages/catalogo-spot/spotHelpers.ts
/home/user/promo-supply-v2/src/pages/catalogo-spot/useSpotCatalog.ts
/home/user/promo-supply-v2/src/pages/catalogo-spot/__tests__/spotHelpers.test.ts
/home/user/promo-supply-v2/src/pages/catalogo-produtos/CatalogoProdutos.tsx
/home/user/promo-supply-v2/src/pages/buyer/BuyerComparisonView.tsx
/home/user/promo-supply-v2/src/pages/buyer/BuyerPerformanceDashboard.tsx
/home/user/promo-supply-v2/src/pages/buyer/buyerDashboardHelpers.tsx
/home/user/promo-supply-v2/src/pages/buyer/__tests__/buyerDashboardHelpers.test.ts
/home/user/promo-supply-v2/src/pages/portal-fornecedor/PortalFornecedor.tsx
/home/user/promo-supply-v2/src/pages/portal-fornecedor/portalFornecedorData.ts
/home/user/promo-supply-v2/src/pages/portal-fornecedor/__tests__/portalFornecedorData.test.ts
/home/user/promo-supply-v2/src/pages/fornecedores/Fornecedores.tsx
/home/user/promo-supply-v2/src/pages/fornecedores/SupplierPerformance.tsx
/home/user/promo-supply-v2/src/pages/fornecedores/fornecedorHelpers.ts
/home/user/promo-supply-v2/src/pages/fornecedores/__tests__/fornecedorHelpers.test.ts
/home/user/promo-supply-v2/src/pages/qualificacao/QualificacaoFornecedores.tsx
/home/user/promo-supply-v2/src/pages/licitacoes/LicitacaoDetailDialog.tsx
/home/user/promo-supply-v2/src/pages/licitacoes/Licitacoes.tsx
/home/user/promo-supply-v2/src/pages/negociacao-ia/NegociacaoIA.tsx
/home/user/promo-supply-v2/src/pages/relatorio-negociacoes/RelatorioNegociacoes.tsx
/home/user/promo-supply-v2/src/pages/relatorio-negociacoes/relatorioNegociacoesData.ts
/home/user/promo-supply-v2/src/pages/relatorio-negociacoes/useRelatorioNegociacoes.ts
/home/user/promo-supply-v2/src/pages/relatorio-negociacoes/__tests__/relatorioNegociacoesData.test.ts
/home/user/promo-supply-v2/src/pages/relatorios/Relatorios.tsx
/home/user/promo-supply-v2/src/pages/relatorios/RelatoriosCharts.tsx
/home/user/promo-supply-v2/src/pages/estoque/GestaoEstoque.tsx
/home/user/promo-supply-v2/src/pages/documentos/DocumentosFiscais.tsx
/home/user/promo-supply-v2/src/pages/contratos/Contratos.tsx
/home/user/promo-supply-v2/src/pages/pagamentos/Pagamentos.tsx
/home/user/promo-supply-v2/src/pages/recompra/RecompraInteligente.tsx
/home/user/promo-supply-v2/src/pages/dev/XbzNetworkPanelHarness.tsx

### Fora do escopo — lidos integralmente para rastrear o fio de dados
/home/user/promo-supply-v2/src/hooks/useXbzIntegration.ts
/home/user/promo-supply-v2/src/hooks/useSpotIntegration.ts
/home/user/promo-supply-v2/supabase/functions/process-invoice-idp/index.ts

### Fora do escopo — inspecionados parcialmente (grep/sed direcionado, não leitura integral)
/home/user/promo-supply-v2/src/routes/AppRoutes.tsx (linhas 15-145)
/home/user/promo-supply-v2/src/hooks/useLicitacoes.ts (mapa de queries/realtime)
/home/user/promo-supply-v2/src/hooks/useBuyerPerformanceData.ts (mapa de queries)
/home/user/promo-supply-v2/src/integrations/supabase/types.ts (existência de tabelas/colunas)
/home/user/promo-supply-v2/supabase/functions/ai-negotiation/index.ts (linhas 1-80)
/home/user/promo-supply-v2/supabase/functions/xbz-proxy/index.ts (linhas 1-60)
/home/user/promo-supply-v2/supabase/functions/spot-proxy/index.ts (hosts e fetch)
/home/user/promo-supply-v2/supabase/functions/spot-api/index.ts (hosts e fetch)
/home/user/promo-supply-v2/supabase/functions/_shared/xbz_client.ts (host base)
/home/user/promo-supply-v2/supabase/functions/_shared/xbz_catalog_cache.ts (tabela espelho)
/home/user/promo-supply-v2/supabase/functions/ai-supplier-suggestion/index.ts (provedor/modelo)
/home/user/promo-supply-v2/supabase/functions/ai-supplier-risk/index.ts (provedor/modelo)

### Não auditados (fora do escopo, apenas montados pelas páginas deste lote)
`src/components/compras/*` — `StrategicQuoteTable`, `SLABySupplierAnalysis`, `KraljicMatrix`, `AdvancedProcurementKPIs`, `DemandPredictionPanel`, `CostCenterPerformanceAnalysis`, `SpendAnalytics`, `SupplierScorecard`, `RiskHeatMap`, `SupplierRankingPanel`, `SupplierAlertsPanel`, `AISupplierSuggestion`, `SupplierRiskAnalysis`, `PriceComparator`, `ProductSupplierManager`, `SavingsGoalPanel`, `BuyerDrilldownModal`, `ContractModal`, `ContractDetailsModal`, `DigitalSignature`, `QualificationHistoryTimeline`; `src/components/pagamentos/*`; `src/components/licitacoes/ReverseAuctionRoom`.
As classificações acima que dependem desses componentes estão marcadas 🟨 justamente por eu não ter verificado a camada de dados deles.
