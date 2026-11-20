# Cahier de pendências — Promo_Supply_V2

Meta do objetivo: CADA item abaixo tem registro final em `docs/pendencias/<ID>-<slug>.md` com estado
(CONCLUIDO / AGUARDANDO HUMANO / DESCARTADO), evidencia (arquivo:linha / diff / saida), camadas (DB/RLS/edge/UI),
regra de negocio, raio de impacto e criterio de validacao. Fases: Fase 0 linha de base (feita), Fase 1 este
catalogo, Fase 2 execucao vertical por item.

## Fios centrais do fluxo de compra (maior valor de negocio)
| ID | Item | Estado | Fonte |
|---|---|---|---|
| fio-1 | Selecao de fornecedor na cotacao nao chama `selectCotacao` | PENDENTE | `useCotacoes.ts:144` / `Cotacao.tsx:55` |
| fio-2 | Aprovar workflow nunca promove `solicitacoes.status` | PENDENTE | `useApprovalWorkflow.ts:201-226` + `20261113122616:91` |
| fio-3 | Kanban de acompanhamento e no-op (toast) | PENDENTE | `Acompanhamento.tsx:144-146,313` |

## Seguranca
| ID | Item | Estado | Fonte |
|---|---|---|---|
| seg-passkey | passkey login valida so `challenge`/`type` (bypass S-1) | PENDENTE | `webauthn-authenticate/index.ts:155-175`; desabilitar botao `Auth.tsx:45` |
| seg-fio-entrada | `process-solicitacao-neural` invocado mas edge NAO EXISTE | PENDENTE | `NovaSolicitacaoModal.tsx:113-114`; `ls functions` vazio |
| seg-tenant-alerts | `useCriticalAlertsBadge` sem tenant/filtro | PENDENTE | `useCriticalAlertsBadge.ts:25-27` |
| seg-mfa-bp | backup codes via `Math.random` | PENDENTE | `useMFA.ts:184` |
| seg-lockout | `useAccountLockout` fail-open | PENDENTE | `useAccountLockout.ts:50-83` |
| seg-scim | `scim-v2` nao em NO_JWT, sem `verify_jwt=false` | PENDENTE | `deploy…sh:109` / `config.toml` |
| seg-punchout | cXML shared_secret nunca validado | PENDENTE | `punchout-receive` vs `punchout-encrypt` |

## Dados ficticios / fachadas que mentem na tela (impacto negocio)
| ID | Item | Estado | Fonte |
|---|---|---|---|
| fake-invoice | `process-invoice-idp` devolve NF por `Math.random` | PENDENTE | `process-invoice-idp/index.ts:53-72` |
| fake-ai-guided | `guided-buying-ai` responde por if/else literais, montado em todo app | PENDENTE | `guided-buying-ai/index.ts:74-104` |
| fake-dash | `useDashboardKPIs`/`useExecutiveDashboardData` literais + Math.random | PENDENTE | Anexo A3/L07 |
| fake-sla | `slaSettingsStore.ts:37` e-mail fixo multi-tenant | PENDENTE | `slaSettingsStore.ts:37` |
| fake-kpi-targets | `kpiTargetsStore` metas fixas sem origem | PENDENTE | `kpiTargetsStore.ts` |

## Edge functions (L10)
| ID | Item | Estado | Fonte |
|---|---|---|---|
| edge-alert-sev | `alert-dispatcher` severidade `.in(["HIGH","CRITICAL"])` vs `critical`/`medium` + canal `webhook` fora do CHECK | PENDENTE | `alert-dispatcher/index.ts:247,337` |
| edge-sla-reve | `check-sla-alerts` regrediu - botao manual manda JWT usuario -> 401 | PENDENTE | `check-sla-alerts/index.ts:88` / `NotificationSettingsPanel.tsx:59` |
| edge-xbz-cron | faltando `cron.schedule('xbz-sync-pedidos-30min')` | PENDENTE | `20260726151043:17,23,44` |
| edge-spot | `spot-api` fora do deploy script | PENDENTE | deploy list vs workflow |
| edge-erp | `erp-sync` stub 501 | PENDENTE (stub honesto) | `erp-sync/index.ts:74-105` |
| edge-ai-risk | `ai-supplier-risk` `const logger` dentro do try -> ReferenceError no catch | PENDENTE | `ai-supplier-risk/index.ts:37-38,162` |
| edge-push | `send-push-notification` morta + VAPID nao usado | PENDENTE | `send-push-notification/index.ts:41-85` |
| edge-audit | `run-audit` sem chamador | PENDENTE | run-audit/ |
| edge-maintain | `maintain-partitions` morta | PENDENTE | seed `:37` |
| edge-fiscal | `fiscal-orchestrator` resposta desonesta + sem retry worker | PENDENTE | `fiscal-orchestrator/index.ts:148-159` |
| edge-bridge | `external-db-bridge` sem chamador prod | PENDENTE | so `validate-bridge.ts` |
| edge-suggestion | `ai-supplier-suggestion` sem chamador em src | PENDENTE | contracts/deploy only |

