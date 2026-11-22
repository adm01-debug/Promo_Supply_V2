# Promo Supply V2 = só compras · catálogo vive no Promo Gifts V4

**Data:** 21/11/2026 · **Autor:** Claude (sessão de engenharia) · **Status:** plano para aprovação
**Repos:** `adm01-debug/Promo_Supply_V2` (compras, Supabase `lmypcdfsrgfftzhxawao`) · `adm01-debug/Promo_Gifts_V4` (PIM/catálogo, Supabase `doufsxqlfjyuvxuezpln`)
**Base de código lida:** `Promo_Supply_V2@7a030e4..199e4ed` e `Promo_Gifts_V4@184ac28` (clone raso de 21/11)

---

## 0. Princípio da separação

| | **Promo Gifts V4 (PIM)** | **Promo Supply V2 (compras)** |
|---|---|---|
| É dono de | produto, variante, cor, imagem, dimensão, NCM/IPI, custo de tabela, estoque do fornecedor, confiabilidade, sincronismo com XBZ/SPOT/Asia | solicitação, cotação, aprovação, pedido, recebimento, crédito/limite, contrato, centro de custo, auditoria da compra |
| Escreve | tudo de produto | nada de produto |
| Lê do outro | nada | produto (somente leitura, sob contrato) |
| Fala com a XBZ para | catálogo, preço, estoque, imagem, ficha fiscal | **transação**: login, carrinho, gerar pedido, cancelar, portador, status do pedido |

**Regra de ouro:** o Promo Supply nunca mantém cópia viva de catálogo. Ele guarda **referência** (`pim_product_id`, `pim_variant_id`) e **congelamento** (o que foi comprado, por quanto, com qual NCM/IPI, na data). Congelamento não é duplicação: é exigência fiscal e de auditoria — uma cotação de 3 meses atrás tem de continuar mostrando o preço daquela data mesmo que o PIM mude o produto amanhã.

---

## 1. O que existe hoje (levantamento com evidência)

### 1.1 Promo Supply V2 — tudo que hoje trata produto

**Tabelas de catálogo no banco de compras** (159 tabelas no total; estas são as de produto):

