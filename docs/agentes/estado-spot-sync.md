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

## Histórico / decisões

- 2026-11-13: PR #138 proposta como pausa dos crons SPOT quando a integração ainda falhava — **obsoleta, fechada sem merge**.
- 2026-11-18: crons ativos com 571 execuções OK de estoque — integração revertida ao vivo, sem pausa.
- Migração futura: qualquer alteração de schema/tabelas SPOT deve passar por migration e por esta doc.
