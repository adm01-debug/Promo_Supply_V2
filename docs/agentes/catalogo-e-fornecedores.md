# Catálogo e fornecedores — referência para agentes

Ler **antes** de tocar em produto, estoque, preço, cor, ficha fiscal, imagem ou sincronismo de
fornecedor neste repositório. Resumo no `AGENTS.md`; aqui está o detalhe e os motivos.

## A regra em uma frase

**Promo Supply V2 é o sistema de compras. Produto, estoque e preço aparecem aqui, mas nascem no
Promo Gifts V4 (PIM).** Compras consome essa informação por contrato de leitura; nunca cadastra,
nunca sincroniza, nunca espelha.

Isso **não** é específico da XBZ: vale para **todos** os fornecedores, atuais e futuros.

## Quem é dono de quê

| | Promo Gifts V4 (PIM) — `doufsxqlfjyuvxuezpln` | Promo Supply V2 (compras) — `lmypcdfsrgfftzhxawao` |
|---|---|---|
| Dono de | produto, variante, cor, imagem, dimensão, NCM/IPI, custo, preço, estoque do fornecedor, confiabilidade do estoque, pipeline de ingestão | solicitação, cotação, aprovação, pedido, acompanhamento (liberação/expedição/entrega), recebimento, crédito/limite, contrato, centro de custo, auditoria da compra |
| Escreve | tudo de produto | **nada** de produto |
| Lê do outro | nada | produto/estoque/preço, somente leitura |
| Fala com a API do fornecedor para | catálogo, preço, estoque, imagem, ficha fiscal | **transação**: login, carrinho, gerar/cancelar pedido, portador/retirada, status do pedido |

## Vale para todos os fornecedores

O PIM já ingere os cinco fornecedores em pipeline próprio (bronze → silver → gold). Evidência no
repo `adm01-debug/Promo_Gifts_V4`:

| Fornecedor | Código em `suppliers.code` | Pipeline no PIM | Cron no PIM |
|---|---|---|---|
| XBZ Brindes | `XBZ` | `fn_xbz_to_silver`, `fn_xbz_enrich_stock`, `fn_xbz_parse_price`, `fn_fetch_xbz_ficha`, `fn_xbz_link_images_to_colors` | `xbz-stock-sync` (15 min), `xbz-enrich-gold-extractors` (10 min) |
| SPOT / Stricker | `SPOT`, `STRICKER` | `fn_spot_to_silver`, `fn_spot_direct_stock_gold`, `fn_spot_direct_prices_gold`, `fn_spot_customization_prices_to_gold` | `spot-stock-fast-sync`, `spot-health-check-daily`, `spot-relink-family-images` |
| Asia Import | `ASIA` | `fn_asia_stock_fast_sync`, `fn_ingest_asia_product`, filas `asia_*` | `asia-enqueue-new-products`, `asia-image-uploader` |
| Só Marcas | `SOMARCAS` | `somarcas_bronze`, `somarcas_catalogo_publico`, `vw_somarcas_sync_status` | (ver no PIM) |
| Qualquer novo | novo código em `suppliers` | criar **no PIM** | criar **no PIM** |

Consequência prática: **nenhuma tabela, cron ou edge de catálogo por fornecedor deve nascer neste
repositório** — nem `xbz_*`, nem `spot_*`, nem `asia_*`, nem `somarcas_*`. Se um fornecedor novo
entra, o trabalho é no PIM; em compras não muda nada, porque a leitura é pela view de compras, que
já cobre todo `products` ativo.

## O que o Promo Supply faz com estoque e preço

Faz, e é essencial — só não é dono:

- **exibe** para o comprador escolher (busca por SKU, nome, fornecedor);
- **aplica regra de negócio de compra** sobre esse dado: quantidade mínima e múltiplo, valor mínimo
  do fornecedor, crédito/limite, alçada de aprovação, cotação e comparação entre fornecedores,
  geração do pedido, acompanhamento de liberação/expedição/entrega, recebimento e divergência;
- **congela no documento** o que foi comprado — nome, código no fornecedor, preço unitário, NCM,
  IPI, quantidade. Congelamento é imutável e é exigência fiscal/auditoria: um pedido de três meses
  atrás tem de continuar mostrando o preço daquele dia mesmo que o PIM mude o produto hoje.

Congelamento **não** é cópia de catálogo. A diferença: cópia é atualizada por sincronismo;
congelamento é escrito uma vez, no ato da compra, e nunca mais muda.