| Tabela | O que guarda | Uso no código | Destino |
|---|---|---|---|
| `produtos` (25 colunas: `codigo, nome, descricao, codigo_ncm, codigo_unspsc, preco_medio, preco_referencia, ultimo_preco, imagem_url, lead_time_dias, estoque_minimo, fornecedor_preferencial_id, …`) | cadastro próprio de produto | `src/hooks/useProdutos.ts`, `PriceComparator.tsx`, `RecompraInteligente.tsx`, `useEstoque.ts` | **morre** (vira referência ao PIM) |
| `produto_fornecedores` (`produto_id, fornecedor_id, codigo_no_fornecedor, preco_custo, lead_time_estimado, preferencial, ultima_cotacao_id`) | preço/código por fornecedor | `src/hooks/useProdutoFornecedores.ts`, `SupplierEcosystemSection.tsx` | **morre** (PIM já tem `products.supplier_reference`, `product_variants.supplier_sku`, `products.cost_price`) |
| `estoque`, `estoque_movimentacoes` | estoque **interno** do que foi recebido | `src/hooks/useEstoque.ts` | fica, mas re-chaveado (decisão D-4) |
| `xbz_produtos` | espelho do catálogo XBZ | `_shared/xbz_catalog_cache.ts` + `xbz-proxy` | **morre** |
| `xbz_cores` | tabela de cores XBZ | `_shared/xbz_fiscal_cache.ts` (PR #230, 21/11) | **morre** |
| `xbz_produto_fiscal` | ficha fiscal (`getSt`) | `_shared/xbz_fiscal_cache.ts` (PR #230, 21/11) | **morre** |
| `spot_produtos`, `spot_estoque`, `spot_skus`, `spot_customization_options`, `spot_api_sync_log` | mesma duplicação, fornecedor SPOT | `spot-api`, `spot-proxy` | **morre** (PIM tem pipeline SPOT: `fn_spot_to_silver`, `fn_spot_direct_stock_gold`, cron `spot-stock-fast-sync`) |
| `punchout_catalogs` | catálogo cXML de punchout | `punchout-receive`, `punchout-setup` | revisar (D-5) |

**Chaves estrangeiras que amarram compra a produto local** — é aqui que mora o trabalho:

- `solicitacoes.produto_id`
- `pedido_itens.produto_id` (já carrega `descricao`, `quantidade`, `valor_unitario`, `valor_total`, `unidade`, `unspsc_code` — ou seja, **o congelamento já existe**)
- `repurchase_suggestions.produto_id`
- `estoque.produto_id`
- `produto_fornecedores.produto_id`

`cotacoes` **não** tem `produto_id`: é por `solicitacao_id` + `quantidade`. Uma amarração menos para desfazer.

**Front que lê produto** (8 arquivos): `src/hooks/useProdutos.ts` (111 l.), `src/hooks/useProdutoFornecedores.ts` (98 l.), `src/hooks/useEstoque.ts` (108 l.), `src/hooks/usePurchaseHistory.ts` (381 l.), `src/components/compras/PriceComparator.tsx` (503 l.), `src/components/compras/SupplierEcosystemSection.tsx` (113 l.), `src/pages/recompra/RecompraInteligente.tsx` (332 l.), `src/pages/relatorio-negociacoes/useRelatorioNegociacoes.ts` (273 l.).

**Edge e automação de catálogo:** `xbz-proxy` (ações `catalogo`, `cores`, `fiscalSt` + cache), `_shared/xbz_catalog_cache.ts`, `_shared/xbz_fiscal_cache.ts`, `spot-api`, `spot-proxy`, e os gatilhos `_invoke_xbz_sync`, `_invoke_spot_sync`, `xbz_sync_watchdog`.

### 1.2 Promo Gifts V4 — já é dono do catálogo, e com mais rigor

Pipeline XBZ completo em medalhão (bronze → silver → gold), com cron ativo:

- `xbz-stock-sync` — a cada 15 min (`8,23,38,53 * * * *`, via `fn_cron_safe_run(54, …)`)
- `xbz-enrich-gold-extractors` — a cada 10 min
- `reconcile-stock-gold-daily` (05:10), `purge-expired-restock-dates` (06:13)
- SPOT: `spot-stock-fast-sync` a cada 30 min · Asia: `asia-image-uploader` 3×/h

Funções do pipeline: `fn_xbz_to_silver`, `fn_xbz_batch_to_silver`, `fn_xbz_enrich_stock(_batch)`, `fn_import_stock_xbz`, `fn_xbz_parse_price`, `parse_xbz_dimensions`, `fn_xbz_derive_materials`, `fn_xbz_link_images_to_colors`, `fn_fetch_xbz_ficha`, `fn_parse_xbz_ficha_site_batch`, `fn_xbz_site_tick`, `extract_xbz_product_code`, `extract_xbz_color_code`.

Colunas que a compra precisa — **todas já existem**:

| Dado da compra | Origem no PIM |
|---|---|
| id estável do produto | `products.id` (uuid) |
| SKU interno / promo | `products.sku`, `products.sku_promo` |
| nome | `products.name` |
| fornecedor | `products.supplier_id` → `suppliers.code`, `suppliers.name`, `suppliers.min_order_value` |
| **código do produto no fornecedor** | `products.supplier_reference` · por variante: `product_variants.supplier_sku` |
| **custo de compra** | `products.cost_price` |
| preço de venda / sugerido | `products.sale_price`, `products.suggested_price` |
| IPI e NCM | `products.ipi_rate`, `products.ncm_code` + `product_fiscal` |
| mínimos | `products.min_quantity`, `products.min_order_quantity` |
| estoque do fornecedor | `products.stock_quantity`, `products.is_stockout`, `products.last_stock_update_at`, `product_variants.stock_quantity` |
| confiabilidade do estoque XBZ | `products.xbz_stock_reliability_id`, `products.xbz_stock_reliability_text` |
| cor / variante | `product_variants.color_id/color_name/color_code/color_hex`, `size_code` |
| imagem | `products.primary_image_url`, `product_variants.images` |
| prazo | `products.lead_time_days` |
| frescor do preço | `products.price_updated_at`, `products.price_verified_at`, `products.price_freshness_threshold_days` |
| payload cru do fornecedor | `supplier_products_raw.raw_data`, `.stock_data`, `.supplier_sku`, `.variant_id` |

**O que as views públicas do PIM escondem** — motivo pelo qual não dá para usar as existentes: `v_products_public` devolve `NULL::numeric AS cost_price`, `NULL::varchar AS supplier_reference`, `NULL::text AS supplier_product_url`, `NULL::numeric AS ipi_rate`, `NULL::text AS external_id`. Isso é correto para o site e inútil para compras.

### 1.3 A ponte já existe — e está desligada

`supabase/functions/external-db-bridge/index.ts` do Promo Supply já é um gateway de leitura para um Supabase externo:

- lê `EXTERNAL_DB_URL` e `EXTERNAL_DB_KEY` (linhas 169-170);
- valida cada requisição contra `_shared/external-bridge-allowlist.ts` (`ALLOWED_TABLES`, `ALLOWED_RPCS`, `ALLOWED_FILTER_OPERATORS`, `ALLOWED_COUNT_MODES`, `MAX_SELECT_LIMIT = 500`), rejeitando 403 **antes** de tocar o banco;
- tem telemetria de query lenta (3 s / 8 s) e rate limit.

Dois fatos: (a) a allowlist hoje aponta para nomes que **não existem** no PIM (`produtos_externos`, `fornecedores_externos`, `spot_pedidos_view`, RPCs `get_saldo_credito`, `buscar_produto_por_sku`) — foi escrita no vazio; (b) os secrets `EXTERNAL_DB_URL`/`EXTERNAL_DB_KEY` **não estão cadastrados** no projeto (os 14 secrets atuais são `CRON_SECRET, OPENROUTER_API_KEY, PSV2_ENCRYPTION_KEY, SCIM_BEARER_TOKEN, SPOT_API_ACCESS_KEY, SPOT_CRON_KEY, SUPABASE_*, XBZ_ENCRYPTION_KEY`). Ou seja: **a infraestrutura de integração está construída e nunca foi ligada.** O plano abaixo liga ela no PIM em vez de inventar caminho novo.

---

## 2. Arquitetura alvo

### 2.1 Contrato de dados

```
Promo Gifts V4 (dono)                  Promo Supply V2 (consumidor)
─────────────────────                  ───────────────────────────
v_compras_catalogo      ──bridge──►    tela de busca de produto
v_compras_precos_faixa  ──bridge──►    cotação / simulação de preço
                                       │
                                       ├─ solicitacoes.pim_product_id        (referência)
                                       ├─ pedido_itens.pim_product_id        (referência)
                                       └─ pedido_itens.{descricao, valor_unitario,
                                          ncm, ipi_rate, codigo_fornecedor}  (congelamento)
XBZ (api.minhaxbz.com.br:5001)
  ├─ catálogo/preço/estoque/ficha  ──► PIM (crons de 10 e 15 min)
  └─ carrinho/pedido/portador      ──► Promo Supply (xbz-proxy)
```

Três regras que decidem tudo em caso de dúvida:

1. **Se o dado muda sozinho** (preço, estoque, imagem, descrição) → é do PIM, lido na hora, nunca copiado.
2. **Se o dado é o que aconteceu** (quanto pagamos, qual código mandamos para o fornecedor, qual NCM foi usado) → é da compra, gravado uma vez, imutável.
3. **Se o dado é identidade** (id do produto, código no fornecedor) → é do PIM; a compra guarda só o ponteiro.

### 2.2 Caminho de leitura

- **Transporte:** `external-db-bridge` (já existe). Nada de FDW/dblink entre projetos, nada de service_role do PIM dentro do Promo Supply.
- **Chave:** a *publishable* (anon) key do PIM em `EXTERNAL_DB_KEY`. As views de compras recebem `GRANT SELECT` para `anon`, como o PIM já faz com `v_products_public` e `v_variant_sale_prices_public`.
- **Superfície:** exatamente **2 views** na allowlist, operação `select` apenas. Sem `insert/update/delete/rpc` para o PIM.
- **Contenção:** `MAX_SELECT_LIMIT = 500` já no código; paginação por `offset`; cache de 60 s no front (React Query `staleTime`), sem persistência.

### 2.3 Identidade do produto na XBZ (para o carrinho)

`CarrinhoItemLancar` exige `{ProdutoId: int}` — o id numérico da XBZ, não o código. Duas opções:

- **(A) PIM guarda o id numérico** — nova coluna `products.supplier_external_id` (e `product_variants.supplier_external_id`) preenchida do `supplier_products_raw.raw_data->>'IdProduto'`, que o PIM já ingere. Compra lê e manda. **Recomendada**: identidade do fornecedor é do dono do catálogo; custo zero em runtime.
- **(B) Compra resolve na hora** — `mxbzConsultaEstoque?busca=<supplier_reference>` no momento de adicionar ao carrinho (1 chamada, sem sync). Serve de fallback quando (A) vier nulo.

Plano: implementar (B) como fallback na mesma PR que liga o carrinho, e pedir (A) ao PIM como melhoria (PR de DDL no outro repo).

### 2.4 O que a XBZ continua fazendo no Promo Supply

Fica (é transação, não catálogo): `getToken`/login, `CarrinhoResumo`, `CarrinhoItemLancar/Alterar/AlterarQuantidade/Remover`, `GerarPedidos`, `CancelarPedido` (PUT), `consultaPedidos` + `xbz-sync-pedidos`, `EntregaTipoListar`, `PagamentoTipoListar`, `PessoasMesmoGrupoListar`, `CreditoLimiteConsultar`, `expedicaoautorizacao/*` (portador, obrigatório desde 23/11/2026).

Sai: `consultaEstoque`, `mxbzConsultaEstoque` (salvo o fallback de identidade do §2.3), `produtosCores`, `getSt`, `foto`, `produtotipo`, `produtomaterial`, `produtotema`, `produtocaixa`, `container`, `GetListaDeProdutos`.

Efeito colateral bom: o teto de **36 chamadas/dia** do `/clientes` deixa de ser risco do Promo Supply — quem consome essa cota é o PIM, que já a administra.

---

## 3. Decisões que precisam da sua palavra

| # | Decisão | Opções | Recomendação |
|---|---|---|---|
| **D-1** | `produtos` e `produto_fornecedores` morrem ou ficam como cache "degradado"? | (a) morrem; (b) viram cache offline | **(a) morrem.** Cache de catálogo é exatamente o que você mandou tirar; a tela mostra "PIM indisponível" em vez de preço velho |
| **D-2** | Id numérico da XBZ | (A) coluna no PIM; (B) resolver na hora | **(A) + (B) de fallback** |
| **D-3** | O que fazer com `spot_produtos/spot_estoque/spot_skus/spot_customization_options` e as edges `spot-api`/`spot-proxy` | (a) desativar junto; (b) deixar para uma segunda rodada | **(b) segunda rodada** — mesma receita, depois que a XBZ provar o caminho |
| **D-4** | `estoque` / `estoque_movimentacoes` (estoque interno do que chegou) | (a) fica em compras, chaveado por `pim_product_id`; (b) migra para o PIM | **(a) fica.** É consequência do recebimento, não catálogo. Mas `produtos.preco_medio/preco_referencia/ultimo_preco` e `produto_fornecedores.preco_custo` morrem — isso é inteligência de preço, do PIM |
| **D-5** | `punchout_catalogs` (catálogo cXML de fornecedor via punchout) | (a) continua em compras; (b) vira ingestão do PIM | **(a) continua**, com ressalva: é sessão de compra, não catálogo persistido. Revisar depois |
| **D-6** | Tenant: o Promo Supply é multi-tenant (`tenant_id` em tudo); o PIM é organização única | (a) view do PIM sem tenant, compra resolve autorização no seu lado; (b) PIM passa a ter tenant | **(a)** — o PIM é o catálogo da casa; quem filtra quem pode comprar é a compra |

---

## 4. Execução em PRs

Cada PR é pequena, com teste e verificação própria. Marcadas com 🔒 as que **ficam abertas para você** (regra 8: DDL em produção, segredo, CI, arquitetura).

### Fase 0 — Parar de cavar (1 PR, Promo Supply)

**PR 0.1 — `revert: remove espelho de catálogo, cores e ficha fiscal da XBZ`**
- Reverte a PR #230 (`_shared/xbz_fiscal_cache.ts` + ganchos em `xbz-proxy`), remove `_shared/xbz_catalog_cache.ts` e as ações `cores`/`fiscalSt`/`catalogo` do `xbz-proxy`, e os testes correspondentes.
- Mantém intactos: credenciais, carrinho, pedidos, portador, `xbz-sync-pedidos`.
- Regenera `docs/mapa/MATRIZ_EDGE_TABELA.md` e `docs/ci/README.md` (guards do repo).
- **Só entra depois da Fase 2 estar de pé** — ordem importa: primeiro o substituto, depois a remoção. Deixar a PR pronta e aberta é aceitável.
- Verificação: `deno test supabase/functions/`, `deno check`, tela `/catalogo-xbz` abrindo sem a aba de catálogo.

### Fase 1 — Contrato no PIM (2 PRs, `Promo_Gifts_V4`) 🔒

**PR 1.1 🔒 — `feat(compras): view v_compras_catalogo para o sistema de compras`**

```sql
create or replace view public.v_compras_catalogo
with (security_invoker = on) as
select
  p.id                        as pim_product_id,
  v.id                        as pim_variant_id,
  p.sku, p.sku_promo, p.name,
  p.supplier_id, s.code       as supplier_code, s.name as supplier_name,
  coalesce(v.supplier_sku, p.supplier_reference) as supplier_reference,
  p.supplier_external_id,                      -- D-2(A); null até a PR 1.3
  p.cost_price, p.sale_price, p.suggested_price,
  p.ipi_rate, p.ncm_code,
  p.min_quantity, p.min_order_quantity, s.min_order_value,
  coalesce(v.stock_quantity, p.stock_quantity)  as stock_quantity,
  p.is_stockout, p.last_stock_update_at,
  p.xbz_stock_reliability_text,
  v.color_id, v.color_name, v.color_code, v.color_hex, v.size_code,
  coalesce(p.primary_image_url, p.primary_image_fallback_url) as image_url,
  p.lead_time_days,
  p.price_updated_at, p.price_verified_at, p.price_freshness_threshold_days,
  p.updated_at
from public.products p
join public.suppliers s on s.id = p.supplier_id
left join public.product_variants v on v.product_id = p.id and v.is_active
where p.is_active and not coalesce(p.is_deleted, false) and s.active and s.is_product_supplier;

grant select on public.v_compras_catalogo to anon, authenticated;
```

- Índices de apoio se o plano pedir: `products(is_active, supplier_id)`, `product_variants(product_id) where is_active`.
- Verificação: `explain analyze` de 3 consultas reais (por SKU, por nome `ilike`, por fornecedor) abaixo de 300 ms; contagem de linhas comparada a `products` ativo.

**PR 1.2 🔒 — `feat(compras): view v_compras_precos_faixa`**
- Expõe preço por faixa de quantidade a partir do que o PIM já calcula (`get_price_by_quantity`, `get_sale_price_for_quantity`, `product_customization_prices`), em formato `(pim_product_id, qty_min, qty_max, unit_cost, unit_price, source)`.
- Verificação: para 20 produtos, o valor da view igual ao da função, com tolerância 0.

**PR 1.3 🔒 — `feat(compras): supplier_external_id no gold` (D-2(A))**
- `alter table products add column supplier_external_id text;` + idem em `product_variants`, preenchido no promote (`fn_xbz_to_silver`/gold) a partir de `supplier_products_raw.raw_data->>'IdProduto'`; backfill único.
- Verificação: `select count(*) from products where supplier_external_id is null and supplier_id = <XBZ>` → 0 para produtos ativos da XBZ.

### Fase 2 — Ligar a ponte (2 PRs + 1 secret, Promo Supply)

**PR 2.1 — `feat: allowlist da bridge aponta para as views de compras do PIM`**
- `_shared/external-bridge-allowlist.ts`: `ALLOWED_TABLES` passa a ser `{ "v_compras_catalogo", "v_compras_precos_faixa" }`; remove os nomes fantasma (`produtos_externos`, `fornecedores_externos`, `spot_pedidos_view`) e os RPCs inexistentes; `ALLOWED_OPERATIONS` restrito a `select` quando o alvo é o PIM.
- Teste novo: tabela fora da allowlist → 403; `insert` em view do PIM → 403; `limit` acima de 500 → 400.

**Secret 🔒 — `EXTERNAL_DB_URL` = `https://doufsxqlfjyuvxuezpln.supabase.co` e `EXTERNAL_DB_KEY` = publishable key do PIM**
- Eu cadastro via API do Supabase; o valor da chave não passa por chat nem commit.
- Verificação: `external-db-bridge` com `{operation:"select", table:"v_compras_catalogo", limit:1}` devolvendo 200 com 1 linha.

**PR 2.2 — `feat: catálogo de compras lê o PIM (hook useCatalogoPim)`**
- Novo `src/hooks/useCatalogoPim.ts`: busca por SKU/nome/fornecedor via `external-db-bridge`, `staleTime` 60 s, sem gravar nada.
- `PriceComparator.tsx` e `SupplierEcosystemSection.tsx` passam a comparar preço com dado do PIM (`cost_price`, `v_compras_precos_faixa`) em vez de `produto_fornecedores`.
- Estado vazio honesto: PIM fora do ar → "catálogo indisponível (PIM)", sem preço velho.
- Verificação: Vitest dos hooks com fetch mockado + teste de erro; tela comparando 3 produtos reais.

### Fase 3 — Documentos de compra referenciam o PIM (2 PRs, sendo 1 DDL)

**PR 3.1 🔒 — `feat(db): referência ao PIM em solicitacoes, pedido_itens e repurchase_suggestions`**

```sql
alter table public.solicitacoes          add column pim_product_id uuid, add column pim_variant_id uuid;
alter table public.pedido_itens          add column pim_product_id uuid, add column pim_variant_id uuid,
                                         add column codigo_fornecedor text, add column ncm text, add column ipi_rate numeric(8,4);
alter table public.repurchase_suggestions add column pim_product_id uuid;
alter table public.estoque                add column pim_product_id uuid;      -- D-4(a)
create index on public.pedido_itens (pim_product_id);
create index on public.solicitacoes (pim_product_id);
```

- Sem FK (banco diferente): a integridade é do contrato, validada na escrita pela edge.
- `produto_id` fica **nullable** e passa a ser legado; nada é apagado nesta fase.

**PR 3.2 — `feat: compra grava referência do PIM e congela o item`**
- `process-solicitacao-neural`, `workflow-engine` e os hooks de solicitação/pedido passam a gravar `pim_product_id` + congelamento (`descricao`, `valor_unitario`, `codigo_fornecedor`, `ncm`, `ipi_rate`).
- `usePurchaseHistory.ts` e `RecompraInteligente.tsx` deixam de fazer `join` em `produtos` e passam a resolver o nome pelo congelamento (histórico) ou pelo PIM (sugestão nova).
- Verificação: criar solicitação → cotação → pedido de ponta a ponta em homologação, conferindo que `pedido_itens` tem `pim_product_id` e congelamento, e que a tela do histórico não consulta `produtos`.

### Fase 4 — Migração de dados (1 PR de script + 1 🔒 de execução)

**PR 4.1 — `chore(script): reconcilia produtos locais com o PIM`**
- Script idempotente (`scripts/migracao/reconcilia-produtos-pim.mjs`) que, para cada linha de `produtos`, procura no PIM nesta ordem: `sku` → `sku_promo` → `supplier_reference` (via `produto_fornecedores.codigo_no_fornecedor`) → nome normalizado + fornecedor.
- Saída: CSV com `match_exato | match_provavel | sem_match` e relatório por fornecedor. **Não escreve nada** nesta PR.
- Verificação: rodar em cima do dump atual e reportar cobertura (esperado: alto para XBZ/SPOT, baixo para itens de serviço/consumo interno, que não são catálogo e permanecem como texto livre no documento de compra).

**PR 4.2 🔒 — `chore(db): backfill de pim_product_id`**
- Aplica o resultado "match_exato" em `solicitacoes`, `pedido_itens`, `estoque`, `repurchase_suggestions`. Os "prováveis" vão para uma tabela de trabalho `migracao_produto_pim` para você revisar na tela, sem chute.
- Verificação: contagem antes/depois, zero linha alterada sem match exato, dump de rollback.

### Fase 5 — Desligar o que ficou órfão (1 PR + 1 🔒)

**PR 5.1 — `refactor: remove camada de catálogo do front e das edges`**
- Apaga `useProdutos.ts`, `useProdutoFornecedores.ts`, a tela de cadastro de produto e os pontos que ainda leem `produtos`.
- `useEstoque.ts` passa a ler pelo `pim_product_id` com nome vindo do PIM.

**PR 5.2 🔒 — `chore(db): drop das tabelas de catálogo`**
- `drop table xbz_produtos, xbz_cores, xbz_produto_fiscal;` · `drop table produto_fornecedores;` · `produtos` só depois de `pedido_itens.produto_id` estar 100% migrado (ou mantido como tabela congelada `produtos_legado`, se você preferir histórico no banco).
- `cron.unschedule` dos gatilhos de sync de catálogo (`_invoke_xbz_sync` e o watchdog), mantendo o de pedidos.
- SPOT fica para a rodada do D-3.

---

## 5. Riscos e o que fazer com cada um

| Risco | Impacto | Mitigação |
|---|---|---|
| Produto que a compra usa não existe no PIM (item de consumo interno, serviço, fornecedor sem integração) | comprador não acha o item | documento de compra aceita **item livre** (texto + preço), sem `pim_product_id`. O PIM é fonte para catálogo, não camisa de força |
| PIM fora do ar | tela de busca vazia | estado explícito "catálogo indisponível"; carrinho/pedido/aprovação continuam funcionando (não dependem do PIM) |
| Preço do PIM desatualizado | cotação com preço velho | mostrar `price_updated_at` e sinalizar quando passar de `price_freshness_threshold_days`; o congelamento registra o que foi usado |
| Chave publishable do PIM vazando | leitura das 2 views de compras | views só com dado de compra, sem cliente/pedido; allowlist + `MAX_SELECT_LIMIT` 500 + rate limit já no bridge; rotação da chave do PIM é independente |
| Latência (2 projetos, 2 regiões) | busca lenta | índices da PR 1.1, `limit` 50 por página no front, `staleTime` 60 s; medir no telemetry que a bridge já emite (3 s/8 s) |
| Divergência de id numérico XBZ | carrinho rejeita item | D-2: `supplier_external_id` no PIM + fallback `mxbzConsultaEstoque` na hora; log quando o fallback for usado |
| Histórico perder o nome do produto | relatório antigo ilegível | congelamento em `pedido_itens` (a coluna `descricao` já existe hoje) |
| Dois agentes mexendo nos mesmos arquivos | conflito de PR | uma tarefa = uma branch = uma PR; listar PRs abertas antes de começar cada fase |

---

## 6. Definição de pronto (por fase)

| Fase | Pronto quando |
|---|---|
| 0 | PR aberta, CI verde, sem código morto; mergeada **após** a Fase 2 |
| 1 | views criadas em produção do PIM, `explain analyze` dentro do alvo, grants conferidos |
| 2 | bridge devolvendo linha real do PIM; tela de comparação mostrando custo do PIM; nenhum `from("xbz_produtos")` restante |
| 3 | pedido novo gravando `pim_product_id` + congelamento; histórico sem `join` em `produtos` |
| 4 | relatório de cobertura entregue; backfill aplicado só em match exato, com rollback guardado |
| 5 | tabelas de catálogo dropadas, crons de sync desligados, `MATRIZ_EDGE_TABELA.md` regenerada |

---

## 7. O que sai do plano anterior

- **Fase 2 do plano XBZ** (edge `xbz-sync-catalogo` + cron diário): **cancelada**. O PIM já sincroniza estoque a cada 15 min.
- **Contador do teto de 36 chamadas/dia do `/clientes`**: **sai** do Promo Supply (passa a ser assunto do PIM).
- **PR 1.4 (ficha fiscal e cores) — já mergeada hoje como #230**: entra na fila de reversão (PR 0.1). Foi trabalho correto para a arquitetura antiga e virou duplicação com esta decisão.
- **`DOCS/INTEGRACOES/XBZ.md`**: continua valendo como referência da API, com nota de que catálogo/ficha/cores são consumidos pelo PIM, não pelo Promo Supply.

---

## 8. Ordem de execução recomendada

```
1.1 ──► 1.2 ──► 2.1 ──► secret ──► 2.2 ──► 3.1 ──► 3.2 ──► 4.1 ──► 4.2 ──► 0.1 ──► 5.1 ──► 5.2
 (PIM)         (bridge)                   (documentos)        (dados)      (limpeza)
        1.3 em paralelo com 2.x (não bloqueia)
```

Nada é destrutivo antes da Fase 4. Até a Fase 3, o sistema roda com os dois caminhos vivos — o que permite voltar atrás em qualquer ponto sem perder pedido.

---

## Anexo A — De onde cada tela passa a ler

| Tela / recurso do Promo Supply | Hoje | Depois |
|---|---|---|
| Busca de produto na solicitação | `produtos` (local) | `v_compras_catalogo` via bridge |
| Comparador de preços (`PriceComparator.tsx`) | `produto_fornecedores.preco_custo` | `v_compras_catalogo.cost_price` + `v_compras_precos_faixa` |
| Ecossistema do fornecedor (`SupplierEcosystemSection.tsx`) | `produto_fornecedores` | `v_compras_catalogo` agrupado por `supplier_id` |
| Recompra inteligente | `repurchase_suggestions` + join em `produtos` | `repurchase_suggestions.pim_product_id` + PIM |
| Histórico de compras | `pedido_itens` + join em `produtos` | congelamento do próprio `pedido_itens` |
| Estoque interno | `estoque.produto_id → produtos` | `estoque.pim_product_id` + nome do PIM |
| Catálogo XBZ (`/catalogo-xbz`, aba Catálogo) | `xbz-proxy` → XBZ + espelho | **removida**; busca de produto é a do PIM |
| Carrinho / pedido / portador XBZ | `xbz-proxy` → XBZ | **inalterado** |
| Pedidos XBZ (status, NF, pago) | `xbz-sync-pedidos` → `xbz_pedidos` | **inalterado** |
| Cotação, aprovação, contrato, centro de custo, crédito | Promo Supply | **inalterado** |

## Anexo B — Mapa de campos (PIM → compra)

| Campo na compra | Origem | Uso |
|---|---|---|
| `pim_product_id` | `products.id` | referência estável |
| `pim_variant_id` | `product_variants.id` | cor/tamanho comprado |
| `codigo_fornecedor` | `product_variants.supplier_sku` ?? `products.supplier_reference` | o que vai no pedido do fornecedor |
| `supplier_external_id` | `products.supplier_external_id` (D-2) | `ProdutoId` do `CarrinhoItemLancar` |
| `valor_unitario` | `v_compras_precos_faixa.unit_cost` (ou `products.cost_price`) | base da cotação, congelado no pedido |
| `ncm`, `ipi_rate` | `products.ncm_code`, `products.ipi_rate` / `product_fiscal` | cálculo fiscal e NF-e |
| quantidade mínima / múltiplo | `products.min_quantity`, `min_order_quantity`, `suppliers.min_order_value` | validação antes de mandar para a XBZ |
| disponibilidade | `stock_quantity`, `is_stockout`, `xbz_stock_reliability_text`, `last_stock_update_at` | decisão de compra |
| prazo | `products.lead_time_days` | previsão de entrega |
| imagem | `products.primary_image_url` | conferência visual |

## Anexo C — Não verificado (honestidade)

- **Sem acesso SQL ao PIM nesta sessão.** Os MCPs de Supabase disponíveis apontam para outros projetos (`SUPABASE - GESTÃO DE CLIENTES` → `pgxfvjmuubtbowutlide`/Singu V2) e o PAT atual só alcança `lmypcdfsrgfftzhxawao`. Tudo que afirmo do PIM vem do **código**: `src/integrations/supabase/types.ts` e `supabase/migrations/` em `Promo_Gifts_V4@184ac28`.
- **Não medi se `products.cost_price` está preenchido** para os produtos XBZ ativos — é a primeira consulta a rodar na PR 1.1; se vier esparso, a view precisa cair para `v_compras_precos_faixa`/`supplier_products_raw` como fonte de custo.
- **Assinatura de `get_price_by_quantity` / `get_sale_price_for_quantity` não lida** (só o nome). A PR 1.2 depende de ler as duas antes de desenhar a view de faixas.
- **`supplier_products_raw.raw_data->>'IdProduto'` não conferido em dado real** — é a chave da D-2(A); a PR 1.3 começa por `select raw_data->>'IdProduto' ... limit 5`.
- **Cobertura do PIM para itens não-catálogo** (serviço, consumo interno) é desconhecida; é o que a PR 4.1 mede antes de qualquer migração.
- **Crons do PIM** foram lidos nas migrations (`xbz-stock-sync` a cada 15 min, `xbz-enrich-gold-extractors` a cada 10 min); **não confirmei no `cron.job` do banco** que estão ativos hoje.

---

## 9. Mapa de remoção do código de produto (inventário completo)

> Correção de rumo: a versão anterior deste plano **nomeava** a remoção (Fases 0, 5.1, 5.2) mas não tinha inventário — e sem inventário "remover código morto" é promessa, não plano. Levantamento feito em `Promo_Supply_V2@a441c3d`.

### 9.1 Front — arquivos que morrem inteiros

| Arquivo | Linhas | Por quê |
|---|---|---|
| `src/pages/catalogo-produtos/CatalogoProdutos.tsx` | — | catálogo próprio de produto; some junto com a rota `/catalogo-produtos` |
| `src/hooks/useProdutos.ts` | 111 | CRUD de `produtos` |
| `src/hooks/useProdutoFornecedores.ts` | 98 | preço/código por fornecedor (é do PIM) |
| `src/pages/catalogo-xbz/XbzCatalogoTab.tsx` | — | aba de catálogo da XBZ |
| `src/pages/catalogo-xbz/__tests__/xbzProdutoView.test.ts` | — | testa o mapeamento do catálogo |
| `src/pages/catalogo-xbz/__tests__/xbzBusca.test.ts` | — | testa a busca do catálogo XBZ |
| `src/pages/catalogo-spot/{CatalogoSpot,SpotCatalogTab,SpotSyncPanel}.tsx`, `useSpotCatalog.ts`, `spotHelpers.ts`, `__tests__/spotHelpers.test.ts` | — | mesma duplicação do lado SPOT — **rodada D-3**; `SpotFinancialTab.tsx` fica (financeiro é compra) |

Trechos a remover de arquivos que sobrevivem: `produtoView()`/`parseXbzNumber` em `src/pages/catalogo-xbz/xbzHelpers.ts`; ações `catalogo`/`cores`/`fiscalSt` em `src/hooks/useXbzIntegration.ts`; aba de catálogo em `src/pages/catalogo-xbz/CatalogoXbz.tsx`.

### 9.2 Front — arquivos que **mudam de fonte** (não morrem)

`src/components/compras/PriceComparator.tsx` (503 l.), `SupplierEcosystemSection.tsx` (113 l.), `RankingCotacoes.tsx`, `SourcingIntelligenceWidget.tsx`, `ProductionRoutingEngine.tsx`, `src/pages/cotacao/cotacaoHelpers.ts`, `src/pages/historico/HistoricoCompras.tsx`, `src/pages/recompra/RecompraInteligente.tsx` (332 l.), `src/hooks/usePurchaseHistory.ts` (381 l.), `src/pages/relatorio-negociacoes/useRelatorioNegociacoes.ts` (273 l.), `src/hooks/useEstoque.ts` (108 l. — D-4: passa a `pim_product_id`), `src/pages/admin/PunchOutCatalogs.tsx` (D-5).

### 9.3 Front — navegação, rotas e índices que precisam ser limpos no mesmo PR

`src/routes/AppRoutes.tsx` (imports `lazy` + rotas `/catalogo-produtos`, `/catalogo-spot` e a aba de catálogo em `/catalogo-xbz`), `src/features/layout/components/AppSidebar.tsx`, `src/features/layout/components/Breadcrumbs.tsx`, `src/components/navigation/ModernBreadcrumbs.tsx`, `src/components/navigation/SmartBackButton.tsx`, `src/features/layout/components/search/searchConfig.ts`, `src/lib/routePrefetch.ts` **e** `src/lib/__tests__/routePrefetch.test.ts` (o teste quebra se a rota sair sem ele).

`src/integrations/supabase/types.ts` **não é editado à mão** — o `types-sync.yml` regenera depois dos drops.

### 9.4 Edge functions e módulos compartilhados

| Alvo | Ação |
|---|---|
| `_shared/xbz_catalog_cache.ts` + `.test.ts` | apagar |
| `_shared/xbz_fiscal_cache.ts` + `.test.ts` (PR #230) | apagar |
| `xbz-proxy/index.ts` | remover ações `catalogo`, `cores`, `fiscalSt` e os imports; manter credenciais, carrinho, pedidos, portador |
| `_shared/contracts.ts` | tirar os contratos de catálogo |
| `spot-api/index.ts`, `spot-proxy/index.ts` | desligar na rodada D-3 |
| `guided-buying-ai/index.ts` | trocar a fonte: lê o PIM pela bridge |
| `punchout-receive`, `punchout-setup` | revisar na D-5 |
| `xbz-sync-pedidos` | **não tocar** |

### 9.5 Banco — objetos que caem com as tabelas

| Tabela | Policies | Triggers | Índices |
|---|---|---|---|
| `produtos` | 5 | 0 | 0 |
| `produto_fornecedores` | 1 | 0 | 0 |
| `xbz_produtos` | 1 | 1 | 2 |
| `xbz_cores` | 1 | 1 | 0 |
| `xbz_produto_fiscal` | 1 | 1 | 0 |
| `spot_produtos` | 1 | 1 | 4 |
| `spot_estoque` | 1 | 1 | 1 |
| `spot_skus` | 1 | 1 | 1 |
| `spot_customization_options` | 1 | 1 | 2 |
| **Total** | **13** | **7** | **10** |

Funções e agendamentos:

- **apagar:** `_invoke_xbz_sync`, `_invoke_spot_sync`, `xbz_sync_watchdog` (e o agendamento que os chama) — são os gatilhos de sync de catálogo;
- **manter:** `verify_xbz_cron_key` e `xbz_cron_key_get` (o cron de **pedidos** usa a mesma chave), `update_estoque_saldo` (estoque interno, D-4), `scan_slow_query_hotspots` (só menciona as tabelas em relatório).

`estoque` e `estoque_movimentacoes` **não caem** (D-4): perdem `produto_id`, ganham `pim_product_id`.

### 9.6 Documentação e artefatos gerados (os guards do repo reprovam se ficarem para trás)

Gerados — rodar o gerador no mesmo PR: `docs/mapa/MATRIZ_EDGE_TABELA.md` (`scripts/ci/gerar-matriz-edge-tabela.mjs`), `docs/ci/README.md` (`scripts/ci/render-workflow-docs.mjs`), `inventario/estado/rotas.json`.

Escritos à mão — atualizar: `DOCS/CODEBASE_ATLAS/03_FRONTEND_MAP.md`, `DOCS/CODEBASE_ATLAS/04_BACKEND_MAP.md`, `DOCS/ESTADO/L01_ROTAS_E_PAGINAS_NUCLEO.md`, `L02_PAGINAS_FLUXO_COMPRAS.md`, `L03_PAGINAS_CATALOGO_IA_RELATORIOS.md`, `L04_COMPONENTS_COMPRAS_P1.md`, `L05_COMPONENTS_COMPRAS_P2.md`, `L07_HOOKS.md`, `L09_LIB_STORES_SERVICES.md`, `L10_EDGE_FUNCTIONS.md`, `L12_BANCO_E_RUNTIME.md`, `DOCS/INTEGRACOES/XBZ.md` (nota: catálogo/ficha/cores são consumidos pelo PIM), `docs/prod-readiness.md`, `docs/agentes/estado-spot-sync.md`, `docs/auditoria-implementacao-261120.md`.

### 9.7 As PRs de remoção (substituem a 5.1/5.2 genéricas)

| PR | Escopo | Regra 8 |
|---|---|---|
| **5.1a** `refactor: remove camada de catálogo do front` | §9.1 + §9.3; ajustes do §9.2 que dependem do PIM entram na 2.2 | não |
| **5.1b** `refactor: xbz-proxy sem catálogo, cores e ficha fiscal` | §9.4 (exceto SPOT e punchout) + regenerar MATRIZ | não |
| **5.2** `chore(db): drop das tabelas e gatilhos de catálogo` | §9.5 | 🔒 sim (DDL em produção) |
| **5.3** `docs: atualiza mapas após a saída do catálogo` | §9.6 | não |
| **5.4** (D-3) `refactor: desliga duplicação SPOT` | SPOT no front, edge e banco | 🔒 sim (DDL) |

Ordem: 5.1a e 5.1b só depois da Fase 2 no ar; 5.2 só depois da Fase 4 (backfill) — antes disso `pedido_itens.produto_id` ainda é a única ligação de histórico.

### 9.8 Como se prova que não sobrou código morto

```bash
# nenhuma referência às tabelas de catálogo no código
grep -rE "\"(produtos|produto_fornecedores|xbz_produtos|xbz_cores|xbz_produto_fiscal)\"" src supabase/functions
# nenhuma rota órfã e nenhum import quebrado
bun run lint && bun run typecheck && bun run test
deno check supabase/functions/xbz-proxy/index.ts && deno test supabase/functions/
# docs geradas em dia (o CI reprova se não)
node scripts/ci/gerar-matriz-edge-tabela.mjs --check && node scripts/ci/render-workflow-docs.mjs --check
node scripts/ci/check-test-inventory.mjs
```

Alvo: os quatro comandos verdes e o `grep` sem saída (fora de `types.ts`, que é gerado).

---

## 10. A regra vale para todos os fornecedores (não é um plano "da XBZ")

### 10.1 O PIM já ingere os cinco fornecedores

| Fornecedor | `suppliers.code` | Pipeline no PIM | Cron no PIM |
|---|---|---|---|
| XBZ Brindes | `XBZ` | `fn_xbz_to_silver`, `fn_xbz_enrich_stock`, `fn_xbz_parse_price`, `fn_fetch_xbz_ficha`, `fn_xbz_link_images_to_colors` | `xbz-stock-sync` (15 min), `xbz-enrich-gold-extractors` (10 min) |
| SPOT / Stricker | `SPOT`, `STRICKER` | `fn_spot_to_silver`, `fn_spot_direct_stock_gold`, `fn_spot_direct_prices_gold`, `fn_spot_customization_prices_to_gold` | `spot-stock-fast-sync`, `spot-health-check-daily`, `spot-relink-family-images` |
| Asia Import | `ASIA` | `fn_asia_stock_fast_sync`, `fn_ingest_asia_product`, filas `asia_*` | `asia-enqueue-new-products`, `asia-image-uploader` |
| Só Marcas | `SOMARCAS` | `somarcas_bronze`, `somarcas_catalogo_publico`, `vw_somarcas_sync_status` | (verificar no PIM) |
| Próximo fornecedor | código novo | criar **no PIM** | criar **no PIM** |

Isso muda o desenho em um ponto importante: **as views de compras não são "a integração XBZ"**. Elas
expõem `products` + `product_variants` + `suppliers` inteiro, com `supplier_code` como coluna. Um
fornecedor novo aparece na busca de compras **sem uma linha de código neste repositório** — basta
existir no PIM, ativo e marcado como `is_product_supplier`.

### 10.2 Consequência para o plano

- A PR 1.1 **não** filtra por fornecedor: `where p.is_active and s.active and s.is_product_supplier`. Quem
  escolhe o fornecedor é o comprador, pelo filtro da tela.
- A Fase 5 deixa de ser "tirar o espelho da XBZ" e passa a ser "tirar o espelho **de todos**": as
  `xbz_*` na 5.2 e as `spot_*` na 5.4 (D-3), com a mesma receita. Asia e Só Marcas nunca chegaram a ter
  espelho em compras — e, por esta regra, **não devem ganhar um**.
- A identidade do produto no fornecedor (§2.3) vale para todos: a coluna `supplier_external_id` no PIM
  guarda o id que cada API de fornecedor exige para transacionar (na XBZ, o `ProdutoId` do
  `CarrinhoItemLancar`), e cada fornecedor com API de pedido usa o seu.
- Credencial por fornecedor continua em compras, cifrada: hoje `xbz_credentials`; o padrão para os
  próximos é o mesmo (nunca em código, nunca em `VITE_*`).

### 10.3 O que o Promo Supply faz com estoque e preço (esclarecimento)

Compras **tem** estoque e preço na tela e nas regras — só não é dono deles:

| Faz | Não faz |
|---|---|
| exibe estoque, custo e preço na busca e na cotação | manter tabela de produto/estoque/preço |
| valida quantidade mínima, múltiplo e valor mínimo do fornecedor | sincronizar catálogo (cron, fila, watchdog) |
| compara fornecedores e monta cotação | chamar endpoint de catálogo do fornecedor |
| aplica crédito/limite e alçada de aprovação | cadastrar produto na mão |
| gera pedido, acompanha liberação, expedição e entrega | guardar cache de preço/estoque para "degradar" |
| registra recebimento e divergência | enriquecer dado de produto (cor, imagem, dimensão, NCM) |
| **congela** no documento: nome, código no fornecedor, preço unitário, NCM, IPI, quantidade | atualizar o congelamento depois (é imutável) |

Congelamento ≠ cópia: cópia é atualizada por sincronismo; congelamento é escrito uma vez, no ato da
compra, e nunca muda. É o que mantém pedido e cotação auditáveis.

### 10.4 Documentação no sistema (para qualquer agente de IA)

A regra passa a viver no repositório, não só neste plano:

- **`docs/agentes/catalogo-e-fornecedores.md`** (novo) — contrato completo: quem é dono de quê, a tabela
  dos cinco fornecedores, o caminho único de leitura pela bridge, os cinco gatilhos de "pare agora", o
  checklist de fornecedor novo e o estado da transição.
- **`AGENTS.md`** — seção nova "Catálogo e fornecedores", lida por qualquer agente antes de tocar em
  produto, estoque ou preço, apontando para o documento acima.

Todo agente que abrir este repo passa por essas duas leituras antes de criar tabela, cron ou chamada de
catálogo — que é o que impediria a duplicação de voltar por outro fornecedor.
