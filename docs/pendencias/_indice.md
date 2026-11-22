# Cahier de pendÃªncias â€” Promo_Supply_V2

Meta do objetivo: CADA item abaixo tem registro final em `docs/pendencias/<ID>-<slug>.md` com estado
(CONCLUIDO / AGUARDANDO HUMANO / DESCARTADO), evidencia (arquivo:linha / diff / saida), camadas (DB/RLS/edge/UI),
regra de negocio, raio de impacto e criterio de validacao. Fases: Fase 0 linha de base (feita), Fase 1 este
catalogo, Fase 2 execucao vertical por item.

## Fios centrais do fluxo de compra (maior valor de negocio)
| ID | Item | Estado | Fonte |
|---|---|---|---|
| fio-1 | Selecao de fornecedor na cotacao nao chamava `selectCotacao` | CONCLUIDO | `Cotacao.tsx` / `fio-1-cotacao-selecao.md` |
| fio-2 | Aprovar workflow nunca promove `solicitacoes.status` | CONCLUIDO #173 + DDL EM PROD (2026-11-28) | PR #173 - trigger `auto_transition_solicitacao_on_workflow_approved`; testado em postgres (aprovada=2, pendente=1). DDL aplicado via Management API; paridade-banco verde |
| fio-3 | Kanban de acompanhamento era no-op (toast) | CONCLUIDO | `Acompanhamento.tsx:144-146,313` / `fio-3-kanban-acompanhamento.md` |