## Front - hooks (L07) mortos / parciais
| ID | Item | Estado | Fonte |
|---|---|---|---|
| hk-dead | `useBulkOperations/useFlashHighlight/useFormDataProtection/useFormDirty/useUnsavedChangesWarning` e exports orfaos | PENDENTE | Anexo A3 :696-701 |
| hk-fuse | `useFuseSearch` inteiro morto (so `normalizeText` usado) | PENDENTE | `useFuseSearch.ts:83,225,306,329` |
| hk-offline | `useOfflineSync` fila vazia sempre | PENDENTE | `useOfflineSync.ts:98,282` |
| hk-dlq | `useWorkflowDLQ` sem UI de retry | PENDENTE | `useWorkflowDLQ.ts:66,111,117,122` |
| hk-badges | `useSidebarBadges` conta tabela errada (`workflow_approvals`) | PENDENTE | `useSidebarBadges.ts:26` vs `useApprovalWorkflow.ts:114` |
| hk-permissions | `DependencyHealthBadge` usa `isAdmin` que nao existe -> nunca renderiza | PENDENTE | `DependencyHealthBadge.tsx:102,116` |
| hk-account-filter | `useAccountFilters` cast `as never` + error nao checado | PENDENTE | `useAccountFilters.ts:90,223` |
| hk-buyer-perf | `useBuyerPerformanceData` taxa 80 literal + economia 0 | PENDENTE | `useBuyerPerformanceData.ts:222,281` |
| hk-purchase-hist | avgDeliveryDays 0 hardcoded | PENDENTE | `usePurchaseHistory.ts:350` |
| hk-push | `useRealPushNotifications` VAPID placeholder | PENDENTE | `useRealPushNotifications.ts:85-95` |
| hk-idle | `useSessionIdleTimeout` catch vazio | PENDENTE | `useSessionIdleTimeout.ts:28-30` |

## Front - componentes/telas (A6) sem acao
| ID | Item | Estado | Fonte |
|---|---|---|---|
| ui-acomp-novos | "NOVA ATUALIZACAO" onClick vazio | PENDENTE | `Acompanhamento.tsx:198` |
| ui-acomp-filtros | "FILTROS AVANCADOS" sem acao | PENDENTE | `Acompanhamento.tsx:298` |
| ui-acomp-nfe | "VISUALIZAR NF-E" sem acao | PENDENTE | `Acompanhamento.tsx:450` |
| ui-acomp-logs | "HISTORICO DE LOGS" sem acao | PENDENTE | `Acompanhamento.tsx:451` |
| ui-spot-checkout | "Finalizar Pedido" SPOT so toast (compromisso financeiro - decisao do dono) | AGUARDANDO HUMANO | `CatalogoSpot.tsx:216` |
| ui-bulk-undo | "Desfazer" em bulk so toast | PENDENTE | `BulkOperationsPreview.tsx:189` |
| ui-erp-* | varios botoes ERP sem acao | PENDENTE | `ERPConnections.tsx:80,119,159,208,224` |
| ui-workflow-* | WorkflowAdmin "Novo/Configurar/Regra/Editar" sem acao | PENDENTE | `WorkflowAdmin.tsx:54,136,167,204` |
| ui-magiclink | "Ver via Magic Link" disabled fixo | PENDENTE | `PortalFornecedor.tsx:378` |
| ui-pedidos-com | "E-MAIL CRIPTOGRAFADO"/"HUB"/"REDESPACHO" sem acao | PENDENTE | `PedidoDetailsDialog.tsx:193,196,430` |
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

Nota: audit listou >150 itens NÃO IMPLEMENTADO e ~190 PARCIAL. Este cahier concentra os executaveis em ordem de
impacto; detalhes completos estao em `auditoria-implementacao-261120.md` (Anexos A1-A7). Itens descartados so
recebem registro quando gerada a decisao (evidencia de que ja funciona / escopo fora).