# Promo Supply V2 = só compras · catálogo SPOT/Stricker vive no Promo Gifts V4

**Data:** 22/11/2026 · **Autor:** Claude (sessão de engenharia) · **Status:** plano para aprovação
**Versão SPOT/Stricker** do plano `claude/PLANO_PROMO_SUPPLY_SO_COMPRAS_CATALOGO_NO_PROMO_GIFTS.md` (XBZ). Mesmas regras; tudo que é específico da SPOT está aqui.
**Repos:** `adm01-debug/Promo_Supply_V2` (compras, Supabase `lmypcdfsrgfftzhxawao`) · `adm01-debug/Promo_Gifts_V4` (PIM, Supabase `doufsxqlfjyuvxuezpln`, região `sa-east-1`)
**Base lida:** `Promo_Supply_V2@640e5d2` e `Promo_Gifts_V4@e8006d7` (clone raso de 22/11) + banco de produção dos dois projetos (consultas de 22/11, ~12:45 UTC) + n8n (`n8n.atomicabr.com.br`) + MCP `SPOT - MCP` (worker `spot-mcp.adm01.workers.dev`) + os 30 arquivos anexados (docs v1→v6, dumps JSON de nov/2025, extensão Chrome).
**Fornecedor no PIM:** `supplier_id = bcfc0d02-44c6-48ae-8472-12b1a3f3d8e0` · cliente SPOT `12869`.

> Nenhuma credencial (AccessKey, login, senha, token de ingest) aparece neste documento. Elas vivem só em secret de serviço/Vault.

---

## 0. Princípio da separação — aplicado à SPOT

| | **Promo Gifts V4 (PIM)** | **Promo Supply V2 (compras)** |
|---|---|---|
| É dono de | produto, variante (SKU `{ref}-{cor}[-{tam}]`), cor/HEX, imagens/vídeos, dimensões/caixa, NCM (`Taric`), preço por faixa (`Price1..5`, `YourPrice`), estoque + 6 janelas de reposição, personalização (áreas, técnicas, `ServiceCode`, preços por faixa, SLA, HotSpots), taxonomia, descontinuados, flags (`IsStockOut`, `NoReplenishment`, `AvailableGross`, `OnlineExclusive`, `Catalogs`) | solicitação, cotação, aprovação, **pedido na SPOT** (`OrderV1`), arte (`ServiceOrderV1`), maquete (aprovar/reprovar), status/rastreio, cancelamento, **NF/fatura/financeiro do portal**, recebimento, auditoria |
| Fala com a SPOT por | **API oficial (WS)**, feeds de catálogo — e nada mais | **API oficial (WS)**, endpoints de pedido (cota ilimitada) **+ API logada** (portal), só leitura operacional |
| Escreve | tudo de produto | nada de produto |
| Lê do outro | nada | produto e personalização, somente leitura, sob contrato |

**Regra de ouro (igual à XBZ):** o Promo Supply guarda **referência** (`pim_product_id`, `pim_variant_id`) e **congelamento** (SKU, `ServiceCode`, preço unitário, NCM, quantidade, data). Nunca uma cópia viva do catálogo SPOT.

**Regra específica da SPOT:** a **API logada é best-effort**. Ela depende de alguém logado num navegador no Brasil (a SPOT bloqueia a conta por "acesso de países diferentes em simultâneo" — mensagem `actividade_suspeita` do `pt.js`). Nada do caminho crítico de compra pode depender dela; tudo o que é crítico passa pelo WS.

---

## 1. O que existe hoje (levantamento com evidência)

### 1.1 Achado que muda a ordem do plano: **hoje o catálogo SPOT fresco está no lugar errado**

| Dado | Promo Supply (`lmypcdfsrgfftzhxawao`) | PIM (`doufsxqlfjyuvxuezpln`) |
|---|---|---|
| Última atualização do Bronze/espelho | `spot_produtos` 22/11 03:10 · `spot_estoque` 22/11 12:40 | `supplier_products_raw` (SPOT) **26/06/2026** |
| Preço | `spot_skus.price_tiers` de hoje (ex.: `92365-131` = 6,17 / 6,05 (11+) / 5,91 (1050+)) | `products.cost_price` `92365` = **6,23**, `price_updated_at` 06/06; `max(price_updated_at)` SPOT = **11/06/2026** |
| Estoque | `11103-103` = **228.155** (22/11 12:40) | `11103-103` = **233.143**, `last_sync_at` **04/07/2026**; `max(products.last_stock_update_at)` = 04/07 |
| Preço de personalização | `spot_customization_options` = **0 linhas** | `product_customization_prices` SPOT = 28.449 linhas, última em **13/06/2026**; `supplier_customization_options_raw` = 46.582, importado em 01/11 |

**Por quê:** o cron `spot-stock-fast-sync` do PIM (`40 * * * *`) só recopia Bronze→Gold — `fn_spot_stock_fast_sync` não chama a SPOT (`supabase/migrations-snapshot/SCHEMA_LIVE.sql:45221-45323`). Quem enchia o Bronze eram workflows n8n, hoje desligados:

| Workflow n8n | Função | Estado |
|---|---|---|
| `AF0p45RVqCQZvGTC` SPOT - GESTÃO DE PRODUTOS | full diário (produtos, estoque, absent, personalização, cores, imagens, vídeos) | **inativo** desde 09/06 |
| `xOzV2EOv3uJUgKyJ` SPOT - ATUALIZAÇÃO ESTOQUE | `Stocks` a cada 15 min → Gold | **inativo** |
| `8Cjg3eY2neYBH4Yb` SPOT - ATUALIZAÇÃO PREÇOS | `OptionalsComplete` **de hora em hora** → `fn_spot_direct_prices_gold` | ativo, 48 execuções "success" — mas `price_updated_at` parado em junho |
| `1uKqFK3xbAWf8ycU` SPOT - GESTÃO DE PERSONALIZAÇÃO | `customizationOptions` mensal (dia 1) | ativo (explica o 01/11) |
| `QZRw79pFFf4oIjeY` SPOT - IMAGENS → CLOUDFLARE | imagens 04:30 | ativo |
| `2PvnD15sj7AhsOgB` SPOT - GESTÃO DE PEDIDOS | `OrdersV1` on-demand | inativo |
| `bpe6eGB5Yu0XvlDs` / `T7FXbu7BCmG227BS` / `sZioc7vi6y9h7Sg2` Solicitar / Atualizar Status / Cancelar Pedido SPOT | legado de mar/2026 | **ativos**, conteúdo **NÃO VERIFICADO** (sem acesso MCP a esses três) |

**Consequência:** desligar o espelho do Promo Supply hoje, como na XBZ, faria compras enxergar preço de junho e estoque de julho. **Primeiro o PIM volta a ser fresco; só depois o Promo Supply larga a cópia.** Ver Fase 1.

### 1.2 Promo Supply V2 — tudo que hoje trata SPOT

**Tabelas** (produção, 22/11):

