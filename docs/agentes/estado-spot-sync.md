# Estado da integração SPOT (sync de catálogo/estoque)

> **Propósito deste documento:** registrar, com evidência de produção, que a integração SPOT
> está **ativa e saudável** para que nenhum agente — humano ou IA — reverta/desative os crons
> por engano. A PR #138 (pausa dos crons SPOT) está **obsoleta e fechada**: foi criada quando a
> integração ainda falhava; hoje ela funciona, e reaplicar a pausa quebraria o catálogo.
> Consulta executada via Management API Supabase em 2026-11-18 (projeto `lmypcdfsrgfftzhxawao`).

## Estado dos crons em produção (2026-11-18 15:00 UTC)

Fonte: `cron.job` + `cron.job_run_details` (Supabase produção).

| jobid | jobname | schedule | active | execuções | sucesso | falhas | última execução |
|---|---|---|---|---|---|---|---|
| 31 | `spot-api-sync-catalog` | `10 3 * * *` (diário 03:10) | `true` | 6 | 6 | 0 | 2026-11-18 03:10 UTC |
| 32 | `spot-api-sync-customization` | `40 3 * * 1` (segunda 03:40) | `true` | 1 | 1 | 0 | 2026-11-16 03:40 UTC |
| 33 | `spot-api-sync-stock` | `*/15 * * * *` (a cada 15 min) | `true` | 571 | 571 | 0 | 2026-11-18 18:15 UTC |

**Zero falhas** nos três jobs. O job 33 roda com sucesso contínuo (últimas execuções `status='succeeded'`).

> ⚠️ Nota técnica para leitura do banco: o status gravado em `cron.job_run_details.status` é
> `succeeded` (minúsculo). Filtrar por `'Succeeded'` retorna 0 — não é sinal de falha.

## Dados de catálogo (produção, 2026-11-18)

| tabela | linhas |
|---|---|
| `spot_produtos` | 1.279 |
| `spot_skus` | 3.776 |
| `spot_estoque` | 3.776 |

Última atualização de `spot_produtos`: 2026-11-18 03:10:09 UTC (rodada do `spot-api-sync-catalog`).

## Como a integração funciona

- ✅ `deploy_edge_functions_promo_supply.sh` publica e configura as funções relacionadas ao SPOT.
- ✅ Edges: `spot-api` (base `https://ws.spotgifts.com.br/api/v1`) e `spot-proxy` (portal).
- ✅ Front: `src/pages/catalogo-spot/` (hook `useSpotCatalog.ts`) lê `spot_produtos` para exibir o catálogo.
- ⚠️ Consumidor humano (já em produção para os clientes do sistema de compras).

## Correções de 2026-11-21 (integração com a API WS)

Três bugs em série impediam o sync de pedidos e um quarto silenciava a gravação do pedido criado:

| # | sintoma | causa | correção |
|---|---|---|---|
| 1 | `getOrders` → **HTTP 403** | `getOrders` não estava na `CRON_ACTIONS` da edge `spot-api` | PR #256 — ação incluída na allowlist do cron |
| 2 | `getOrders` → **HTTP 502** `ErrorCode:2` | `OrdersV1` exige o parâmetro `Status`; sem ele a API recusa | PR #257 — `query: { Status: "ALL" }` |
| 3 | pedidos nunca sincronizados | não existia cron de pedidos | PR #258 — `spot-api-sync-orders-30min` (`*/30 * * * *`) |
| 4 | `createOrder` lia `details: []` sempre | `OrderV1` envelopa a resposta em `{ OrderV1Result: {...} }` e `readOrdersDetails` lia só a raiz | PR #260 — desembrulho do envelope em `_shared/spot_api.ts` |
| 5 | `quota_blocked` todo dia às 23:30/23:45 BRT | cron de estoque em `*/15` = 96 rodadas contra limite `Stocks: 96` | PR #261 — schedule para `*/20` (72/dia) |

**Achado de negócio**: a conta SPOT não tem nenhum pedido — `Count:0` em `PROCESSING`, `SHIPPED`,
`DELIVERED`, `CANCELED`, `EXPIRED`, `PENDING` e `ALL`. `spot_pedidos = 0` é reflexo fiel da origem,
não falha de sync. Antes, os erros 403/502 mascaravam esse fato.

### Estado dos crons após as correções

| jobid | jobname | schedule | active |
|---|---|---|---|
| 31 | `spot-api-sync-catalog` | `10 3 * * *` | `true` |
| 32 | `spot-api-sync-customization` | `40 3 * * 1` | `true` |
| 122 | `spot-api-sync-stock` | `*/20 * * * *` | `true` (jobid mudou: 33 → 122 ao reagendar) |
| 121 | `spot-api-sync-orders-30min` | `*/30 * * * *` | `true` |

Verificação em produção: `_invoke_spot_sync `getOrders`` → **HTTP 200**
`{"success":true,"action":"getOrders","orders":0}`; `spot_api_sync_log` com
`endpoint=OrdersV1 action=getOrders status=success error_code=null`.

### Pendência conhecida

O `OrderV1` (criação de pedido) não tem contrato de payload documentado no repositório e as sondas
com `destination` inventado devolvem `ErrorCode:2` genérico. O fluxo `ui-spot-checkout` continua
sem ponte entre o carrinho do **portal** (`spot-proxy`, scraping HTML) e a **API** (`spot-api`,
`OrderV1`). Não inventar payload de pedido — envolve compromisso financeiro.

## Histórico / decisões

- 2026-11-13: PR #138 proposta como pausa dos crons SPOT quando a integração ainda falhava — **obsoleta, fechada sem merge**.
- 2026-11-18: crons ativos com 571 execuções OK de estoque — integração revertida ao vivo, sem pausa.
- Migração futura: qualquer alteração de schema/tabelas SPOT deve passar por migration e por esta doc.
