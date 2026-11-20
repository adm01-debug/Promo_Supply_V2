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
| fake-invoice | `process-invoice-idp` devolve NF por `Math.random` | CONCLUIDO (PR #177) | `process-invoice-idp/index.ts` determinÃ­stico por hash + `fonte=simulacao`; toast honesto em `DocumentosFiscais.tsx` |
| fake-ai-guided | `guided-buying-ai` responde por if/else literais, montado em todo app | CONCLUIDO (PR #177) | `guided-buying-ai/index.ts` usa `callAIGateway` real com fallback determinÃ­stico |
| fake-dash | `useDashboardKPIs`/`useExecutiveDashboardData` literais + Math.random | CONCLUIDO (PR #181, merge 2026-11-20) | KPI SLA/card fabricado removido; dashboard Executivo/KPIs usam dados reais via RPC; top-5 = 77.5% prod. `kpiTargetsStore` virou metas (objetivos), nao dados simulados |
| fake-sla | `slaSettingsStore.ts:37` e-mail fixo multi-tenant | CONCLUIDO (PR #194, merge 2026-11-20) | default `emailRecipients: []` + seed via `profile.email` em `SLASettingsPanel.tsx` |
| fake-kpi-targets | metas sao objetivos configuráveis (KPITargetsConfig + persist localStorage), não dados simulados | CONCLUIDO | `kpiTargetsStore.ts` |

## Edge functions (L10)
| ID | Item | Estado | Fonte |
|---|---|---|---|
| edge-alert-sev | `alert-dispatcher` severidade `.in(["HIGH","CRITICAL"])` vs `critical`/`medium` + canal `webhook` fora do CHECK | CONCLUIDO (PR #189, merge 2026-11-20) | `alert-dispatcher/index.ts:247,337` |
|  edge-sla-reve | `check-sla-alerts` regrediu - botao manual manda JWT usuario -> 401 | CONCLUIDO (PR #187, merge 2026-11-20) | `check-sla-alerts/index.ts:88` / `NotificationSettingsPanel.tsx:59` |
| edge-xbz-cron | faltando `cron.schedule('xbz-sync-pedidos-30min')` | PR #191 ABERTA (regra 8 - DDL prod, aguardando dono) | `20260726151043:17,23,44` |
| edge-spot | `spot-api` fora do deploy script | CONCLUIDO â€” ACTIVE v14 em prod, deploy via `deploy-edge-functions.yml` (todo push em main com `supabase/functions/**`) | `spot-api/index.ts` + prod list API |
| edge-erp | `erp-sync` stub 501 | PENDENTE (stub honesto) | `erp-sync/index.ts:74-105` |
| edge-ai-risk | `ai-supplier-risk` `const logger` dentro do try -> ReferenceError no catch | CONCLUIDO (PR #190, merge 2026-11-20) | `ai-supplier-risk/index.ts:37-38,162` |
| edge-push | `send-push-notification` morta + VAPID nao usado | PENDENTE | `send-push-notification/index.ts:41-85` |
| edge-audit | `run-audit` sem chamador | PENDENTE | run-audit/ |
| edge-maintain | `maintain-partitions` morta | PENDENTE | seed `:37` |
| edge-fiscal | `fiscal-orchestrator` resposta desonesta + sem retry worker | CONCLUIDO (PR #121) â€” retry SEFAZ com backoff + resposta honesta (`fiscal_events`, "agendado para reprocessamento"); item desatualizado | `fiscal-orchestrator/index.ts:28-63,130-165` |
| edge-bridge | `external-db-bridge` sem chamador prod | PENDENTE | so `validate-bridge.ts` |
| edge-suggestion | `ai-supplier-suggestion` sem chamador em src | PENDENTE | contracts/deploy only |

## Front - hooks (L07) mortos / parciais
| ID | Item | Estado | Fonte |
|---|---|---|---|
| hk-dead | `useBulkOperations/useFlashHighlight/useFormDataProtection/useFormDirty/useUnsavedChangesWarning` e exports orfaos | PENDENTE | Anexo A3 :696-701 |
| hk-fuse | `useFuseSearch` inteiro morto (so `normalizeText` usado) | PENDENTE | `useFuseSearch.ts:83,225,306,329` |
| hk-offline | `useOfflineSync` fila vazia sempre | PENDENTE | `useOfflineSync.ts:98,282` |
| hk-dlq | `useWorkflowDLQ` sem UI de retry | PENDENTE | `useWorkflowDLQ.ts:66,111,117,122` |
| hk-badges | `useSidebarBadges` conta tabela errada (`workflow_approvals`) | CONCLUIDO â€” passa a contar `approval_workflows` por `organization_id` | `useSidebarBadges.ts:26` |
| hk-permissions | `DependencyHealthBadge` usa `isAdmin` que nao existe -> nunca renderiza | CONCLUIDO â€” `useAuth().isAdmin` (fonte real), badge passa a renderizar para admin | `DependencyHealthBadge.tsx:102,116` |
| hk-account-filter | `useAccountFilters` upsert tipado (sem cast never) | CONCLUIDO | `useAccountFilters.ts` |
| hk-buyer-perf | `useBuyerPerformanceData` taxa real + economia por fornecedor | CONCLUIDO | `useBuyerPerformanceData.ts` |
| hk-purchase-hist | avgDeliveryDays calculado por entrega real | CONCLUIDO | `usePurchaseHistory.ts` |
| hk-push | `useRealPushNotifications` VAPID placeholder | PENDENTE | `useRealPushNotifications.ts:85-95` |
| hk-idle | `useSessionIdleTimeout` catch vazio | PENDENTE | `useSessionIdleTimeout.ts:28-30` |

## Front - componentes/telas (A6) sem acao
| ID | Item | Estado | Fonte |
|---|---|---|---|
| ui-acomp-novos | "NOVA ATUALIZACAO" onClick vazio | CONCLUIDO (PR #185, merge 2026-11-20) | `Acompanhamento.tsx:198` |
| ui-acomp-filtros | "FILTROS AVANCADOS" sem acao | CONCLUIDO (PR #185, merge 2026-11-20) | `Acompanhamento.tsx:298` |
| ui-acomp-nfe | "VISUALIZAR NF-E" sem acao | CONCLUIDO (PR #184, merge 2026-11-20) | `Acompanhamento.tsx:450` |
| ui-acomp-logs | "HISTORICO DE LOGS" sem acao | CONCLUIDO (PR #184, merge 2026-11-20) | `Acompanhamento.tsx:451` |
| ui-spot-checkout | "Finalizar Pedido" SPOT so toast (compromisso financeiro - decisao do dono) | AGUARDANDO HUMANO | `CatalogoSpot.tsx:216` |
| ui-bulk-undo | "Desfazer" em bulk so toast | CONCLUIDO | `BulkOperationsPreview.tsx:189` (PR #198) |
| ui-erp-* | varios botoes ERP sem acao | PENDENTE | `ERPConnections.tsx:80,119,159,208,224` |
| ui-workflow-* | WorkflowAdmin "Novo/Configurar/Regra/Editar" sem acao | CONCLUIDO (PR #193, merge 2026-11-20) | `WorkflowAdmin.tsx` â€” 4 botoes + dialogs de workflow e regra SoD |
| ui-magiclink | "Ver via Magic Link" disabled fixo | CONCLUIDO | `PortalFornecedor.tsx:378` (PR #199) |
| ui-pedidos-com | "E-MAIL CRIPTOGRAFADO"/"HUB"/"REDESPACHO" sem acao | CONCLUIDO | `PedidoDetailsDialog.tsx:193,196,430` (PR #200) |
| ui-exec-dash | carta executive/insights "GERAR PEDIDO PREDITIVO"/"FULL REPORT" sem acao | PENDENTE | Anexo A6 items 21-23,43 |

## Docs (A7) - promessas inexistentes
| ID | Item | Estado | Fonte |
|---|---|---|---|
| doc-adr-link | README link `DOCS/ADR/README.md` que nao existe | PENDENTE | README.md:27 |
| doc-dev-copy | DeveloperDocs e copia hardcoded de DOCS, nao le arquivos | PENDENTE | `DeveloperDocs.tsx:10-230` |
| doc-readme-evt | README estrutura nao cita `src/features/*` | PENDENTE | README.md:16-18 |
| doc-marketing | README/ARCH "Pronto 10/10" sem base | PENDENTE (decisao) | README.md:58 |
| doc-neural | ARCH promete `useNeuralSolicitacao` + edge inexistente | PENDENTE | ARCH:84-97 / NovaSolicitacaoModal.tsx:113 |
| doc-title | ARCH titulo "Freight Quest" obsoleto | PENDENTE | ARCH:1 / main.yml:10 |
| doc-backup | BACKUP_STRATEGY promete script/buckets/.env.production inexistentes | PENDENTE | BACKUP:398,426,373 |
| doc-security | SECURITY.md OBSOLETO (14 WARNs vs 154 secdef) | PENDENTE | SECURITY.md:274 |
| doc-secdef | get_user_role/has_permission classificados sem chamador | DESCARTADO (da lista de quebra) | secdef-classificacao.md:638 |

Nota: audit listou >150 itens NÃƒO IMPLEMENTADO e ~190 PARCIAL. Este cahier concentra os executaveis em ordem de
impacto; detalhes completos estao em `auditoria-implementacao-261120.md` (Anexos A1-A7). Itens descartados so
recebem registro quando gerada a decisao (evidencia de que ja funciona / escopo fora).