## Como ler o catálogo (caminho único)

```
front/edge do Promo Supply
   └─► edge `external-db-bridge`            (já existe neste repo)
         ├─ allowlist `_shared/external-bridge-allowlist.ts` (tabela fora da lista = 403)
         ├─ `EXTERNAL_DB_URL` / `EXTERNAL_DB_KEY` (secrets; chave *publishable* do PIM)
         └─► views de compras no PIM: `v_compras_catalogo`, `v_compras_precos_faixa`
```

Regras do caminho:

- somente `select`, limite máximo de 500 linhas por chamada (`MAX_SELECT_LIMIT`), paginação por `offset`;
- **nunca** `service_role` do PIM dentro deste projeto; **nunca** FDW/dblink entre os bancos;
- **nunca** gravar o resultado em tabela deste banco — cache é no cliente (React Query), em memória;
- PIM fora do ar → estado explícito "catálogo indisponível". Nunca preço velho de cache.

## Pare se você estiver a ponto de fazer isto

1. criar/alterar tabela de produto, estoque, preço, SKU, cor ou ficha fiscal neste banco
   (`produtos`, `produto_fornecedores`, `xbz_produtos`, `xbz_cores`, `xbz_produto_fiscal`,
   `spot_produtos`, `spot_estoque`, `spot_skus`, `spot_customization_options` — todas em extinção);
2. criar cron, edge function ou script de **sync de catálogo** neste repositório;
3. chamar endpoint de **catálogo** do fornecedor daqui — XBZ `consultaEstoque`/`mxbzConsultaEstoque`/
   `getSt`/`produtosCores`/`GetListaDeProdutos`, SPOT `ws_products`/`ws_stocks`/`ws_colors`, APIs de
   Asia ou Só Marcas;
4. adicionar coluna de preço, custo ou estoque em qualquer tabela de compras que não seja o
   congelamento do item comprado;
5. cadastrar produto na mão em uma tela de compras.

Em todos os cinco: **pare**, leia este documento e o plano no Projeto
("Promo Supply V2 = só compras · catálogo vive no Promo Gifts V4"). A informação vem do PIM.

## Fornecedor novo — ordem correta

1. pipeline de ingestão **no PIM** (bronze → silver → gold) e cron **no PIM**;
2. fornecedor em `suppliers` do PIM, com `code`, `active`, `is_product_supplier`;
3. nada a fazer no catálogo de compras: a view `v_compras_catalogo` já cobre o fornecedor novo;
4. em compras, só o que é **transação** do fornecedor: credencial (cifrada), carrinho/pedido quando
   houver API de pedido, acompanhamento de status, portador/retirada;
5. em compras, **nenhuma** tabela de produto/estoque/preço do fornecedor novo.

## O que, neste repo, ainda fala com fornecedor — e para quê

| Edge | Papel | Catálogo? |
|---|---|---|
| `xbz-proxy` | credenciais, carrinho, gerar/cancelar pedido, portador | **não** (as ações de catálogo saem; ver plano) |
| `xbz-sync-pedidos` | status, NF, pagamento dos pedidos XBZ | não |
| `spot-api`, `spot-proxy` | hoje também fazem catálogo | em desligamento |
| `punchout-*`, `erp-sync` | sessão de punchout e ERP | ver plano (decisões D-5) |
| `external-db-bridge` | leitura do catálogo no PIM | **é o caminho oficial** |

## Estado da transição (21/11/2026)

A separação está em execução por fases; o plano com as 12 PRs, as 6 decisões abertas, a migração de
dados e o inventário completo do código a remover está no Projeto do Claude
(`claude/PLANO_PROMO_SUPPLY_SO_COMPRAS_CATALOGO_NO_PROMO_GIFTS.md`). Enquanto a transição não
terminar, as tabelas acima ainda existem — existir não é autorização para usar: código novo lê do
PIM.

## Onde está o resto

- `docs/agentes/servicos-externos.md` — como falar com fora (CORS, auth, tenant, bridge).
- `docs/agentes/banco.md` — regras de SQL/migration antes de qualquer DDL.
- `docs/agentes/regras-dominio.md` — solicitação, cotação, aprovação, acompanhamento.
- `DOCS/INTEGRACOES/XBZ.md` — referência da API da XBZ (44 endpoints); catálogo/ficha/cores de lá
  são consumidos pelo PIM, não por este repo.