## Seguranca
| ID | Item | Estado | Fonte |
|---|---|---|---|
| seg-passkey | passkey login valida so `challenge`/`type` (bypass S-1) | CONCLUIDO (PR #177, fail-closed) | `webauthn-authenticate/index.ts` rejeita finish; botao `Auth.tsx` desabilitado. Verificacao COSE real: futuro |
| seg-fio-entrada | `process-solicitacao-neural` invocado mas edge NAO EXISTE | CONCLUIDO | PR #171 (edge criado + front consome `data.fields`; deploy confirmado, GET no endpoint -> 401 sem JWT) |
| seg-tenant-alerts | `useCriticalAlertsBadge` sem tenant/filtro | CONCLUIDO (PR #183, merge 2026-11-20) | `useCriticalAlertsBadge.ts:25-27` |
| seg-mfa-bp | backup codes via `Math.random` | CONCLUIDO (PR #183, merge 2026-11-20) | `useMFA.ts:184` |
| seg-lockout | `useAccountLockout` fail-open | CONCLUIDO (PR #183, merge 2026-11-20) | `useAccountLockout.ts:50-83` |
| seg-scim | `scim-v2` nao em NO_JWT, sem `verify_jwt=false` | CONCLUIDO (PR #180, merge 2026-11-20 + deploy) | `config.toml` [functions.scim-v2] verify_jwt=false; edged prod scim-v2 verify_jwt=False v14 |
| seg-punchout | cXML shared_secret nunca validado | CONCLUIDO (PR #180, merge 2026-11-20 + deploy) | `punchout-receive/index.ts:155-176` valida `shared_secret_encrypted` de `punchout_catalogs`; edged prod v17 verify_jwt=False |

## Dados ficticios / fachadas que mentem na tela (impacto negocio)
| ID | Item | Estado | Fonte |
|---|---|---|---|
| fake-invoice | `process-invoice-idp` fabricava NF com valor fixo de R$ 1.250,50 e chave de zeros | CONCLUIDO (PR #283) | `process-invoice-idp` chama `callAIGateway` (OpenRouter, `google/gemini-2.5-flash`) com o PDF/imagem em base64; `extraction.ts` normaliza e devolve `null` + `campos_ausentes` em vez de inventar. Sem `OPENROUTER_API_KEY` ou com gateway fora responde 503 `fonte=indisponivel`. Front grava `status: pendente` (nao `validada`) e recusa gravar quando numero ou valor total nao foram lidos |
| fake-ai-guided | `guided-buying-ai` responde por if/else literais, montado em todo app | CONCLUIDO (PR #177) | `guided-buying-ai/index.ts` usa `callAIGateway` real com fallback determinÃ­stico |
| fake-dash | `useDashboardKPIs`/`useExecutiveDashboardData` literais + Math.random | CONCLUIDO (PR #181, merge 2026-11-20) | KPI SLA/card fabricado removido; dashboard Executivo/KPIs usam dados reais via RPC; top-5 = 77.5% prod. `kpiTargetsStore` virou metas (objetivos), nao dados simulados |
| fake-sla | `slaSettingsStore.ts:37` e-mail fixo multi-tenant | CONCLUIDO (PR #194, merge 2026-11-20) | default `emailRecipients: []` + seed via `profile.email` em `SLASettingsPanel.tsx` |
| fake-kpi-targets | metas sao objetivos configuráveis (KPITargetsConfig + persist localStorage), não dados simulados | CONCLUIDO | `kpiTargetsStore.ts` |
| fake-sla-analysis | `slaAnalysisData.ts` e `SLABySupplierAnalysis.tsx` geravam 6 fornecedores hardcoded com todos os numeros via `Math.random()` no import | CONCLUIDO (PR #284) | `buildSupplierSLAData` agrega `pedidos` reais (conformidade = `data_entrega <= data_previsao`, lead time = `data_entrega - data_emissao`, criticos = previsao vencida sem entrega) + `fornecedores.avaliacao`/`prazo_medio_entrega`; sem amostra o campo e `null` e a tela mostra `—`. `useSupplierSlaData` filtra pelo periodo (3m/6m/12m) e tem estados loading/erro/vazio |
| fake-price-comparator | `priceComparatorHelpers.ts` inventava `unitPrice` (25 + random*50), forma de pagamento, estoque, nota e prazo; a economia era `preco medio x 1,2` | CONCLUIDO (PR #285) | `generateQuotesFromSuppliers` recebe as `cotacoes` reais (vinculo via `solicitacoes.produto_id` -> `cotacoes.solicitacao_id`) e nunca inventa valor: precedencia `produto_fornecedores` -> `cotacoes` -> ausente; campos sem fonte viram `null` e a tela mostra `—`, com `coverage` (X de Y com preco) |
| fake-busca-api | `simulateAPISearch` em `cotacaoHelpers.ts` inventava fornecedor encontrado (`Math.random() > 0.3`), preco (20 + random*15), frete, prazo, estoque e forma de pagamento, com `setTimeout` de 2s fingindo chamada de API | CONCLUIDO | substituido por `fetchRegisteredQuotes`, que le as `cotacoes` ja registradas da solicitacao; sem cotacao registrada a tela diz que nao encontrou, nunca inventa |

## Edge functions (L10)
| ID | Item | Estado | Fonte |
|---|---|---|---|
| edge-alert-sev | `alert-dispatcher` severidade `.in(["HIGH","CRITICAL"])` vs `critical`/`medium` + canal `webhook` fora do CHECK | CONCLUIDO (PR #189, merge 2026-11-20) | `alert-dispatcher/index.ts:247,337` |
|  edge-sla-reve | `check-sla-alerts` regrediu - botao manual manda JWT usuario -> 401 | CONCLUIDO (PR #187, merge 2026-11-20) | `check-sla-alerts/index.ts:88` / `NotificationSettingsPanel.tsx:59` |
| edge-xbz-cron | cron `xbz-sync-pedidos-30min` agendado e ativo em prod | AGENDADOR OK / **DADOS VAZIOS** (reaberto 2026-11-22) | `cron.job`: ativo `*/30 * * * *`, runs `succeeded` — mas `succeeded` so prova que o SELECT de `_invoke_xbz_sync()` rodou (net.http_post fire-and-forget), não que a edge funcionou. Medido em prod 2026-11-22 11:30: `xbz_pedidos`, `xbz_produtos`, `xbz_cores`, `xbz_produto_fiscal` = **0 linhas**; `xbz_credentials` = **0 linhas** (nenhuma integração cadastrada; a UI `XbzCredenciaisDialog` existe). Watchdog reescrito na PR #264 para medir o dado e não o agendador |
| edge-spot | `spot-api` fora do deploy script | CONCLUIDO â€” ACTIVE v14 em prod, deploy via `deploy-edge-functions.yml` (todo push em main com `supabase/functions/**`) | `spot-api/index.ts` + prod list API |
| edge-erp | `erp-sync` stub 501 | DESCARTADO (stub honesto HIGH-C5 - intencional, grava `erp_sync_log` pending + retorna 501; nao finge sucesso) | `erp-sync/index.ts:74-105` |
| edge-ai-risk | `ai-supplier-risk` `const logger` dentro do try -> ReferenceError no catch | CONCLUIDO (PR #190, merge 2026-11-20) | `ai-supplier-risk/index.ts:37-38,162` |
| edge-push | `send-push-notification` usa VAPID (JWT ES256) + cifragem aes128gcm (RFC 8291) | CONCLUIDO | #205 / `webpush.ts` |
| edge-audit | `run-audit` sem chamador | CONCLUIDO (PR #203, merge 2026-11-11) — painel Compliance RLS em /auditoria (admin) | run-audit/ + RlsCompliancePanel.tsx |
| edge-maintain | (edge completa, sem cron.schedule) | INATIVO POR DECISAO (nao agendar - tabelas <1 MB; gate de reavaliacao scan-particoes-semanal ja roda; 20261117230000:96-100) | edge-maintain.md + 20261117230000:87-100 |
| edge-fiscal | `fiscal-orchestrator` resposta desonesta + sem retry worker | CONCLUIDO (PR #121) â€” retry SEFAZ com backoff + resposta honesta (`fiscal_events`, "agendado para reprocessamento"); item desatualizado | `fiscal-orchestrator/index.ts:28-63,130-165` |
| edge-bridge | (integracao completa, falta EXTERNAL_DB_URL/KEY em prod) | CONCLUIDO (refutado - nao morto; JWT+allowlist+rate limit em external-db-bridge/index.ts, deploy :100) | validate-bridge.ts |
| edge-suggestion | `ai-supplier-suggestion` sem chamador em src | CONCLUIDO (PR #207, merge 2026-11-20) — AISupplierSuggestion consulta edge real com fallback honesto | AISupplierSuggestion.tsx |
| obs-cron-watchdog | `cron_watchdog()` filtrava 13 nomes de job (11 inexistentes) e **nunca foi agendado** — vigiava 2 de 26 jobs e mesmo esses nunca eram checados | CONCLUIDO (PR #266, 2026-11-22) | Medido em prod: `weekly-procurement-report`, `weekly-summary-report-job` e `cotacao-followup-check` agendados desde `20261121153000` e com `last_run = null`, sem alerta. Passa a vigiar todo job ativo, SLA derivado do `schedule` (3× período, mín. 10 min), dedupe por alerta aberto e auto-resolução. Job `123` `cron-watchdog-15min` ativo |
| obs-system-error | `check_telemetry_alerts()` (TRIGGER em `telemetry_logs`) inseria 1 `SYSTEM_ERROR` por `logger.error`, sem dedupe nem resolução | CONCLUIDO (PR #267, 2026-11-22) | Medido em prod: **450 abertos**, dos quais **421 são a mesma mensagem** `[spot-api] spot-api falhou`. Passa a manter 1 alerta por `(mensagem, tenant)` com `occurrences`/`last_seen`, colapsa backlog (450→10) e auto-resolve o que parou há >24h via `cron_watchdog-15min`. Semântica preservada: todo `logger.error` ainda alerta |
| obs-cron-sla | cron_watchdog() da #266 derivava SLA de 90 dias para jobs semanais e alertava job recém-agendado antes do 1º slot | CONCLUIDO (PR #270, 2026-11-22) | Medido em prod: 8 schedules semanais anunciavam SLA: 129600 min; weekly-procurement-report e weekly-summary-report-job (criados 11-21 15:30, 1º slot 11-23) abriram 2 alertas HIGH falsos em 11:51 de domingo. Parser passa a usar dow>dom>mês (semanais 129600→10140 min, frequentes inalterados), e a tabela cron_watchdog_seen ancora a 1ª observação: sem histórico só alerta após 1 período + 1h. Verificado: 0 falsos positivos, alerta abre com atraso real (observado há 240h), idempotente |
| obs-cron-contrato | Cron contract-expiry-check (07:00 UTC) chamava check-expiry-alerts, a MESMA edge do expiry-alerts-check — nenhum alerta de contrato vencendo/vencido era emitido desde 20261121153000. Corrigido cobrindo contrato na própria edge, já que trocar o comando do job exige DDL em cron.job que o role das migrations não possui | CONCLUIDO (PR desta rodada, 2026-11-22) | Prod: 5 contratos (4 ctive, 1 pending_approval), 12 destinatários (5 admin + 7 buyer) com 	enant_id. Regras puras em check-expiry-alerts/contractExpiry.ts, 14 testes Deno. Job 115 intocado (cron.alter_job/cron.unschedule negados a postgres e a ci_snapshot: ver 20261121180000_fix_owner_crons_negocio.sql:21-28) |
| edge-spot-portal | spot-proxy lia spot_sessions sem filtrar o tipo e invalidava o token da API WS do spot-api ao limpar sessoes antigas (portal e API dividem a mesma tabela) | CONCLUIDO (PR desta rodada, 2026-11-22) | Prod: spot_sessions 94 linhas, 94 tag=spot-api-token e 0 tag=spot-portal-cookie - o lado portal nunca funcionou e cada chamada do spot-proxy podia pegar o token da API como cookie. Regras puras em spot-proxy/sessions.ts, 10 testes Deno; leitura e invalidacao passam a filtrar metadata.tag |
| edge-spot-typecheck | deno check spot-proxy/index.ts falhava com TS2304 (2 erros): action era const dentro do try e o catch fazia typeof action - nenhum guard de CI roda deno check, entao a regressao de tipo passava | CONCLUIDO (PR desta rodada, 2026-11-22) | let action: SpotAction ou undefined declarado antes do try; log usa action ?? unknown. deno check supabase/functions/spot-proxy/index.ts = 0 erros. Suite deno test 127 passed. Varredura em 39 edges: 46 erros herdados em outros arquivos (fora do escopo, anotados) |

## Front - hooks (L07) mortos / parciais
| ID | Item | Estado | Fonte |
|---|---|---|---|
| hk-dead | hooks orfaos (tree-shaken, sem barrel; remocao sem ganho de runtime) | DESCARTADO (arquivamento documentado - NAO remover; useBulkOperations ancorado por teste) | hk-dead-mortos.md |
| hk-fuse | `useFuseSearch` motor Fuse morto, mas `normalizeText` usado por 8 callers | DESCARTADO (manter como hk-dead — arquivo necessario, motor tree-shaken) | `normalizeText`: PendingApprovalsList, enhanced-search, AdvancedSearch, CommandPalette, searchConfig, SupplierChat |
| hk-offline | `useOfflineSync` fila nunca alimentada em runtime, mas wired no OfflineIndicator | DESCARTADO (manter — condicao de origem: sync pendente; motor completo) | `OfflineIndicator.tsx:11` (isOnline/isSyncing/pendingCount/hasPendingOperations) |
| hk-dlq | `useWorkflowDLQ` sem UI de retry | CONCLUIDO - WorkflowDLQPanel em Aprovacoes (retry/descartar/limpar) | `useApprovalWorkflow.ts` + `WorkflowDLQPanel.tsx` |
| hk-badges | `useSidebarBadges` conta tabela errada (`workflow_approvals`) | CONCLUIDO â€” passa a contar `approval_workflows` por `organization_id` | `useSidebarBadges.ts:26` |
| hk-permissions | `DependencyHealthBadge` usa `isAdmin` que nao existe -> nunca renderiza | CONCLUIDO â€” `useAuth().isAdmin` (fonte real), badge passa a renderizar para admin | `DependencyHealthBadge.tsx:102,116` |
| hk-account-filter | `useAccountFilters` upsert tipado (sem cast never) | CONCLUIDO | `useAccountFilters.ts` |
| hk-buyer-perf | `useBuyerPerformanceData` taxa real + economia por fornecedor | CONCLUIDO | `useBuyerPerformanceData.ts` |
| hk-purchase-hist | avgDeliveryDays calculado por entrega real | CONCLUIDO | `usePurchaseHistory.ts` |
| hk-push | `useRealPushNotifications` VAPID placeholder | CONCLUIDO — VAPID vem do env (`VITE_VAPID_PUBLIC_KEY`); sem key não registra (evita gravar endpoints inalcançáveis); SW com handler `push` entregue (#234) | #228 + #234 / `useRealPushNotifications.ts:85-95`, `public/push-handler.js` |
| hk-idle | `useSessionIdleTimeout` catch vazio | DESCARTADO (manter - best-effort intencional: signOut nunca lanca unhandled) | `useSessionIdleTimeout.ts:28-30` |

## Front - componentes/telas (A6) sem acao
| ID | Item | Estado | Fonte |
|---|---|---|---|
| ui-acomp-novos | "NOVA ATUALIZACAO" onClick vazio | CONCLUIDO (PR #185, merge 2026-11-20) | `Acompanhamento.tsx:198` |
| ui-acomp-filtros | "FILTROS AVANCADOS" sem acao | CONCLUIDO (PR #185, merge 2026-11-20) | `Acompanhamento.tsx:298` |
| ui-acomp-nfe | "VISUALIZAR NF-E" sem acao | CONCLUIDO (PR #184, merge 2026-11-20) | `Acompanhamento.tsx:450` |
| ui-acomp-logs | "HISTORICO DE LOGS" sem acao | CONCLUIDO (PR #184, merge 2026-11-20) | `Acompanhamento.tsx:451` |
| ui-spot-checkout | "Finalizar Pedido" SPOT so toast (compromisso financeiro - decisao do dono) | CONCLUIDO (2026-11-22) | `CatalogoSpot.tsx` — botao chama `getCheckoutInfo()` (action `checkout`), abre dialog com total, enderecos cadastrados e `ExternalLink` para a pagina de destino da SPOT (`openExternalSpotUrl`, allowlist de host). Confirmacao final do pedido continua no portal do fornecedor por decisao de negocio. Teste: `src/hooks/__tests__/useSpotIntegration.checkout.test.tsx` (2 casos) |
| ui-bulk-undo | "Desfazer" em bulk so toast | CONCLUIDO | `BulkOperationsPreview.tsx:189` (PR #198) |
| ui-erp-* | varios botoes ERP sem acao | CONCLUIDO (PR #201) | `ERPConnections.tsx` |
| ui-workflow-* | WorkflowAdmin "Novo/Configurar/Regra/Editar" sem acao | CONCLUIDO (PR #193, merge 2026-11-20) | `WorkflowAdmin.tsx` â€” 4 botoes + dialogs de workflow e regra SoD |
| ui-magiclink | "Ver via Magic Link" disabled fixo | CONCLUIDO | `PortalFornecedor.tsx:378` (PR #199) |
| ui-pedidos-com | "E-MAIL CRIPTOGRAFADO"/"HUB"/"REDESPACHO" sem acao | CONCLUIDO | `PedidoDetailsDialog.tsx:193,196,430` (PR #200) |
| ui-exec-dash | carta executive/insights "GERAR PEDIDO PREDITIVO"/"FULL REPORT" sem acao | CONCLUIDO (PR #202) | Anexo A6 items 21-23,43 |

## Docs (A7) - promessas inexistentes
| ID | Item | Estado | Fonte |
|---|---|---|---|
| doc-adr-link | README link `DOCS/ADR/README.md` que nao existe | CONCLUIDO (PR #219) | README.md:27 |
| doc-dev-copy | DeveloperDocs e copia hardcoded de DOCS, nao le arquivos | CONCLUIDO (corrigidas refs obsoletas "Freight Quest" e hook fake useNeuralSolicitacao -> implementacao real em NovaSolicitacaoModal) | `DeveloperDocs.tsx:11,39-53,255` |
| doc-readme-evt | README estrutura nao cita `src/features/*` | CONCLUIDO (README.md:16-23 adiciona src/features com dominios) | `README.md:16-23` |
| doc-marketing | README/ARCH "Pronto 10/10" sem base | CONCLUIDO (PR #219) | README.md / ENGINEERING_EXCELLENCE.md |
| doc-neural | ARCH promete `useNeuralSolicitacao` inexistente (edge existe, draft usa invoke direto) | CONCLUIDO (PR #219) | ARCH:29 / NovaSolicitacaoModal.tsx:109 |
| doc-title | ARCH titulo "Freight Quest" obsoleto | CONCLUIDO (PR #219) | ARCH:1 (main.yml CI name mantido intencional) |
| doc-backup | BACKUP_STRATEGY ja honesto (script/buckets marcados como gap "to be created") | DESCARTADO (ja era honesto) | DOCS/BACKUP_STRATEGY.md:41,143 |
| doc-security | SECURITY.md ja honesto (14 WARNs documentados como divida arquitetural) | DESCARTADO (ja era honesto) | DOCS/SECURITY.md:11,28-80 |
| doc-secdef | get_user_role/has_permission classificados sem chamador | DESCARTADO (da lista de quebra) | secdef-classificacao.md:638 |

Nota: audit listou >150 itens NÃƒO IMPLEMENTADO e ~190 PARCIAL. Este cahier concentra os executaveis em ordem de
impacto; detalhes completos estao em `auditoria-implementacao-261120.md` (Anexos A1-A7). Itens descartados so
recebem registro quando gerada a decisao (evidencia de que ja funciona / escopo fora).