| Tabela | Linhas | Policies / Triggers / Índices | Natureza | Destino |
|---|---|---|---|---|
| `spot_produtos` | 1.279 | 1 / 1 / 5 | espelho de `products` | **morre** |
| `spot_skus` | 3.776 | 1 / 1 / 2 | espelho de `optionals` (com `raw` jsonb completo) | **morre** |
| `spot_estoque` | 3.776 | 1 / 1 / 2 | espelho de `Stocks` (só `quantity` + 1 janela; perde 5 das 6 reposições) | **morre** |
| `spot_customization_options` | **0** | 1 / 1 / 3 | espelho de `customizationOptions` — o sync semanal não grava nada | **morre** |
| `spot_pedidos` | 0 | 2 / 0 / 2 | pedidos SPOT | **fica** (é compra), ganha colunas (Fase 4) |
| `spot_sessions` | 93 (todas `tag=spot-api-token`) | 1 / 0 / 0 | token WS **e** cookie do portal na mesma tabela | **fica**, separada por tipo (Fase 0) |
| `spot_api_sync_log` | 479 | 1 / 0 / 1 | ledger de chamadas/cota | **fica** só para endpoints de pedido |

**Crons** (`cron.job`): `31 spot-api-sync-catalog 10 3 * * *` · `32 spot-api-sync-customization 40 3 * * 1` · `122 spot-api-sync-stock */20 * * * *` · `121 spot-api-sync-orders-30min */30 * * * *`. Log 48 h: `Stocks` 176 OK + 2 `quota_blocked` (21/11, antes da PR #261); `products`/`optionals` 3 OK; `OrdersV1` 28 OK + 3 erro.

**Edges:**
- `spot-api` (649 l.) — única ponte com o WS. Ações `syncCatalog | syncCustomization | syncStock | createOrder | getOrders | status` (`index.ts:42`). Ledger de cota em `_shared/spot_api.ts` (`evaluateQuota`, 266 l.). `createOrder` existe mas **não tem contrato de payload validado** (`docs/agentes/estado-spot-sync.md:72-75`).
- `spot-proxy` (877 l.) — portal por scraping. Ações `search, catalog, product, stock, addToCart, getCart, removeFromCart, updateCartQty, orders, financial, checkout, login` (`index.ts:27-30`). **Faz login-robô** com `SPOT_USERNAME`/`SPOT_PASSWORD` (`index.ts:130-217`).

**Front:** `src/pages/catalogo-spot/` (`CatalogoSpot.tsx` 351 l., `SpotCatalogTab.tsx` 225, `SpotSyncPanel.tsx` 133, `SpotFinancialTab.tsx` 100, `useSpotCatalog.ts` 154, `spotHelpers.ts` 72 + teste), `src/hooks/useSpotIntegration.ts` (196), `src/tests/spot/spotApi.test.ts` (210), rota `/catalogo-spot` (`AppRoutes.tsx:105`), menu `AppSidebar.tsx:115`. Referências laterais: `BuscaAutomatica.tsx`, `SLABySupplierAnalysis.tsx`, `slaAnalysisData.ts`, `SupplierThresholdConfig.tsx`, `PunchOutCatalogs.tsx`, `relatorioNegociacoesData.ts`, `_shared/contracts.ts`, `check-sla-alerts`.

**Já pronto do plano XBZ (vale para a SPOT):** `src/hooks/useCatalogoPim.ts` (230 l.) e a allowlist da bridge com `v_compras_catalogo` / `v_compras_precos_faixa` (`_shared/external-bridge-allowlist.ts:21-25`). **Mas as duas views não existem no PIM** (`information_schema.views` sem `v_compras%`) — o hook hoje não tem o que ler.

**Bugs/achados no código atual:**

| # | Achado | Evidência | Grau |
|---|---|---|---|
| A1 | O lado portal do Promo Supply nunca funcionou em produção: nenhuma sessão de portal foi criada | 93/93 linhas de `spot_sessions` têm `tag=spot-api-token`; o login-robô nunca gravou cookie | CONFIRMADO |
| A2 | `spot-proxy` lê `spot_sessions` sem filtrar o tipo e invalida as "outras" sessões — pode pegar o token do WS como cookie e matar o token válido do `spot-api` | `spot-proxy/index.ts:93-124` filtra só `is_valid`; `spot-api` usa `metadata.tag` (`index.ts:153-173`) | PLAUSÍVEL (não reproduzido) |
| A3 | `syncCustomization` não grava nada | `spot_customization_options` = 0; nenhum log de `customizationOptions` em 48 h; feed tem ~44-46 MB e o timeout é 120 s (`index.ts:37`) | causa PLAUSÍVEL |
| A4 | `OrdersV1` devolve `Count:0` em todos os status, mas a conta tem pedidos no portal (29 em 2026 segundo o addendum v6, mar/2026) | `estado-spot-sync.md:53-55` × `SPOT_addendum_v6.md` §5 | **inferência:** o WS só lista pedidos criados pela API; pedidos do portal só aparecem na área logada. NÃO VERIFICADO com a SPOT |
| A5 | Login-robô a partir de servidor fora do Brasil arrisca bloquear a conta inteira (inclusive o humano) | mensagem `actividade_suspeita`; região do projeto `lmypcdfsrgfftzhxawao` não confirmada | risco |

### 1.3 Promo Gifts V4 — a estrutura de dono já existe (falta só alimentá-la)

- 1.220 produtos SPOT ativos / 3.663 variantes ativas; `cost_price` e `ncm_code` preenchidos em 100% dos ativos; `supplier_sku` em 100% das variantes.
- Colunas que compras precisa — todas existem: `products.{supplier_reference, cost_price, ncm_code, box_*_mm/cm, box_quantity, box_inner_quantity, supplier_type_code, supplier_subtype_code, supplier_external_id}` · `product_variants.{supplier_sku, stock_quantity, next_quantity_1..6, next_date_1..6, next_entry_*, supplier_external_id}`.
- Personalização SPOT já modelada: `product_customization_prices` (`service_code, table_code, component, location, handling_cost, table_max_area_cm2, max_stitches, hotspot, min_qty, price`), `product_print_positions` (3.824), `supplier_customization_raw` (327 = `customizationTables`), `supplier_customization_options_raw` (46.582), `supplier_replenishment_events` (21.800), `supplier_colors`, `spot_typecode_map` (30).
- Mais de 40 funções `*spot*` (ex.: `fn_spot_to_silver`, `fn_spot_direct_stock_gold`, `fn_spot_direct_prices_gold`, `fn_spot_customization_prices_to_gold`, `fn_upsert_stocks_bulk_spot`, `fn_mark_removed_from_spot`, `fn_get_spot_access_key` (Vault), `fn_spot_health_check`).
- `supplier_external_id` existe mas está **nulo em 1.220/1.220** produtos SPOT. Para a SPOT isso é irrelevante: o `OrderV1` usa o próprio `Sku` (= `supplier_sku`), não um id numérico como a XBZ.

### 1.4 A "API logada" que criamos

**Componentes:** extensão Chrome *SPOT Session Sync* (MV3: `cookies`, `alarms`, `storage`) → `POST https://spot-mcp.adm01.workers.dev/ingest` com header de token → KV (`spot:phpsessid`, TTL 1 h) → ferramentas `[LOGADO]` do MCP. Captura ao iniciar o navegador, quando o `PHPSESSID` muda e a cada 30 min.

**Ferramentas do MCP `SPOT - MCP`** (descrições lidas do servidor):

| Tipo | Ferramenta | Uso |
|---|---|---|
| `[site][LOGADO]` | `spot_cart_status`, `spot_checkout_inspect`, `spot_list_invoices`, `spot_find_invoice`, `spot_get_invoice_pdf` | leitura de carrinho, checkout (etapa destino), faturas/NF + PDF |
| `[site][PÚBLICO]` | `spot_search_products`, `spot_get_stock_warehouses`, `spot_get_personalizations`, `spot_get_related` | busca, estoque por armazém, áreas/técnicas (HTML), relacionados |
| `[RESERVADO]` | `spot_checkout_set_destination`, `spot_ws_order_create` | desativados por segurança |
| `[WS]` | `spot_ws_status`, `_products`, `_optionals`, `_optionals_complete`, `_optionals_price`, `_stocks`, `_customization_options`, `_customization_tables`, `_colors`, `_product_types`, `_products_tree`, `_canceled_products`, `_download`, `_orders_list` | leitura do WS, com **contador de cota próprio** |

**Estado agora (22/11 ~12:50 UTC):** `spot_session_status` → `session_present:false` (ninguém logado); `spot_ws_status` → AccessKey configurada, contadores `0/22` e `0/96`.

**Achados de segurança:**
- O token do `/ingest` está **fixo no código** da extensão (`background.js:18`). Quem tiver a pasta da extensão pode empurrar cookie arbitrário para o worker. Precisa rotacionar e sair do código.
- Os repositórios são **públicos** (o proxy de git confirmou leitura anônima). Dois documentos do `Promo_Gifts_V4` publicam o **login** e a **senha do portal** (arquivos informados ao dono fora do repo). A AccessKey não aparece em nenhum dos dois repos (grep por valor, 0 arquivos). **A senha do portal precisa ser trocada.**
- Os anexos trazem **duas AccessKeys diferentes** (uma de nov/2025, outra de mar/2026). Qual está ativa em cada consumidor: NÃO VERIFICADO.

### 1.5 A cota é uma só e hoje tem 4 consumidores sem conversa entre si

Limites documentados (doc v2.1, verificado em 03/03/2026): **`Stocks`/`StocksByCountry` 96/dia · catálogo e personalização 22/dia · auth e pedidos ilimitados**, reset 00h00 BRT, erro `14` quando estoura.

| Consumidor | Endpoints de catálogo/estoque por dia |
|---|---|
| Promo Supply `spot-api` | `Stocks` 72 (`*/20`) · `products` 1 · `optionals` 1 · `customizationOptions` 1/semana |
| n8n `SPOT - ATUALIZAÇÃO PREÇOS` | `OptionalsComplete` **24** (de hora em hora) — sozinho já passa de 22 |
| n8n `SPOT - GESTÃO DE PERSONALIZAÇÃO` | `customizationOptions` 1/mês |
| MCP `spot-mcp` | sob demanda, contador separado |

Se as chaves forem do mesmo cliente (12869) e o limite for por cliente — **NÃO VERIFICADO** — o fluxo de preço do n8n estoura a cota todo dia e as chamadas do fim do dia voltam `ErrorCode 14` com HTTP 200, o que explicaria "success" no n8n com preço parado no PIM. Causa **PLAUSÍVEL**, a confirmar abrindo uma execução (a resposta é grande demais para o MCP do n8n).

---

## 2. Inventário completo do que a SPOT oferece — e o que fazer com cada coisa

### 2.1 API oficial (WS `https://ws.spotgifts.com.br/api/v1SSL/`)

| # | Endpoint | Cota | O que entrega (verificado nos dumps/docs) | Dono | Uso | Decisão |
|---|---|---|---|---|---|---|
| 1 | `AuthenticateClient` | ∞ | token 24 h | ambos | sessão | ✅ cada sistema mantém o seu token |
| 2 | `ValidateSession` | ∞ | `Status 1/0` | ambos | reuso de token | ✅ |
| 3 | `CloseSession` | ∞ | — | — | — | ❌ desnecessário |
| 4 | `products` | 22 | produto-pai, 87 campos (`Taric`, `Box*`, `Multiplier`, `IsStockOut`, `OnlineExclusive`, `AvailableGross`, `Catalogs`, `CustomizationDefault*`, vídeos, certificados) | PIM | Silver/Gold | 🟡 coberto pelo `optionalsComplete` |
| 5 | `optionals` | 22 | SKU, 134 campos (cor/HEX, tamanho, capacidade, 10 faixas, `YourPrice`, 8 áreas, `NoReplenishment`) | PIM | — | 🟡 coberto pelo #6 |
| 6 | **`optionalsComplete`** | 22 | SKU + produto, **227 campos** — feed-mãe | PIM | catálogo inteiro | ✅ **1×/dia** |
| 7 | **`optionalsPrice`** | 22 | só preço por SKU, 33 campos (`YourPrice`, `MinQt1..10`, `Price1..10`) | PIM | preço leve | ✅ até 4×/dia em horário comercial (substitui o n8n de hora em hora) |
| 8 | `productsTree` | 22 | árvore produto→componente→localização→técnica | PIM | posições de impressão | 🟡 1×/semana, se `product_print_positions` precisar |
| 9 | **`Stocks`** | 96 | `Quantity` + `NextQuantity/Date 1..6` + `Country` | PIM | estoque | ✅ `*/20` = 72/dia, reserva de 24 |
| 10 | `StocksByCountry?country=BR` | 96 (mesma cota) | estoque filtrado BR | PIM | — | 🔍 **testar**: se `Stocks` somar armazém europeu, este vira o oficial (D-8) |
| 11 | `productTypes` | 22 | 30 tipos + subtipos (códigos legados e novos coexistem) | PIM | taxonomia | ✅ 1×/semana |
| 12 | `colors` | 22 | 52 cores, **sem HEX** (HEX vem de `ColorHex1`) | PIM | de-para | ✅ 1×/semana |
| 13 | `customizationTables` | 22 | 289 tabelas, 15 faixas de preço, **SLA por faixa (`Sla1..14`)**, `PriceByColor`/`PriceByArea` (178/111; `PriceByStitches` sempre falso); 54 sem `Price1` = sob consulta (dump nov/2025) | PIM | preço de gravação + prazo | ✅ 1×/semana |
| 14 | **`customizationOptions`** | 22 | ~35,9 mil linhas, ~46 MB: `ServiceCode` (`{ref}.{comp}.{loc}.{tabela}`), preço total produto+manuseio+gravação, HotSpots, `IsDefault` | PIM | **cotação com gravação e o `ServCode` do pedido** | ✅ 1×/semana via **download direto em lotes** (o fetch único estoura — A3) |
| 15 | `catalogPrices` | 22 | preço de catálogo (sugerido) | PIM | referência de venda | 🟡 avaliar conteúdo |
| 16 | `canceledProducts` | 22 | descontinuados | PIM | `is_active=false` | ✅ ao fim de cada full |
| 17 | `RestrictedProducts` | 22 | produtos restritos à conta | PIM | bloquear compra | 🔍 testar e, se vier algo, virar flag |
| 18 | **`OrderV1`** (POST) | ∞ | cria pedido; `test=true` em homologação; resposta `OrderV1Result.OrdersDetails[]` (com S) → `OrderStamp`, `OrderLineStamp`, `OrderTotal`, `Tracking` | Compras | **emitir pedido** | ✅ Fase 4 |
| 19 | **`ServiceOrderV1`** (POST) | ∞ | envia arte depois (`WaitArtWork=true` reserva estoque 15 dias úteis) | Compras | arte | ✅ |
| 20 | `OrdersV1` | ∞ | lista pedidos (exige `Status`, ex. `ALL`) | Compras | status | ✅ já em cron 30 min |
| 21 | `OrdersV2` | ∞ | versão nova da lista | Compras | — | 🔍 comparar com V1 |
| 22 | **`OrderDetailsV1`** | ∞ | detalhe/linhas/tracking | Compras | status por pedido aberto | ✅ |
| 23 | **`CancelOrderV1`** (POST) | ∞ | cancela | Compras | cancelamento | ✅ com confirmação humana |
| 24 | `ApprovalMockups` | ∞ | maquetes pendentes (`OrderNumber CSO-…`, `Version`) | Compras | fila de aprovação | ✅ |
| 25 | `ApproveMockup` (POST) | ∞ | aprova | Compras | — | ✅ ação humana |
| 26 | `NotApproveMockup` (POST) | ∞ | reprova com observação e arquivo | Compras | — | ✅ ação humana |
| — | Download direto `downloads/v1SSL/file?data=…&extension=json\|csv\|xml` (sem token) | **NÃO VERIFICADO** se conta na cota | qualquer feed em arquivo | PIM | cargas pesadas | ✅ para `customizationOptions`/`optionalsComplete` |
| — | Imagens `https://ws.spotgifts.com.br/Products/{arquivo}` | livre | principal, `_C1`, `_C1_L1`, áreas | PIM | mídia | ✅ já no pipeline de imagens |

**Pegadinhas do WS que o código tem de respeitar** (todas confirmadas nos docs/dumps): `Quantity`, `WaitArtWork`, `Sample`, `noShipping` como **string**; `Appproved` com **3 Ps**; `OrdersDetails` com **S**; resposta embrulhada em `OrderV1Result` (já corrigido na PR #260); `internalReference` **único** (erro `70`); CEP partido em 5+3 (`Postalcode` + `ExtentionPostalcode`); `HandlingCosts` com **vírgula decimal**; `MinQt6..10` sempre vazias no BR; cores `03`/`103`/`143` = Preto; TypeCodes legados e novos convivem (filtrar com OR); `YourPrice` (preço negociado da conta) presente em 683/3.718 SKUs do dump — quando houver, é ele o custo.

### 2.2 Portal público (`www.spotgifts.com.br`, sem login)

| Recurso | O que dá | Dono | Decisão |
|---|---|---|---|
| `catalogo.ajax.php` `getStockWarehouses {prod, sub, rel}` | estoque **por armazém, em tempo real, sem cota** | Compras | ✅ **checagem na hora de emitir** o pedido (cota zero, sem sessão) — precisa do id interno `prod` (ver D-9) |
| `pesquisar.php?q=` | 5 resultados, `{REF} - {NOME}` | — | ❌ busca é do PIM |
| `carregaPersonalizacoes.php` | HTML de áreas/técnicas | — | ❌ WS `customizationOptions` é melhor |
| `carregaRelacionados.php` | relacionados | — | ❌ |
| `downloadImagensProduto.php` | ZIP de imagens | — | ❌ WS entrega imagens |
| `/catalogo/{slug}/{iderp}/pdf/` | ficha PDF (com/sem preço, margem mínima 100%) | — | ❌ é material de venda |

### 2.3 Portal logado (a "API logada")

| Recurso | O que dá | Dono | Decisão |
|---|---|---|---|
| **Documentos financeiros** (`/pt/area-reservada/documentos-financeiros/` + `documentos/download.php?id=`) | faturas/NF, vencimento, status, PDF; alerta de **faturas vencidas** | Compras | ✅ **o único lugar com NF/fatura da SPOT** → anexar ao pedido e ao recebimento |
| **Pedidos** (`/pt/area-reservada/pedidos/`, `?ano=`, `?p=`; detalhe `/pt/loja/orcamento/?encomenda_id={id}&view=1`) | pedidos feitos **pelo portal** (10 status com cor: Submetida… Expedida, Anulada), transportadora, rastreio | Compras | ✅ importar pedidos que não passaram pela API (A4) |
| `getSemaforo {qtd, prod, opcionais}` | verde/amarelo/vermelho para a quantidade | Compras | 🟡 complemento do `getStockWarehouses` |
| Carrinho (`adicionaCarrinho`, `actualizarGrupoProduto`, `esvaziarCarrinho`, `importFicheiro` .xlsx ≤200 KB, `pesquisaRapida`) | montar carrinho | — | ❌ **o carrinho é o mesmo do humano logado**; automação mexendo nele colide com quem está usando o portal |
| Checkout (`destino` → `expedicao` → `confirmacao`; `loja.ajax.php` `devolveOpcoesEntrega/Expedicao/Portes`; `verificaCompras`; `carrinho_hash`) | frete, forma de pagamento, confirmação | — | ❌ para emitir; 🟡 `devolvePortes` só leitura, se um dia precisar de frete da SPOT (D-6) |
| Simulador (`criarDraft`, `guardarMaqueta`, `adicionarAoCarrinho`, `devolveAgrupador`) | maquete própria do portal | — | ❌ maquete oficial vem pelo WS (#24-26) |
| Orçamentos, orçamentos comparativos (margens), rascunhos, maquetas guardadas, pesquisas guardadas, wishlist, endereços, "meus dados", downloads de marketing, calculadora | ferramentas de revenda | — | ❌ fora do escopo de compra |
| Amostra física (`devolveGruposParaValidarAmostraFisica`, `guardarInfoAmostraFisica`) | marcação de amostra | — | ❌ no WS o equivalente é `Sample:"true"` no `OrderV1` |
| Endereços de faturamento (`id_morada`) | endereço cadastrado | Compras | 🟡 leitura para conferir o `destination` do `OrderV1` |

---

## 3. Arquitetura alvo

### 3.1 Fluxo de dados

```
SPOT WS (feeds de catálogo, 22/96 por dia)
   └──► PIM  edge spot-ws-ingest + pg_cron  ──► Bronze ──► Silver ──► Gold
                                                    │
                       v_compras_catalogo ──────────┤  (já previstas no plano XBZ)
                       v_compras_precos_faixa ──────┤
                       v_compras_personalizacao ────┘  (nova, SPOT/qualquer fornecedor com ServiceCode)
                                    │ external-db-bridge (select, anon key, allowlist)
                                    ▼
Promo Supply  solicitação → cotação → aprovação → pedido_itens (pim_* + congelamento)
                                    │
             spot-api (só pedidos)  ├──► WS OrderV1 / ServiceOrderV1 / OrderDetailsV1 / CancelOrderV1 / Mockups
             spot-proxy (só leitura)└──► portal: getStockWarehouses (público) · faturas/NF · pedidos do portal
                                          ▲
                     extensão Chrome (cookie BR) ── spot-session-ingest (Promo Supply)
```

### 3.2 Três regras (iguais à XBZ) + uma da SPOT

1. **Muda sozinho** (preço, estoque, reposição, gravação, SLA, imagem) → PIM, lido na hora.
2. **É o que aconteceu** (SKU pedido, `ServCode`, preço pago, NCM, `OrderStamp`, NF) → compra, imutável.
3. **É identidade** (`supplier_sku`, `ServiceCode`) → PIM; a compra guarda o ponteiro.
4. **Depende de sessão logada** → nunca bloqueia a compra; sem sessão, a tela mostra "portal SPOT sem sessão — faça login no navegador" e segue.

### 3.3 Contrato de leitura — o que a SPOT acrescenta às views do plano XBZ

`v_compras_catalogo` (PR 1.1 XBZ) ganha colunas que a SPOT exige para decidir compra — todas já existem no Gold ou saem do `raw_data` do Bronze:

| Coluna | Origem | Por quê |
|---|---|---|
| `next_quantity_1..3`, `next_date_1..3` | `product_variants` | "sem estoque, chega X em DD/MM" |
| `no_replenishment`, `is_stockout` | Bronze `NoReplenishment` / `IsStockOut` | não oferecer compra futura de Stockout |
| `available_gross` | Bronze `AvailableGross` (18 produtos falsos no dump) | proíbe `LineType=SIMPLE` |
| `catalogs`, `online_exclusive` | Bronze | filtro de compra |
| `box_quantity`, `box_inner_quantity`, `multiplier` | `products` / Bronze | múltiplo de venda (erro `erro_quantidade_multiplo` do portal) |
| `your_price` | Bronze `YourPrice` | custo negociado prevalece sobre a faixa |

Nova **`v_compras_personalizacao`** (🔒 DDL no PIM): `(pim_product_id, pim_variant_id, service_code, technique, component, location, table_code_option, max_colors, max_area_cm2, price_by, is_default, handling_cost, min_qty, unit_price_total, sla_days, sob_consulta, hotspot)`, a partir de `product_customization_prices` + `supplier_customization_raw` (SLA). `unit_price_total` já inclui produto + manuseio + gravação (doc v2.1: prova com `11103`, R$ 105,342).

### 3.4 Congelamento no Promo Supply (o que o pedido SPOT precisa guardar)

`pedido_itens` (colunas do plano XBZ: `pim_product_id, pim_variant_id, codigo_fornecedor, ncm, ipi_rate`) **+** para SPOT: `service_code`, `line_type` (`SIMPLE|PRINT`), `wait_artwork`, `sample`, `print_colors` (Pantones), `logo_w_mm/h_mm/area`, `sla_dias_cotado`.
`spot_pedidos` ganha: `internal_reference` (UNIQUE — vira o id do nosso pedido), `order_stamp`, `order_number` (`CSO-…`), `status_spot`, `tracking`, `order_total`, `origem` (`api|portal`), `pedido_id` (FK para o pedido de compras), `raw_response`.
Novas: `spot_pedido_linhas` (`order_line_stamp`, SKU, quantidade, `service_code`), `spot_maquetes` (`order_number`, `version`, status, arquivo, observação, quem aprovou).

### 3.5 Sessão logada — modelo operacional

- **Login-robô sai.** O `loginToSpot` do `spot-proxy` nunca gravou uma sessão (A1) e é o caminho mais curto para bloquear a conta (A5).
- A extensão passa a mandar o cookie para uma edge do Promo Supply (`spot-session-ingest`), que grava em `spot_sessions` com `metadata.tag='spot-portal-cookie'`, cifrado com a chave de criptografia que o projeto já tem (`PSV2_ENCRYPTION_KEY`). O worker `spot-mcp` pode continuar recebendo uma cópia para uso do Claude (D-3).
- Token do ingest: sai do código; a extensão lê de `chrome.storage` (configurado uma vez no popup); token rotacionado.
- Chamadas ao portal saem de **IP brasileiro**: a edge do `spot-proxy` é invocada com região forçada `sa-east-1`. **NÃO VERIFICADO** se o projeto `lmypcdfsrgfftzhxawao` e o worker Cloudflare saem do Brasil — é o primeiro teste da Fase 5.
- Sessão ausente/expirada → as telas de NF e pedidos do portal mostram o estado honesto e oferecem o link do portal; nada mais para.

### 3.6 Orçamento de cota (alvo)

| Endpoint | Quem | Frequência | Chamadas/dia | Limite |
|---|---|---|---|---|
| `optionalsComplete` (download direto) | PIM | 03:10 | 1 | 22 |
| `optionalsPrice` | PIM | 08h, 11h, 14h, 17h | 4 | |
| `customizationOptions` (download, lotes) | PIM | seg 03:40 | 1/sem | |
| `customizationTables`, `colors`, `productTypes`, `productsTree` | PIM | dom 04:00 | 4/sem | |
| `canceledProducts` | PIM | após o full | 1 | |
| Reserva manual (MCP/diagnóstico) | — | — | ≤ 8 | |
| **Total catálogo** | | | **≤ 15/dia** | 22 |
| `Stocks` ou `StocksByCountry` | PIM | `*/20` | 72 | 96 |
| Reserva estoque | — | — | 24 | |
| Pedidos (todos os #18-26) | Promo Supply | por evento + `*/30` | ilimitado | ∞ |

Um **único ledger** de cota (`supplier_api_quota_log` no PIM) registra toda chamada de catálogo; o MCP passa a consultar o ledger antes de chamar (D-7). O Promo Supply deixa de gastar cota de catálogo.

---

## 4. O fluxo de compra SPOT de ponta a ponta (estado alvo)

| # | Etapa | Sistema | Fonte | Regra/validação |
|---|---|---|---|---|
| 1 | Busca do item | Supply | `v_compras_catalogo` (SPOT) | mostra estoque, reposição, `price_updated_at`; Stockout/OnlineExclusive sinalizados |
| 2 | Cotação | Supply | `v_compras_precos_faixa` + `v_compras_personalizacao` | faixa pela quantidade; `YourPrice` se houver; técnica sob consulta → cotação manual; prazo = SLA da faixa |
| 3 | Validação | Supply | view | múltiplo de caixa; `available_gross=false` exige `PRINT`; `max_colors`/`max_area_cm2` da técnica |
| 4 | Aprovação | Supply | workflow interno | — |
| 5 | Checagem final de estoque | Supply | portal público `getStockWarehouses` (sem cota) | se faltar, mostra `next_date_*`; comprador decide |
| 6 | Emissão | Supply | WS `OrderV1` | `internalReference` = id do nosso pedido; `test=true` em homologação; grava `OrderStamp`, `OrderLineStamp`, total; congela o item |
| 7 | Arte | Supply | WS `ServiceOrderV1` | se `WaitArtWork=true`, prazo de 15 dias úteis vira alerta |
| 8 | Maquete | Supply | WS `ApprovalMockups` / `ApproveMockup` / `NotApproveMockup` | ação humana; versão incrementa a cada reprovação |
| 9 | Acompanhamento | Supply | WS `OrdersV1` (cron) + `OrderDetailsV1` (abertos) | mapa `WAITING_ART_WORK, PENDING_MOCKUP_APPROVAL, PROCESSING, WAITING_STOCK, PROCESSED, INVOICED, SHIPPED, CANCELED` → status de compras; `Tracking` no `SHIPPED` |
| 10 | Cancelamento | Supply | WS `CancelOrderV1` | confirmação humana |
| 11 | NF / fatura | Supply | portal logado (documentos financeiros + PDF) | casa por número do pedido; alerta de fatura vencida (o portal trava pedido novo) |
| 12 | Recebimento | Supply | interno | confere NF × pedido congelado |
| 13 | Pedidos feitos no portal à mão | Supply | portal logado (pedidos) | importados com `origem='portal'` |

---

## 5. Decisões que precisam da sua palavra

| # | Decisão | Opções | Recomendação |
|---|---|---|---|
| **D-1** | Onde roda a ingestão SPOT do PIM | (a) edge + `pg_cron` no PIM, portando o `spot-api` que já funciona; (b) reativar os workflows n8n | **(a)** — mesma regra que você fixou para a XBZ (só sistema + Supabase); o código de sync já existe e roda (176 `Stocks` OK em 48 h) |
| **D-2** | Canal de emissão do pedido | (a) WS `OrderV1`; (b) checkout do portal; (c) WS com portal de reserva | **(a)** — é API, idempotente por `internalReference`, tem `test=true`; o portal compartilha carrinho com o humano |
| **D-3** | Para onde a extensão manda a sessão | (a) Promo Supply (e cópia para o worker do MCP); (b) só o worker, e o Supply lê do worker; (c) manter login-robô | **(a)**; **(c) proibido** (risco de bloqueio da conta) |
| **D-4** | `spot_produtos/skus/estoque/customization_options` | (a) morrem; (b) viram cache | **(a) morrem** — depois da Fase 1 estar fresca |
| **D-5** | Primeiro pedido real pela API | (a) você autoriza um pedido pequeno real após o `test=true` passar; (b) só homologação até falar com a SPOT | **(a)**, item de baixo valor, com a gestora de conta avisada |
| **D-6** | Frete da SPOT | (a) só `courier` do `OrderV1`; (b) consultar `devolvePortes` no portal | **(a)** — (b) exige carrinho montado |
| **D-7** | Ferramentas `[WS]` de catálogo do MCP | (a) passam a ler do PIM / respeitar o ledger; (b) ficam como estão | **(a)** — proteger a cota |
| **D-8** | Estoque oficial | (a) `Stocks`; (b) `StocksByCountry?country=BR` | **testar os dois** no mesmo dia e escolher o que bate com o portal |
| **D-9** | Id interno do portal (`prod`) para `getStockWarehouses` | (a) gravar no PIM (`supplier_external_id`, hoje nulo) via busca no portal; (b) resolver na hora | **(a)** com (b) de reserva — mesma lógica da D-2 da XBZ |
| **D-10** | Workflows n8n de pedido legados (Solicitar/Atualizar/Cancelar Pedido SPOT, ativos) | (a) desligar quando a Fase 4 entrar; (b) manter | **(a)** — dois caminhos de pedido para o mesmo fornecedor é risco de pedido duplicado |

---

## 6. Execução em PRs

🔒 = fica aberta para você (regra 8: DDL em produção, cron, segredo, arquitetura, custo). Uma tarefa = uma branch = uma PR. Antes de cada fase: listar PRs abertas nos dois repos.

### Fase 0 — Estancar o que está quebrado (Promo Supply, imediato)

**PR 0.1 — `fix: spot-proxy usa só sessão de portal e sem login-robô`**
- `getSpotSession` filtra `metadata.tag='spot-portal-cookie'` e não invalida linhas de outro tipo (A2).
- Remove `loginToSpot` e a ação `login`; sem sessão → erro 409 "sem sessão do portal", com mensagem para a tela.
- Testes: token WS presente + sem cookie → 409 e o token WS continua válido.

**🔒 Ação 0.2 — trocar a senha do portal SPOT e retirar login/senha dos docs públicos do PIM** (arquivos informados ao dono fora do repo). A troca da senha é sua (é a conta da empresa no portal); a limpeza dos docs é PR minha no PIM. Histórico do git continua com o valor — por isso a troca é obrigatória.

**🔒 Ação 0.3 — rotacionar o token do `/ingest` do worker** e publicar a extensão v1.1 sem token no código (vai junto da Fase 5).

### Fase 1 — PIM volta a ser o dono fresco da SPOT (`Promo_Gifts_V4`) 🔒

**PR 1.1 🔒 — `feat(spot): edge spot-ws-ingest + ledger de cota`**
- Edge no PIM portando `_shared/spot_api.ts` (auth, `ValidateSession`, `evaluateQuota`, erros) do Promo Supply. AccessKey via `fn_get_spot_access_key()` (Vault, já existe).
- Tabela `supplier_api_quota_log` (fornecedor, endpoint, dia, status, duração).
- Ações: `stock` → `fn_upsert_stocks_bulk_spot`; `full` → `optionalsComplete` por download direto → `supplier_products_raw.raw_data`; `prices` → `optionalsPrice` → `fn_spot_direct_prices_gold` (que deve atualizar `price_updated_at`); `customization` → `customizationOptions` por download em lotes → `supplier_customization_options_raw` → `fn_spot_customization_prices_to_gold`; `tables/colors/types/tree`; `canceled` → `fn_mark_removed_from_spot`.
- Crons no calendário do §3.6, sem colidir com o `promote tick` do PIM.
- Verificação: 50 SKUs aleatórios — estoque e preço do PIM = resposta do WS no mesmo minuto (tolerância 0); `max(price_updated_at)` e `max(last_stock_update_at)` < 30 min.

**PR 1.2 🔒 — `chore(spot): desliga n8n de preço e reaponta o health-check`**
- Desativa `8Cjg3eY2neYBH4Yb` (24 chamadas/dia de `OptionalsComplete`) e `1uKqFK3xbAWf8ycU` só depois da 1.1 verde; `fn_spot_health_check` passa a alertar quando `price_updated_at` ou `last_stock_update_at` passarem de 2 h.

**PR 1.3 🔒 — `feat(spot): id interno do portal no gold`** (D-9) — preencher `supplier_external_id` com o `prod` do portal. Fonte: **NÃO VERIFICADO** — o WS não expõe esse id; candidatos: `pesquisar.php` (só URL com `iderp`) ou a página do produto (`data-prod`). Começa por uma sonda em 5 produtos; se não houver fonte estável, a D-9 fica em (b).

### Fase 2 — Contrato de compras no PIM 🔒

**PR 2.1 🔒** = PR 1.1 do plano XBZ (`v_compras_catalogo`) **com as colunas do §3.3**. Uma view para todos os fornecedores — não criar view por fornecedor.
**PR 2.2 🔒** = PR 1.2 do plano XBZ (`v_compras_precos_faixa`) — para SPOT, 5 faixas por SKU + `YourPrice`.
**PR 2.3 🔒 — `feat(compras): v_compras_personalizacao`** (§3.3). Verificação: para 20 `ServiceCode` reais, `unit_price_total` da view = `customizationOptions` do WS, tolerância 0; técnicas sem preço saem com `sob_consulta=true`.

### Fase 3 — Promo Supply lê o PIM

**PR 3.1 — `feat: allowlist da bridge inclui v_compras_personalizacao`** (+ teste 403/400 como no plano XBZ).
**🔒 Secret** `EXTERNAL_DB_URL`/`EXTERNAL_DB_KEY` — o mesmo item do plano XBZ; se já estiver cadastrado, só a verificação (`select … limit 1` → 200).
**PR 3.2 — `feat: cotação SPOT com produto + gravação + prazo do PIM`**
- `useCatalogoPim` ganha `buscarPersonalizacoes(pimVariantId)`.
- Tela de cotação: técnica → localização → cores/área → preço total por faixa + SLA; "sob consulta" desabilita o preço e abre cotação manual.
- `PriceComparator`, `SupplierEcosystemSection`, `BuscaAutomatica` deixam de ler `spot_*`.

### Fase 4 — Transação SPOT pela API oficial (Promo Supply)

**PR 4.1 🔒 — `feat(db): pedido SPOT completo`** — colunas e tabelas do §3.4 (`spot_pedidos` + `spot_pedido_linhas` + `spot_maquetes` + congelamento em `pedido_itens`); `internal_reference` UNIQUE.
**PR 4.2 — `feat: contrato tipado do OrderV1`** — `_shared/spot_order_contract.ts`: monta o payload a partir do pedido aprovado (strings, `Appproved`, CEP 5+3, `Files` base64, Pantones `Color1..5`), valida antes de enviar (SKU ativo, múltiplo, `LineType`, `ServCode` pertence ao SKU, área ≤ máxima, cores ≤ máximo) e lê `OrderV1Result.OrdersDetails`. Sem rede: só Deno test com os exemplos documentados.
**PR 4.3 — `feat: emissão SPOT em homologação`** — `spot-api createOrder` com `test=true` forçado por variável de ambiente; idempotente por `internalReference` (reenvio devolve o pedido já gravado, nunca cria outro); botão "Enviar à SPOT" só para pedido aprovado. Verificação: 3 pedidos de teste (SIMPLE, PRINT com arte, PRINT `WaitArtWork`) com `OrderStamp` não nulo gravado.
**🔒 4.4 — primeiro pedido real** (D-5): troca `test=true` → produção para 1 pedido, com seu OK.
**PR 4.5 — `feat: arte depois e maquetes`** — `ServiceOrderV1`; cron `ApprovalMockups` a cada 30 min → fila "Maquetes SPOT"; aprovar/reprovar (com observação e arquivo) só por usuário humano com papel `buyer+`.
**PR 4.6 — `feat: status, rastreio e cancelamento`** — `OrderDetailsV1` para pedidos abertos; mapa de status SPOT → status de compras; `Tracking` no `SHIPPED`; `CancelOrderV1` com confirmação de uma linha. Alerta: `WAITING_ART_WORK` > 10 dias úteis; maquete pendente > 24 h.
**🔒 4.7 — desligar os 3 workflows n8n de pedido** (D-10), após 4.4.

### Fase 5 — API logada, só leitura operacional (Promo Supply)

**PR 5.1 🔒 — `feat: spot-session-ingest`** — edge que recebe o cookie (token novo, rotacionado), cifra e grava `tag=spot-portal-cookie`; `spot-proxy` chamado com região `sa-east-1`. Extensão v1.1: token lido do `chrome.storage`, envia para o Supply e (opcional) para o worker. Verificação: com um login real, `spot-proxy financial` devolve a lista; teste de IP de saída antes do primeiro uso (A5).
**PR 5.2 — `feat: NF e faturas SPOT no pedido`** — `financial` lista documentos; casa por número do pedido; baixa o PDF para o storage do Supply e anexa ao pedido/recebimento; alerta de fatura vencida no painel de compras.
**PR 5.3 — `feat: importa pedidos feitos no portal`** — `orders` (paginação `?ano=`/`?p=`) → `spot_pedidos origem='portal'`, sem duplicar os da API (casa por número).
**PR 5.4 — `feat: estoque na hora de emitir`** — `getStockWarehouses` (público, sem sessão) e, com sessão, `getSemaforo`; resultado aparece no passo 5 do §4 e é gravado no congelamento.
**Fora do plano, de propósito:** carrinho, checkout, simulador, orçamentos do portal (ver §2.3).

### Fase 6 — Migração de dados

**PR 6.1 — `chore(script): reconcilia SKUs SPOT com o PIM`** — chave exata `spot_skus.sku = product_variants.supplier_sku` (100% das variantes do PIM têm `supplier_sku`). Relatório: casados / só no Supply / só no PIM (hoje: 3.776 × 3.663). `spot_pedidos` está vazio → sem backfill de pedido.
**PR 6.2 🔒 — backfill** de `pim_*` onde houver referência a produto SPOT em `solicitacoes`/`pedido_itens`/`repurchase_suggestions` (mesma PR 4.2 do plano XBZ, filtrando SPOT).

### Fase 7 — Remover o que ficou órfão

Ver §10. Ordem: 7.1 (front) e 7.2 (edges) depois da Fase 3 no ar; 7.3 🔒 (drop + cron) depois da Fase 1 verde por 7 dias seguidos.

---

## 7. Riscos e mitigação

| Risco | Impacto | Mitigação |
|---|---|---|
| Cortar o espelho do Supply antes do PIM estar fresco | compra com preço de junho | Fase 1 antes de tudo; drop só após 7 dias de frescor < 30 min |
| Cota estourada (`ErrorCode 14`) | catálogo parado o resto do dia | ledger único; n8n de hora em hora desligado; Supply sem cota de catálogo; reserva de 7 (catálogo) e 24 (estoque) |
| Limite por cliente × por chave desconhecido | idem | perguntar à SPOT (Anexo B); até lá, tratar como por cliente |
| Bloqueio da conta por acesso de países diferentes | portal parado para todo mundo, inclusive o humano | sem login-robô; uso de cookie só com saída BR; parar e avisar ao primeiro sinal de bloqueio |
| Sessão logada ausente | NF/pedidos do portal desatualizados | não bloqueia compra; estado honesto na tela; NF pode ser anexada à mão |
| Carrinho do portal compartilhado com o humano | itens trocados no carrinho de alguém | automação nunca escreve no carrinho |
| Pedido duplicado | compromisso financeiro em dobro | `internalReference` UNIQUE + idempotência + desligar n8n de pedido (D-10) |
| Payload do `OrderV1` inválido | pedido recusado (`ErrorCode 2` genérico) | contrato tipado (4.2) + `test=true` (4.3) antes de produção |
| Técnica "sob consulta" | preço zero na cotação | `sob_consulta=true` bloqueia preço automático |
| `Stocks` com armazém não-BR | estoque inflado | D-8 |
| Senha e login públicos no GitHub | acesso de terceiros à conta | Ação 0.2 |
| Token do ingest no código da extensão | cookie forjado no worker | Ação 0.3 / PR 5.1 |
| Dois agentes nos mesmos arquivos (`spot-api`, `estado-spot-sync.md`) | conflito | listar PRs abertas antes de cada fase; o doc `estado-spot-sync.md` manda **não** desligar os crons — atualizar no mesmo PR do unschedule (7.3), senão outro agente religa |

---

## 8. Definição de pronto

| Fase | Pronto quando |
|---|---|
| 0 | `spot-proxy` não toca no token WS; login-robô removido; senha trocada |
| 1 | PIM: `price_updated_at` e `last_stock_update_at` SPOT < 30 min por 7 dias; 50/50 SKUs batem com o WS; n8n de preço desligado; ledger registrando |
| 2 | 3 views em produção, `explain analyze` < 300 ms, `GRANT SELECT` para `anon` conferido |
| 3 | cotação SPOT com produto + gravação + SLA vindo do PIM; nenhum `from("spot_produtos"|"spot_skus"|"spot_estoque"|"spot_customization_options")` no front |
| 4 | pedido aprovado → `OrderV1` (homologação e 1 real) com `OrderStamp`, linhas, maquete, status, tracking e cancelamento funcionando |
| 5 | com sessão: NF anexada ao pedido, pedidos do portal importados; sem sessão: telas em estado honesto |
| 6 | relatório de reconciliação entregue; backfill só em match exato, com rollback |
| 7 | tabelas e crons de catálogo SPOT fora do Supply; docs regeneradas; grep sem referência |

---

## 9. Ordem de execução

```
0.1 ─ 0.2 ─ 0.3                                     (já)
1.1 ──► 1.2 ──► 2.1 ──► 2.2 ──► 2.3 ──► 3.1 ──► 3.2 ──► 7.1 ──► 7.2
                 │                                     │
                 └── 1.3 em paralelo                   └── 7 dias de frescor ──► 7.3
4.1 ──► 4.2 ──► 4.3 ──► 4.4 ──► 4.5 ──► 4.6 ──► 4.7   (paralelo à Fase 2/3; só depende do PIM para o congelamento)
5.1 ──► 5.2 ──► 5.3 ──► 5.4                          (paralelo; best-effort)
6.1 ──► 6.2
```

Nada destrutivo antes da 7.3. Até lá o sync do Supply continua ligado como rede de segurança.

---

## 10. Mapa de remoção (inventário completo, `Promo_Supply_V2@640e5d2`)

### 10.1 Front — morre inteiro
`src/pages/catalogo-spot/CatalogoSpot.tsx`, `SpotCatalogTab.tsx`, `SpotSyncPanel.tsx`, `useSpotCatalog.ts`, `spotHelpers.ts`, `__tests__/spotHelpers.test.ts`; rota `/catalogo-spot` (`AppRoutes.tsx:31,105`) e item de menu (`AppSidebar.tsx:115`) — com os índices de navegação do plano XBZ §9.3 (`Breadcrumbs`, `ModernBreadcrumbs`, `SmartBackButton`, `searchConfig.ts`, `routePrefetch.ts` + teste).

### 10.2 Front — fica e muda de lugar/fonte
`SpotFinancialTab.tsx` → aba "Fornecedor SPOT" dentro de Pedidos (financeiro é compra). `useSpotIntegration.ts` → só `orders`, `financial`, `stockLive`. `BuscaAutomatica.tsx`, `SLABySupplierAnalysis.tsx`, `slaAnalysisData.ts`, `SupplierThresholdConfig.tsx`, `relatorioNegociacoesData.ts`, `PunchOutCatalogs.tsx` → leem PIM ou pedidos.

### 10.3 Edges
| Alvo | Ação |
|---|---|
| `spot-api` | remove `syncCatalog`, `syncCustomization`, `syncStock` e o código de upsert de catálogo; fica `createOrder`, `getOrders`, `status` + ações novas da Fase 4 |
| `_shared/spot_api.ts` | cota de catálogo sai (vai para o PIM); fica auth/erros/envelope |
| `spot-proxy` | remove `search`, `catalog`, `product`, `addToCart`, `getCart`, `removeFromCart`, `updateCartQty`, `checkout`, `login`; fica `orders`, `financial`, `stock` (vira `stockLive`) |
| `_shared/contracts.ts` | contratos de catálogo SPOT saem |
| `src/tests/spot/spotApi.test.ts` | reduzido ao que sobrou |

### 10.4 Banco (🔒 7.3)
- `drop table spot_produtos, spot_skus, spot_estoque, spot_customization_options` — leva 4 policies, 4 triggers, 12 índices.
- `cron.unschedule` dos jobs **31, 32, 122**; job **121** (pedidos) fica.
- `spot_sessions`, `spot_pedidos`, `spot_api_sync_log` ficam.

### 10.5 Docs e artefatos
Gerados: `docs/mapa/MATRIZ_EDGE_TABELA.md`, `docs/ci/README.md`, `inventario/estado/rotas.json`. À mão: **`docs/agentes/estado-spot-sync.md`** (reescrever: sync de catálogo agora é do PIM; o aviso "não desligar os crons" deixa de valer), `DOCS/CODEBASE_ATLAS/03_FRONTEND_MAP.md`, `04_BACKEND_MAP.md`, `DOCS/ESTADO/L01/L03/L07/L10/L12`. No PIM: `docs/suppliers/spot-fontes-de-dados.md` (Canal A passa a ser edge, não n8n; Canal C ganha o uso operacional deste plano; sem senha), `docs/workflows/ING-SPOT-STOCK.md` (arquivar).

### 10.6 Prova de que não sobrou nada
```bash
grep -rnE "\"spot_(produtos|skus|estoque|customization_options)\"" src supabase/functions   # vazio
grep -rn "loginToSpot\|SPOT_PASSWORD" supabase/functions                                     # vazio
bun run lint && bun run typecheck && bun run test
deno check supabase/functions/spot-api/index.ts supabase/functions/spot-proxy/index.ts && deno test supabase/functions/
node scripts/ci/gerar-matriz-edge-tabela.mjs --check && node scripts/ci/render-workflow-docs.mjs --check
```

---

## Anexo A — De onde cada tela passa a ler

| Tela / recurso | Hoje | Depois |
|---|---|---|
| Catálogo SPOT (`/catalogo-spot`) | `spot_produtos/skus/estoque` | **removida**; busca é a do PIM |
| Busca de produto na solicitação | `produtos` local | `v_compras_catalogo` (filtro fornecedor SPOT) |
| Preço de gravação | — (tabela vazia) | `v_compras_personalizacao` |
| Prazo de produção | — | SLA da faixa (`customizationTables`) |
| Estoque na emissão | `spot_estoque` (≤20 min) | PIM (≤20 min) + `getStockWarehouses` na hora |
| Pedido SPOT | inexistente na prática | WS `OrderV1` + linhas + maquetes + status |
| Financeiro SPOT | `spot-proxy financial` (nunca teve sessão) | mesmo, com sessão da extensão |
| Pedidos feitos no portal | `spot-proxy orders` (nunca teve sessão) | importados para `spot_pedidos origem='portal'` |

## Anexo B — Perguntas para a gestora de conta SPOT

1. O limite diário (22/96) é **por AccessKey** ou **por cliente 12869**? Quantas AccessKeys ativas existem na conta?
2. O download direto (`downloads/v1SSL/file`) conta na mesma cota?
3. Pedido criado por `OrderV1` aparece na área "Pedidos" do portal? Tem as mesmas condições de pagamento e frete do portal? Pedido feito no portal aparece no `OrdersV1`? (explica o `Count:0` — A4)
4. `test=true` valida estoque e preço de verdade ou só o formato?
5. `Stocks` inclui armazém fora do Brasil? Quando usar `StocksByCountry?country=BR`?
6. A regra de bloqueio por "acesso de países diferentes" vale para chamadas da API WS? Qual IP/origem é considerado?
7. `RestrictedProducts` e `catalogPrices`: o que significam para a nossa conta?
8. Existe webhook de mudança de status de pedido ou de maquete?
9. `Sla1..14` está em dias úteis contados a partir de quê (pedido, aprovação da maquete, pagamento)?

## Anexo C — Não verificado (honestidade)

- **Conteúdo dos 3 workflows n8n de pedido ativos** (Solicitar/Atualizar/Cancelar Pedido SPOT): não estão liberados para o MCP do n8n.
- **Causa do preço parado no PIM**: o n8n de preço roda e termina "success"; a execução é grande demais para inspecionar pelo MCP. Cota estourada é a hipótese mais forte, não a confirmada.
- **Se as AccessKeys dos 4 consumidores são a mesma** e se o limite é por chave ou por cliente.
- **Região/IP de saída** do projeto `lmypcdfsrgfftzhxawao` e do worker `spot-mcp` para chamadas ao portal.
- **Contrato real do `OrderV1`**: o payload deste plano vem da doc v2.1 (verificada pela autora em 03/03/2026) e do mapeamento de nov/2025; nenhuma chamada `test=true` foi feita nesta sessão.
- **A4** (pedidos do portal invisíveis no WS) é inferência.
- **Fonte do id interno `prod`** do portal (D-9).
- `spot_customization_options = 0`: timeout do payload de ~46 MB é a causa provável (A3), não reproduzida.
- Os dumps anexados são de **2025** (`UpdateDate` máx. 05/08/2025, 1.249 produtos / 3.718 SKUs); os números de hoje (1.279 / 3.776 no Supply; 1.220 ativos no PIM) vêm do banco.
