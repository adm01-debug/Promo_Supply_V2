# Auditoria: o que foi planejado × o que está implementado — Promo Supply V2

> Data: 2026-11-20 · Código auditado: `main` em `2a86602` · Banco: snapshot gerado da produção `lmypcdfsrgfftzhxawao` (branch `contexto`, 2026-11-20 00:55 UTC).
> Somente leitura. Nada foi alterado em produção, nenhuma migration aplicada, nenhum deploy.
> Toda linha cita `arquivo:linha` do código ATUAL. Linha sem evidência verificável está marcada **NÃO VERIFICADO**.

## 0. Como foi feito

**Fontes de "planejado"** (tudo que a documentação do repositório afirma existir ou promete):

| Fonte | O que contém | Itens extraídos |
|---|---|---|
| `DOCS/ESTADO/L01…L15` (auditoria 2026-08-16) | 532 unidades classificadas ✅/🟨/🟦/⬛ | todos os 🟨/🟦/⬛ + os ✅ que o L15 marca como errados — **~370 itens reverificados um a um** |
| `docs/prod-readiness.md` (auditoria 2026-11-12/14) | §5.1 (67 elementos clicáveis sem ação), §4 (edges bloqueadas), §9 (pendências do dono), §10 (falhas) | reverificados em HEAD |
| `ESTADO_ATUAL.md`, `docs/agentes/regras-dominio.md` | 3 fios cortados, passkey, KPIs fixos, 99 tabelas vazias | reverificados em código e no snapshot do banco |
| `README.md`, `DOCS/ARCHITECTURE_GUIDE.md`, `ENGINEERING_EXCELLENCE.md`, `SECURITY.md`, `BACKUP_STRATEGY.md`, `CODEBASE_ATLAS/*`, `ADR/*`, `AUDITORIA_*`, `AUDIT-COMPREHENSIVE…`, `MELHORIAS_PENDENTES.md`, `.lovable/plan.md`, `docs/agentes/*` | promessas de arquitetura, segurança, backup, testes, backlog | ver §10 |
| Branch `contexto` (gerada do código + banco vivo) | edges órfãs, componentes órfãos, drift migration×types, crons vivos, contagem de linhas, lints, triggers instalados | usada como prova de runtime |

**Verificação própria adicional** (fora do que os documentos listam): cruzamento das 90 tabelas vazias de produção com o código que as usa; 70 cron jobs definidos em migrations × 18 vivos; menu × rotas × `navigate()`; i18n (chaves × telas); RBAC granular; MFA; push; PWA/offline; testes por tipo; deploy automatizado de edges; bateria local de qualidade.

**Bateria local em HEAD `2a86602`** (rodada nesta sessão, após `npm ci`): `npm run typecheck` exit 0 · `npx eslint .` 0 erros / 9 warnings · `npx vitest run` **2328 passed / 12 skipped** (113 arquivos) · `npm run guards` OK (inventário de testes OK, `docs/ci/README.md` bate com os 11 workflows). A qualidade estática está verde; **o problema deste sistema não é código quebrado, é código que não faz o que a tela promete.**

**Limites:** clone raso (51 commits, desde o PR #108) — PRs anteriores não são visíveis no `git log`, então tudo abaixo é o estado do código em HEAD, não histórico. Management API do Supabase recusou o token desta sessão (`Invalid access token`): lista real de edges publicadas e nomes de secrets **NÃO VERIFICADOS**. Nenhum fluxo foi executado em navegador.

---

## 1. Resumo executivo

| Medida | Valor | Fonte |
|---|---|---|
| Itens 🟨/🟦/⬛ de agosto reverificados | **~370** | anexos A1–A5 |
| … que viraram IMPLEMENTADO desde agosto | **~30** (8%) | §12 |
| … que continuam PARCIAL | **~190** | anexos |
| … que continuam NÃO IMPLEMENTADO / mortos | **~150** | anexos |
| Os 3 fios cortados do processo de compra | **3 de 3 continuam cortados** no front | §2 |
| Bypass de login por passkey | **continua** (botão ativo) | §3.1 |
| Tabelas de produção vazias (de 156) | **90** | `docs/prod-readiness.md` §3.3 + `stats.md` |
| … das quais nenhum código do front escreve | **≈45** | §4 |
| Edge functions sem nenhum chamador | **8** (+1 chamada a edge inexistente) | §5 |
| Cron jobs definidos em migrations × vivos em produção | **70 × 18** → 52 nunca agendados/desligados | §6 |
| Elementos clicáveis sem ação / dado fictício em tela | ver §7 | anexo A6 |
| Tabelas cuja coluna existe em produção mas nenhuma migration cria | **50** (`tenant_id` em 48) | §11 |

**Leitura em uma frase:** desde agosto o time consertou segurança de banco, CI, crons de manutenção, deploy e um punhado de botões; **nenhuma das funcionalidades de negócio marcadas como pela metade foi concluída** — seleção de fornecedor, aprovação, acompanhamento, checkout SPOT, workflow engine, contratos, notificações, push, MFA, SSO/SCIM, ERP, IA de nota fiscal e assistente de compras continuam exatamente como descritos em agosto, e várias telas seguem exibindo números inventados como se fossem reais.

---

## 2. Fluxo central de compras — o que não fecha

| # | Passo planejado | Estado | Evidência (HEAD) | O que falta |
|---|---|---|---|---|
| 2.1 | **Selecionar fornecedor vencedor na cotação grava no banco** | **NÃO IMPLEMENTADO (fio cortado)** | `src/pages/cotacao/Cotacao.tsx:65` `useState`; `:267,:268,:276` `onSelecionar={setFornecedorSelecionado}`; `selectCotacao` em `src/features/cotacoes/hooks/useCotacoes.ts:144` tem **0 chamadores** (grep em `src/` = só `:144` e export `:208`); justificativa de `RankingCotacoes.tsx:73` descartada | Chamar `selectCotacao(id, justificativa)` no clique. O banco já está pronto: triggers `trg_cotacao_approved_status` e `trg_auto_transition_on_cotacao_approval` **instalados e ativos** em produção (`origin/contexto:docs/contexto/supabase/tables/public/cotacoes.md`, seção Triggers) — nunca disparam porque o front não grava `selecionada=true` |
| 2.2 | **Aprovar workflow muda status da solicitação** | **NÃO IMPLEMENTADO (fio cortado)** | `src/hooks/useApprovalWorkflow.ts:185-239` grava só `approval_steps/approval_workflows/approval_history`; único `.from('solicitacoes')` é SELECT em `:95`. Triggers vivos em `approval_workflows`: só `a_fill_tenant_id` e `update_approval_workflows_updated_at`; em `approval_steps`: só `a_fill_tenant_id` (snapshot `tables/public/approval_*.md`) | Trigger ou RPC que promova `solicitacoes.status` quando o workflow aprova/rejeita |
| 2.3 | **Kanban de acompanhamento grava mudança de status do pedido** | **NÃO IMPLEMENTADO (fio cortado)** | `src/pages/acompanhamento/Acompanhamento.tsx:144-146` `handleStatusChange = async () => { toast.success(...) }`, passado ao `KanbanBoard` em `:313` | Chamar `usePedidos().updateStatus` |
| 2.4 | Gerar Ordem usa cotação selecionada | PARCIAL | `src/pages/gerar-ordem/GerarOrdem.tsx:105,:177` buscam `c.selecionada` (nunca gravado, ver 2.1); `:112` fallback `fornecedoresData[0]`; `:53` frete `useState(150)`; `:123` `"A DEFINIR"` vai ao PDF/WhatsApp | OC pode sair contra o 1º fornecedor ativo |
| 2.5 | Devolução vinculada ao pedido | PARCIAL | `src/pages/devolucoes/DevolucoesModals.tsx` não tem campo de pedido; `useDevolucoes.ts:116` grava `input.pedido_id` sempre `undefined` | Rastreabilidade pedido↔devolução perdida |
| 2.6 | Recebimento offline | PARCIAL | `src/pages/recebimento/RecebimentoOffline.tsx:247` `every(i => i.quantidade_recebida > 0)` vs online `:160` `>= i.quantidade` — 1 unidade marca `entregue` e dispara `trg_pedido_entregue_status` (ativo em prod) → pagamento e solicitação `concluida` indevidos; observações (`:172,:174`) descartadas | — |
| 2.7 | Badge "Aprovações" na sidebar | PARCIAL (tabela errada) | `src/hooks/useSidebarBadges.ts:26` conta `workflow_approvals` (gravada só pela edge `workflow-engine`), não `approval_workflows` (gravada pela UI) → badge estruturalmente 0 | — |
| 2.8 | Solicitação → IA "neural" | NÃO IMPLEMENTADO (edge inexistente) | `src/components/compras/NovaSolicitacaoModal.tsx:113` e `src/pages/admin/DeveloperDocs.tsx:44` invocam `process-solicitacao-neural`; pasta não existe em `supabase/functions/` | Criar a função ou remover o botão |
| 2.9 | KPIs do Dashboard de Compras | PARCIAL (números fixos) | `src/hooks/useDashboardKPIs.ts:98` sparkline `[]`, `:106 atrasados: 0`, `:107 taxaEntrega: 100`, `:109 totalFornecedores: 0`, `:111 pendingApprovals: 0`, `:117 avgSla: 1.8`, `:118 taxaSlaReal: 85`, `:138-143 sla:{85,82,3,[…]}` → tela `ComprasDashboard.tsx:199-204`, `DashboardInsights.tsx:57-63` | Card SLA sempre 85% |
| 2.10 | Aprovações — KPIs, aba Métricas, fallback do Histórico | NÃO IMPLEMENTADO (mock) | `src/pages/aprovacoes/Aprovacoes.tsx:74-99` lêem `approvalStats` literal de `aprovacoesData.ts`; `:46-49,:199` gráficos de `approvalTrendData` mock; `:139` histórico cai no mock quando o banco está vazio | — |
| 2.11 | Regras/Delegações de aprovação | PARCIAL (IDs fictícios persistidos) | `src/components/compras/approval/ApprovalRuleModal.tsx:14,:22` `mockUsers`/`mockCategories` (`user-1`, `cat-1`) gravados de verdade via `useApprovalRules.ts:71,:75,:111,:115` em `approval_rules`/`approval_delegations` | Aprovador real do banco |
| 2.12 | Seletor de empresa (multiempresa) | PARCIAL (decorativo) | `src/features/auth/hooks/useAuth.tsx:32-40` grava localStorage + invalidate; 0 leituras de `selectedEmpresaId`/`useEmpresaFilter` nas queries (`useEmpresaFilter.ts:27` sem chamador) | Nenhuma query filtra pela empresa escolhida |
| 2.13 | Centro de Custo pai = "Nenhum" | PARCIAL (bug) | `src/pages/configuracoes/ConfiguracoesCentroCusto.tsx:215` `value="none"`, `:109` grava `"none"` em coluna `uuid` → erro ao salvar | — |

---

## 3. Segurança planejada e não entregue

| # | Item | Estado | Evidência |
|---|---|---|---|
| 3.1 | **Login por Passkey verifica assinatura** | **NÃO IMPLEMENTADO — bypass de autenticação latente** | `supabase/functions/webauthn-authenticate/index.ts:155-175` busca credencial só por `credential_id` e compara `challenge`/`type`; 0 ocorrências de `signature`, `crypto.subtle`, `authenticatorData`, `rpIdHash`; `:195` emite magic link. `webauthn-register/index.ts:192` grava `attestationObject` em `public_key` (não é chave COSE). Front: `src/hooks/useWebAuthn.ts:253-261` engole erro do `verifyOtp` e devolve `toast.success` + `success:true`. **Botão continua ativo** em `src/pages/auth/Auth.tsx:45,357-374`. Desarmado só porque `webauthn_credentials` tem 0 linhas em prod |
| 3.2 | MFA/TOTP exigido no login | PARCIAL | `src/hooks/useMFA.ts:106 verifyMFA`, `:203 checkMFARequired` **sem chamadores**; grep `mfa|aal2` em `Auth.tsx`/`features/auth` = 0; `MFASettings.tsx:27-30` pula o passo do QR; backup codes com `Math.random` (`useMFA.ts:184`) nunca lidos |
| 3.3 | Bloqueio/whitelist de IP e geo-restrição aplicados no login | PARCIAL (painéis sem enforcement) | `is_ip_blocked`/`is_ip_whitelisted` só em `types.ts`; `Auth.tsx:104-105` comentário sem checagem; `:114 _ip_address: ''`; `allowed_countries/blocked_countries/geo_settings` lidos só pelos painéis; 0 produtores de `geo_access_logs` e `active_sessions` |
| 3.4 | RBAC granular (matriz de permissões) | PARCIAL (construído, vazio, não aplicado) | `permissions` e `role_permissions` com **0 linhas** em prod; `usePermissions.hasPermission` (`src/hooks/usePermissions.ts:78-90`) retorna `false` para todo não-admin; `PermissionGate` usado em **1** tela (`Seguranca.tsx`); `withPermission` HOC sem chamador (`PermissionGate.tsx:58`). Rotas admin protegidas só por `requiredRole="admin"` |
| 3.5 | Travamento de conta por anônimo | BLOQUEADO (decisão) | `record_failed_login` executável por anon (registrado em `docs/prod-readiness.md` §10.6) — sem mudança |
| 3.6 | SCIM/SSO | NÃO IMPLEMENTADO (token) / PARCIAL | `SSOConfig.tsx:214-216` "Gerar Token SCIM" sem `onClick`; nenhum hook/edge gera token; `scim-v2` fora da lista `NO_JWT_FUNCTIONS` (`deploy_edge_functions_promo_supply.sh:109`) → gateway rejeita Bearer do IdP antes do código; `sso_configurations` 0 linhas |
| 3.7 | Deploy automatizado preserva `verify_jwt=false` | **PARCIAL — regressão latente** | `.github/workflows/deploy-edge-functions.yml:194` `supabase functions deploy "${fn}"` **sem** `--no-verify-jwt`; `supabase/config.toml` só tem `project_id`. Qualquer push que toque `_shared/` ou as 6 funções públicas (`punchout-receive`, `webauthn-authenticate`, `telemetry`, `run-audit`, `system-simulation`, `dependency-health`) religa JWT → webhook PunchOut e passkey ficam 401 no gateway. `docs/agentes/deploy.md:36` cita um `config.toml` com `verify_jwt` que não existe. Runtime NÃO VERIFICADO |
| 3.8 | PunchOut valida `shared_secret` do fornecedor | PARCIAL | `punchout-encrypt` grava o segredo cifrado; `punchout-receive` nunca o lê (grep `shared_secret` em `supabase/functions` fora de `punchout-encrypt` = 0) |
| 3.9 | CORS / rate limit | PARCIAL | `health-dashboard/index.ts:11-12` `Access-Control-Allow-Origin: *`; `_shared/rate_limit.ts:34-37` fail-open |
| 3.10 | Aprovação de reset de senha redefine senha | PARCIAL | `reset_token` só gravado (`usePasswordResetRequests.ts:17,:108`); 0 leituras; nenhuma edge de reset |
| 3.11 | Security logs cobrem login/logout/permissões | PARCIAL | único produtor de `log_security_event`: `webauthn-authenticate/index.ts:218` |
| 3.12 | "Sair" do Command Palette desloga | PARCIAL | `src/features/layout/components/CommandPalette.tsx:168` `navigate("/auth")` sem `signOut` |
| 3.13 | `useAccountLockout` fail-closed | PARCIAL | `src/hooks/useAccountLockout.ts:50-53,:68-71,:80-83` erro de RPC → `locked:false` |
| 3.14 | Sanitização / storage seguro | NÃO USADO | `src/lib/security.ts`, `src/lib/secureStorage.ts` com 0 consumidores; stores persistem em localStorage puro |

---

## 4. Módulos inteiros construídos e nunca ligados (tabela vazia em produção × quem escreve nela)

Fonte: contagem de linhas de `docs/prod-readiness.md` §3.3 (2026-11-12) confirmada por `origin/contexto:docs/contexto/supabase/stats.md` (2026-11-20); referências contadas por grep em `src/` (fora de testes e `types.ts`) e `supabase/functions/`.

| Módulo | Tabelas vazias | Quem escreve no código | Veredito |
|---|---|---|---|
| **Workflow engine** (motor gráfico) | `workflow_instances`, `workflow_nodes`, `workflow_edges`, `workflow_logs`, `workflow_approvals`, `workflow_tasks`, `workflow_audit_log` | só a edge `workflow-engine` (sem chamador de produção — só `system-simulation`, `scripts/stress-test.ts`, `tests/integration_suite.ts`); `workflow_tasks`/`workflow_audit_log` **ninguém**; `WorkflowAdmin.tsx` só lê e tem 4 botões inertes (`:54,:136,:167,:204`), "Designer Canvas" é placeholder (`:152-155`) | **NÃO IMPLEMENTADO** (templates populados pelo #122, motor nunca executa) |
| **Aprovações** | `approval_workflows`, `approval_steps`, `approval_history`, `approval_rules`, `approval_delegations`, `approval_hierarchy` | UI grava (`useApprovalWorkflow`, `useApprovalRules`) mas o fio não promove a solicitação (§2.2); `approval_hierarchy` **ninguém** | PARCIAL |
| **Integração XBZ** | `xbz_credentials`, `xbz_pedidos`, `xbz_pedido_status_history`, `xbz_produtos`, `xbz_cores`, `xbz_produto_fiscal`, `xbz_carrinho_log` | credenciais: diálogo `src/pages/catalogo-xbz/XbzCredenciaisDialog.tsx` existe; sync `xbz-sync-pedidos` agendado (job 23 vivo) mas devolve `results: []`; `xbz_cores`/`xbz_produto_fiscal` **ninguém**; 10 ações do hook sem consumidor (`useXbzIntegration.ts:473-573`) | PARCIAL (sem credencial cadastrada — 0 linhas) |
| **SPOT** — catálogo | `spot_produtos`, `spot_skus`, `spot_estoque` (eram 0; **hoje ~1.3k/3.8k/3.8k linhas**) | crons 31–33 vivos, `spot-api` sincronizando desde ~2026-11-18 (`stats.md`: autovacuum 2026-11-19/20) | **IMPLEMENTADO desde agosto** |
| **SPOT** — pedido/checkout | `spot_pedidos`, `spot_sessions`, `spot_customization_options`, `spot_api_sync_log` (0) | `CatalogoSpot.tsx:216` "Finalizar Pedido" = `toast.info('Em desenvolvimento')`; 6 ações do hook órfãs (`useSpotIntegration.ts:86-166`) | NÃO IMPLEMENTADO |
| **ERP** | `erp_connections`, `erp_sync_log`, `erp_field_mappings` | `erp-sync/index.ts:74-105` grava `pending` e devolve **501**; `ERPConnections.tsx` 5 botões sem handler (`:80,:119,:160,:209,:224`); `erp_field_mappings` **ninguém** | NÃO IMPLEMENTADO (stub honesto) |
| **Notificações in-app** | `notifications` | 0 inserts no front; 4 migrations inserem por trigger (aprovação/sla) que nunca disparam (§2); edges `check-*` gravam mas não estão agendadas (§6) | NÃO IMPLEMENTADO em prática |
| **Push (Web Push)** | `push_subscriptions` | `useRealPushNotifications.ts:85-87` **VAPID placeholder** literal; `send-push-notification` **0 chamadores**, `generateVapidAuth` declarada e não usada (`:41,:84-85`) | NÃO IMPLEMENTADO |
| **Contratos** (corpo) | `contract_items`, `contract_documents`, `contract_penalties`, `contract_history`, `order_contracts` (0; `contracts` tem 5) | `ContractDetailsModal.tsx:223-236` 6 abas, só 4 com conteúdo ("Itens" e "Docs" em branco); `handleUploadDocument :113` sem `<input>`; modal de edição inalcançável (`Contratos.tsx:72,:270`); `DigitalSignature` 100% mock sem tabela | PARCIAL |
| **Sourcing/RFx** — respostas e adjudicação | `sourcing_responses`, `sourcing_response_items`, `sourcing_response_answers`, `sourcing_awards`, `sourcing_pipeline`, `sourcing_event_questions`, `sourcing_invitations` (30 → 0 hoje) | criação de evento grava; respostas/awards **nenhum escritor**; `RFxDetails.tsx:255-265,:307-311` 6 botões inertes; `SourcingPipeline.tsx` KPIs literais (`:67-110`); "Anti-Sniping" só texto (`AuctionRoom.tsx:235`) | PARCIAL |
| **Leilão (sourcing)** | `auction_bids` | **ninguém** (o leilão de `licitacoes` usa `licitacao_lances`, que funciona) | NÃO IMPLEMENTADO |
| **Orçamento** (transações) | `budget_transactions`, `spend_forecasts`, `financial_audit_logs`, `payment_history` | `budget_transactions` sem INSERT em código nem migration; `spend_forecasts` só teste; `payment_history` só leitura | PARCIAL |
| **Recebimento com checklist** | `receiving_checklists` | só teste RLS; `ReceivingModal` removido (#137 portou a regra para `pedidoComplementar.ts`) | NÃO IMPLEMENTADO |
| **IA persistida** | `negotiation_analyses`, `repurchase_suggestions` (0) | front grava (`NegociacaoIA.tsx:101`, `RecompraInteligente.tsx:156`) — módulos funcionam mas nunca foram usados; edges `ai-*` dependem de `OPENROUTER_API_KEY` (**existência do secret NÃO VERIFICADA**) | PARCIAL |
| **Segurança avançada** | `mfa_settings`, `webauthn_*`, `sso_configurations`, `scim_provisioning_log`, `active_sessions`, `geo_access_logs`, `security_logs`, `ip_whitelist`, `allowed/blocked_countries`, `password_reset_requests`, `secret_rotation_schedule` | ver §3; `scim_provisioning_log` e `secret_rotation_schedule` **ninguém** escreve | PARCIAL |
| **Multiorganização** | `user_organizations` | 0 referências em `src/` e edges (5 migrations) | NÃO IMPLEMENTADO |
| **Fiscal (SEFAZ)** | `aliquotas_tributarias` (0 refs), `fiscal_documents` (20, via IDP mock) | `fiscal-orchestrator` sem chamador; `FiscalDashboard.tsx:48,:49,:60,:61,:90` literais ("SEFAZ: Online", `128`, `1.4s`) | NÃO IMPLEMENTADO |
| **Monitores de banco** (Ondas 18–21, 77–84) | `deadlock_snapshots`, `table_size_snapshots`, `wal_rate_snapshots`, `checkpoint_snapshots`, `health_scan_runs`, `dependency_health*` | funções `scan_*` existem; **nenhum `scan-*` agendado em produção** (§6) exceto `scan-particoes-semanal` | PARCIAL |
| **Dashboards personalizáveis** | `dashboard_layouts`, `dashboard_filter_favorites` | `ComprasDashboard.tsx:87` `saveToDb` nunca chamado; `DraggableDashboard`/`FilterFavoritesManager` importados e não renderizados (`:30,:33`) | NÃO IMPLEMENTADO |
| **Qualificação de fornecedor / estratégia** | `category_strategies`, `supplier_bonifications`, `penalty_escalation_config`, `produto_fornecedores` | painéis existem; `KraljicMatrix.tsx:104-105` cai em fallback de exemplo silencioso; `produto_fornecedores` 0 linhas alimenta `PriceComparator`/`ProductionRoutingEngine` | PARCIAL |
| **Portal do Fornecedor** | — | rota `/portal-fornecedor` sem entrada de menu (só breadcrumbs); aba "Sourcing" com `<Button disabled>Ver via Magic Link` (`PortalFornecedor.tsx:372-378`); fluxo de magic link não existe | PARCIAL |
| **PunchOut** | `punchout_catalogs` (4), `punchout_sessions` (0) | CRUD de catálogo entregue (#139); `punchout-setup/index.ts:103` devolve `mock_redirect` em vez de POSTar cXML ao fornecedor | PARCIAL |

---

## 5. Edge functions (37 pastas)

**Sem nenhum chamador** (nem front, nem cron vivo, nem outra edge): `ai-supplier-suggestion`, `alert-dispatcher`¹, `fiscal-orchestrator`, `maintain-partitions`, `process-outbox`¹, `run-audit`, `send-push-notification`, `workflow-engine`. ¹ `alert-dispatcher` e `process-outbox` têm invocador SQL (`_invoke_edge_function`): `process-outbox` roda (job 18 vivo); `alert-dispatcher-1min` **não está** na lista de crons vivos.

**Chamada a edge inexistente:** `process-solicitacao-neural` (`NovaSolicitacaoModal.tsx:113`, `DeveloperDocs.tsx:44`).

**Fachadas (dado inventado apresentado como real):**

| Edge | Evidência | Efeito |
|---|---|---|
| `process-invoice-idp` | `index.ts:53` "simulando extração IA", `:57-72` `mockExtractedData` com `Math.random()`, chave fixa, `valor_total: 1250.50` | `/documentos-fiscais` grava NF inventada com `status: "validada"` e `tenant_id` sentinela (`DocumentosFiscais.tsx:27,:97,:136,:152`) |
| `guided-buying-ai` | `index.ts:74` `systemPrompt` nunca usado; `:99-104` if/else por substring com "Dell"/"Stricker" literais | assistente montado em **todo o app** (`MainLayout.tsx` → `GuidedBuyingAssistant`) |
| `erp-sync` | `:74-105` devolve 501 | stub honesto |

**Parciais:** `ai-supplier-risk` (`logger` declarado dentro do `try` e usado no `catch` `:37-38,:162-163` → `ReferenceError` em todo erro); `alert-dispatcher` filtra `["HIGH","CRITICAL"]` (`:247`) enquanto `process-outbox:114` grava `"critical"` e `xbz-sync-pedidos:125` `"medium"` → alertas de DLQ/XBZ nunca despachados; canal `webhook` (`:337`) fora do CHECK da tabela; `check-sla-alerts` botão manual (`NotificationSettingsPanel.tsx:59`) agora recebe 401 porque `verifyCronSecret` virou fail-closed; `system-simulation` envia `action:"approve_step"` que `workflow-engine` não aceita (`:47` vs `workflow-engine/index.ts:47,105,143`) e o front lê `data.success` que a edge não devolve (`AdminTelemetria.tsx:70` vs `system-simulation/index.ts:110-112`); `fiscal-orchestrator` devolve `success:true` em falha (`:148,:158-159`) sem reprocessador; `punchout-setup` `mock_redirect`.

**Deploy:** script manual lista 31 de 37 (faltam `spot-api`, `xbz-proxy`, `xbz-sync-pedidos`, `maintain-partitions`, `health-dashboard`, `punchout-encrypt`); workflow automático cobre por diff mas sem `--no-verify-jwt` (§3.7). `supabase/functions/tests/fuzzing_suite.ts` e `integration_suite.ts` não têm sufixo `*_test.ts` → **nunca executam** no `deno test` do CI (o plano `.lovable/plan.md §1` "fuzzing suite" é código morto). Edges com teste próprio: 7 de 37.

---

## 6. Automação agendada: 70 jobs em migrations × 18 vivos

Vivos (`origin/contexto:docs/contexto/supabase/cron.md`): 11 de limpeza/manutenção, `outbox-worker-1min`, `refresh-mv-dashboard-kpis`, `lgpd_retention_daily`, `xbz-sync-pedidos-30min`, `xbz-sync-watchdog-hourly`, `spot-api-sync-{catalog,customization,stock}`, `scan-particoes-semanal`.

**Definidos em migrations e NÃO agendados em produção (52):**

- *Negócio:* `alert-dispatcher-1min`, `approval-escalation-check`, `contract-expiry-check`, `cotacao-followup-check`, `expiry-alerts-check`, `sla-alert-check`/`sla-alerts-check`, `weekly-procurement-report`, `weekly-summary-report-job` → **nenhum alerta de SLA, vencimento, follow-up de cotação, escalonamento de aprovação ou relatório semanal é emitido**. As edges correspondentes existem e respondem 200 ao ping.
- *Segurança/LGPD:* `check_secret_rotation_due_daily`, `cleanup_expired_password_resets_daily`, `security_definer_drift_quarterly`, `cleanup-login-attempts`, `cleanup-security-logs-daily`, `cleanup-geo-access-logs`.
- *Observabilidade (Ondas 18–21, 77–84 de `MELHORIAS_PENDENTES.md`):* `run-all-health-scans-hourly` e **todos** os `scan-*` (xid-wraparound, replication-slots, invalid-dup-indexes, unused-indexes, rollback-rate, connection-saturation, cache-hit-ratio, long-running-queries, unindexed-fks, blocking-locks, temp-spill, idle-in-txn, slow-query-hotspots, autovacuum-starvation, deadlocks, lock-waits, sequence-exhaustion, tables-without-pk, toast-bloat, schema-hygiene, table-growth, stale-alerts, scan-runs-sla), `cron-watchdog`, `pg-activity-watchdog`.
- *Particionamento:* `ensure-*-next-partition`, `archive-*-old-partitions` — declarado "INATIVO POR DECISÃO" em `20261117230000_retencao_fonte_unica.sql:96`.

Parte desse desligamento foi deliberado e documentado (`20261117230000`: 4 crons de retenção concorrente; `20261117170000`: particionamento). **Para os jobs de negócio e de segurança não há registro de decisão** — `MELHORIAS_PENDENTES.md` ainda os descreve como ativos ("OBS-01: alert-dispatcher + cron 1min", "CRON: 5 jobs auto-invocados").

---

## 7. Telas: botões sem ação e dado fictício

Reverificação dos 67 elementos de `docs/prod-readiness.md` §5.1 + varredura própria em 274 `.tsx` (detalhe no anexo A6).

| Estado | Qtd | Itens |
|---|---|---|
| **LIGADO desde 12/11** | 2 | PunchOut "Novo Catálogo" e engrenagem (`PunchOutCatalogs.tsx:171,:210`, PR #139) |
| **SÓ TOAST** (finge executar) | 2 + 7 novos | `CatalogoSpot.tsx:216` Finalizar Pedido; `BulkOperationsPreview.tsx:189` Desfazer; **novos:** `UrgencyDetailsSheet.tsx:217` "Escalar para Gerência" e `:291` "Alertar Comprador" dizem "notificação enviada" sem enviar; `NegociacaoIA.tsx:441,:448` WhatsApp/E-mail; `HistoricoCompras.tsx:214` "Desfazer Global"; `PriceComparator.tsx:377` "Disparar RFQ" |
| **DISABLED FIXO** | 1 | `PortalFornecedor.tsx:378` "Ver via Magic Link" |
| **SEM AÇÃO** | 62 + 5 novos | 56 em telas vivas; 6 em código morto (`SourcingHistoryConsole.tsx` ×5, `EnhancedPedidoTimeline.tsx:294`); **novos:** `HeaderActions.tsx:121-128` "Ver tour" (`onRestartTour={() => {}}` em `MainLayout.tsx:149`), `CommandPalette.tsx:144,:145,:165,:167` Exportar/Importar/Notificações/Ajuda |
| **Provável bug** (NÃO VERIFICADO em browser) | 1 | `DocumentosFiscais.tsx:261` "Importar PDF (IA)": `<Button>` dentro de `<label>` sem `asChild` (o botão XML ao lado usa `asChild`) — clique provavelmente não abre o seletor de arquivo |

Por tela (sem ação / só toast): `/acompanhamento` 4 · `/admin/erp` 5 · `/admin/workflows` 4 · `/admin/sso` 1 · `/sourcing/:id` 6 · `/sourcing` 1 · `/pedidos` detalhe 4 · `/relatorios` 3 · `/historico-compras` 3 · `/solicitacoes` 8 (IAAdvisor ×2, BulkPlanningConsole ×3, SolicitacaoCard ×3) · `/compras` 2 · `/dashboard-executivo` 1 · `/negociacao-ia` 3 · `/estoque` 1 · `/contratos` 1 · `/aprovacoes` 1 · `/cotacao`+`/fornecedores` 1 · `/catalogo-spot` 1 · `/portal-fornecedor` 1 · chat global (`ChatArea.tsx`) 8 · header/⌘K 7.

**Dado fictício renderizado em produção (14 fontes; 2 mortas):**

| # | Fonte | O que é inventado | Onde aparece |
|---|---|---|---|
| C1 | `executive/executiveDashboardData.ts:3-156` | métricas, séries mensais, fornecedores, pendências, opções de filtro; `ExecutiveChartsRow.tsx:73-91` multiplica por 0.4/0.3 "to show visual change" | **/dashboard-executivo** (gráficos de tendência 100% fictícios) |
| C2 | `procurement-kpis/kpiMockData.ts` (53 usos) | todos os 8 KPIs (ROI 4.2, maverick R$ 187.500, compliance 78%…) | **/relatorios** aba KPIs |
| C3 | `SLABySupplierAnalysis.tsx:44-56` + `slaAnalysisData.ts:31-69` | fornecedores "XBZ Brindes", "Stricker"… com `Math.random` — muda a cada F5 | **/relatorios** aba geral |
| C4 | `AISupplierSuggestion.tsx:35,40-43` | "12 qualified suppliers", "AluTech Indústria 98%" | **/cotacao**, **/fornecedores** |
| C5 | `BulkPlanningConsole.tsx:23-66` | lotes, preços-alvo, frete | **/solicitacoes**, **/dashboard-executivo** |
| C6 | `digital-signature/signatureHelpers.ts:16` | pedidos de assinatura | **/contratos** |
| C7 | `DynamicApprovalMatrix.tsx:15-27`, `ApprovalRuleModal.tsx:14-28`, `ApprovalDelegationModal.tsx:12-18` | aprovadores/categorias (`user-1…5`) — **gravados no banco** | **/aprovacoes**, **/solicitacoes** |
| C8 | `SupplierInteractionLog.tsx:16` | conversa com fornecedor | **/pedidos** detalhe |
| C9 | `SolicitacaoCard.tsx:286-299` | "Neural Context Thread" @João Silva "há 2h" | **/solicitacoes** |
| C10 | `SupplierIntelligenceConsole.tsx:168-171,:21` | "Alumínio deve subir 8%"; eixo Y arbitrário | **/historico-compras** analytics |
| C11 | `HistoricoSourcingTab.tsx:285-320` | Target Price = ×0.92, Economia = ×0.08, "+4.2%" | **/historico-compras** sourcing |
| C12 | `cotacaoHelpers.ts:123-168 simulateAPISearch` | cotações "descobertas" aleatórias (consulta a `produto_fornecedores` é lida e ignorada) | **/cotacao** "START AUTO SEARCH" |
| C13 | `price-comparator/priceComparatorHelpers.ts:45-75` | preço/prazo/estoque/rating aleatórios | **/fornecedores** |
| C14 | `ExecutiveAIInsights.tsx:37,60,85`, `DashboardInsights.tsx:41-49,:103` | benchmarks fixos ("média do setor 18%", "98% documentação em dia") | **/dashboard-executivo**, **/compras** |
| — | `FiscalDashboard.tsx:48-91`, `SourcingPipeline.tsx:67-110`, `Sourcing.tsx:72-99`, `NegociacaoIA.tsx:148,:485-516`, `Aprovacoes.tsx` (`aprovacoesData.ts`), `Pedidos.tsx:155,:294-305` (SLA por índice da linha), `Seguranca.tsx:208-232`, `WorkflowAdmin.tsx:85,:94`, `DeveloperDocs.tsx:380-392`, `VisualComparadorCotacoes.tsx:95-98` ("confiança 94%"), `PriceHistoryModal.tsx:227`, `PurchaseClimateWidget.tsx:120`, `BuscaAutomatica.tsx:18-21`, `KraljicMatrix.tsx:104-105` (fallback silencioso), `RiskHeatMap.tsx:95-99`, `SourcingIntelligenceWidget.tsx:32-41`, `SupplierEcosystemSection.tsx` (estrelas sempre vazias), `deliveryCalendarHelpers.ts:150` (tipo por índice), `SupplierChat.tsx:69` (online por índice) | KPIs, badges e rótulos literais | diversas |

---

## 8. Código morto (existe, nenhum caminho de execução alcança)

**Componentes sem importador** (`origin/contexto:docs/contexto/codigo/componentes.json` + grep): `src/components/compras/SourcingHistoryConsole.tsx` (972 linhas), `HistoricoComprasModal.tsx`, `OrderPreviewModal.tsx`, `EnhancedPedidoTimeline.tsx`, `compras/MainLayout.tsx` (shim), `fornecedores/FornecedorMobileCard.tsx`, `mobile/SwipeableListItem.tsx:279 SwipeableTableRow`, `atoms/EliteImage.tsx`, `atoms/PreloadLink.tsx`, `molecules/EliteFormField.tsx`, `organisms/Organism.tsx` (+ cadeia `Atom`→`Molecule`), `ui/sidebar.tsx`, `ui/form.tsx`, `ui/kbd.tsx`, `ui/status-indicators.tsx` (802 linhas), `SLADistributionChart` (só `lazy`, sem `case`), `TargetProgressRing`, `LiveRegion` ×2, `DistributionCharts` (`RelatoriosCharts.tsx:165`), `HistoricoDrilldownModal` (inalcançável), 16 exports de `animations/MotionComponents.tsx`, 8 widgets do `switch` de `ComprasDashboard.tsx:258-266` sem chamador.

**Hooks sem importador:** `src/hooks/useBulkOperations.ts`, `useFlashHighlight.ts`, `useFormDataProtection.ts`, `useFormDirty.ts`, `useUnsavedChangesWarning.ts`; símbolos: `useEmpresaFilter`, `useSolicitacoesKPIs`, `useFocusTrap`, `useUndoableAction`, `useLongPress`, `useTrackPageView`, `shortcutsList`, `useFuseSearch`/`useMultiCollectionSearch`/`createSearchIndex`/`HighlightedText`, `addPendingOperation`/`withOfflineSupport` (a fila offline **nunca recebe operação**), `retryEntry`/`removeEntry`/`clearDLQ`/`retryableEntries` (DLQ sem UI), `XbzRequestError`/`getXbzSavedRatio`/`clearXbzStaticCache`, `use-toast.ts reducer`, `recentItemType*`.

**Lib/stores sem consumidor:** `src/lib/security.ts`, `secureStorage.ts`, `supabaseRpc.ts`; 4 exports de `dbMapping.ts`; `solicitacaoColumns`/`fornecedorColumns`/`cotacaoColumns`/`pagamentoColumns` de `exportData.ts`; `getCompressedPreviewUrl`; `buyerAlertsStore.loadTargetsFromDb` (painel de alertas do comprador **nunca alerta**).

**Mocks mortos com teste:** `relatorioNegociacoesData.ts`, `pending-approvals/pendingApprovalsData.ts:22 mockPendingApprovals`.

**Edges mortas:** ver §5. **Funções SQL não agendadas:** ver §6.

**Imports mortos** em `ComprasDashboard.tsx:12,16,30,33,41,48`, `Seguranca.tsx:1,3`, `ConfiguracoesCentroCusto.tsx:2`, `SourcingPipeline.tsx:7-8`, `CatalogoSpot.tsx:2`, `PortalFornecedor.tsx:9`, `QualificacaoFornecedores.tsx:2`, `Licitacoes.tsx:16`, `Pagamentos.tsx:12,21-30,34,55,56`, `useSolicitacoes.ts:9`, `HistoricoCompras.tsx:33,55,61,62`.

---

## 9. Hooks, features e lib ainda parciais (resumo; detalhe nos anexos A4–A5)

- `useAccountFilters.ts:90,:223` upsert sem ler `error`; `useBuyerPerformanceData.ts:222` taxa 80 literal, `:281-296` `economia: 0`; `useCriticalAlertsBadge` sem tenant; `useExecutiveDashboardData.ts:153-154` maverick/tail "Simulated" alimentam KPIs e "insights de IA"; `useFuseSearch` motor inteiro sem uso; `useOfflineSync` fila vazia para sempre; `usePurchaseHistory.ts:350 avgDeliveryDays: 0`; `useSessionIdleTimeout.ts:28-30` catch vazio; `useWorkflowDLQ` sem UI; `usePermissions` não expõe `isAdmin` → `DependencyHealthBadge.tsx:102-116` nunca renderiza; `useDevolucoes.ts:65,:230,:299` tenant sentinela; `useMFA.ts:184` `Math.random`.
- `features/layout`: `MainLayout.tsx:90,:97` / `AppSidebar.tsx:342` classe Tailwind inválida `ease-&lsqb;`; `onRestartTour={() => {}}` (`MainLayout.tsx:149`); 8 páginas aninham `MainLayout` dentro de `Shell`; `CommandPalette.tsx:117-129` badges literais, `:144-167` 5 `action: () => {}`; `UserMenu.tsx:76-82` "Meu Perfil"/"Configurações" sem ação (sem rota `/perfil`/`/configuracoes`); `AdvancedSearch.tsx:119-123` `ilike` sem escape e sem tenant; FAB sobreposto (`QuickActionsFAB.tsx:116` = `GuidedBuyingAssistant.tsx:37`); `QuickActionsFAB.tsx:88-89` dispara atalho em `window` com listener em `document`; `SupplierChat.tsx:69 online: index % 3 === 0`; `SupplierThresholdConfig.tsx:10-17 KNOWN_SUPPLIERS` fixo; `SLASettingsPanel.tsx:269` "Notificações por Email (Mock)" e `slaSettingsStore.ts:37` destinatário fixo.
- `features/solicitacoes`: `useSolicitacoesKPIs` sem chamador; `bulkUpdateStatus:270-283` e `usePedidos.bulkUpdateStatus:232-246` sem validar transição; `SolicitacaoStatusSchema` só em teste.
- `src/lib/logger.ts:61,64,68` console comentado (zero saída em DEV); `src/i18n`: **74 chaves**, `useTranslation` em **3 de 334** telas/componentes — a promessa "multi-idioma PT/EN/ES" do `README.md` cobre ~1% da UI; `CatalogoProdutos.tsx:149-153` usa chaves inexistentes (`catalog.*`, `common.new`); `kpiTargetsStore.ts` 8 metas literais em `persist` (sem tabela de metas); feature flags (`VITE_ENABLE_*` do `.env.example`) nunca lidas.

---

## 10. Promessas da documentação não cumpridas

38 documentos lidos integralmente (detalhe por documento no anexo A7). Além da tabela abaixo, os seguintes planos/afirmações **não têm correspondência no código**:

- **Integrações declaradas e inexistentes:** Bitrix24, Banco Inter e WhatsApp marcadas "OK" em `DOCS/AUDITORIA_BACKEND.md:99-105` e no `CODEBASE_ATLAS/01` — zero código (só a string `target: 'bitrix' | 'inter' | 'whatsapp'` em `process-outbox/index.ts:24`); o backlog INT-03/INT-04 de `MELHORIAS_PENDENTES.md` refere-se a elas. `AUDITORIA_BACKEND_V3.md` (R-01) cita edges `pagamentos-baixa`, `pedido-fracionar`, `estoque-movimentar` que nunca existiram.
- **Backup só no papel (`DOCS/BACKUP_STRATEGY.md`):** `scripts/backup-db.sh` "to be created" não existe; cron de espelhamento de buckets `nf-e`/`contratos`/`receipts` não existe e os buckets reais são outros; `.env.production` não existe; runbook mensal e changelog nunca criados; PITR/retention NÃO VERIFICÁVEL pelo repo.
- **Testes prometidos e não entregues:** `AUDITORIA_QA_2026Q3.md` planeja 6 specs `tests-e2e/simulations/*` (rfx-lifecycle, reverse-auction, contract-penalties, three-way-match, multi-tenant-switch, mobile-nav) — pasta não existe; `.lovable/plan.md` promete testes de `erp-sync`/`ai-negotiation` e mocks globais ERP/fiscal — não existem; `MELHORIAS_PENDENTES.md` TEST-03 afirma "`tests-rls` no CI" — nenhum workflow roda `vitest.rls.config.ts`; "`db-explain-analyze` falha CI se > 250ms" e "`realtime-audit` bloqueia PR" — nenhum workflow chama esses scripts; `fuzzing_suite.ts` não é coletado pelo `deno test`.
- **Monitores SQL (Ondas 10–21, 77–84):** todas as 37 funções `scan_*` e tabelas `*_snapshots` existem em migrations/`types.ts`, mas nenhum dos crons correspondentes está vivo (§6); os nomes das Ondas 10–12 citados no `CODEBASE_ATLAS/09` (`scan-wal-generation-rate-5min`, `scan-checkpoint-health-5min`, `scan-replication-lag-5min`) nem sequer têm `cron.schedule` em migration. O Atlas fala em "43 jobs"; `secdef-classificacao.md` mediu 20; hoje são 18.
- **`CODEBASE_ATLAS` desatualizado em contagens e riscos:** "32 edges"/"123 tabelas"/"46 rotas" (hoje 37/163/55); `10_TESTES_CI.md` cita `.github/workflows/ci.yml` (não existe) e `tsgo`; riscos "sem allowlist" do `external-db-bridge` e "sem JWT" de `run-audit`/`process-invoice-idp` já corrigidos; IA descrita como Lovable Gateway (é OpenRouter); `cleanup_old_audit_logs` listada (dropada em `20261117190000`); `06_UI_COMPONENTS.md` diz que `ai-supplier-suggestion` é acionada em NegociacaoIA (não é — edge morta); `03_FRONTEND_MAP.md` sem `/catalogo-xbz`, `/admin/health`, `/admin/health/alerts/:id`.
- **`DOCS/SECURITY.md`:** "14 WARNs" de SECURITY DEFINER (eram 154 em 11/2026, revogados em `20261112171300`); `get_user_role`/`has_permission` descritas como usadas pela UI (não têm chamador); revisão trimestral com tools da Lovable (`supabase--linter`) que não existem no repo; "última auditoria 2026-06-19".
- **ADRs:** `0001` prevê `services/` e `schemas/` por feature — só `auth` e `solicitacoes` têm `schemas/`, nenhuma tem `services/`, ~60 hooks seguem em `src/hooks/` (migração parada); `0002` cita papéis "Administrador > Gerente > Comprador > Solicitante" — reais: `admin | coordinator | buyer | finance | viewer | supplier`.
- **`AUDITORIA_BACKEND_V2.md`:** A-03 `SupplierRiskContract` nunca criado; A-04/A-05 (desmockar IDP e guided-buying) não feitos; A-11 `generate-contract-pdf` continua gerando HTML; A-12 `data_retention_policies` nunca criada (solução adotada foi outra: `apply_lgpd_retention`).
- **`DOCS/ENGINEERING_EXCELLENCE.md`:** "Storybook" e "Edge Cache headers" (próximos passos) não existem; "Status 10/10 certificado" contradiz os achados acima.
- **`DOCS/RUNBOOKS`:** template manda duplicar um runbook por migration — 314 migrations, 0 runbooks.
- **`docs/conventions/pages-directory.md`:** 10 arquivos "tracked for migration" para `src/components/` continuam em `src/pages/`; `linting-roadmap.md` e `eslint-plugin-boundaries` citados não existem.
- **`inventario/README.md`:** `banco.json` e `tabelas-uso.json` nunca gerados; `rotas.json` desatualizado (`gerar-rotas.mjs --check` falha); texto ainda diz que `config.toml` aponta `trwgmplubeqxrxpncdgf` (já corrigido).
- **`DOCS/AUDIT-COMPREHENSIVE-SYSTEM-REPORT.md` ainda abertos:** F-014 `check-expiry-alerts` sem `verifyCronSecret`; F-023 polling `setInterval` em `useApprovalWorkflow.ts:315` convive com a edge de escalonamento; F-020 CSV sem proteção a formula injection (NÃO VERIFICADO em detalhe); F-046 i18n; F-049 componentes não-rota em `src/pages`; F-051 sem banco de teste.

Já confirmado nesta sessão, independentemente do anexo:

| Doc | Promessa | Estado | Evidência |
|---|---|---|---|
| `README.md` | "MFA & Passkeys" | PARCIAL / inseguro | §3.1–3.2 |
| `README.md` | "Multi-idioma PT-BR, EN, ES" | PARCIAL (~1%) | §9 |
| `README.md` | "Documentação disponível dentro do sistema no painel administrativo" | PARCIAL | `src/pages/admin/DeveloperDocs.tsx:11,:255` strings "Freight Quest" congeladas no bundle; `:259` "Ver Repo" abre `https://github.com`; `:380-392` "Status do Projeto" sem medição |
| `README.md` | link `DOCS/ADR/README.md` | NÃO EXISTE | `ls DOCS/ADR` = 2 arquivos |
| `README.md` | "Pronto para produção. Blindagem 10/10." | não corresponde | este relatório |
| `DOCS/MELHORIAS_PENDENTES.md` | "OBS-01: alert-dispatcher + cron 1min", "CRON: 5 jobs auto-invocados", Ondas 18–21/77–84 agendadas | NÃO (em produção) | §6 — nenhum desses crons está vivo |
| `DOCS/MELHORIAS_PENDENTES.md` | backlog M-04, INT-03/04/05, TEST-02 | PENDENTES (declarados) | — |
| `.lovable/plan.md` | fuzzing suite executada; testes de `erp-sync`/`ai-negotiation`; mocks globais ERP/fiscal; E2E "solicitação → aprovação → contrato"; stress test | PARCIAL | `supabase/functions/tests/*` nunca roda (§5); `erp-sync`, `ai-*` sem teste; E2E existe (9 specs) mas sem fluxo aprovação→contrato (NÃO VERIFICADO em detalhe); `scripts/stress-test.ts` existe |
| `AGENTS.md` | "`.env` está comitado" | DESATUALIZADO | `.env` removido e ignorado (#126) — `npm run dev`/`test:rls` agora exigem `.env` local |
| `AGENTS.md` | "São 7 workflows" / "Edge: deploy manual, nenhum workflow publica edge" | DESATUALIZADO | 11 workflows; `deploy-edge-functions.yml` publica no merge (#123) |
| `AGENTS.md` / `mapa-repo.md` | "39 pastas de edge" | DESATUALIZADO | 37 (+`_shared`, `tests`) |
| `docs/agentes/deploy.md:36-39` | `config.toml` declara `verify_jwt` | NÃO EXISTE | `supabase/config.toml` = 1 linha |
| `docs/agentes/mapa-repo.md` | "`inventario/estado/banco.json` não existe ainda" | CONFIRMADO pendente | `ls inventario/estado` = `edges.json`, `rotas.json` |
| `docs/agentes/mapa-repo.md` | scripts na raiz de `scripts/` e `scripts/inventario/` sem README | CONFIRMADO pendente | 10 arquivos soltos; `scripts/inventario/` sem README |
| `docs/prod-readiness.md` §8.1 | "Aprovar cotação (`selectCotacao`) → aprovada … provado no banco vivo" | **PARCIAL** | provado no **banco** (trigger funciona quando `selecionada=true` é gravado por SQL); o **front nunca chama `selectCotacao`** (§2.1) — o usuário não consegue reproduzir |
| `docs/prod-readiness.md` §0 | "Fluxo de compra completo OK" | PARCIAL | idem; Kanban e aprovação continuam cortados (§2.2–2.3) |
| `ESTADO_ATUAL.md` §3 | "typecheck verifica 0 arquivos", "CI vermelho", "RLS Audit no-op" | **CORRIGIDOS** | `package.json:30` `tsc -p tsconfig.app.json && -p tsconfig.node.json`; `main.yml:51-58` `rls-audit.ts --strict` com `SUPABASE_DB_URL`; bateria local verde |

---

## 11. Ambiente, banco e CI

| Item | Estado | Evidência |
|---|---|---|
| Ledger de migrations | NÃO EXISTE | `supabase_migrations.schema_migrations` ausente (prod-readiness §3.2); 314 arquivos sem registro do que rodou; `paridade-banco.yml` (#115) só avisa por e-mail |
| Ambiente reconstruível a partir do repo | NÃO | `origin/contexto:docs/contexto/codigo/banco.json`: **50 tabelas com drift** — `tenant_id` existe em produção em 48 tabelas sem nenhuma migration que o crie; `profiles.display_name` idem; `fornecedores.nome/categoria/ativo`, `solicitacoes.item_number/empresa/…` (9 colunas), `pedido_itens.status_producao`, `tenants.regime_tributario` existem em migration e não em `types.ts` |
| Triggers duplicados | PARCIAL (decisão registrada) | `validate_solicitacao_status` + `trg_validate_solicitacao_status`; `validate_pedido_status` + `trg_validate_pedido_status` continuam ×2 (`tables/public/{solicitacoes,pedidos}.md`); #85 manteve "por terem eventos diferentes" |
| Edges publicadas × repo | NÃO VERIFICADO | Management API recusou token; `edge-functions.md` do contexto: "Management API desabilitada: defina SUPABASE_ACCESS_TOKEN" — o próprio gerador de contexto está sem o secret |
| Secrets das edges (`OPENROUTER_API_KEY`, `SPOT_API_ACCESS_KEY`, `CRON_SECRET`, `RESEND_API_KEY`, `VAPID_*`, `SEFAZ_*`, `SLACK_WEBHOOK_URL`, `PSV2_ENCRYPTION_KEY`, `SCIM_BEARER_TOKEN`, `EXTERNAL_DB_*`, `GITHUB_DISPATCH_TOKEN`) | NÃO VERIFICADO | idem; SPOT comprovadamente configurado (catálogo sincroniza) |
| `inventario-estado-semanal.yml` | BLOQUEADO | setting "Allow GitHub Actions to create and approve pull requests" (prod-readiness §2) |
| Testes | PARCIAL | `testes.json`: **51 telas, 62 hooks, 30 edges sem teste**; 9 specs E2E; `tests-rls` só roda com secrets; `vitest` 2328 ✓ |
| Lints do banco | OK / baixo | `lints.md`: 0 ERROR; só `policy_auth_fn_not_wrapped` (perf), 2 FKs sem índice (`entity_versions.changed_by`, `workflow_tasks.assigned_to_user`), `btree_gist` em `public` |
| `public/dependency-health.json` | congelado (2026-08-31) sem gerador; `install-report.json` e `datefns-usage.json` não existem → 404 em `/admin/dependency-health` | `InstallReportPanel.tsx:31`, `DateFnsUsagePanel.tsx:40` |
| Mojibake em dados | pendente DML | `sourcing_event_lots.nome` — migration `20261114095500` existe; aplicação NÃO VERIFICADA |

---

## 12. O que foi de fato concluído desde agosto (crédito devido)

Segurança de banco: `execute_read_query`/`exec_sql` fechadas, views `security_invoker`, 141 SECURITY DEFINER revogadas de anon, `tenant_isolation_*` RESTRICTIVE, policies de storage, auditoria append-only com hash (#130), autoria preservada (#112), 24 índices aplicados (#111). CI: typecheck real, lint 0 erros, RLS audit `--strict` com `SUPABASE_DB_URL`, Deno roda toda a árvore, deploy automático de edges com delete (#123/#160), dependency review, dependabot. Edges: `safeTruncate` importado, `getTenantId` corrigido em `workflow-engine`/`fiscal-orchestrator` (#121), `ai-*` via OpenRouter com circuit breaker (#141), `verifyCronSecret` fail-closed, `migrate-helper` removida (#158), `punchout-encrypt` nova, alerta de `RESEND_API_KEY` ausente, detecção de falhas consecutivas em `check-sla-alerts` (#143). Banco: crons apontando ao projeto certo via Vault, `lgpd_retention_daily` e `refresh-mv-dashboard-kpis` funcionando, retenção com fonte única, triggers de orçamento/pagamento corrigidos, moeda `char(3)`, cadastro de usuários religado (#110), templates de workflow populados (#122). Front: `vercel.json` (SPA), mojibake eliminado, "VER TUDO", "Novo Evento", busca no RFx, CSV/Exportar em 3 relatórios, "Iniciar Cotação Imediata", "VER MATRIZ KRALJIC", "Citar Agora" com id certo, CRUD de catálogos PunchOut (#139), pedido complementar no recebimento parcial (#137), Realtime sem crash (#116). Integração: **SPOT sincronizando** (catálogo/estoque/customização, ~3.8k SKUs).

Nenhum desses itens fecha um fluxo de negócio que estava aberto em agosto.

---

## 13. Não verificado nesta auditoria

- Execução em navegador de qualquer tela; comportamento visual dos botões.
- Edges realmente publicadas, versão e `verify_jwt` real; existência dos secrets.
- Conteúdo das tabelas além das contagens do snapshot (`stats.md` arredonda).
- Corretude lógica das 300+ policies RLS e das funções SECURITY DEFINER.
- Execução ponta a ponta dos triggers de cotação/pedido com usuário real.
- Aplicação em produção das migrations de 17–19/11 (`20261117*`, `20261119*`) — sem ledger, só o `paridade-banco.yml` semanal poderia dizer.
- Histórico das PRs < #108 (clone raso).

---

# ANEXOS — tabelas de evidência item a item

> Produzidos por 7 verificadores independentes sobre o HEAD `2a86602`; cada linha com `arquivo:linha` atual. A classificação de agosto está na coluna "Classif. ago/2026".

---

## Anexo A1 — Lotes L01 (núcleo/admin) e L02 (fluxo de compras)

### Reverificação L01 + L02 — estado em HEAD `2a86602` (2026-11-20)

Método: leitura/grep direto em `src/`, `supabase/functions/`, `supabase/migrations/` do HEAD. Estado de produção
(triggers instalados, contagem de linhas) veio **só** do snapshot gerado na branch `origin/contexto`
(`docs/contexto/supabase/*`, gerado 2026-11-20 00:55 UTC sobre o mesmo HEAD) — nenhum comando foi executado contra o Supabase.
Linhas citadas são as atuais. Observação: o clone local tem apenas 51 commits (desde PR #108); PRs #43/#46/#47/#70–#75/#81
não estão no histórico local — a verificação é pelo código em HEAD, não pelo histórico.

Legenda do estado atual: **NÃO_IMPLEMENTADO** (esqueleto/menção/código morto), **PARCIAL** (existe mas falta camada, stub,
mock ou fio cortado), **IMPLEMENTADO** (corrigido desde ago/2026), **REMOVIDO** (código não existe mais).

#### Resumo

| Estado atual | L01 | L02 | Total |
|---|---|---|---|
| IMPLEMENTADO | 4 | 1 | **5** |
| PARCIAL | 14 | 14 | **28** |
| NÃO_IMPLEMENTADO | 19 | 30 | **49** |
| REMOVIDO | 0 | 0 | **0** |
| **Itens reverificados** | 37 | 45 | **82** |

#### Tabela

| Lote | Funcionalidade | Classif. ago/2026 | Estado atual | Evidência atual (arquivo:linha) | O que falta hoje |
|---|---|---|---|---|---|
| L01 | `AnimatedRoutes` — nome vs. comportamento | 🟨 | PARCIAL | `src/routes/AppRoutes.tsx:69` define `AnimatedRoutes`; grep de `AnimatePresence`/`motion.` no arquivo = 0 ocorrências | Animação nunca implementada; nome mente |
| L01 | Login com Google (OAuth) | 🟨 | PARCIAL | `src/pages/auth/Auth.tsx:336-340` — `import('@/integrations/lovable/index')` + `lovable.auth.signInWithOAuth('google')`; só trata `result?.error`, sem `navigate()`; módulo em `src/integrations/lovable/index.ts:12-16` | Caminho de auth paralelo ao Supabase; sucesso do OAuth NÃO VERIFICADO (runtime) |
| L01 | Links "Termos de Uso" / "Política de Privacidade" | 🟦 | NÃO_IMPLEMENTADO | `src/pages/auth/Auth.tsx:448` e `:450` — ambos `href="#"`; nenhuma rota `termos`/`privacidade` em `AppRoutes.tsx` | Documentos e rotas inexistentes |
| L01 | Login por Passkey (WebAuthn) — errata L15 | ✅ (errado → 🟨 crítico) | PARCIAL (bug crítico persiste) | `supabase/functions/webauthn-authenticate/index.ts:166-174` verifica apenas `clientData.challenge` e `clientData.type`; grep `-i signature` no arquivo (245 linhas) = 0 ocorrências; emite magiclink em `:205-212`. Prod: `webauthn_credentials` com **0 linhas** (`origin/contexto:docs/contexto/supabase/stats.md:159`) | Verificação da assinatura do authenticator (authenticatorData + clientDataHash vs. chave pública) — bypass total ainda presente, desarmado só porque ninguém registrou passkey |
| L01 | Dashboard de Compras — KPIs — errata L15 | ✅ (errado → 🟨) | PARCIAL | `src/hooks/useDashboardKPIs.ts:75` chama RPC real, mas `:98` `generateSparkline = () => []`, `:106 atrasados: 0`, `:107 taxaEntrega: 100`, `:109 totalFornecedores: 0`, `:111 pendingApprovals: 0`, `:117 avgSla: 1.8`, `:118 taxaSlaReal: 85`, `:139-142 sla: {current: 85 … sparkline: [80,82,…]}` | Card SLA ainda fixo em 85%; 7 campos sobrescritos por constante |
| L01 | Dashboard — botão "VER TUDO" das urgências | 🟦 | **IMPLEMENTADO** | `src/pages/dashboard/ComprasDashboard.tsx:228` — `onClick={() => navigate("/solicitacoes")}` | — |
| L01 | Dashboard — 8 widgets no `switch` sem chamador | ⬛ | NÃO_IMPLEMENTADO (morto) | Cases `ComprasDashboard.tsx:258-266` (`supplier-alerts`, `supplier-ranking`, `buyer-performance`, `savings-goal`, `delivery-calendar`, `demand-prediction`, `risk-heatmap`, `active-sourcing`); únicos chamadores `:368-369` (4 `kpi-*`) e `:375-381` (`chart-pipeline`, `trend-charts`, `sourcing-intelligence`, `dashboard-insights`, `urgent-items`) | Nenhum caminho monta os 8 widgets |
| L01 | Dashboard — `DraggableDashboard` / `FilterFavoritesManager` / `SLADistributionChart` importados sem uso | ⬛ | NÃO_IMPLEMENTADO (morto) | `ComprasDashboard.tsx:30`, `:33`, `:48` — 1 ocorrência cada no arquivo (só o import/lazy); `SLADistributionChart` não é referenciado em nenhum outro `.tsx` de `src/` | Layout arrastável nunca renderizado |
| L01 | Dashboard — gravação do layout (`saveToDb`) | 🟨 | PARCIAL | `ComprasDashboard.tsx:87` desestrutura `saveToDb`; `:106` só `loadFromDb('compras')`; `saveToDb` = 1 ocorrência. Prod: `dashboard_layouts` com 0 linhas (`stats.md:162`) | Nada grava layout |
| L01 | Dashboard — imports mortos (`Link`, `Badge`, `performanceMonitor`) | ⬛ | NÃO_IMPLEMENTADO (morto) | `ComprasDashboard.tsx:12`, `:16`, `:41` — 1 ocorrência cada | Lixo de refatoração |
| L01 | Central de Segurança — 15 abas (casca) | 🟨 | **IMPLEMENTADO** (fio de dados provado) | 15/15 painéis em `src/components/security/*.tsx` têm `supabase.from/rpc`, `functions.invoke` ou hook de `@/hooks/` (grep estrito; ex.: `GeoAccessLogsPanel.tsx:33` `.from('geo_access_logs')`, `BlockedCountriesPanel.tsx` 3 ocorrências) | Conteúdo das tabelas NÃO VERIFICADO; `PasskeyManager` depende do WebAuthn quebrado acima |
| L01 | Central de Segurança — card "Configurações de Sessão" | 🟦 | NÃO_IMPLEMENTADO | `src/pages/seguranca/Seguranca.tsx:208` "24 horas", `:216` "Ativo", `:224` "TOTP + Email", `:232` "Por IP" — literais | Painel decorativo |
| L01 | Central de Segurança — imports mortos (`useState`, `MainLayout`) | ⬛ | NÃO_IMPLEMENTADO (morto) | `Seguranca.tsx:1` e `:3` | — |
| L01 | Compliance — estado de carregamento | 🟨 | PARCIAL | `src/pages/compliance/ComplianceDashboard.tsx:35` declara `loading`; `:54` `setLoading(false)`; `loading` nunca lido no JSX (grep `\bloading\b` = só :35) | Skeleton ausente; "Nenhum fornecedor" durante carga |
| L01 | Compliance — painéis de CRUD fora das abas | 🟨 | PARCIAL | `ComplianceDashboard.tsx:370` `</Tabs>`; `:373` `<SupplierBonificationsPanel/>`, `:376` `<PenaltyEscalationConfigPanel/>` empilhados abaixo | Aba de CRUD prometida nunca criada |
| L01 | Telemetria — simulação de estresse | 🟨 | PARCIAL (pior que o documentado) | `src/pages/admin-telemetria/AdminTelemetria.tsx:70` lê `data.success`/`data.error`; a edge devolve `{message, summary}` (`supabase/functions/system-simulation/index.ts:110-112`) — **ambos** `undefined`; `:150` "100% VALIDADO" literal | Toast imprime `undefined sucessos, undefined falhas`; selo fixo |
| L01 | Telemetria — abas "Logs da Aplicação" / "Alertas de Sistema" | 🟨 | **IMPLEMENTADO** (fio provado) | `src/components/admin/telemetry/AppLogsView.tsx:38` `.from("telemetry_logs")`; `SystemAlertsView.tsx:29,42` `.from("system_alerts")`; montados em `AdminTelemetria.tsx:273,277` | Conteúdo NÃO VERIFICADO (runtime) |
| L01 | Centros de Custo — hierarquia (Centro pai = "Nenhum") | 🟨 | PARCIAL (bug confirmado) | `src/pages/configuracoes/ConfiguracoesCentroCusto.tsx:215` `SelectItem value="none"`; `:109` `parent_id: form.parent_id \|\| null` → grava `"none"`. Prod: `cost_centers.parent_id` é `uuid` (`origin/contexto:…/tables/public/cost_centers.md:26`) → Postgres rejeita | Salvar com "Nenhum" falha por uuid inválido; falta mapear `"none"` → `null` |
| L01 | Centros de Custo — `colSpan` da tabela | 🟨 | PARCIAL | `ConfiguracoesCentroCusto.tsx:264` e `:270` `colSpan={4}` em tabela de 7 colunas (`:252-258`) | Desalinhamento visual |
| L01 | Centros de Custo — import morto `MainLayout` | 🟦 | NÃO_IMPLEMENTADO (morto) | `ConfiguracoesCentroCusto.tsx:2` | — |
| L01 | Health Dashboard — link "Detalhes" como `<a>` | 🟨 | PARCIAL | `src/pages/admin/HealthDashboard.tsx:770` `<a href={\`/admin/health/alerts/${row.id}\`}>`; nenhum import de `react-router-dom` no arquivo | Recarrega SPA; trocar por `<Link>` |
| L01 | Conectores ERP — 5 botões sem handler | 🟦 | NÃO_IMPLEMENTADO | `src/pages/admin/ERPConnections.tsx:80-82` "Configurar Nova Conexão", `:119` "Documentação de API", `:160` engrenagem, `:209` "Ver Log Completo", `:224` "Configurar Campos" — único `onClick` do arquivo é o sync em `:153` | Configuração/mapeamento inexistente |
| L01 | Conectores ERP — `organizationId` ignorado | 🟨 | PARCIAL | `ERPConnections.tsx:23` desestrutura; queries `:30` (`erp_connections`) e `:41` (`erp_sync_log`) sem filtro de tenant | Isolamento 100% em RLS |
| L01 | Catálogos PunchOut — "Testar Setup" | 🟨 | PARCIAL | `src/pages/admin/PunchOutCatalogs.tsx:146` invoke `punchout-setup`, `:156-157` abre `data.mock_redirect`; edge `supabase/functions/punchout-setup/index.ts:103` `mock_redirect: catalog.setup_url + "?hook=" + buyerCookie` — monta cXML (`:85-94`) mas devolve ao browser em vez de POSTar ao fornecedor | Handshake PunchOut real (POST cXML → StartPage URL) não existe |
| L01 | Catálogos PunchOut — "Novo Catálogo" e engrenagem | 🟦 | **IMPLEMENTADO** (PR #139) | `PunchOutCatalogs.tsx:171` `onClick={openNew}`, `:210` `openEdit(cat)`, `handleSave :91` → `.update` `:114-115` / `.insert` `:122-123` em `punchout_catalogs`. Prod: tabela com 0 linhas (`stats.md:104`) | CRUD existe, sem uso em produção |
| L01 | SSO — botão "Gerar Token SCIM" | 🟦 | NÃO_IMPLEMENTADO | `src/pages/admin/SSOConfig.tsx:214-216` `<Button>` sem `onClick`; edge `scim-v2` continua inalcançável pela UI | Emissão de credencial SCIM |
| L01 | SSO — endpoints do SP hardcoded | 🟨 | PARCIAL (ref corrigido, ainda literal) | `SSOConfig.tsx:273` e `:277` `https://lmypcdfsrgfftzhxawao.supabase.co/auth/v1/sso/saml/...` — project ref agora é o oficial, mas segue fixo no JSX; `:211` usa `window.location.origin` (que é o front, não o Supabase) | Derivar de `VITE_SUPABASE_URL` |
| L01 | Workflow & Compliance — KPIs "Violações Bloqueadas" / "SLA de Aprovação" | 🟦 | NÃO_IMPLEMENTADO | `src/pages/admin/WorkflowAdmin.tsx:85` `<div>0</div>`, `:94` `<div>--</div>` | Métricas nunca calculadas |
| L01 | Workflow & Compliance — 4 botões de escrita sem handler | 🟦 | NÃO_IMPLEMENTADO | `WorkflowAdmin.tsx:54-56` "Novo Workflow", `:136` "Configurar", `:167-169` "Adicionar Regra", `:204` "Editar" — sem `onClick` (só `:51` "Logs de Auditoria" navega) | Tela read-only que se apresenta como editor |
| L01 | Workflow — "Workflow Designer Canvas" | 🟦 | NÃO_IMPLEMENTADO | `WorkflowAdmin.tsx:152-155` bloco `border-dashed` + título | Editor visual inexistente |
| L01 | Workflow — aba "Monitoramento Realtime" | 🟦 | NÃO_IMPLEMENTADO | `WorkflowAdmin.tsx:228` "Nenhum workflow ativo no momento.", `:236` "Aguardando dados de telemetria." — sem query | Aba estática |
| L01 | Painel Fiscal — 4 KPIs e 2 badges | 🟦 | NÃO_IMPLEMENTADO | `src/pages/admin/FiscalDashboard.tsx:48` "SEFAZ: Online", `:49` "Focus NFe: OK", `:60` `128`, `:61` "+12%…", `:90` `1.4s`, `:91` "Latência SEFAZ em tempo real" — literais; única query real é `:15` `fiscal_events` | Números inventados no JSX |
| L01 | Sourcing Pipeline — 5 métricas hardcoded | 🟦 | NÃO_IMPLEMENTADO | `src/pages/admin/SourcingPipeline.tsx:67` "Meta Q2: R$ 2.5M", `:80` "8 em negociação final", `:89` "R$ 12.4M", `:99-100` "14.2% vs 12.0%", `:110` "Matriz de Kraljic atualizada" | Literais |
| L01 | Sourcing Pipeline — imports mortos (`format`, `ptBR`) | 🟦 | NÃO_IMPLEMENTADO (morto) | `SourcingPipeline.tsx:7-8` | — |
| L01 | Documentação técnica (strings no bundle, "Freight Quest") | 🟦 | NÃO_IMPLEMENTADO | `src/pages/admin/DeveloperDocs.tsx:11` "Guia de Arquitetura - Freight Quest", `:255` "…do Freight Quest"; sem `fetch(` no arquivo | Conteúdo congelado e com nome errado |
| L01 | Documentação — botão "Ver Repo" | 🟦 | NÃO_IMPLEMENTADO | `DeveloperDocs.tsx:259` `window.open('https://github.com', '_blank')` | Sem owner/repo |
| L01 | Documentação — card "Status do Projeto" | 🟦 | NÃO_IMPLEMENTADO | `DeveloperDocs.tsx:380` "Tipagem TS", `:384` `w-[100%]`, `:392` "Modular" | Selo sem medição |
| L02 | Solicitações — KPIs do topo | 🟨 | PARCIAL | `src/pages/solicitacoes/Solicitacoes.tsx:127-136` calcula em memória sobre `filteredSolicitacoes`; `useSolicitacoesKPIs` (`src/features/solicitacoes/hooks/useSolicitacoes.ts:334`, RPC `:342`) sem chamador na tela | KPIs refletem só a página carregada |
| L02 | Solicitações — "Matriz de Prioridade Neural" | 🟦 | NÃO_IMPLEMENTADO | `Solicitacoes.tsx:379` título; `:396` `left: \`${(i * 7) + 10}%\`` — posição pelo índice | Gráfico decorativo |
| L02 | Solicitações — IAAdvisor | 🟦 | NÃO_IMPLEMENTADO | `Solicitacoes.tsx:297`; `src/components/compras/IAAdvisor.tsx:41` "Ver Insights", `:44` "Ação Rápida" — sem `onClick` | Template string + botões inertes |
| L02 | Solicitações — BulkPlanningConsole ("Disparar Cotações") | 🟦 | NÃO_IMPLEMENTADO | `src/components/compras/BulkPlanningConsole.tsx:23` `mockPlanningData` ("Brindes Premium" `:26`), `:62` `freightAnalysis` literal, botão `:105-107` sem `onClick` | 100% mock |
| L02 | Solicitações — `FiltrosAvancados onApply` | 🟦 | NÃO_IMPLEMENTADO | `Solicitacoes.tsx:344` `onApply={() => {}}` | Callback vazio |
| L02 | Cotação — SELECIONAR FORNECEDOR VENCEDOR (fio #4/#4b) | ⬛ | NÃO_IMPLEMENTADO (fio cortado) | `src/pages/cotacao/Cotacao.tsx:65` `useState`, `:267`, `:268`, `:276` `onSelecionar={setFornecedorSelecionado}`; `selectCotacao` em `src/features/cotacoes/hooks/useCotacoes.ts:144` (grava `selecionada: true` `:152`, `status: 'aprovada'` `:153`, `justificativa_selecao` `:154`) — grep em `src/` retorna só `:144` e o export `:208`; justificativa de `RankingCotacoes.tsx:73` descartada | Nada persiste a escolha; `docs/agentes/regras-dominio.md:19` ainda lista como fio cortado |
| L02 | Cotação — trigger `trg_cotacao_approved_status` (fio #6) | 🟨 | PARCIAL | Trigger **instalado e `enabled`** em produção: `origin/contexto:docs/contexto/supabase/tables/public/cotacoes.md:136`, `snapshot.json:66682` (função `trg_cotacao_approved_transition`) | Nunca dispara pelo front porque o item acima não grava `selecionada=true` |
| L02 | Cotação — "START AUTO SEARCH" | 🟦 | NÃO_IMPLEMENTADO | `src/pages/cotacao/cotacaoHelpers.ts:135` consulta `produto_fornecedores` e ignora; `:150,152,153,160,161,164` `Math.random()` | Dados aleatórios; nada gravado |
| L02 | Cotação — análise de IA ("Strategic Insight") | 🟦 | NÃO_IMPLEMENTADO | `Cotacao.tsx:80` `setTimeout(2000)`, `:84` "**15%** savings", `:85` "zero delivery delays" | Literais |
| L02 | Cotação — FOLLOW-UP (botão) | 🟦 | NÃO_IMPLEMENTADO | `Cotacao.tsx:109-121` `toast.info` + `setTimeout(1500)` + `toast.success`; edge `supabase/functions/check-cotacao-followup` existe mas não é chamada de `src/` (grep = 0) | Nenhum envio real |
| L02 | Cotação — NeuralFollowUpMonitor | 🟦 | NÃO_IMPLEMENTADO | `src/components/compras/NeuralFollowUpMonitor.tsx:21,25,28` `setTimeout` encadeados | Simulação |
| L02 | Cotação — AISupplierSuggestion | 🟦 | NÃO_IMPLEMENTADO | `src/components/compras/AISupplierSuggestion.tsx:32` "Aluminum Mug", `:35` "12 qualified suppliers", `:41` "AluTech Indústria 98"; botão `:59-63` sem `onClick` | Literais |
| L02 | Cotação — StrategicQuoteTable | 🟨 | PARCIAL | `src/components/compras/StrategicQuoteTable.tsx:40-41` `handleSelectStrategy` = só `toast.success`; chamado em `:114`, `:126` | Não persiste |
| L02 | Cotação — BuscaAutomatica | 🟦 | NÃO_IMPLEMENTADO | `src/components/compras/BuscaAutomatica.tsx:18-22` `fornecedoresAPI` literal ("XBZ Brindes 10.172 produtos") | Contagens fixas |
| L02 | Aprovações — aprovar/rejeitar não propaga para `solicitacoes.status` (fio #5) | 🟨 | PARCIAL (fio cortado persiste) | `src/hooks/useApprovalWorkflow.ts:185-239` `approveStep` grava `approval_steps`/`approval_workflows`/`approval_history`; único `.from('solicitacoes')` do arquivo é SELECT em `:95` (`createWorkflow`); nenhum trigger em `approval_workflows` nas migrations. Prod: `approval_workflows` com 0 linhas (`stats.md:38`) | Solicitação aprovada segue `pendente`; `regras-dominio.md:20` confirma |
| L02 | Aprovações — 5 cards de KPI | 🟦 | NÃO_IMPLEMENTADO | `src/pages/aprovacoes/Aprovacoes.tsx:74,78,82,86,90,99` lêem `approvalStats` de `src/pages/aprovacoes/aprovacoesData.ts` (objeto literal) | Constantes |
| L02 | Aprovações — aba Métricas | 🟦 | NÃO_IMPLEMENTADO | `Aprovacoes.tsx:46-49` derivam de `approvalTrendData` mock; `:199-200` gráficos; `periodo` (`:34`, `:183`) não consumido | Dados fictícios |
| L02 | Aprovações — aba Histórico (fallback mock) | 🟨 | PARCIAL | `Aprovacoes.tsx:139` `: (approvalHistory as ApprovalHistoryItem[])`; mock em `aprovacoesData.ts:55-57` ("SOL-2024-150"…) | Banco vazio exibe mock como real |
| L02 | Pedidos — coluna "Saúde do SLA" | 🟦 | NÃO_IMPLEMENTADO | `src/pages/pedidos/Pedidos.tsx:294` `index % 3 === 0 ? '40%' : '85%'`, `:297`, `:303`, `:305` "ATENÇÃO"/"NO PRAZO" | Métrica pelo índice da linha |
| L02 | Pedidos — badge "4 Novas Movimentações" | 🟦 | NÃO_IMPLEMENTADO | `Pedidos.tsx:155` | Literal |
| L02 | Pedidos — alerta "Auditoria de 1ª Peça" | 🟦 | NÃO_IMPLEMENTADO | `src/pages/pedidos/PedidoDetailsDialog.tsx:337` `includes('boné')` | Regra por substring |
| L02 | Pedidos — aba "LOG DE AUDITORIA" | 🟦 | NÃO_IMPLEMENTADO | `PedidoDetailsDialog.tsx:167` trigger; `:420` "Inicializando vetores de log de auditoria histórica..."; nenhum `audit_logs` no arquivo | Sem query |
| L02 | Pedidos — botões E-MAIL / HUB COMUNICAÇÃO / AUTORIZAR REDESPACHO | 🟦 | NÃO_IMPLEMENTADO | `PedidoDetailsDialog.tsx:193-198` (2 botões) e `:430` — sem `onClick` | Inertes |
| L02 | Pedidos — SupplierInteractionLog | 🟦 | NÃO_IMPLEMENTADO | `src/components/compras/SupplierInteractionLog.tsx:16` `mockInteractions`, `:27` "aguardando a chegada da matéria-prima", `:54` render | Mock para qualquer fornecedor |
| L02 | Acompanhamento — mudar status (Kanban drop) (fio #10) | ⬛ | NÃO_IMPLEMENTADO (fio cortado) | `src/pages/acompanhamento/Acompanhamento.tsx:144-146` `handleStatusChange` = só `toast.success`; passado em `:313` `onStatusChange={handleStatusChange}` | Confirma escrita que não ocorre; `regras-dominio.md:21` confirma |
| L02 | Acompanhamento — 4 botões inertes | 🟦 | NÃO_IMPLEMENTADO | `Acompanhamento.tsx:198` `onClick={() => {}}` "NOVA ATUALIZAÇÃO", `:299` "FILTROS AVANÇADOS", `:450` "VISUALIZAR NF-E", `:451` "HISTÓRICO DE LOGS" | — |
| L02 | Acompanhamento — timeline com datas fixas | 🟨 | PARCIAL | `src/pages/acompanhamento/AcompanhamentoHelpers.ts:119` `'15/12/2025' : … 'Agora'` | Sem data real de etapa |
| L02 | Acompanhamento — `gerarEtapasEnhanced` | ⬛ | NÃO_IMPLEMENTADO (morto) | `AcompanhamentoHelpers.ts:123` exportado; grep em `src/` fora do próprio arquivo e testes = 0; conteúdo sintético `:133` "3 fornecedores", `:135` `url: '#'` | Sem consumidor |
| L02 | Gerar Ordem — carregar com fallback perigoso | 🟨 | PARCIAL | `src/pages/gerar-ordem/GerarOrdem.tsx:112` `fornecedoresData[0]`; `:53` `useState(150)` frete; `:126`, `:226`, `:460` `\|\| 12`; `:105`/`:177` buscam `c.selecionada` que nunca é gravado (ver Cotação) | OC pode sair contra o 1º fornecedor ativo; `:123` `"A DEFINIR"` ainda vai no PDF/WhatsApp |
| L02 | Recebimento — conferência online (observações) | 🟨 | PARCIAL | `src/pages/recebimento/RecebimentoOffline.tsx:172` `observacao`, `:174` `observacao_geral` só no objeto `entry`; `:184` `.update({ quantidade_recebida })`, `:190-193` `.update({ status, data_entrega })` — nenhum campo de observação. PR #137 adicionou pedido complementar (`:202`) | Observações continuam descartadas |
| L02 | Recebimento — fila offline + auto-sync | 🟨 | PARCIAL | `RecebimentoOffline.tsx:247` `allComplete = entry.items.every(i => i.quantidade_recebida > 0)` vs. online `:160` `>= i.quantidade` | 1 unidade recebida offline marca `entregue` e dispara `trg_pedido_entregue_status` (instalado, ver abaixo) |
| L02 | Recebimento → trigger `trg_pedido_entregue_status` (fio #12) | 🟨 | **IMPLEMENTADO** (instalação confirmada) | Trigger `enabled` em prod: `origin/contexto:…/tables/public/pedidos.md:144`, `snapshot.json:67276`; front grava `status: "entregue"` em `RecebimentoOffline.tsx:190-193` | Execução real de ponta a ponta NÃO VERIFICADA (sem query ao banco nesta tarefa) |
| L02 | Devoluções — criar sem vínculo com pedido (fio #13) | 🟨 | PARCIAL | `src/pages/devolucoes/DevolucoesModals.tsx` — única ocorrência de "pedido" é leitura `:250` (`devolucao.pedido?.numero \|\| '—'`); `useDevolucoes.ts:24` `pedido_id?` e `:116` grava `input.pedido_id` (sempre `undefined`) | Campo de pedido no formulário |
| L02 | Histórico — "Desfazer Global" / "Desfazer" | 🟦 | NÃO_IMPLEMENTADO | `src/pages/historico/HistoricoCompras.tsx:214` `toast.success("Ação desfeita…(Neural Undo)")`; `HistoricoSourcingTab.tsx:62`, `:128` | Sem undo |
| L02 | Histórico — Price Benchmark / Target Price / Economia | 🟦 | NÃO_IMPLEMENTADO | `HistoricoSourcingTab.tsx:285` `*0.88`, `:286` "Distribuidora Global", `:290` "+4.2%", `:314` `*0.92`, `:320` `*0.08` | Multiplicadores inventados |
| L02 | Histórico — "Ver Análise Detalhada" / "Gerar Executive Sourcing Report" | 🟦 | NÃO_IMPLEMENTADO | `HistoricoSourcingTab.tsx:294-295`, `:329-330` — sem `onClick` | — |
| L02 | Histórico — gráfico "Volume de Sourcing por Período" | 🟨 | PARCIAL | `HistoricoSourcingTab.tsx:74` título; `:79` plota `priceBenchmarkData` ou `[{date:'N/A', price:0}]` | Rótulo não bate com dado |
| L02 | Histórico — "Benchmark IA" (aba Produtos) | 🟦 | NÃO_IMPLEMENTADO | `src/pages/historico/HistoricoProdutosTab.tsx:84-86` `avgPrice * 0.95` | — |
| L02 | Histórico — modal de drilldown | ⬛ | NÃO_IMPLEMENTADO (morto) | `HistoricoCompras.tsx:64` `handleDrilldown` = 1 ocorrência (nunca passado a filho); `:363` modal renderizado; `setDrilldownOpen` só em `useState` e `onOpenChange` | `HistoricoDrilldownModal.tsx` inalcançável |
| L02 | Histórico — estado morto (`showAdvancedFilters`, `comparisonEnabled`, `comparisonPeriod`, `COLORS`) | 🟦 | NÃO_IMPLEMENTADO (morto) | `HistoricoCompras.tsx:33`, `:55`, `:61`, `:62` — 1 ocorrência cada | — |
| L02 | Histórico — aba Analytics | 🟦 | NÃO_IMPLEMENTADO | `HistoricoCompras.tsx:355` "Previsões neurais de demanda futura em desenvolvimento..." | Placeholder |
| L02 | Kanban Workflow — indicador de SLA | 🟨 | PARCIAL | `src/pages/kanban/KanbanWorkflow.tsx:71-72` `hours > 72` / `> 48` fixos; `data_necessidade` é selecionada (`:42`) mas não usada no SLA | SLA não contratual |
| L02 | Orçamentos — excluir sem confirmação | 🟨 | PARCIAL | `src/pages/orcamentos/Orcamentos.tsx:297` `onClick={() => deleteBudget.mutate(budget.id)}`; grep `confirm\|AlertDialog` = 0 | Clique único apaga |
| L02 | Orçamentos — editar | 🟦 | NÃO_IMPLEMENTADO | `Orcamentos.tsx:36` `updateBudget` desestruturado — 1 ocorrência | Sem UI de edição |
| L02 | Orçamentos — mês "Anual" → `NaN` | 🟨 | PARCIAL | `Orcamentos.tsx:144` `value={m.value \|\| 'anual'}`; `:49` `form.mes ? parseInt(form.mes, 10) : null` | `parseInt('anual')` = `NaN` |

#### Itens que viraram IMPLEMENTADO

1. **Dashboard — botão "VER TUDO"** — `src/pages/dashboard/ComprasDashboard.tsx:228` navega para `/solicitacoes`.
2. **Catálogos PunchOut — criar/editar** (PR #139) — `src/pages/admin/PunchOutCatalogs.tsx:171`, `:210`, `:114-123` (insert/update em `punchout_catalogs`). Tabela ainda com 0 linhas em produção.
3. **Central de Segurança — 15 abas** — 🟨 era por limite de escopo; 15/15 painéis em `src/components/security/` têm camada de dados.
4. **Telemetria — abas Logs/Alertas** — idem; `AppLogsView.tsx:38` e `SystemAlertsView.tsx:29,42` consultam tabelas reais.
5. **Trigger `trg_pedido_entregue_status`** — era "NAO_VERIFICADO (runtime)"; snapshot de produção confirma instalado e habilitado (`tables/public/pedidos.md:144`), e o front grava `entregue` (`RecebimentoOffline.tsx:190`).

Promoções parciais (não chegam a IMPLEMENTADO): trigger `trg_cotacao_approved_status` confirmado instalado (`cotacoes.md:136`) mas inerte pelo front; SSO troca o project ref errado pelo oficial `lmypcdfsrgfftzhxawao` (`SSOConfig.tsx:273,277`) mas segue hardcoded; `punchout-setup` monta cXML real (`index.ts:85-94`) mas devolve `mock_redirect`.

**Os 3 fios cortados de ago/2026 (seleção de cotação, aprovação → status, Kanban de acompanhamento) continuam cortados em HEAD** — `docs/agentes/regras-dominio.md:17-21` (também em HEAD) ainda os lista. A premissa "PRs #70–#75 ligaram o fluxo de compra" não se confirma no código.

#### Itens cuja evidência eu NÃO consegui confirmar

| Item | Status | Motivo |
|---|---|---|
| Login com Google via Lovable funciona em runtime | NÃO VERIFICADO | Exige executar OAuth; só leitura foi feita. Código em `Auth.tsx:336-340`. |
| Trigger `trg_pedido_entregue_status` executa de ponta a ponta (solicitação concluída + pagamento) | NÃO VERIFICADO | Instalação confirmada pelo snapshot `origin/contexto`; execução real exigiria query em produção, proibida nesta tarefa. |
| Conteúdo real das tabelas lidas pelos 15 painéis de Segurança e pelas abas de Telemetria | NÃO VERIFICADO | Só o fio código→tabela foi provado por grep; linhas em produção não foram contadas (exceto as citadas de `stats.md`). |
| Resposta real de `punchout-setup` ao abrir `mock_redirect` (`catalog.setup_url + "?hook="`) | NÃO VERIFICADO | Depende de `setup_url` cadastrado e do fornecedor; `punchout_catalogs` tem 0 linhas (`stats.md:104`). |
| Histórico de PRs #43/#46/#47/#70–#75/#81 citado na tarefa | NÃO VERIFICADO | Clone local tem 51 commits (a partir do PR #108); esses PRs não aparecem em `git log`. A verificação foi feita sobre o código em HEAD `2a86602`. |
| Edge `webauthn-authenticate` está deployada em produção | NÃO VERIFICADO | `origin/contexto:docs/contexto/supabase/edge-functions.md` diz "Management API desabilitada"; o código existe no repo e o bypass está no código. |

---

## Anexo A2 — Lotes L03 (catálogos/IA/relatórios) e L04 (components compras 1ª metade)

### Reverificação L03 + L04 — itens 🟨 / 🟦 / ⬛ da auditoria de 2026-08-16

Repo `/home/user/Promo_Supply_V2`, HEAD `2a86602` (2026-11-20). Método: grep/leitura direta em `src/`, `supabase/functions/`, `supabase/migrations/`. Somente leitura; nada rodado contra o Supabase; `tsc` não rodado (sem `node_modules`). Linhas citadas são do código atual.

Legenda do estado atual: **NÃO_IMPLEMENTADO** (esqueleto/literal/morto) · **PARCIAL** (existe mas falta camada, stub, mock, fio cortado) · **IMPLEMENTADO** (corrigido desde ago/2026) · **REMOVIDO** (código não existe mais).

Totais (94 itens): IMPLEMENTADO 8 · REMOVIDO 1 · PARCIAL 45 · NÃO_IMPLEMENTADO 40.

| Lote | Funcionalidade | Classif. ago/2026 | Estado atual | Evidência atual (arquivo:linha) | O que falta hoje |
|---|---|---|---|---|---|
| L03 | SPOT — API oficial (`spot-api`) disparada pelo front | 🟨 | PARCIAL | Único hit de `spot-api` em `src/` é comentário `src/pages/catalogo-spot/useSpotCatalog.ts:7`; botão do painel só `refetch()` `src/pages/catalogo-spot/SpotSyncPanel.tsx:88` | Nenhuma tela invoca a sincronização; sem job agendado o catálogo fica vazio |
| L03 | IA — IDP de nota fiscal (PDF) | 🟨 (dado fabricado) | PARCIAL | `supabase/functions/process-invoice-idp/index.ts:53` ("simulando extração IA"), `:57-58` `mockExtractedData` + `Math.random()`, `:61` `valor_total: 1250.50`, `:72` devolve o mock; front grava com `status: "validada"` `src/pages/documentos/DocumentosFiscais.tsx:136,152` | Provedor real de extração; PR #141 (OpenRouter) não tocou esta edge |
| L03 | IA — "Sentimento de Mercado" (NegociacaoIA) | 🟦 | NÃO_IMPLEMENTADO | `src/pages/negociacao-ia/NegociacaoIA.tsx:485` título, `:496` "R$ 5,24 -0.2%", `:509` "Estável +1.5%", `:516` "Insight de Timing" — literais | Fonte de cotação/índice |
| L03 | IA — "Análise de IA" em RFxDetails | 🟦 | NÃO_IMPLEMENTADO | `src/pages/sourcing/RFxDetails.tsx:295` rótulo, `:302` template string `Identificamos que o fornecedor…` | Chamada de IA ou retirar o rótulo |
| L03 | XBZ — 10 ações do hook sem consumidor (`cancelarPedido`, `getFiscal`, `getCores`, `getVendedor`, `getPessoaToken`, `getEntregaTipos`, `getPagamentoTipos`, `alterarQuantidade`, `buscarProdutos`, `login`) + tabelas `XBZ_*_TIPOS` | ⬛ | NÃO_IMPLEMENTADO | Definições só em `src/hooks/useXbzIntegration.ts:473,477,482,497,503,531,536,554,568,573` (grep em `src/` fora de testes: só o hook); `XBZ_ENTREGA_TIPOS`/`XBZ_PAGAMENTO_TIPOS` só em `src/pages/catalogo-xbz/xbzHelpers.ts:89,96` | Consumidor ou remoção |
| L03 | Catálogo SPOT (busca/coleção/categoria) | 🟨 | PARCIAL | `src/pages/catalogo-spot/useSpotCatalog.ts:48` `SPOT_CATALOG_PAGE_SIZE = 60`, `:66` `.limit(...)`; vazio em `SpotCatalogTab.tsx:139` | Paginação e disparo de sync |
| L03 | Painel frescor de cache + quota SPOT | 🟨 | PARCIAL | Limites/janelas literais `src/pages/catalogo-spot/SpotSyncPanel.tsx:16-19` (22/96), botão só `refetch()` `:88` | Quota vinda do backend; botão forçar sync |
| L03 | Finalizar pedido SPOT (checkout) | 🟦 | NÃO_IMPLEMENTADO | `src/pages/catalogo-spot/CatalogoSpot.tsx:216` `toast.info('Checkout SPOT — Em desenvolvimento')`; `getCheckoutInfo` sem consumidor (`src/hooks/useSpotIntegration.ts:166,193`) | Todo o checkout |
| L03 | SPOT — 6 ações órfãs (`searchProducts`, `browseCatalog`, `getProduct`, `checkStock`, `updateCartQuantity`, `getCheckoutInfo`) + `extractSpotProductId` | ⬛ | NÃO_IMPLEMENTADO | `src/hooks/useSpotIntegration.ts:86,93,100,107,146,166` (grep: só o hook); `src/pages/catalogo-spot/spotHelpers.ts:65` (só teste importa) | Consumidor ou remoção |
| L03 | `MainLayout` importado e não usado — CatalogoSpot | 🟦 | NÃO_IMPLEMENTADO | `src/pages/catalogo-spot/CatalogoSpot.tsx:2` (1 ocorrência no arquivo) | Remover import |
| L03 | KPI "Preço médio" (fórmula frágil) | 🟨 | PARCIAL | `src/pages/catalogo-produtos/CatalogoProdutos.tsx:110` mesma expressão `reduce(...)/filter(...).length \|\| 0` | Parênteses/guard + teste |
| L03 | KPIs do topo de Sourcing | 🟦 | NÃO_IMPLEMENTADO | `src/pages/sourcing/Sourcing.tsx:72` `12`, `:81` `4`, `:90` `28`, `:99` `R$ 142k` | Derivar de `events` |
| L03 | Busca e filtros em Sourcing | 🟦 | NÃO_IMPLEMENTADO | `Sourcing.tsx:109` `<Input>` sem `value`/`onChange`; `:112-115` botão "Filtros" sem `onClick` | Handlers |
| L03 | Abas RFPs / RFQs / Leilões | 🟦 | NÃO_IMPLEMENTADO | `Sourcing.tsx:122-124` triggers; só `TabsContent value="all"` `:127`; `activeTab` `:25` nunca lido | Filtro por tipo ou conteúdo das abas |
| L03 | Botão "Novo Evento" do empty state | 🟦 | IMPLEMENTADO | `Sourcing.tsx:173` `onClick={() => navigate("/sourcing/novo")}` | — |
| L03 | Busca de fornecedores no passo 4 do RFxCreate | 🟦 | IMPLEMENTADO | `src/pages/sourcing/RFxCreate.tsx:62` `supplierSearch`, `:443-444` `value`/`onChange`, `:450-451` filtro da lista | — |
| L03 | Promessa "E-mail automático será enviado no lançamento" | 🟦 | NÃO_IMPLEMENTADO | `RFxCreate.tsx:484` badge; `handleCreate` só `insert` em `sourcing_invitations` `:174`; zero `functions.invoke` no arquivo | Disparo de e-mail/fila |
| L03 | Validação de soma de pesos = 100% | 🟨 | PARCIAL | `RFxCreate.tsx:361-362` badge `destructive`; nenhum bloqueio em `handleCreate` (grep `weight`: só `:86-88,164,300,324,327,361`) | Bloquear lançamento |
| L03 | Aba "Histórico" do RFx | 🟦 | NÃO_IMPLEMENTADO | `RFxDetails.tsx:113` trigger; `TabsContent` só `overview/items/responses` `:116,163,186` | Conteúdo |
| L03 | Card "Ações" do RFx (Gerenciar Convites / Chat / Cancelar Evento) | 🟦 | NÃO_IMPLEMENTADO | `RFxDetails.tsx:255-265` três `<Button>` sem `onClick` | Handlers |
| L03 | "Gerar Tabela Comparativa" / "Cobrar Fornecedores (WhatsApp)" | 🟦 | NÃO_IMPLEMENTADO | `RFxDetails.tsx:307-311` sem `onClick` | Handlers |
| L03 | Aviso "Anti-Sniping Ativo" | 🟦 | NÃO_IMPLEMENTADO | `src/pages/sourcing/AuctionRoom.tsx:235-237` texto; nenhum update de `closes_at` em `src/hooks/useLicitacoes.ts`; grep `sniping/prorrog/extend` em `src/`, `supabase/functions`, `supabase/migrations`: zero | Lógica de extensão |
| L03 | `comparisonRadarData` / `comparisonHistorico` mortos | ⬛ | NÃO_IMPLEMENTADO | `src/pages/buyer/BuyerPerformanceDashboard.tsx:114,121` calculados; único uso de comparação é `<BuyerComparisonView>` `:232` | Remover código morto |
| L03 | Aba "Sourcing (RFx)" do Portal do Fornecedor | 🟦 | NÃO_IMPLEMENTADO | `src/pages/portal-fornecedor/PortalFornecedor.tsx:372-378` texto + `<Button disabled>Ver via Magic Link` | Listagem de convites |
| L03 | `MainLayout` importado e não usado — PortalFornecedor | 🟦 | NÃO_IMPLEMENTADO | `PortalFornecedor.tsx:9` (1 ocorrência) | Remover import |
| L03 | Botão `MoreHorizontal` da linha — Fornecedores | 🟦 | NÃO_IMPLEMENTADO | `src/pages/fornecedores/Fornecedores.tsx:262-264` sem `onClick` | Menu ou remoção |
| L03 | `totalMes` / `ultimaCompra` hardcoded | 🟨 | PARCIAL | `src/pages/fornecedores/fornecedorHelpers.ts:43-44` `0` / `'-'` | Cálculo real ou retirar do contrato |
| L03 | Intelligence Hub (SupplierPerformance = contêiner) | 🟨 | PARCIAL (filhos NÃO VERIFICADOS) | `src/pages/fornecedores/SupplierPerformance.tsx:13-16` imports, `:47,51,55,59` monta 4 componentes; zero query própria | Camada de dados dos 4 componentes (lote L05) |
| L03 | `MainLayout` importado e não usado — Qualificação | 🟦 | NÃO_IMPLEMENTADO | `src/pages/qualificacao/QualificacaoFornecedores.tsx:2` (1 ocorrência) | Remover import |
| L03 | Sala de leilão reverso — identidade do licitante | 🟨 | PARCIAL | `src/pages/licitacoes/Licitacoes.tsx:88` `userFornecedorId={fornecedores[0]?.id} // For demo purposes` | Fornecedor do usuário logado |
| L03 | `MainLayout` importado e não usado — Licitacoes | 🟦 | NÃO_IMPLEMENTADO | `Licitacoes.tsx:16` (1 ocorrência) | Remover import |
| L03 | Comparativo estratégico — rating fabricado | 🟨 | PARCIAL | `NegociacaoIA.tsx:231` `\|\| 4.2`; idem `:375,377` `\|\| 85`, `:380` `\|\| 'Tático'` | Fallback honesto |
| L03 | KPI "Economia Total: R$ 245.2k" | 🟦 | NÃO_IMPLEMENTADO | `NegociacaoIA.tsx:148` literal | Derivar de `negotiation_analyses` |
| L03 | Botões "WhatsApp" e "E-mail" por fornecedor | 🟦 | NÃO_IMPLEMENTADO | `NegociacaoIA.tsx:441,448` só `toast.info` | Geração/envio |
| L03 | Botão "Saber mais" | 🟦 | NÃO_IMPLEMENTADO | `NegociacaoIA.tsx:590-592` sem `onClick` | Handler |
| L03 | Campo `modelo_ia` gravado ≠ modelo usado | 🟨 | PARCIAL | `NegociacaoIA.tsx:106` `"gemini-2.5-flash"`; edge `supabase/functions/ai-negotiation/index.ts:70` `"google/gemini-3-flash-preview"` (agora via `OPENROUTER_API_KEY` `:53`) | Edge devolver o modelo e front gravar o devolvido |
| L03 | Fórmula de economia do relatório | 🟨 | PARCIAL | `src/pages/relatorio-negociacoes/useRelatorioNegociacoes.ts:140-143` `Number(c.valor_total) - vu * (desconto/100)` inalterada | Fórmula correta (total × desconto) |
| L03 | Performance por comprador — `display_name` inexistente | 🟨 | IMPLEMENTADO | `useRelatorioNegociacoes.ts:83` `select("id, full_name, email")`; teste `__tests__/useRelatorioNegociacoes.test.tsx:56-69` | — (tsc não rodado aqui) |
| L03 | `melhorPreco` — `score_total` fora do select | 🟨 | IMPLEMENTADO | `useRelatorioNegociacoes.ts:58` select inclui `score_total`; uso `:181` | — |
| L03 | Drill-down por comprador (`as any`) | 🟨 | PARCIAL | `src/pages/relatorio-negociacoes/RelatorioNegociacoes.tsx:405` `comprador={selectedBuyer as any}` | Tipar o contrato |
| L03 | Botão "Exportar" do relatório | 🟦 | IMPLEMENTADO | `RelatorioNegociacoes.tsx:134-146` `exportToCSV(comparativoCompradores…)` | — |
| L03 | Rótulo "+X% vs período anterior" | 🟨 | PARCIAL | `RelatorioNegociacoes.tsx:165` exibe `mediaPercentual` (média do período atual, `:72-75`) | Cálculo de período anterior |
| L03 | Meta "12%" | 🟦 | NÃO_IMPLEMENTADO | `RelatorioNegociacoes.tsx:181` literal | Meta configurável |
| L03 | `relatorioNegociacoesData.ts` (mock morto com testes) | ⬛ | NÃO_IMPLEMENTADO | Arquivo existe; único consumidor `__tests__/relatorioNegociacoesData.test.ts:3-8`. Atenuante: hook real agora tem teste próprio (`__tests__/useRelatorioNegociacoes.test.tsx`) | Apagar mock + teste |
| L03 | Gráfico "Otimização (Saving)" | 🟨 | PARCIAL | `src/pages/relatorios/Relatorios.tsx:151` `economiaMensal: [] // Logic simplified for brevity`; `RelatoriosCharts.tsx:146,159` frase estática | Série real |
| L03 | Top Partners — coluna "SLA Score" 95% | 🟨 | PARCIAL | `Relatorios.tsx:142` `taxaEntrega: … ? 95 : 0, // Mock for now`; `RelatoriosCharts.tsx:243` | Cálculo real de OTIF |
| L03 | `distribuicaoTipo` sempre vazio | 🟨 | PARCIAL | `Relatorios.tsx:152` `distribuicaoTipo: []` | Preencher |
| L03 | `DistributionCharts` | ⬛ | NÃO_IMPLEMENTADO | Definido `RelatoriosCharts.tsx:165`, importado `Relatorios.tsx:46`, nunca renderizado (nenhum `<DistributionCharts`); corpo oco `:176,189` | Remover ou implementar |
| L03 | Botão "CSV" (exportar) | 🟦 | IMPLEMENTADO | `Relatorios.tsx:98-106` `handleExportCSV` → `exportToCSV`; ligado em `:188` | — |
| L03 | Botões "ABRIR CHAMADO" e "FULL REPORT" | 🟦 | NÃO_IMPLEMENTADO | `Relatorios.tsx:240`; `RelatoriosCharts.tsx:202` — sem `onClick` | Handlers |
| L03 | Abas Spend / KPIs / Centros de Custo / Estratégia / IA Forecast | 🟨 | PARCIAL (filhos NÃO VERIFICADOS) | `Relatorios.tsx:35-40` lazy, `:247-251` `TabsContent`; `AdvancedProcurementKPIs` continua mock (ver L04) | Dados dos componentes filhos |
| L03 | Mojibake em rótulos de UI | 🟨 | IMPLEMENTADO | grep `Ã£\|Ã§\|Ã©\|Ãš\|Ãª\|â€¢\|Ã³\|Ã‡\|Ã‰\|Ãƒ` em `src/pages/relatorios/`, `SupplierPerformance.tsx`, `Pagamentos.tsx`: zero; `Relatorios.tsx:198` "VISÃO GERAL" correto. Resíduo: BOM no início de `SupplierPerformance.tsx:1` | — |
| L03 | Botão "Filtros Avançados" (Estoque) | 🟦 | NÃO_IMPLEMENTADO | `src/pages/estoque/GestaoEstoque.tsx:166-169` sem `onClick` | Handler |
| L03 | Título "Gestão de Estoque 10/10" / "Monitoramento neural" | 🟨 | PARCIAL | `GestaoEstoque.tsx:92-93` | Texto |
| L03 | Importar PDF "via IA" (front) | 🟨 | PARCIAL | `DocumentosFiscais.tsx:136` invoke, `:152` `status: "validada"`, `:154` `tenant_id: LEGACY_TENANT_ID` (`:27`) — edge ainda mock | Edge real + tenant real |
| L03 | Conciliação NF ↔ pedido | 🟨 | PARCIAL | `DocumentosFiscais.tsx:177` só `Math.abs(valor_total diff) < 0.01` | Casar fornecedor/chave/data |
| L03 | Modal de edição de contrato | ⬛ | NÃO_IMPLEMENTADO | `src/pages/contratos/Contratos.tsx:72` estado, `:270` modal; nenhum `setIsEditModalOpen(true)` no arquivo | Gatilho na UI |
| L03 | Botão `MoreHorizontal` da linha — Contratos | 🟦 | NÃO_IMPLEMENTADO | `Contratos.tsx:256-258` sem `onClick` | Menu (poderia abrir a edição acima) |
| L03 | Badge "N Ativos" no header | 🟨 | PARCIAL | `Contratos.tsx:128` `{contracts.length} Ativos` | Usar contagem de ativos |
| L03 | `PagamentoMobileCard`, `isMobile`, `approvePagamento` | ⬛ | NÃO_IMPLEMENTADO | `src/pages/pagamentos/Pagamentos.tsx:12,55,56` — cada símbolo 1 ocorrência (grep `-c`) | Layout mobile e ação de aprovar inalcançáveis |
| L03 | Imports sem uso em Pagamentos (`DropdownMenu*`, `Tooltip*`, `toast`, `Eye`, `Download`, `Filter`, `QrCode`, `FileText`) | 🟦 | NÃO_IMPLEMENTADO | `Pagamentos.tsx:21-30,34` — cada um 1 ocorrência; só `TooltipProvider` usado `:194` | Limpar imports |
| L03 | Limite de 500 itens na análise de recompra | 🟨 | PARCIAL | `src/pages/recompra/RecompraInteligente.tsx:82` `.limit(500)` sem `order` | Paginação/ordem |
| L04 | AISupplierSuggestion | 🟦 | NÃO_IMPLEMENTADO | `src/components/compras/AISupplierSuggestion.tsx:9` `isExpanding` não usado, `:32` "Aluminum Mug", `:35` "12 qualified suppliers", `:41-42` lista literal; montado em `src/pages/cotacao/Cotacao.tsx:335` e `src/pages/fornecedores/Fornecedores.tsx:131` | Toda a camada de dados |
| L04 | AdvancedProcurementKPIs | 🟨 | PARCIAL | `AdvancedProcurementKPIs.tsx:47` importa `kpiData` de `procurement-kpis/kpiMockData.ts`; `:88-94` todos os KPIs do mock; metas em `stores/kpiTargetsStore.ts:113` `persist` (0 `supabase`) | Fonte real dos 8 KPIs |
| L04 | BulkOperationsPreview | 🟨 | PARCIAL | `BulkOperationsPreview.tsx:189` "desfazer em desenvolvimento"; `:238` "até 22%" fixo | Undo real; texto |
| L04 | BulkPlanningConsole | 🟦 | NÃO_IMPLEMENTADO | `BulkPlanningConsole.tsx:23` `mockPlanningData`, `:62` `freightAnalysis` literal, `:107` "Disparar Cotações" sem `onClick`, `:200,213` "94%"/"R$ 4.2k"/"98.2%", `:243,258` VALIDAR/REVISAR sem `onClick`; montado só em `src/pages/solicitacoes/Solicitacoes.tsx:299` (saiu do ExecutiveDashboard) | Tudo |
| L04 | BuscaAutomatica | 🟨 | PARCIAL | `BuscaAutomatica.tsx:18-21` `fornecedoresAPI` literal ("10.172 produtos"), `:62-63` progresso encenado por índice | Lista real; progresso real |
| L04 | BuyerPerformanceAlerts | 🟨 | PARCIAL | `BuyerPerformanceAlerts.tsx:40` dados reais; `src/stores/buyerAlertsStore.ts:51` `persist` (localStorage); `:68-70` `loadTargetsFromDb` só **lê** `profiles` — nenhum `insert/upsert` | Persistir metas/alertas no banco |
| L04 | ComparadorCotacoes | 🟨 | PARCIAL | `ComparadorCotacoes.tsx:470,474` bullets fixos sob "Escolha da IA" (`:450`); `Cotacao.tsx:267` `onSelecionar={setFornecedorSelecionado}`; `fornecedorSelecionado` só `:65,277` (não persiste) | Persistir seleção |
| L04 | ContractDetailsModal | 🟨 | PARCIAL | `ContractDetailsModal.tsx:223-236` 6 triggers; `TabsContent` só `general/sla/penalties/history` `:239,310,314,318` — "Itens" e "Docs" em branco; `handleUploadDocument` `:113` sem nenhum `<input>` no arquivo | Abas Itens/Docs e gatilho de upload |
| L04 | CostCenterPerformanceAnalysis | 🟨 | IMPLEMENTADO | `CostCenterPerformanceAnalysis.tsx:189-199` "Exportar" → `exportToCSV`; RPC `:30`; RPC definida em `supabase/migrations/20260512141452_…sql` e `20260619194754_…sql` | — (existência da RPC no banco NÃO VERIFICADA) |
| L04 | CotacaoManualModal | 🟨 | PARCIAL | `CotacaoManualModal.tsx:80-89` `onSave` sem `observacoes`/`validade` (editados `:220-231`); `:238-243` área de anexo é `<div>` sem `<input type="file">`; consumidor `Cotacao.tsx:355-363` também não repassa esses campos | Campos descartados; anexo |
| L04 | DashboardInsights | 🟨 | PARCIAL | `DashboardInsights.tsx:103` "98% … documentação em dia" literal; `:186-189` botão `insight.action` sem `onClick`; `:170` impacto por índice | Insight real; ação |
| L04 | DeliveryCalendar | 🟨 | PARCIAL | Botões corrigidos: `DeliveryCalendar.tsx:315-316` `navigate("/pedidos")`/`navigate("/acompanhamento")`; **mas** `delivery-calendar/deliveryCalendarHelpers.ts:150` `type: index % 3 === 0 ? 'pickup' : …` continua | Tipo de evento real |
| L04 | DigitalSignature | 🟦 | NÃO_IMPLEMENTADO | `DigitalSignature.tsx:46` `mockSignatureRequests`, `:124,164` `setTimeout`, `:149` "Email enviado", `:342` MP 2.200-2/2001; zero `supabase`; montado `Contratos.tsx:135` | Persistência, envio, assinatura |
| L04 | DynamicApprovalMatrix | 🟨 | PARCIAL | `DynamicApprovalMatrix.tsx:15` `mockUsers`, `:23` `mockCategories`, `:41-42` resolução só contra mocks (`\|\| userId`) | Nomes do banco |
| L04 | EnhancedBulkActionsBar | 🟨 | PARCIAL | `EnhancedBulkActionsBar.tsx:94-97` "8 segundos para desfazer", `:124` `setShowUndo(false); toast.info("Ação desfeita…")` sem reverter; `:174` `totalValue * 0.15` | Undo real; previsão |
| L04 | EnhancedPedidoTimeline | ⬛ | NÃO_IMPLEMENTADO | Hits externos: `timeline/timelineConfig.ts:64` (tipo) e `src/pages/acompanhamento/AcompanhamentoHelpers.ts:10` (só tipo `TimelineStep`); nenhum `<EnhancedPedidoTimeline` | Consumidor ou remoção |
| L04 | ExecutiveDashboard | 🟨 | PARCIAL | Corrigido: "EXPORT REPORT" `ExecutiveDashboard.tsx:54-69,217` CSV dos KPIs reais; "VER MATRIZ KRALJIC" `:316` `scrollIntoView`. Mantido: `:25-27` importa mocks de `executive/executiveDashboardData.ts` ("Mock data constants"), usados em `:147,154,161,168`; `:71` `savingsPercent: 10.0`; `:290` `rating: 4.5` | Gráficos/tabelas com dado real |
| L04 | FiltrosAvancados | 🟨 | PARCIAL | `FiltrosAvancados.tsx:59-61` opções literais ("ABC Ltda", "João Silva"); acordeões só `periodo/valor/empresas/prioridades` `:157,191,222,245`; `Solicitacoes.tsx:344` `onApply={() => {}}`, aplica só `dateRange`/`valorMin` `:116-120` | 5 dimensões sem UI; opções do banco |
| L04 | HistoricoComprasModal | ⬛ | NÃO_IMPLEMENTADO | Arquivo existe; grep em `src/` fora do próprio arquivo: zero | Consumidor |
| L04 | IAAdvisor | 🟨 | PARCIAL | `IAAdvisor.tsx:40-45` "Ver Insights"/"Ação Rápida" sem `onClick` | Handlers |
| L04 | KPITargetsConfig | 🟨 | PARCIAL | `KPITargetsConfig.tsx:49` `updateTarget`, `:53` "salvas com sucesso"; `src/stores/kpiTargetsStore.ts:113` `persist`, 0 ocorrências de `supabase` | Persistência server-side |
| L04 | MainLayout (compras/) shim | ⬛ | NÃO_IMPLEMENTADO | `src/components/compras/MainLayout.tsx` = 1 linha de re-export; grep `compras/MainLayout` em `src/`: zero | Apagar |
| L04 | NeuralFollowUpMonitor | 🟦 | NÃO_IMPLEMENTADO | `NeuralFollowUpMonitor.tsx:21,25,28` `setTimeout`, `:31` "[OK] Message delivered via Promo AI Gateway.", `:102` "+48h Overdue"; montado `Cotacao.tsx:310` | Envio real |
| L04 | OrderPreviewModal | ⬛ | NÃO_IMPLEMENTADO | Arquivo existe; grep em `src/` fora do próprio arquivo: zero | Consumidor |
| L04 | PendingApprovalsList — "Ver Histórico" | 🟨 | PARCIAL | `PendingApprovalsList.tsx:433-435` `DropdownMenuItem` sem `onClick` | Handler |
| L04 | PriceComparator | 🟨 (preços fabricados) | PARCIAL | `price-comparator/priceComparatorHelpers.ts:58` preço `Math.random()`, `:70-74` prazo/pagamento/estoque/rating/pontualidade aleatórios; `PriceComparator.tsx:118` "Comparação concluída", `:294` "Melhor Preço"; montado `Fornecedores.tsx:200` | Preço real; RFQ; plano |
| L04 | PriceHistoryModal | 🟨 | PARCIAL | `PriceHistoryModal.tsx:221` "Volatilidade Neural", `:224` `> 10`, `:227` "Confiança da análise: 94%" | Métrica real/rótulo |
| L04 | ProductionRoutingEngine | 🟨 | PARCIAL | `ProductionRoutingEngine.tsx:36-38,48-50,60-62` `status` literais | Estado de produção persistido |
| L04 | SourcingIntelligenceBanner | 🟨 | PARCIAL | `ProductionRoutingEngine.tsx:127` contagem real em `produto_fornecedores`; `:180` "LISTAR"/"CONECTAR" — nenhum `onClick` no arquivo | Ações |
| L04 | PurchaseClimateWidget | 🟨 | PARCIAL | `PurchaseClimateWidget.tsx:120` `trendValue = 5.2 / -3.8 / 0.5`, exibido `:178` | Tendência real |
| L04 | RankingCotacoes | 🟨 (justificativa descartada) | PARCIAL | `RankingCotacoes.tsx:73` `onSelecionar(id, justificativa)`, `:386` "for audit tracking"; `Cotacao.tsx:276` `onSelecionar={setFornecedorSelecionado}` (`useState`, `:65`); `:240` `\|\| 80` | Persistir seleção + justificativa |
| L04 | ReceivingModal | ⬛ (órfão) | REMOVIDO (lógica portada) | `src/components/compras/ReceivingModal.tsx` não existe; regra portada em `src/pages/recebimento/pedidoComplementar.ts:9-19` (com 2 correções: tenant sentinela e rollback), tela `/recebimento` em `src/routes/AppRoutes.tsx:44,122`; commit `efc2e5f` (PR #137) | — |

#### Itens que viraram IMPLEMENTADO (8) + REMOVIDO (1)

1. Botão "Novo Evento" do empty state — `src/pages/sourcing/Sourcing.tsx:173`.
2. Busca de fornecedores no passo 4 do RFx — `src/pages/sourcing/RFxCreate.tsx:62,443-451`.
3. Performance por comprador (`display_name`) — `src/pages/relatorio-negociacoes/useRelatorioNegociacoes.ts:83` + teste `__tests__/useRelatorioNegociacoes.test.tsx`.
4. `melhorPreco`/`score_total` — `useRelatorioNegociacoes.ts:58,181`.
5. Botão "Exportar" do relatório de negociações — `RelatorioNegociacoes.tsx:134-146`.
6. Botão "CSV" de Relatórios — `src/pages/relatorios/Relatorios.tsx:98-106,188`.
7. Mojibake UTF-8 — zero ocorrências nos arquivos citados (resíduo: BOM em `SupplierPerformance.tsx:1`).
8. Exportar em CostCenterPerformanceAnalysis — `src/components/compras/CostCenterPerformanceAnalysis.tsx:189-199`.
9. ReceivingModal (REMOVIDO) — lógica vive em `src/pages/recebimento/pedidoComplementar.ts`, rota `/recebimento` (`AppRoutes.tsx:122`).

Correções parciais (ainda PARCIAL, mas parte do que faltava foi feita): `DeliveryCalendar.tsx:315-316` botões ligados; `ExecutiveDashboard.tsx:54-69,217,316` export e navegação Kraljic ligados.

#### Itens que NÃO consegui confirmar

- **Erros de `tsc` em `useRelatorioNegociacoes.ts`** — NÃO VERIFICADO: sem `node_modules` (`node_modules/.bin/tsc` ausente) e a tarefa proíbe rodar; a correção foi inferida pelo `select` atual (`:58,:83`).
- **Camada de dados dos filhos de SupplierPerformance e das abas de Relatórios** (`SupplierScorecard`, `RiskHeatMap`, `SupplierRankingPanel`, `SupplierAlertsPanel`, `SpendAnalytics`, `KraljicMatrix`, `SLABySupplierAnalysis`) — NÃO VERIFICADO: pertencem ao lote L05, fora do escopo pedido.
- **Existência no banco da RPC `get_cost_center_performance_report`** — NÃO VERIFICADO: só confirmei nas migrations (sem ledger de migration no projeto, não há prova de que rodou); sem acesso ao Supabase nesta tarefa.
- **BOM em `SupplierPerformance.tsx:1`** — visto como `﻿` na saída do grep; `xxd` indisponível para confirmar os bytes.
- **Job agendado de sincronização SPOT** — NÃO VERIFICADO: fora do código (cron do Supabase); só confirmei que nenhum ponto de `src/` invoca `spot-api`.

---

## Anexo A3 — Lotes L05 (components compras 2ª metade) e L06 (transversais/segurança)

### Reverificação L05 + L06 — estado em 2026-11-20 (HEAD 2a86602)

Método: leitura integral de `DOCS/ESTADO/L05_COMPONENTS_COMPRAS_P2.md` e `DOCS/ESTADO/L06_COMPONENTS_TRANSVERSAIS.md`; para cada item 🟨/🟦/⬛, grep/leitura direta no código atual (`src/`, `supabase/functions/`, `supabase/migrations/`, `public/`). Nada rodado contra o Supabase; nenhum arquivo do repo editado. Linhas citadas são as **atuais**.

Limite importante: o checkout local é raso — `git rev-list --count HEAD` = 51, primeiro commit `08eb373` de 2026-11-17. Não dá para provar via git *quando* algo mudou desde agosto; só o estado atual é comprovável.

Legenda do estado atual: **PARCIAL** = fio existe mas com mock/constante/toast-only/coluna faltando · **NÃO_IMPLEMENTADO** = só mock sem camada de dados, ou código sem nenhum chamador (morto) · **IMPLEMENTADO** = o que faltava foi corrigido · **REMOVIDO** = código não existe mais.

#### Tabela

| Lote | Funcionalidade | Classif. ago/2026 | Estado atual | Evidência atual (arquivo:linha) | O que falta hoje |
|---|---|---|---|---|---|
| L05 | `RiskHeatMap` | 🟨 | PARCIAL | `src/components/compras/RiskHeatMap.tsx:95` (`avaliacao \|\| 4.5`), `:97` (`financialRisk = 40 - avaliacao*5`), `:99` (`'Eletrônicos' \|\| 'Tecnologia' ? 60 : 15`); renderizado em `src/pages/fornecedores/SupplierPerformance.tsx:80` e `ComprasDashboard.tsx:264` | Riscos continuam fórmulas inventadas no cliente; nenhum score persistido |
| L05 | `SLABySupplierAnalysis` | 🟨 | PARCIAL | `SLABySupplierAnalysis.tsx:48-53` (6× `Math.random`), `:57-58` (gerado em nível de módulo); fornecedores literais `:48,:52`; renderizado em `src/pages/relatorios/Relatorios.tsx:244` | 100% aleatório, sem query; ranking muda a cada recarga |
| L05 | `SavingsGoalPanel` | 🟨 | PARCIAL | `SavingsGoalPanel.tsx:42` (`STORAGE_KEY`), `:51` (`localStorage.getItem`), `:100` (`localStorage.setItem`), `:214` (literal "Dados em tempo real"); leitura real `:69` | Meta ainda em localStorage (não multi-device/tenant) |
| L05 | `SolicitacaoCard` (swipe aprovar/arquivar/rejeitar) | 🟨 | PARCIAL | `SolicitacaoCard.tsx:113,:135,:145` (fallbacks toast); `src/pages/solicitacoes/Solicitacoes.tsx:408-414` passa só `solicitacao/selectable/selected/onSelectChange`; literais `:180,:184,:198-201,:284-288` | Pai ainda não passa `onApprove/onReject/onArchive`; gestos só fazem toast; "Neural"/"94%" continuam literais |
| L05 | `SourcingIntelligenceWidget` | 🟨 | PARCIAL | `SourcingIntelligenceWidget.tsx:32-34` (Matrix Brindes/AluPromo/EcoGift `type: 'IA'`), `:41` (`saving: 'Optimization'`); renderizado `ComprasDashboard.tsx:267` | Fallback fictício indistinguível do real; `saving` não calculado |
| L05 | `StrategicQuoteTable` (CTA selecionar estratégia) | 🟨 | PARCIAL | `StrategicQuoteTable.tsx:22-25` (props só `cotacoes`/`quantidade`), `:40-44` (`handleSelectStrategy` = `toast.success`), `:114,:126` (onClick) | CTA ainda não persiste nada nem recebe callback do pai |
| L05 | `SupplierEcosystemSection` (estrelas) | 🟨 | PARCIAL | `SupplierEcosystemSection.tsx:21-24` (`select` só `id, razao_social`), `:56` (`rating?: number`), `:74` (`fornecedor?.rating \|\| 0`) | Coluna `rating` não existe e não é selecionada; estrelas sempre vazias |
| L05 | `SupplierIntelligenceConsole` | 🟨 | PARCIAL | `SupplierIntelligenceConsole.tsx:21` (`// (mocked logic ...)`), `:169` ("Alumínio ... 8%"), `:173-175` (`<Button>` "GERAR PEDIDO PREDITIVO" sem `onClick`) | Eixo Y mockado, texto de IA fixo, botão inerte |
| L05 | `UrgentItemsList` ("Notificar") | 🟨 | PARCIAL | `UrgentItemsList.tsx:64-67` (`handleNotify` = `toast.success`), `:157` | Sem insert em notificações/edge |
| L05 | `VisualComparadorCotacoes` (IA rationale) | 🟨 | PARCIAL | `VisualComparadorCotacoes.tsx:95-98` (`useState` com rationale fixo e `confidence: 94`), `:379-382` (render "IA Decision Support") | `setDecisionSupport` nunca chamado; placeholder apresentado como IA |
| L05 | `ApprovalDelegationModal` | 🟨 | PARCIAL | `approval/ApprovalDelegationModal.tsx:12-13` (`mockUsers` user-1..), `:47,:56` (selects); persiste de verdade via `src/hooks/useApprovalRules.ts:111,:115` (`approval_delegations`) | Delegações gravadas com IDs de usuário fictícios |
| L05 | `ApprovalRuleModal` | 🟨 | PARCIAL | `approval/ApprovalRuleModal.tsx:14` (`mockUsers`), `:22-23` (`mockCategories` cat-1), `:97,:129,:154` (selects); `costCenters` real `:42`; persiste via `useApprovalRules.ts:71,:75` (`approval_rules`) | Aprovadores/categorias mock gravados em `approval_rules`; centro de custo real ao lado |
| L05 | `UrgencyDetailsSheet` | 🟨 | PARCIAL (melhorou) | `dashboard/UrgencyDetailsSheet.tsx:60-66` (`select` sem `solicitante`), `:236` ("Desconhecido"), `:217` (Escalar = `toast.info`), `:291` (Alertar = `toast.success`); **corrigido:** `:263` "Iniciar Cotação Imediata" agora faz `navigate('/cotacao?id=...')` (antes toast "em desenvolvimento") | Solicitante ainda não selecionado; 2 de 3 botões ainda só toast |
| L05 | `deliveryCalendarHelpers` (tipo do evento) | 🟨 | PARCIAL | `delivery-calendar/deliveryCalendarHelpers.ts:150` (`index % 3 === 0 ? 'pickup' : index % 5 === 0 ? 'partial' : 'delivery'`) | "Coleta"/"Parcial" continuam decididos pelo índice |
| L05 | `ExecutiveAIInsights` | 🟨 | PARCIAL | `executive/ExecutiveAIInsights.tsx:37` ("média do setor (18%)"), `:38` (`'+ R$ 142.500/ano'`), `:61`, `:86`; `:173-175` `<button>` sem `onClick`; pai injeta `rating: 4.5` em `ExecutiveDashboard.tsx:290` | Sem IA; impactos literais; botão inerte |
| L05 | `ExecutiveChartsRow` | 🟨 | PARCIAL | `executive/ExecutiveChartsRow.tsx:17` (import `monthlyTrend/comparisonTrend` do mock), `:76-77` e `:90` (`multiplier` 0.4/0.3 "to show visual change") | Gráfico ainda fabrica resposta ao filtro sobre mock |
| L05 | `ExecutiveDrillDownModal` | 🟨 | PARCIAL (melhorou) | `executive/ExecutiveDrillDownModal.tsx:5` (import `pendingItems` mock), `:118` (itera mock), `:159` ("+8.4%" literal); **mojibake ausente:** `:33` "Exploração", `:36` "Ações Críticas", `:99` "Ciclo Médio" (grep `Ã` = 0) | Caso `pending` ainda lista 5 itens fixos; projeção literal |
| L05 | `ExecutiveFiltersBar` | 🟨 | PARCIAL | `executive/ExecutiveFiltersBar.tsx:11` (`allCategories, allSuppliers` do mock), `:58,:73`, `:106` ("AI Smart Optimization") | Opções de filtro ainda vêm do mock |
| L05 | `KraljicMatrix` | 🟨 | PARCIAL | `executive/KraljicMatrix.tsx:94` (query `category_strategies` real), `:104-105` (fallback "Matéria Prima A"/"Energia Elétrica"), `:220` ("AI Strategic Advisory") | Fallback silencioso de exemplo; "IA" é ternário |
| L05 | `ApprovalModals → DetailsModal` | 🟨 | PARCIAL | `pending-approvals/ApprovalModals.tsx:156-157` (`animate-pulse` + "IA Decision Support Active") | Badge estático sem lógica |
| L05 | `priceComparatorHelpers` (`generateQuotesFromSuppliers`) | 🟨 | PARCIAL | `price-comparator/priceComparatorHelpers.ts:58` (preço `Math.random`), `:61` (`avgPrice = unitPrice * 1.2`), `:70-74` (prazo/pagamento/estoque/rating/pontualidade sorteados), `:79`; consumido por `PriceComparator.tsx:234` → `StrategicQuoteTable` | Cotações sorteadas ainda exibidas junto às reais |
| L05 | `SolicitacaoFormSteps → Step1Identification` | 🟨 | PARCIAL | `solicitacao/SolicitacaoFormSteps.tsx:47-48` (`empresasMock`, `vendedoresMock`), `:84,:107` (selects), `:88` ("Score: 9.8"), `:143` ("Risco de Atraso (Neural)" = `diffDays < 3`) | Entidade e gestor ainda são 5 strings fixas |
| L05 | `SolicitacaoReviewStep` (Fast Track) | 🟨 | PARCIAL | `solicitacao/SolicitacaoReviewStep.tsx:139` (`valorEstimado < 1000`), `:145` | Limiar hardcoded duplicado, sem regra de `approval_rules` |
| L05 | `SupplierInteractionLog` | 🟦 | NÃO_IMPLEMENTADO (mock renderizado) | `SupplierInteractionLog.tsx:16` (`mockInteractions`), `:40` (`supplierName` não usado), `:54`, `:92` ("Amanhã às 14:00"), `:95` ("Intervir Agora" sem handler); renderizado em `src/pages/pedidos/PedidoDetailsDialog.tsx:203` | Nenhum agente/tabela por trás; só literais |
| L05 | `signatureHelpers` / `DigitalSignature` | 🟦 | NÃO_IMPLEMENTADO (mock renderizado) | `digital-signature/signatureHelpers.ts:16` (`mockSignatureRequests`), `:35` (`carlos@empresa.com`); `DigitalSignature.tsx:37,:46` (estado inicial = mock); grep `supabase\|functions.invoke\|fetch(` em `DigitalSignature.tsx` = 0; grep `signature_requests\|digital_signatures` em `types.ts` = 0; renderizado em `src/pages/contratos/Contratos.tsx:135` | Sem tabela, sem edge, sem persistência |
| L05 | `PriceVarianceAnalysis` | 🟦 | NÃO_IMPLEMENTADO (mock renderizado) | `executive/PriceVarianceAnalysis.tsx:10-12` (Notebook Dell/Cadeira), `:37,:70`, `:85` ("15%"); renderizado `ExecutiveDashboard.tsx:300` | Nenhuma query |
| L05 | `executiveDashboardData` (módulo) | 🟦 | NÃO_IMPLEMENTADO (mock em uso) | consumidores: `ExecutiveDashboard.tsx:25-27` → `:147` (`categorySpend`), `:154` (`topSuppliers`), `:161` (`buyerPerformance`), `:168` (`pendingItems`) → `ExecutiveTablesRow`/`ExecutivePendingActions` (`:304`, `:322-324`); `ExecutiveChartsRow.tsx:17`; `ExecutiveDrillDownModal.tsx:5`; `ExecutiveFiltersBar.tsx:11` | Só `metrics/spendByCategory/topSuppliers` dos cards vêm do hook real (`useExecutiveDashboardData`, `ExecutiveDashboard.tsx:46-51`); tabelas, pendências, séries e filtros seguem mock |
| L05 | `procurement-kpis/kpiMockData` | 🟦 | NÃO_IMPLEMENTADO (mock renderizado) | `AdvancedProcurementKPIs.tsx:47` (import `kpiData`), `:88-91`; grep `supabase\|useQuery` no arquivo = 0; renderizado `Relatorios.tsx:248` (aba "kpis") | Painel inteiro constante |
| L05 | `sla-analysis/slaAnalysisData` | 🟦 | NÃO_IMPLEMENTADO (mock) | `sla-analysis/slaAnalysisData.ts`: 17× `Math.random` (contagem via `grep -c`), `:31-33` (`generateSupplierSLAData`, "XBZ Brindes") | Sem query |
| L05 | `SLADistributionChart` | ⬛ | NÃO_IMPLEMENTADO (morto) | única referência fora da definição: `src/pages/dashboard/ComprasDashboard.tsx:48` (`lazy`); `switch` de painéis `:144-267` não tem case para ele; grep `<SLADistributionChart` em `src/` = 0 | Continua inalcançável (componente com query real em `solicitacoes` `:137`) |
| L05 | `SourcingHistoryConsole` | ⬛ | NÃO_IMPLEMENTADO (órfão) | `SourcingHistoryConsole.tsx:49` é a única ocorrência em `src/`; 972 linhas (`wc -l`) | Zero importadores |
| L05 | `TargetProgressRing` | ⬛ | NÃO_IMPLEMENTADO (morto) | def `enhanced-kpi/EnhancedKpiHelpers.tsx:94`; `EnhancedKpiCard.tsx:11` só importa; `EnhancedKpiCard` usa `Progress` (`:7,:51-52`) | Import morto |
| L05 | `mockPendingApprovals` | ⬛ | NÃO_IMPLEMENTADO (morto) | `pending-approvals/pendingApprovalsData.ts:22`; única referência: `__tests__/pendingApprovalsData.test.ts`; `PendingApprovalsList.tsx:51-57` importa só tipos + `getTimeStatus/getTimeProgress` | Vivo só pelo teste |
| L06 | WebAuthn — registro (`PasskeyManager`) | 🟨 | PARCIAL | `supabase/functions/webauthn-register/index.ts:192` (`public_key: credResponse.attestationObject`); grep `COSE\|cbor\|verifyRegistration` = 0; UI `Seguranca.tsx:184` | Attestation não verificada; chave pública gravada errada |
| L06 | WebAuthn — login por passkey | 🟨 (grave) | PARCIAL (grave) | `supabase/functions/webauthn-authenticate/index.ts`: grep `signature` = 0; `:170-175` só `challenge`/`type`; `:178` counter++ sem validação; `:195` `auth.admin.generateLink` | Bypass de autenticação segue: sem verificação criptográfica, origin ou counter |
| L06 | MFA / TOTP (`MFASettings`) | 🟨 | PARCIAL | `src/hooks/useMFA.ts:106` (`verifyMFA`), `:203` (`checkMFARequired`), exportados `:217,:220`, grep de chamadores fora do hook = 0; grep `mfa\|aal2` em `src/pages/auth/Auth.tsx` e `src/features/auth/` = 0; `MFASettings.tsx:27` (`setQrCode`) → `:30` (`setStep('verify')`) enquanto o QR está sob `step === 'enroll'` `:61-65`; backup codes `useMFA.ts:184` (`Math.random`), `:188` | MFA nunca exigido no login; QR inalcançável; códigos de backup inseguros e nunca lidos |
| L06 | Bloqueio / whitelist de IP (`BlockedIPsPanel`, `IPWhitelistPanel`) | 🟨 | PARCIAL | `is_ip_blocked`/`is_ip_whitelisted` só em `src/integrations/supabase/types.ts:9583-9584`; `src/pages/auth/Auth.tsx:104` comentário "Check if IP is blocked" seguido de `:105 const userAgent` | Sem enforcement |
| L06 | Geo-restrição (`BlockedCountriesPanel`, `GeoWhitelistPanel`) | 🟨 | PARCIAL | grep `allowed_countries\|blocked_countries\|geo_settings` fora de `components/security/`, `useGeoRestriction.ts`, `types.ts` = 0 em `src/` e `supabase/functions/` | Sem enforcement |
| L06 | Logs de acesso geográfico (`GeoAccessLogsPanel`) | 🟨 | PARCIAL | nenhum INSERT em `geo_access_logs` em `src/`/`supabase/functions/`; migrations só limpeza (`20260711183924_...sql:47-54`), RLS (`20260108121914_...sql:72`) e autovacuum (`20260711184927_...sql:27`); UI `Seguranca.tsx:280` | Tabela sem produtor |
| L06 | Sessões ativas (`ActiveSessionsPanel`) | 🟨 | PARCIAL | `active_sessions` em `src/` só em `ActiveSessionsPanel`, `useSecurityLogs.ts` e `src/tests/security/rls-tenant-isolation-restrictive.test.ts:18`; 0 em `supabase/functions/`; UI `Seguranca.tsx:250` | Tabela sem produtor |
| L06 | Notificações push (browser) | 🟨 (grave) | PARCIAL (grave) | `src/hooks/useRealPushNotifications.ts:85-87` (placeholder VAPID `BEl62i...`), `:90`, `:104` (upsert `push_subscriptions`); `send-push-notification` só em `_shared/contracts.ts:146`; função lê `VAPID_PUBLIC_KEY` do env (`send-push-notification/index.ts:129-130`) | Chave placeholder e emissor sem chamador |
| L06 | Notificação de teste | 🟨 | PARCIAL | `NotificationSettingsPanel.tsx:39` (`new Notification` local); `:59` invoca `check-sla-alerts`, que grava em `notifications` (`supabase/functions/check-sla-alerts/index.ts:32`) e não chama push | Não exercita push server→cliente |
| L06 | Acessibilidade (`AccessibilityPanel` + `AccessibilityStyles`) | 🟨 | PARCIAL | montado em `src/App.tsx:71` **e** `src/features/layout/components/HeaderActions.tsx:81`; filtros SVG `AccessibilityStyles.tsx:82,:85,:88`; `OpenDyslexic` só em `AccessibilityStyles.tsx:53` e `AdvancedAccessibility.tsx:247`, grep `@font-face` em `src/ public/ index.html` = 0 | Montagem dupla; fonte nunca carregada |
| L06 | Onboarding / tour (`OnboardingTour`, `dashboardTourSteps`) | 🟨 | PARCIAL | `data-tour` no JSX: 3 (`AppSidebar.tsx:340` sidebar, `HeaderActions.tsx:137` notifications, `PedidosKPIs.tsx:13` pedidos-kpis); 21 alvos em `tourStepDefinitions.ts`; consumidor único `src/pages/dashboard/DashboardExecutivo.tsx:13-14` | 18 de 21 alvos ainda inexistentes |
| L06 | Tours cotação/fornecedor/pedidos/solicitações | 🟨 | NÃO_IMPLEMENTADO | `cotacaoTourSteps` etc. só em `OnboardingTour.tsx:474-477` (re-export) e testes; `DashboardExecutivo.tsx:2` importa só `dashboardTourSteps` | Nenhuma página consome |
| L06 | Feature flags | ⬛ | NÃO_IMPLEMENTADO | `import.meta.env.*` em `src/`: `DEV`(6), `PROD`(2), `VITE_SUPABASE_URL`(2), `VITE_SUPABASE_PUBLISHABLE_KEY`(1); `.env.example:18-19` declara `VITE_ENABLE_ANALYTICS/DEBUG` | Flags nunca lidas |
| L06 | `withPermission` (HOC) | ⬛ | NÃO_IMPLEMENTADO (morto) | def `src/components/security/PermissionGate.tsx:58`; grep de import/uso em `src/` = 0 | Sem chamador |
| L06 | `LoginAttemptsPanel` | 🟨 | PARCIAL | `src/pages/auth/Auth.tsx:112-114` (`log_login_attempt` com `_ip_address: ''`) | IP sempre vazio; auto-bloqueio agrupa por `''` |
| L06 | `SecurityLogsPanel` | 🟨 | PARCIAL | único produtor: `supabase/functions/webauthn-authenticate/index.ts:218` (`log_security_event`); leitura `useSecurityLogs.ts:80` | Login por senha/logout/permissões não geram evento |
| L06 | `PasswordResetRequestsPanel` | 🟨 | PARCIAL | `reset_token` só em `src/hooks/usePasswordResetRequests.ts:17,:108`; 0 leituras em `src/`/`supabase/functions/`; `ls supabase/functions \| grep -i password\|reset` = 0 | Aprovar não redefine senha |
| L06 | `LiveRegion` (×2) | ⬛ | NÃO_IMPLEMENTADO (morto) | defs `AdvancedAccessibility.tsx:357` e `VisuallyHidden.tsx:35`; grep de uso = 0 | Duplicado e não usado |
| L06 | `useFocusTrap` | ⬛ | NÃO_IMPLEMENTADO (morto) | def `AdvancedAccessibility.tsx:375`; grep `useFocusTrap(` = 0 | Sem chamador |
| L06 | `DependencyHealthBadge` | 🟨 | PARCIAL | `public/dependency-health.json:2` (`generatedAt: 2026-08-31T14:30:00Z`, estático); grep `dependency-health.json` em `scripts/`, `.github/workflows/`, `package.json` = 0; renderizado `HeaderActions.tsx:59` | Retrato congelado (agora com 3 meses), sem gerador |
| L06 | `InstallReportPanel` | 🟦 | NÃO_IMPLEMENTADO | `public/install-report.json` não existe; `InstallReportPanel.tsx:31` faz `fetch("/install-report.json")`; renderizado `src/pages/admin/DependencyHealth.tsx:1323` | 404 permanente |
| L06 | `DateFnsUsagePanel` | 🟦 | NÃO_IMPLEMENTADO | `public/datefns-usage.json` não existe; `DateFnsUsagePanel.tsx:40`; renderizado `DependencyHealth.tsx:1331` | 404 permanente |
| L06 | `SystemAlertsView` | 🟨 | PARCIAL | `src/components/admin/telemetry/SystemAlertsView.tsx:45` (`// resolved_by: ...` comentado) | Resolução sem autoria |
| L06 | `SwipeableTableRow` | ⬛ | NÃO_IMPLEMENTADO (morto) | def `src/components/mobile/SwipeableListItem.tsx:279`; grep `<SwipeableTableRow` = 0 | Sem chamador |
| L06 | `FornecedorMobileCard` | ⬛ | NÃO_IMPLEMENTADO (morto) | def `src/components/fornecedores/FornecedorMobileCard.tsx:73` (289 linhas); grep de import/uso = 0 | Sem chamador |
| L06 | `ReverseAuctionRoom` (leilão reverso) | 🟨 | PARCIAL | `src/pages/licitacoes/Licitacoes.tsx:88` (`userFornecedorId={fornecedores[0]?.id} // For demo purposes`) | Todo lance atribuído ao 1º fornecedor |
| L06 | `MotionComponents` (16 exports) | 🟨 | PARCIAL | `src/components/animations/MotionComponents.tsx`: `MotionCard, MotionButton, FadeIn, ScaleIn, SlideIn, StaggerContainer, StaggerItem, FloatingElement, ShimmerEffect, AnimatedList, AnimatedListItem, HoverScale, AttentionPulse, SuccessCheck, LoadingSpinner, EntranceAnimation` — 0 referências cada (grep import/JSX fora do arquivo) | 16 exports mortos |
| L06 | `motionVariants` | 🟨 | PARCIAL | consumidores: só `MotionComponents.tsx:10,:12` + testes | Variantes para exports mortos |
| L06 | `Atom` → `Molecule` → `Organism` | ⬛ | NÃO_IMPLEMENTADO (morto) | `Molecule.tsx:1,:13` importa `Atom`; `Organism.tsx:1` importa `Molecule`; `Organism` 0 usos | Cadeia transitivamente morta |
| L06 | `EliteImage` | ⬛ | NÃO_IMPLEMENTADO (morto) | `src/components/atoms/EliteImage.tsx`; grep = 0 | Sem chamador |
| L06 | `EliteFormField` | ⬛ | NÃO_IMPLEMENTADO (morto) | `src/components/molecules/EliteFormField.tsx`; grep = 0 | Sem chamador |
| L06 | `PreloadLink` | 🟦 | NÃO_IMPLEMENTADO | `src/components/atoms/PreloadLink.tsx:19-23` (`// Logic to trigger route pre-fetching can be added here`); grep de uso = 0 | Não faz prefetch e ninguém usa (substituído por `components/PrefetchLink.tsx`) |
| L06 | `ui/sidebar.tsx`, `ui/form.tsx`, `ui/kbd.tsx`, `ui/status-indicators.tsx` | ⬛ | NÃO_IMPLEMENTADO (morto) | grep `ui/sidebar"`, `ui/form"`, `ui/kbd"`, `ui/status-indicators"` em `src/` (excluindo o próprio) = 0 cada; tamanhos 637/129/22/14 linhas | 802 linhas sem importador |

#### Itens que viraram IMPLEMENTADO

Nenhum item inteiro mudou de classe. Dois sub-itens foram corrigidos (o item segue PARCIAL por outros motivos):

1. `UrgencyDetailsSheet` — botão "Iniciar Cotação Imediata" deixou de ser toast "em desenvolvimento" e agora navega: `src/components/compras/dashboard/UrgencyDetailsSheet.tsx:263` (`onClose(); navigate('/cotacao?id=${item.id}')`).
2. `ExecutiveDrillDownModal` — mojibake não existe mais: `executive/ExecutiveDrillDownModal.tsx:33` "Exploração", `:36` "Ações Críticas", `:99` "Ciclo Médio"; grep `Ã` no arquivo = 0.

Verificado também que `ExecutiveDashboard` consome o hook real `useExecutiveDashboardData` (`ExecutiveDashboard.tsx:46-51`, def `src/hooks/useExecutiveDashboardData.ts:27`) para os cards de métrica — mas a auditoração de agosto já registrava isso (`metrics` real); tabelas/pendências/séries/filtros continuam mock.

#### Itens que NÃO consegui confirmar

- **Quando/por qual PR os dois sub-itens acima foram corrigidos** — NÃO VERIFICADO: o checkout é raso (51 commits, primeiro em 2026-11-17); `git log -S'ExploraÃ§'` não encontra nada no histórico disponível. Pode até ter sido artefato de decodificação da ferramenta da auditoria, não do arquivo.
- **PRs #43/#46/#47/#70–#75/#84 citadas no enunciado** — NÃO VERIFICADO: não aparecem no `git log` local (`grep -E "#(43|46|47|7[0-5]|84)\b"` = 0); só #108–#163 estão no histórico. Nenhum arquivo deste escopo mostra mudança atribuível a elas.
- **Conteúdo real das tabelas** (`active_sessions`, `geo_access_logs`, `security_logs`, `approval_rules` com `user-1..user-5`, `push_subscriptions` com chave placeholder) — NÃO VERIFICADO: tarefa somente leitura, nada rodado contra o Supabase. O que está provado é ausência/presença de produtor no código.
- **`ExecutiveAIInsights` botões de ação** — a auditoria citava `<Button>` em `:173` sem `onClick`; hoje é `<button>` HTML em `:173-175`, também sem `onClick`. Confirmado inerte; não confirmei se houve troca de componente ou só renumeração.

---

## Anexo A4 — Lotes L07 (hooks) e L08 (features)

### Reverificação L07 (hooks) + L08 (features) — HEAD 2a86602 (2026-11-19)

Método: leitura do código atual + grep por símbolo/arquivo em `src/` (excluindo `__tests__`), cruzamento com
`src/integrations/supabase/types.ts` (gerado do banco, último sync bfc3e0e #140) e `supabase/migrations`.
Nada rodado contra o Supabase. **Clone é shallow: o histórico começa em 08eb373 (#108, 2026-11-17)** — PRs < #108
(ex.: #70–#75, #81) não são visíveis aqui; afirmação sobre eles = só o que o código em HEAD mostra.
Desde 2026-08-16 só **1 commit** tocou `src/hooks`/`src/features` além do import inicial: 79214f8 (#116,
reaproveitamento de canal Realtime). Logo, quase tudo do L07/L08 está idêntico ao auditado.

Legenda estado atual: NÃO_IMPLEMENTADO · PARCIAL · IMPLEMENTADO (corrigido) · REMOVIDO · MORTO (sem importador).

#### Tabela principal

| Lote | Hook/Feature | Classif. ago/2026 | Estado atual | Evidência atual | O que falta hoje |
|---|---|---|---|---|---|
| L07 | `useAccountFilters` | 🟨 | PARCIAL | `src/hooks/useAccountFilters.ts:90` e `:223` — `.upsert([...] as never, {onConflict})` sem ler `error`; consumidores vivos (Solicitacoes/Historico/Acompanhamento/ComprasDashboard) | Checar `error` do upsert e sinalizar falha de persistência; remover cast `as never` |
| L07 | `useBuyerPerformanceData` | 🟨 | PARCIAL | `:222` `… : buyerPeds.length > 0 ? 80 : 0` (taxa de sucesso literal 80); `:281,:288` `economia: 0` nunca incrementada, `:296` exposta; UI em `src/pages/buyer/BuyerPerformanceDashboard.tsx:422` renderiza `buyer.fornecedores` | Calcular economia por fornecedor (ou remover coluna); tirar fallback 80 |
| L07 | `useCriticalAlertsBadge` | 🟨 | PARCIAL | `:25-27` `const { count: c } = await supabase.from("system_alerts")…` — `error` não desestruturado; nenhum `filter`/tenant no arquivo (grep `tenant|organization|filter` = 0); importado só por `AppSidebar.tsx` | Tratar erro; filtrar Realtime por tenant |
| L07 | `useDashboardKPIs` | 🟨 (L15: ✅ falso no L01) | PARCIAL | `:98` `generateSparkline = () => []`; `:106 atrasados: 0`, `:107 taxaEntrega: 100`, `:109 totalFornecedores: 0`, `:111 pendingApprovals: 0`, `:117 avgSla: 1.8`, `:118 taxaSlaReal: 85`; `:138-143` `sla:{current:85,previous:82,trend:3,sparkline:[80,82,81,84,83,85,85]}`. Chega à tela: `src/pages/dashboard/ComprasDashboard.tsx:199-204` e `src/components/compras/DashboardInsights.tsx:57-63`. Teste novo `src/hooks/__tests__/useDashboardKPIs.test.tsx` cobre só `p_organization_id`/`economiaPercentual`, não os literais | Trazer SLA/atrasados/fornecedores/aprovações da RPC `get_compras_dashboard_metrics` ou esconder os cards |
| L07 | `useExecutiveDashboardData` | 🟨 (L15) | PARCIAL | `:153` `maverickSpend: totalSpend*0.045 // Simulated`; `:154` `tailSpend: totalSpend*0.12 // Simulated`; metas literais `:144-152`. Consumido em `src/components/compras/AdvancedProcurementKPIs.tsx:89,202,211` e `executive/ExecutiveAIInsights.tsx:80-85` (gera "insight" de IA sobre número inventado) | Calcular maverick/tail a partir de `contracts`/`pedidos` ou rotular como estimativa |
| L07 | `useFuseSearch` | 🟨 | PARCIAL | Únicos imports do arquivo são `normalizeText` (`enhanced-search.tsx:17`, `PendingApprovalsList.tsx:22`, `SupplierChat.tsx:26`, `searchConfig.ts:6`, `CommandPalette.tsx:49`, `AdvancedSearch.tsx:14`). `useFuseSearch:83`, `useMultiCollectionSearch:225`, `createSearchIndex:306`, `HighlightedText:329`, `default:348` sem consumidor | Mover `normalizeText` para `src/lib` e apagar o motor Fuse (ou adotá-lo na busca) |
| L07 | `useOfflineSync` | 🟨 | PARCIAL | grep `addPendingOperation|withOfflineSupport|deadLetterQueue|syncPendingOperations` fora de `useOfflineSync.ts` = **0**; único consumidor `src/features/layout/components/OfflineIndicator.tsx:11` lê só `isOnline,isSyncing,pendingCount,hasPendingOperations` | Fila continua vazia para sempre; ou ligar `withOfflineSupport` nas mutations ou remover o motor |
| L07 | `usePurchaseHistory` | 🟨 (L15) | PARCIAL | `:350` `avgDeliveryDays: 0, // Would need tracking data`; `:369` `isLoading: loadingPedidos` só; `suppliersHistory` consumido em `HistoricoCompras.tsx:47,152` e `SourcingHistoryConsole.tsx:50,77` (campo `avgDeliveryDays` não é renderizado em nenhum dos dois — grep em `src/pages`/`src/components` só acha o scorecard, que calcula o seu próprio) | Calcular de `pedidos.data_entrega` ou remover campo |
| L07 | `useRealPushNotifications` | 🟨 | PARCIAL | `:85-87` `// placeholder VAPID key` + literal `'BEl62iUYg…'`; `:95` `catch {` sem log. #116 só alterou reuso de canal | Chave VAPID real por env/edge; tratar falha de `subscribe()` |
| L07 | `useSessionIdleTimeout` | 🟨 | PARCIAL | `:28-30` `catch (error: unknown) { // Best-effort: ignore… }` vazio | Logar e re-tentar/forçar redirect se `signOut` falhar |
| L07 | `useSidebarBadges` | 🟨 | PARCIAL | `:23-26` 4 counts sem `.error`, `:30-33` `?? 0`; **drift resolvido como "as duas tabelas existem"**: `workflow_approvals` em `types.ts:8355` e `approval_workflows` em `types.ts:589`. Mas o badge "Aprovações" conta `workflow_approvals` (`:26`), tabela gravada só por `supabase/functions/workflow-engine/index.ts:122`, enquanto a UI de aprovação grava `approval_workflows` (`useApprovalWorkflow.ts:114,214,222,252`) | Badge aponta para a tabela errada → sempre 0 para o fluxo real; trocar para `approval_workflows.status='pending'` e tratar erro |
| L07 | `useWebAuthn` (passkey) | 🟨 (L15: ✅ falso no L01) | PARCIAL — **crítico mantido** | `:248-261`: `verifyOtp` falha → `logger.error` + comentário "Try alternative approach" sem código → `:260 toast.success('Login realizado…')` + `:261 return { success: true }`. Edge `supabase/functions/webauthn-authenticate/index.ts:166-173` valida só `clientData.challenge` e `type`; grep `signature|crypto.subtle|authenticatorData` = 0 (245 linhas) → bypass S-1 intacto. Botão ainda ligado: `src/pages/auth/Auth.tsx:45`; `PasskeyManager.tsx:43` | Verificar assinatura (COSE) na edge ou desabilitar botão; propagar erro do `verifyOtp` |
| L07 | `useWorkflowDLQ` | 🟨 | PARCIAL | `useApprovalWorkflow.ts:45,177,236,265` só chama `pushToDLQ`; `:357` expõe `workflowDLQ`; grep `workflowDLQ|retryableEntries|dlqEntries|retryEntry|clearDLQ` em `*.tsx` fora de `src/hooks` = **0** | UI de retry/alerta do DLQ (ou remover) |
| L07 | `useBulkOperations` | ⬛ | MORTO | hook `:11` + `solicitacoesStatusOptions:73`, `pedidosStatusOptions:83`, `pagamentosStatusOptions:92`; único uso fora: `src/hooks/__tests__/hookConstants.test.ts`. `BulkOperationsPreview` vive (`Pedidos.tsx`, `Solicitacoes.tsx`) sem passar pelo hook | Apagar arquivo + teste de constantes |
| L07 | `useFlashHighlight` | ⬛ | MORTO | `:7` definição; 0 ocorrências fora do arquivo | Apagar |
| L07 | `useFormDataProtection` | ⬛ | MORTO | `:8`; 0 ocorrências fora | Apagar (3 cópias do mesmo `beforeunload`) |
| L07 | `useFormDirty` | ⬛ | MORTO | `:6`; 0 ocorrências fora | Apagar |
| L07 | `useUnsavedChangesWarning` | ⬛ | MORTO | `:9`; 0 ocorrências fora | Apagar |
| L07 | exports órfãos em arquivos vivos | (listados) | MORTO (símbolo) | `useKeyboardShortcuts.ts:162 shortcutsList`; `useGlobalUndo.ts:94 useUndoableAction`; `useMobileGestures.ts:162 useLongPress`; `useRecentlyViewed.ts:167 useTrackPageView`; `useOfflineSync.ts:98,282` (`addPendingOperation`,`withOfflineSupport`); `useWorkflowDLQ.ts:66,111,117,122` — todos 0 usos fora do arquivo/teste | Apagar ou ligar |
| L07 | `usePermissions` ↔ `DependencyHealthBadge` | ✅ com contrato quebrado | PARCIAL (sem mudança) | `usePermissions.ts:117-127` não retorna `isAdmin` (usa internamente `:23,:75`); `src/components/admin/DependencyHealthBadge.tsx:102` `const { isAdmin } = usePermissions() as {isAdmin?:boolean}` → `:116 if (!isAdmin) return null` — badge **nunca renderiza** | Usar `useAuth().isAdmin` (`useAuth.tsx:293`) |
| L07 | `useAccountLockout` fail-open | ✅ (falha #10) | PARCIAL (sem mudança) | `:50-53,:68-71` erro de RPC → `return { locked:false }`; `:80-83` idem | Fail-closed ou ao menos alerta |
| L07 | `useMFA` backup codes | ✅ (dado fictício) | PARCIAL (sem mudança) | `:184` `Math.random().toString(36)…` | `crypto.getRandomValues` |
| L07 | `useDevolucoes` tenant sentinela | ✅ | PARCIAL (sem mudança) | `:65,:230,:299` `'00000000-0000-0000-0000-000000000000'` | Falhar sem tenant |
| L07 | Mapa de 57 objetos | NAO_VERIFICADO (runtime) | VERIFICADO contra `types.ts` | 56 tabelas + 11 RPCs do mapa presentes em `types.ts` (loop grep `^      <nome>: \{`); 5 edge fns existem em `supabase/functions/`. Único "MISSING" do meu loop (`get_cost_center_performance_report`) foi **falso-positivo do regex** — está em `types.ts:9475` (overload) | Existência ≠ dado: 99/162 tabelas vazias (ESTADO_ATUAL.md) segue NÃO VERIFICADO aqui |
| L08 | `aprovacoes/components/ApprovalCharts.tsx` | 🟨 | PARCIAL | `src/pages/aprovacoes/Aprovacoes.tsx:28-31` importa `approvalTrendData` de `aprovacoesData.ts` (cabeçalho `:1-3` "Mock data"); `:46-49` KPIs calculados do mock; `:199 <ApprovalTrendChart data={approvalTrendData}/>` | Ligar a `approval_history`/`approval_workflows` (já lidos em `:35 useApprovalWorkflow`) |
| L08 | `aprovacoes/components/ApprovalStats.tsx` | 🟨 | PARCIAL | `:57 trendValue="+2.3% vs período anterior"`, `:65 "-0.8h vs período anterior"` literais no JSX | Idem |
| L08 | `aprovacoes/types/approval.types.ts` | 🟨 | PARCIAL | `ApprovalByValueRangeItem:18`, `ApprovalByApproverItem:24`, `WeeklyTrendItem:43` — os usos (`aprovacoesData.ts:78,86,107`) apontam para a cópia redeclarada em `aprovacoesData.ts:23,29,48` | Unificar tipos |
| L08 | `empresas/components/EmpresaSelector.tsx` (G1) | 🟨 | PARCIAL | `useAuth.tsx:32-40` `setSelectedEmpresa` só grava `localStorage` + `queryClient.invalidateQueries()`; grep `selectedEmpresaId|empresaIds|isConsolidatedView|queryKeyPart` fora de `features/(empresas|auth)` = **0**; montado em `HeaderActions.tsx:55` | Seletor não filtra nada — ligar `useEmpresaFilter` nas queries de `useSolicitacoes/usePedidos/useCotacoes` |
| L08 | `empresas/hooks/useEmpresaFilter.ts` | ⬛ | MORTO | `:27` definição; só `index.ts:3` re-exporta; 0 chamadores | Ligar (é a peça que falta para G1) ou apagar |
| L08 | `empresas/index.ts` | 🟨 | PARCIAL | `:3` exporta símbolo morto; único importador `HeaderActions.tsx:13` | — |
| L08 | `layout/MainLayout.tsx` (G5, G9, G10) | 🟨 | PARCIAL | `:90`, `:97` `ease-&lsqb;cubic-bezier(…)]` (classe Tailwind inválida); `:149 onRestartTour={() => {}}` (botão em `HeaderActions.tsx:124` morto); 8 páginas ainda aninham `MainLayout` dentro de `Shell`: `pages/{catalogo-spot/CatalogoSpot,catalogo-xbz/CatalogoXbz,licitacoes/Licitacoes,orcamentos/Orcamentos,portal-fornecedor/PortalFornecedor,qualificacao/QualificacaoFornecedores,seguranca/Seguranca,configuracoes/ConfiguracoesCentroCusto}.tsx` | Corrigir `[` ; ligar tour; remover MainLayout das 8 páginas |
| L08 | `layout/AppSidebar.tsx` | 🟨 | PARCIAL | `:342` `ease-&lsqb;…`; `:459 export const MobileSidebarTrigger` 0 usos; `:75` item Dashboard `href: "/"` e `AppRoutes.tsx:84` redireciona `/`→`/compras` (nunca ativo) | Idem |
| L08 | `layout/AdvancedSearch.tsx` (G3, G8) | 🟨 | PARCIAL | `:76,:79` Ctrl/⌘+K em `document`; `:119-123` 5× `.ilike.%${searchQuery}%` sem `escapeIlike`; sem filtro de tenant | Escapar; resolver colisão com CommandPalette |
| L08 | `layout/CommandPalette.tsx` (G2, G3, G10) | 🟨 | PARCIAL | badges literais `:117 "5"`, `:118 "3"`, `:121 "2"`, `:129 "4"`; `:144,:145,:165,:166,:167 action: () => {}`; `:168 id:"sair" … action: () => navigate("/auth")` sem `signOut`; `:358,:364` mesmo Ctrl+K em `document` | "Sair" não desloga (vazamento em máquina compartilhada); badges mentem |
| L08 | `layout/UserMenu.tsx` (G10) | 🟨 | PARCIAL | `:76-82` "Meu Perfil" e "Configurações" `DropdownMenuItem` sem `onClick` | Ligar ou remover |
| L08 | `layout/SLASettingsPanel.tsx` | 🟨 | PARCIAL | `:269` label "Notificações por Email (Mock)"; `:28` e `src/stores/slaSettingsStore.ts:37` `emailRecipients: ['compras@promobrindes.com.br']` fixo | Canal de e-mail real / editor de destinatários |
| L08 | `layout/SupplierChat.tsx` (G11) | 🟨 | PARCIAL | `:64 slice(0, 15)`; `:69 online: index % 3 === 0`; `:70-72` `lastMessage/lastMessageTime: undefined`, `unreadCount: 0`; `:226` total não-lidas sempre 0 (#116 só mexeu em canal) | Presença real (já existe infra no arquivo) e contador de não-lidas |
| L08 | `layout/chat/ChatArea.tsx` (G10) | 🟨 | PARCIAL | `:130` selo "IA INSIGHT" decorativo; `<Button>` sem handler em `:132,:135,:140,:221,:240` | Ligar ou remover |
| L08 | `layout/GuidedBuyingAssistant.tsx` (G4) | 🟨 | PARCIAL | `:37` e `:47` `fixed bottom-6 right-6 … z-50` = mesma coordenada de `QuickActionsFAB.tsx:116` | Separar posição |
| L08 | `layout/QuickActionsFAB.tsx` (G4, G6) | 🟨 | PARCIAL (melhorou) | Mojibake **corrigido**: `:43 "Nova Solicitação"`, `:162 "Acesso Rápido"`, `:227 "Ações Rápidas"`; permanecem `:88-89` `new KeyboardEvent… window.dispatchEvent` (listeners estão em `document`) e `:116` colisão de FAB | Disparar em `document`/chamar `setOpen`; separar FAB |
| L08 | `layout/search/SearchResultsList.tsx` (G6) | 🟨 | **IMPLEMENTADO (corrigido)** | `:80 "Ir diretamente para a página filtrada"`; grep `Ã[§£¡©³µ¢]` em todo `src/` = **0 arquivos** | — |
| L08 | `layout/sla-settings/SupplierThresholdConfig.tsx` (G14) | 🟨 | PARCIAL | `:10-17 KNOWN_SUPPLIERS` 6 ids literais (`xbz`,`tech`,`stricker`,`premium`,`asia`,`eco`); `:86` itera a lista fixa | Ler de `fornecedores` |
| L08 | `solicitacoes/hooks/useSolicitacoes.ts` | 🟨 | PARCIAL | `:334 export function useSolicitacoesKPIs()` 0 chamadores (RPC `get_solicitacoes_kpis` `:342` só é chamada daqui e do wrapper `src/lib/supabaseRpc.ts:113`, que também só tem teste); `:9 import { fetchAllRows }` 1 ocorrência = import sem uso; `bulkUpdateStatus:270-283` sem validar transição | Ligar KPIs na tela ou apagar; tirar import morto; validar transições em lote |
| L08 | `solicitacoes/schemas/solicitacao.schemas.ts` | 🟨 | PARCIAL | `:3 SolicitacaoStatusSchema` só em `__tests__` | Usar no `updateStatus`/`bulkUpdateStatus` |
| L08 | `pedidos/hooks/usePedidos.ts` (G12) | ✅ com nota | PARCIAL (sem mudança) | `:218` `updateStatus` valida `VALID_PEDIDO_TRANSITIONS:56`; `:232-246 bulkUpdateStatus` faz `.update(updates).in('id', ids)` sem validar | Validar transição em lote |
| L08 | `auth/hooks/useAuth.tsx` (G13) | ✅ risco de design | PARCIAL (sem mudança) | `:284 if (role === 'admin') return true;` | Decisão de negócio (manter ou restringir) |
| L08 | `src/components/compras/MainLayout.tsx` (shim) | ⬛ | MORTO | arquivo de 69 bytes; grep `compras/MainLayout` em `src/` = 0 | Apagar |
| L08 | `MobileSidebarTrigger`, 3 tipos duplicados, `SolicitacaoStatusSchema`, `useSolicitacoesKPIs` | ⬛ (símbolos) | MORTO | ver linhas acima | Apagar/unificar |
| L15 | Login por Passkey (L01 ✅ → 🟨) | ✅ falso | PARCIAL — crítico | ver `useWebAuthn` + edge acima; `ESTADO_ATUAL.md:84-92` já registra; `webauthn_credentials` com 0 linhas (ESTADO_ATUAL, NÃO reverificado aqui) | Desabilitar botão (`Auth.tsx:45`) até reescrever |
| L15 | Dashboard de Compras — KPIs (L01 ✅ → 🟨) | ✅ falso | PARCIAL | ver `useDashboardKPIs` | — |
| L15 | 6 hooks que alimentam ✅ falsos (`useAccountFilters`, `useBuyerPerformanceData`, `useDashboardKPIs`, `useExecutiveDashboardData`, `usePurchaseHistory`, `useWebAuthn`) | 🟨 | **6/6 PARCIAL, nenhum corrigido** | linhas acima | — |
| regras-dominio | Fio 1: seleção de fornecedor na cotação | fio cortado | **ainda cortado em HEAD** | `src/features/cotacoes/hooks/useCotacoes.ts:144 selectCotacao` existe e audita (`:162 logApprove`), mas grep `selectCotacao` fora de `features/cotacoes` = **0**; `Cotacao.tsx:55` só desestrutura `{ cotacoes, createCotacao }` | Ligar botão de seleção → `selectCotacao` (caller afirma que #70–#75 ligaram; não aparece no código em HEAD) |
| regras-dominio | Fio 2: aprovar workflow → status da solicitação | fio cortado | **ainda cortado** | `useApprovalWorkflow.ts:201-226` escreve só `approval_steps/approval_workflows/approval_history`; grep `CREATE TRIGGER … ON approval_workflows` em `supabase/migrations` = 0 (existe só `auto_transition_solicitacao_on_cotacao_approval`, 20261113122616:91, para cotação) | Trigger/RPC que promova `solicitacoes.status` |
| regras-dominio | Fio 3: Kanban de acompanhamento | fio cortado | **ainda cortado** | `src/pages/acompanhamento/Acompanhamento.tsx:144-146` `handleStatusChange = async (…) => { toast.success(…) }`; passado ao `KanbanBoard` em `:313` | Chamar `usePedidos().updateStatus` |

Contagem: L07 🟨 13 → 13 PARCIAL · L07 ⬛ 5 → 5 MORTO · L08 🟨 19 → 18 PARCIAL + 1 IMPLEMENTADO (`SearchResultsList`) · L08 ⬛ 1 → 1 MORTO · L15 ✅ falsos 2 → 2 PARCIAL · fios cortados 3 → 3 cortados.

#### Hooks sem importador (varredura própria)

Critério: para cada `src/hooks/*.ts(x)` e `src/features/*/hooks/*.ts(x)`, grep de `from '…/<arquivo>'` e de cada símbolo
exportado (palavra inteira) em `src/`, excluindo o próprio arquivo, `__tests__` e barrels `index.ts`.

**Arquivos inteiros sem importador (5 — os mesmos do L07, confirmados):**
`src/hooks/useBulkOperations.ts`, `src/hooks/useFlashHighlight.ts`, `src/hooks/useFormDataProtection.ts`,
`src/hooks/useFormDirty.ts`, `src/hooks/useUnsavedChangesWarning.ts`.
Em `src/features/*/hooks/` nenhum arquivo inteiro é órfão (todos chegam via barrel), mas `useEmpresaFilter.ts` só é
re-exportado — ninguém importa o símbolo.

**Símbolos exportados sem uso fora do arquivo/teste (código morto não documentado em L07/L08 está marcado NOVO):**

| Arquivo:linha | Símbolo | Obs |
|---|---|---|
| `src/hooks/use-toast.ts:71` | `reducer` | NOVO — só `__tests__/useToastReducer.test.ts` |
| `src/hooks/useBulkOperations.ts:11,73,83,92` | `useBulkOperations`, `solicitacoesStatusOptions`, `pedidosStatusOptions`, `pagamentosStatusOptions` | doc |
| `src/hooks/useFlashHighlight.ts:7` · `useFormDataProtection.ts:8` · `useFormDirty.ts:6` · `useUnsavedChangesWarning.ts:9` | hooks | doc |
| `src/hooks/useFuseSearch.ts:83,225,306,329,348` | `useFuseSearch`, `useMultiCollectionSearch`, `createSearchIndex`, `HighlightedText`, default | doc (só `normalizeText:59` é usado) |
| `src/hooks/useGlobalUndo.ts:94` | `useUndoableAction` | doc |
| `src/hooks/useKeyboardShortcuts.ts:162` | `shortcutsList` | doc |
| `src/hooks/useMobileGestures.ts:162` | `useLongPress` | doc |
| `src/hooks/useRecentlyViewed.ts:132,143,154,167` | `recentItemTypeIcons`, `recentItemTypeLabels`, `recentItemTypeColors` (NOVO — só `hookConstants.test.ts`), `useTrackPageView` | parcialmente doc |
| `src/hooks/useXbzIntegration.ts:152,270,277` | `XbzRequestError`, `getXbzSavedRatio`, `clearXbzStaticCache` | NOVO — os dois últimos só em `useXbzIntegration.cache.test.tsx`; `getXbzNetworkStats/resetXbzNetworkStats` são usados (`XbzNetworkPanel.tsx:9`) |
| `src/hooks/useOfflineSync.ts:98,282` | `addPendingOperation`, `withOfflineSupport` (e `deadLetterQueue`, `syncPendingOperations`) | doc |
| `src/hooks/useWorkflowDLQ.ts:66,111,117,122` | `retryEntry`, `removeEntry`, `clearDLQ`, `retryableEntries` | doc |
| `src/features/empresas/hooks/useEmpresaFilter.ts:27` | `useEmpresaFilter` | doc |
| `src/features/solicitacoes/hooks/useSolicitacoes.ts:334` | `useSolicitacoesKPIs` | doc |

#### Viraram IMPLEMENTADO (ou melhoraram) desde ago/2026

1. **G6 mojibake** — 0 arquivos em `src/` com `Ã§/Ã£/Ã¡…` (`QuickActionsFAB.tsx:43,162,227`, `SearchResultsList.tsx:80` corretos; commit 3293856 #150 cobriu `App.tsx`/`PrefetchLink.tsx`; os de `features/` já vinham corrigidos no import 08eb373). `SearchResultsList.tsx` passa a IMPLEMENTADO; `QuickActionsFAB.tsx` segue PARCIAL por G4 e pelo dispatch em `window`.
2. **Drift `workflow_approvals` × `approval_workflows`** — não é drift de nome: as duas tabelas existem (`types.ts:8355` e `:589`; migrations 20260513190856 e 20260111025047). O problema real passa a ser **fonte errada do badge** (`useSidebarBadges.ts:26` conta a tabela do `workflow-engine`, não a do fluxo de aprovação da UI).
3. **Realtime** — #116 (79214f8) corrigiu crash por canal reaproveitado em `useRealtimeSubscription`, `useCriticalAlertsBadge`, `useApprovalNotifications`, `useRealPushNotifications`, `useLicitacoes`, `SupplierChat` (não estava nos docs; não altera as classificações acima).
4. **Teste novo** `src/hooks/__tests__/useDashboardKPIs.test.tsx` (tenant/grupo e divisão por zero) — não cobre os KPIs literais.
5. **Mapa de 57 objetos** — sai de NAO_VERIFICADO para "existe no schema gerado" (56 tabelas, 11 RPCs, 5 edges).

#### NÃO consegui confirmar

- **Runtime/banco**: linhas em `webauthn_credentials`, `workflow_approvals`, `system_alerts`, `user_filter_preferences`; corretude de RLS; se `get_cost_center_performance_report` roda em produção (existe em `types.ts:9475` e nas migrations 20260512…/20261112223649). Tarefa era só leitura, sem Supabase.
- **PRs #70–#75, #81** citadas pelo chamador: o clone é shallow (primeiro commit 08eb373 = #108). Em HEAD, `selectCotacao` não tem chamador e o Kanban só faz `toast` — ou as PRs não mergearam, ou foram revertidas, ou o chamador se refere a outra coisa. `docs/agentes/regras-dominio.md:17-21` (versão do import) também diz que os 3 fios seguem cortados.
- **Comportamento em navegador** (G3 dois diálogos no Ctrl+K, G4 FAB sobreposto, G9 layout duplo, `QuickActionsFAB` dispatch em `window` inerte): dedução por leitura, não observado.
- **Qualidade das asserções** dos testes novos (`useSolicitacoes.rls.test.tsx`, `useDashboardKPIs.test.tsx`): lidos só por grep de `it(`/`expect(`.

---

## Anexo A5 — Lotes L09 (lib/stores/services) e L10 (edge functions)

### Reverificação L09 (lib/stores/services) + L10 (edge functions) — HEAD 2a86602 (2026-11-20)

Somente leitura de código. Nada rodado contra Supabase; tudo que depende de runtime está em "NÃO consegui confirmar".
Linhas citadas são do código ATUAL. Legenda estado: NÃO_IMPLEMENTADO · PARCIAL · IMPLEMENTADO · REMOVIDO.

#### Tabela — itens 🟨/🟦/⬛ de ago/2026 (31 itens: 22 edges + 9 módulos L09)

| Lote | Item | Classif. ago/2026 | Estado atual | Evidência atual | O que falta hoje |
|---|---|---|---|---|---|
| L10 | ai-demand-prediction | 🟨 | PARCIAL | `supabase/functions/ai-demand-prediction/index.ts:38` lê `OPENROUTER_API_KEY`; `:92` `callAIGatewayWithFallback`; `_shared/ai_gateway.ts:12` `https://openrouter.ai/api/v1/chat/completions`; chamador `src/components/compras/DemandPredictionPanel.tsx:139` | Provedor trocado (Lovable→OpenRouter, PR #141), IA real. Continua sem persistir nada e fallback devolve HTTP 200 com `_fallback:true` (`ai_gateway.ts:102-104`) |
| L10 | ai-negotiation | 🟨 | PARCIAL | `ai-negotiation/index.ts:53` `OPENROUTER_API_KEY`, `:67` `callAIGateway` com circuit breaker; chamador `src/pages/negociacao-ia/NegociacaoIA.tsx:92` (rota `/negociacao-ia`, `AppRoutes.tsx:110`) | IA real; não persiste resultado |
| L10 | ai-supplier-risk | 🟨 | PARCIAL | OpenRouter `:46`; **G-3 persiste**: `const logger` dentro do `try` (`ai-supplier-risk/index.ts:37-38`) e usado no `catch` (`:162-163`) → `ReferenceError` em todo caminho de erro; chamador `SupplierRiskAnalysis.tsx:131` | Mover `getLogger` para fora do `try` (ou `typeof logger`) |
| L10 | ai-supplier-suggestion | ⬛ | PARCIAL (código real, **morta**) | 0 `invoke` em `src/`; só `_shared/contracts.ts:131,161` e `deploy_edge_functions_promo_supply.sh:68,116`; OpenRouter `:38,:83` | Ligar na UI (ex.: NovaSolicitacaoModal) ou remover pasta |
| L10 | alert-dispatcher | 🟨 | PARCIAL | Invocador cron corrigido: `supabase/migrations/20261112171742_cron_edge_projeto_correto_vault.sql:17-51` (`_invoke_edge_function` → projeto `lmypcdfsrgfftzhxawao`, chave via Vault `edge_invoke_service_key`). **G-6 persiste**: `alert-dispatcher/index.ts:247` `.in("severity",["HIGH","CRITICAL"])` vs `process-outbox/index.ts:114` `severity:"critical"` e `xbz-sync-pedidos/index.ts:125` `"medium"`; `:337` `channel==="webhook"` vs `CHECK (channel IN ('inapp','email','slack'))` (`20260712203402:10`, nenhuma migration altera) | Normalizar severidade (upper/lower) e adicionar `'webhook'` ao CHECK ou remover canal |
| L10 | check-sla-alerts (era ✅) | ✅ | **REGREDIU → PARCIAL** | `check-sla-alerts/index.ts:88` `verifyCronSecret(req)`; `_shared/security.ts:289-326` agora **fail-closed** (aceita só `CRON_SECRET` ou `SUPABASE_SERVICE_ROLE_KEY`); botão manual `src/components/notifications/NotificationSettingsPanel.tsx:59` manda JWT de usuário → 401 | Aceitar JWT admin no caminho manual ou tirar o botão |
| L10 | erp-sync | 🟦 | NÃO_IMPLEMENTADO (stub honesto) | `erp-sync/index.ts:74-77` grava `status:"pending"`, `:105` devolve 501; chamador `src/pages/admin/ERPConnections.tsx:53` (rota `/admin/erp`) | Integração real por `connection.type` |
| L10 | external-db-bridge | 🟨 | PARCIAL (sem chamador de produção) | Só `scripts/validate-bridge.ts:139` e doc `src/pages/admin/DeveloperDocs.tsx:53-111`; 0 `invoke('external-db-bridge')` em `src/` | Hook consumidor ou remover |
| L10 | fiscal-orchestrator | ⬛ | PARCIAL (**morta**) | **G-2 corrigido**: `fiscal-orchestrator/index.ts:98` `getTenantId(supabaseAdmin, user)` (2 args; assinatura `_shared/security.ts:251-255`). 0 chamadores em `src/`/migrations (só `contracts.ts:128,152`, deploy script `:72`). **G-10 persiste**: `:148` `status:"failed"` mas `:158-159` `success:true` "agendado para reprocessamento"; nenhum reprocessador (`FiscalDashboard.tsx:15` só lê `fiscal_events`) | Chamador na UI fiscal; resposta honesta; worker de retry |
| L10 | guided-buying-ai | 🟦 | NÃO_IMPLEMENTADO (**fachada em produção**) | `guided-buying-ai/index.ts:74` `systemPrompt` nunca usado; `:99-104` if/else por substring com `'Notebook Dell Latitude'`/`'Stricker'` literais; chamador `src/hooks/useGuidedBuying.ts:56` ← `GuidedBuyingAssistant.tsx` ← **`src/features/layout/components/MainLayout.tsx`** (montado em todo o app) | Chamar `callAIGateway` com o prompt ou desmontar o assistente |
| L10 | maintain-partitions | ⬛ | PARCIAL (**morta**) | Única referência: seed `20260719000002_cron_heartbeats.sql:37`; nenhum `cron.schedule` para a edge; fora do deploy script. `20261117170000:244` agendou `scan_partition_candidates` (RPC), não a edge; `20261117230000_retencao_fonte_unica.sql:96` declara particionamento "INATIVA POR DECISAO" | Decisão: remover pasta + heartbeat seed, ou agendar |
| L10 | process-invoice-idp | 🟦 | NÃO_IMPLEMENTADO (**fachada em produção**) | `process-invoice-idp/index.ts:53` "simulando extração IA"; `:57-72` `mockExtractedData` com `Math.random()` (`:58`), chave fixa `:59`, `valor_total: 1250.50` `:61`; chamador `src/pages/documentos/DocumentosFiscais.tsx:136` (rota `/documentos-fiscais`, `AppRoutes.tsx:112`) | Extração real (OCR/IA) ou desabilitar botão |
| L10 | punchout-receive | 🟨 | PARCIAL | **G-1 corrigido**: `punchout-receive/index.ts:6` `import { safeTruncate } from "../_shared/logLevel.ts"`; `:61,:66` usam. Refatorada em `session.ts`/`solicitation.ts` (#108, `organization_id` do perfil `solicitation.ts:67-68,98`). **S-3 persiste**: `grep -rn shared_secret supabase/functions` fora de `punchout-encrypt` = 0 → cXML `<Credential>` nunca validado; só rate limit por IP; `--no-verify-jwt` (`deploy…sh:109`) | Validar `shared_secret_encrypted` (gravado por `punchout-encrypt`) no receive |
| L10 | run-audit | ⬛ | PARCIAL (**morta**) | 0 chamadores em `src/`; só `deploy…sh:97,109` e comentário `scripts/ci/check-test-inventory.mjs:83`; `run-audit/rls_test.ts` agora roda no CI (`main.yml:94`) | UI/admin que a invoque ou remover |
| L10 | scim-v2 | 🟨 | PARCIAL | **S-5 persiste**: não está em `NO_JWT_FUNCTIONS` (`deploy…sh:109`); `supabase/config.toml` só tem `project_id`; `deploy-edge-functions.yml:194` `supabase functions deploy` sem `--no-verify-jwt` → gateway rejeita Bearer SCIM antes de `scim-v2/index.ts:86-110`; só exibida em `SSOConfig.tsx:211` | `verify_jwt=false` no `config.toml` + NO_JWT list |
| L10 | send-push-notification | ⬛ | NÃO_IMPLEMENTADO (**morta + G-4**) | 0 chamadores (só `contracts.ts:146`, `deploy…sh:94`); `send-push-notification/index.ts:41` `generateVapidAuth` só declarada; `:84-85` `_vapidPublicKey/_vapidPrivateKey` não usados; `:218` `.delete()` da subscription em qualquer falha | Web Push real (VAPID header + aes128gcm) e chamador |
| L10 | spot-api | ⬛ | **IMPLEMENTADO** (código; runtime NÃO VERIFICADO) | `20261112171742:100-171`: `_invoke_spot_sync` + `cron.schedule` de `spot-api-sync-catalog` (`10 3 * * *`), `-customization` (`40 3 * * 1`), `-stock` (`*/15 * * * *`) via Vault `spot_cron_key`. Ainda fora da lista do deploy script (workflow `deploy-edge-functions.yml` cobre por diff) | Confirmar secrets no Vault e job rodando |
| L10 | system-simulation | 🟨 | PARCIAL | `ci.yml` não existe mais (G-5 saiu do CI); `package.json:29` `test:simulate` ainda manda `SUPABASE_SERVICE_ROLE_KEY` onde `requireAdmin` (`system-simulation/index.ts:12`) espera JWT de usuário. **G-11 persiste**: `:47` `action:"approve_step"` vs `workflow-engine/index.ts:47,105,143` (só `start_workflow`/`submit_decision`) | Payload baseline `start_workflow`; corrigir script |
| L10 | tests/ (edge) | 🟨 | **IMPLEMENTADO** | `.github/workflows/main.yml:94` `deno test --allow-net --allow-env --allow-read supabase/functions/` (toda a árvore); 12 arquivos `*test.ts` em pastas de função | — (G-8 corrigido) |
| L10 | webauthn-authenticate | 🟨 | **NÃO_IMPLEMENTADO (segurança — S-1 persiste)** | `webauthn-authenticate/index.ts:155-159` busca só por `credential_id` (sem `user_id`/email); `:167-175` só compara `challenge` e `type`; **0 ocorrências** de `crypto.subtle`, `verify`, `rpIdHash`, `authenticatorData`, `signature`; `:178` contador próprio; `:195` `generateLink magiclink`; `--no-verify-jwt` `deploy…sh:109`; chamador `src/hooks/useWebAuthn.ts:185,231` ← `src/pages/auth/Auth.tsx` | Verificar assinatura/origin/rpId/counter ou desligar passkey no login |
| L10 | webauthn-register | 🟨 | PARCIAL | `webauthn-register/index.ts:192` `public_key: credResponse.attestationObject` (atestação bruta, não COSE); chamador `useWebAuthn.ts:86,139` ← `PasskeyManager.tsx` | Extrair chave COSE do `authData` |
| L10 | workflow-engine | 🟨 | PARCIAL | **G-2 corrigido**: `workflow-engine/index.ts:41` `getTenantId(supabase, user)`. Sem chamador de produção: só `system-simulation/index.ts:45`, `scripts/stress-test.ts:64`, `tests/integration_suite.ts:105`, `backend-stress.yml:29`; `20261117180000` populou `workflow_nodes/edges` | Fio "aprovar workflow" na UI (regras-dominio #2) |
| L10 | xbz-sync-pedidos | 🟨 | PARCIAL | `_invoke_xbz_sync` recriado com projeto correto + Vault (`20261112171742:53-98`); **nenhum `cron.schedule` cria `'xbz-sync-pedidos-30min'`** (só watchdog `20260726151043:17,23,44` o consulta); 0 chamadores em `src/` | `cron.schedule('xbz-sync-pedidos-30min','*/30 * * * *', 'SELECT public._invoke_xbz_sync()')` |
| L09 | `src/lib/security.ts` | ⬛ | NÃO_IMPLEMENTADO (órfão) | `grep -rnw "lib/security" src` fora de testes = 0; arquivo existe | Usar `security.sanitize` onde há HTML ou remover |
| L09 | `src/lib/secureStorage.ts` | ⬛ | NÃO_IMPLEMENTADO (órfão) | 0 consumidores fora do próprio arquivo/teste; stores persistem em localStorage puro | Ligar aos `persist` dos stores ou remover |
| L09 | `src/lib/supabaseRpc.ts` | ⬛ | NÃO_IMPLEMENTADO (órfão) | 0 consumidores fora do teste | Migrar `supabase.rpc(` diretos ou remover |
| L09 | `src/lib/dbMapping.ts` | 🟨 | PARCIAL | `nullToUndefined`, `undefinedToNull`, `nullsToUndefined`, `undefinedsToNull` → 0 consumidores externos (grep -w) | Remover 4-5 exports mortos |
| L09 | `src/lib/exportData.ts` | 🟨 | PARCIAL (melhorou) | `pedidoColumns` agora usado em `src/pages/relatorios/Relatorios.tsx:23,105`; `solicitacaoColumns`, `fornecedorColumns`, `cotacaoColumns`, `pagamentoColumns` → 0 | Usar ou remover os 4 |
| L09 | `src/lib/logger.ts` | 🟨 | PARCIAL (Achado #1 persiste) | `src/lib/logger.ts:61,64,68` `// console.*` comentados — zero saída de console | Reativar console em DEV ao menos |
| L09 | `src/lib/imageCompression.ts` | 🟨 | PARCIAL | `getCompressedPreviewUrl` 0 consumidores | Remover export |
| L09 | `src/stores/buyerAlertsStore.ts` | 🟨 | PARCIAL (Achado #3 meio corrigido) | Query agora `.from('profiles').select('id, full_name').eq('current_organization_id', …)` (`:70-73`, sem `role` inexistente). **Fio continua cortado**: `targets: []` (`:53`); `loadTargetsFromDb`/`setTargets` 0 chamadores externos; `BuyerPerformanceAlerts.tsx:50` `targets.find` → nunca alerta | Chamar `loadTargetsFromDb` no painel |
| L09 | `src/i18n/config.ts` | 🟨 | PARCIAL (Achado #5 persiste) | 3 arquivos com `useTranslation`; 9 chaves `t("…")` no app; `CatalogoProdutos.tsx:149,150,153` usam `catalog.title/subtitle`, `common.new` — 0 ocorrências em `src/locales/pt/translation.json` | Adicionar chaves ou remover i18n |

Outros achados de L10 reverificados (não eram itens de tabela):
- **S-2** PARCIAL: `verifyCronSecret` agora fail-closed (`security.ts:289-326`), e `alert-dispatcher`/`process-outbox` usam `_invoke_edge_function` com service key via Vault. **Mas** `check-sla-alerts`, `check-expiry-alerts`, `check-cotacao-followup`, `check-approval-escalations`, `weekly-report` continuam agendados só em `20260402114640` com `current_setting('app.settings.supabase_anon_key')` (anon ≠ service role → 401 pelo código atual); `weekly-summary-report` segue em `20260507194402:9` apontando `apuzcrkeqodktmpwobnz`. Nenhuma migration posterior os recria. Runtime NÃO VERIFICADO.
- **S-4** IMPLEMENTADO no script (`docs/agentes/deploy.md:41`: anon key saiu do `.sh`); JWT anon literal segue em `20260711153258:19` (histórico).
- **S-6** persiste: `health-dashboard/index.ts:11-12` `Access-Control-Allow-Origin: "*"`; `_shared/rate_limit.ts:34-37` fail-open.
- **G-7** PARCIAL: `deploy…sh:22` `PROJECT_REF="lmypcdfsrgfftzhxawao"` (correto); `:107` `BLOCKED_FUNCTIONS=("migrate-helper")`; lista ainda 31 de 37 — faltam `spot-api`, `xbz-proxy`, `xbz-sync-pedidos`, `maintain-partitions`, `health-dashboard`, `punchout-encrypt`.
- **G-9** persiste: `src/tests/fuzzing/edge-functions.test.ts:23,38` só `mockValidator` local.
- **NOVO (deploy-edge-functions.yml, PR #123)**: `.github/workflows/deploy-edge-functions.yml:194` roda `supabase functions deploy "${fn}" --project-ref …` **sem `--no-verify-jwt`** e `supabase/config.toml` só tem `project_id` → qualquer push que toque `punchout-receive`, `webauthn-authenticate`, `telemetry`, `run-audit`, `system-simulation`, `dependency-health` ou `_shared/` (= todas) **religa verify_jwt** nessas 6 → webhook PunchOut (externo, sem JWT) e login por passkey ficam 401 no gateway. `docs/agentes/deploy.md:36-39` diz que o `config.toml` declara `verify_jwt` para `migrate-helper` — não declara nada. Runtime NÃO VERIFICADO.

#### Edges sem chamador
Nenhum chamador em `src/`, `supabase/migrations/`, outras edges, `.github/`, `scripts/` (só `_shared/contracts.ts` e/ou lista do deploy script):
- `ai-supplier-suggestion` · `run-audit` · `send-push-notification` · `maintain-partitions` · `fiscal-orchestrator`

Sem chamador de **produção** (só teste/CI/externo):
- `workflow-engine` (system-simulation, stress-test, integration_suite) · `external-db-bridge` (scripts/validate-bridge.ts) · `scim-v2` (IdP externo; URL em `SSOConfig.tsx:211`) · `punchout-receive` (webhook externo; URL emitida em `punchout-setup/index.ts:90`) · `xbz-sync-pedidos` (invocador SQL existe, job nunca agendado)

Chamadores por edge (pasta × quem chama) — 37 pastas:
ai-demand-prediction←DemandPredictionPanel.tsx:139 · ai-negotiation←NegociacaoIA.tsx:92, system-simulation:37 · ai-supplier-risk←SupplierRiskAnalysis.tsx:131 · alert-dispatcher←cron `alert-dispatcher-1min` (20260711153258:59-61 via `_invoke_edge_function` recriada em 20261112171742) · check-approval-escalations←cron 20260402114640:66 · check-cotacao-followup←cron 20260402114640:24 · check-expiry-alerts←cron :52 · check-sla-alerts←cron :38 + NotificationSettingsPanel.tsx:59 · dependency-health←DependencyHealth.tsx:47,76,188,263 · erp-sync←ERPConnections.tsx:53, system-simulation:56 · generate-contract-pdf←ContractDetailsModal.tsx:148 · guided-buying-ai←useGuidedBuying.ts:56 · health-dashboard←AlertDetail.tsx:69-70 (HealthDashboard.tsx agora lê view/RPC direto, `:155,198-210`) · migrate-storage-paths←StorageMigration.tsx:50-51 · process-invoice-idp←DocumentosFiscais.tsx:136 · process-outbox←cron `outbox-worker-1min` (20260711153258:68) · punchout-encrypt←PunchOutCatalogs.tsx:82 · punchout-setup←PunchOutCatalogs.tsx:146 · spot-api←cron 20261112171742:159-161 · spot-proxy←useSpotIntegration.ts:51 · system-simulation←AdminTelemetria.tsx:65, package.json:29 · telemetry←logger.ts:117 · webauthn-authenticate←useWebAuthn.ts:185,231 · webauthn-register←useWebAuthn.ts:86,139 · weekly-report←cron 20260402114640:10 · weekly-summary-report←cron 20260507194402:9 (projeto errado) · xbz-proxy←useXbzIntegration.ts:178

#### Chamadas a edges inexistentes
- `process-solicitacao-neural`: `src/components/compras/NovaSolicitacaoModal.tsx:113` (botão IA do modal de nova solicitação — código vivo) e `src/pages/admin/DeveloperDocs.tsx:44` (snippet de documentação). `ls supabase/functions | grep neural` = vazio. Único caso.

#### Dado fictício em produção
| Onde | O quê | Gravidade |
|---|---|---|
| `supabase/functions/process-invoice-idp/index.ts:57-72` | NF inventada (`Math.random`, chave fixa, R$ 1.250,50) devolvida como extração real para `/documentos-fiscais` | ALTA (dado fiscal falso na tela) |
| `supabase/functions/guided-buying-ai/index.ts:99-104` | Resposta "IA" por if/else com fornecedor/produto literais; assistente montado em `MainLayout.tsx` | ALTA (usuário acha que é IA) |
| `supabase/functions/punchout-setup/index.ts:103` | Campo `mock_redirect` (nome; URL é real) e cXML "Simplified for MVP" `:71` | BAIXA |
| `src/stores/kpiTargetsStore.ts` | 8 metas `target:` fixas no código, sem origem no banco | MÉDIA |
| `src/stores/slaSettingsStore.ts:37` | `emailRecipients: ['compras@promobrindes.com.br']` fixo em produto multi-tenant | MÉDIA |
| `supabase/functions/erp-sync/index.ts:74-105` | Stub declarado, devolve 501 — honesto, não fictício | — |
| Legítimos (não fictício): `dependency-health/index.ts:536` e `_shared/retry.ts:26` (jitter), `src/lib/utils.ts:23` e `src/stores/undoStore.ts:45` (ids de UI), `src/lib/query-client.ts:36` (`placeholderData` do TanStack) | | |

#### Viraram IMPLEMENTADO (corrigidos desde ago/2026)
1. G-1 `punchout-receive` importa `safeTruncate` (`index.ts:6`).
2. G-2 `getTenantId` em `workflow-engine/index.ts:41` e `fiscal-orchestrator/index.ts:98` (PR #121).
3. G-8 CI roda `deno test supabase/functions/` inteiro (`main.yml:94`).
4. `spot-api` agendada (3 jobs, `20261112171742:159-161`).
5. Invocadores de cron apontam ao projeto oficial com chave no Vault (`_invoke_edge_function`, `_invoke_xbz_sync`, `_invoke_spot_sync`).
6. `verifyCronSecret` fail-closed (`security.ts:289-326`) — S-2 deixa de ser "aberto"; vira "jobs antigos com anon key quebram".
7. Deploy script: `PROJECT_REF` correto (`:22`), `migrate-helper` bloqueada (`:107`), anon key removida do arquivo.
8. ai-* migradas para OpenRouter com circuit breaker (`_shared/ai_gateway.ts:12-59`, PR #141).
9. `.env.example` agora declara `VITE_SUPABASE_PUBLISHABLE_KEY` (Achado #4 do L09; as 5 outras vars continuam fictícias — 0 leituras).
10. `buyerAlertsStore.loadTargetsFromDb` consulta coluna existente `current_organization_id` (`:73`), mas segue sem chamador.
11. `pedidoColumns` passou a ter consumidor (`Relatorios.tsx:23,105`).
12. `punchout-encrypt` (nova) cifra `shared_secret` com AES-GCM via `PSV2_ENCRYPTION_KEY` (`index.ts:27-50`), chamada por `PunchOutCatalogs.tsx:82`.

#### NÃO consegui confirmar (runtime)
- Quais funções estão publicadas e com qual `verify_jwt` real no projeto `lmypcdfsrgfftzhxawao` (script manual × workflow divergem).
- Se os secrets `edge_invoke_service_key`, `xbz_cron_key`, `spot_cron_key` existem no Vault e se `spot-api-sync-*` roda.
- Se os jobs `check-*`/`weekly-report` no banco vivo ainda mandam anon key (migrations dizem sim → 401 pelo código atual) e se `weekly-summary-report-job` ainda aponta a `apuzcrkeqodktmpwobnz`.
- Se `xbz-sync-pedidos-30min` foi criado à mão no dashboard.
- Se algum IdP chama `scim-v2` ou algum fornecedor chama `punchout-receive`.
- Se `CRON_SECRET` está definido nas secrets das edges.

---

## Anexo A6 — Elementos clicáveis sem ação e dado fictício (prod-readiness §5.1 + varredura própria)

### Verificação §5 / §5.1 de docs/prod-readiness.md — HEAD 2a86602 (2026-11-20)

Método: cada arquivo:linha da tabela 5.1 reaberto (grep de `<Button|<EliteButton|<button|<DropdownMenuItem|onClick|disabled|toast(`) + varredura própria por script (`scan.mjs`, 274 .tsx fora `__tests__` e `components/ui`) + grep de `onClick={() => toast…}`, `=> {}` e `mock*|Math.random|executiveDashboardData|kpiMockData`. Histórico git é raso (commit `08eb373` reimporta tudo em 17/11), então a comparação é por leitura do código, não por diff.

Totais tabela A (67 linhas): **LIGADO desde 11-12: 2** · **SÓ TOAST: 2** · **DISABLED FIXO: 1** · **SEM AÇÃO: 62** (1 com `onClick={() => {}}`, 61 sem handler) — dos 62, **6 estão em código morto** (componente não renderizado em nenhuma rota): `SourcingHistoryConsole.tsx` (5 botões) e `EnhancedPedidoTimeline.tsx:294` (1). Linhas: só `PunchOutCatalogs.tsx` mudou; as demais 65 estão na mesma linha de 2026-11-12.

#### Tabela A — itens da §5.1

| # | Arquivo:linha atual | Rótulo | Tela/rota | Estado | O que faltaria |
|---|---|---|---|---|---|
| 1 | `src/pages/acompanhamento/Acompanhamento.tsx:198` | NOVA ATUALIZAÇÃO | /acompanhamento | SEM AÇÃO (`onClick={() => {}}`) | Definir o que é "atualização" (status? nota?) e criar o Dialog + gravação |
| 2 | `src/pages/acompanhamento/Acompanhamento.tsx:298` | FILTROS AVANÇADOS | /acompanhamento | SEM AÇÃO | Especificar critérios; hoje só existem `searchTerm` e `filtroSLA` |
| 3 | `src/pages/acompanhamento/Acompanhamento.tsx:450` | VISUALIZAR NF-E | /acompanhamento → dialog detalhes | SEM AÇÃO | Campo/URL de NF-e no pedido e rota ou viewer |
| 4 | `src/pages/acompanhamento/Acompanhamento.tsx:451` | HISTÓRICO DE LOGS | /acompanhamento → dialog detalhes | SEM AÇÃO | Fonte de log por pedido; /auditoria não filtra por pedido |
| 5 | `src/pages/catalogo-spot/CatalogoSpot.tsx:216` | Finalizar Pedido | /catalogo-spot (aba carrinho) | SÓ TOAST ("Checkout SPOT — Em desenvolvimento") | Chamar checkout real da Spot (compromisso financeiro — decisão do dono) |
| 6 | `src/components/compras/BulkOperationsPreview.tsx:189` | Desfazer (no toast de sucesso) | /pedidos e /solicitacoes (ações em massa) | SÓ TOAST ("em desenvolvimento") | Reverter ação em massa já gravada; não há snapshot anterior |
| 7 | `src/pages/admin/ERPConnections.tsx:80` | Configurar Nova Conexão | /admin/erp | SEM AÇÃO | Form de criação + INSERT em `erp_connections` |
| 8 | `src/pages/admin/ERPConnections.tsx:119` | Documentação de API | /admin/erp | SEM AÇÃO | Destino (não há doc de API ERP; /admin/docs é arquitetura) |
| 9 | `src/pages/admin/ERPConnections.tsx:159` | ícone Settings2 | /admin/erp (por conexão) | SEM AÇÃO | Definir ação (editar/ativar/excluir) + Dialog |
| 10 | `src/pages/admin/ERPConnections.tsx:208` | Ver Log Completo | /admin/erp | SEM AÇÃO | Tela/listagem paginada de `erp_sync_log` |
| 11 | `src/pages/admin/ERPConnections.tsx:224` | Configurar Campos | /admin/erp | SEM AÇÃO | Modelo de mapeamento de campos (tabela + UI) |
| 12 | `src/pages/admin/PunchOutCatalogs.tsx:171` (era :52) | Novo Catálogo | /admin/punchout | **LIGADO desde 11-12** — `onClick={openNew}` (:62) abre Dialog; `handleSave` (:91) faz `insert` em `punchout_catalogs` (:122-123). PR #139, commit `e94b12f` 2026-11-18 | — |
| 13 | `src/pages/admin/PunchOutCatalogs.tsx:210` (era :91) | ícone Settings2 | /admin/punchout | **LIGADO desde 11-12** — `onClick={() => openEdit(cat)}` (:68); `handleSave` faz `update` (:114-115). PR #139 | — |
| 14 | `src/pages/admin/SSOConfig.tsx:214` | Gerar Token SCIM | /admin/sso | SEM AÇÃO | Edge/RPC que gera e grava hash do token (segurança — dono) |
| 15 | `src/pages/admin/WorkflowAdmin.tsx:54` | Novo Workflow | /admin/workflows | SEM AÇÃO | Dialog de criação + INSERT; "Workflow Designer" não existe |
| 16 | `src/pages/admin/WorkflowAdmin.tsx:136` | Configurar | /admin/workflows | SEM AÇÃO | Editor de workflow (placeholder estático :155-157) |
| 17 | `src/pages/admin/WorkflowAdmin.tsx:167` | Adicionar Regra | /admin/workflows | SEM AÇÃO | Form + INSERT em `workflow_sod_rules` (regra de compliance) |
| 18 | `src/pages/admin/WorkflowAdmin.tsx:204` | Editar | /admin/workflows | SEM AÇÃO | Form + UPDATE em `workflow_sod_rules` |
| 19 | `src/pages/portal-fornecedor/PortalFornecedor.tsx:378` | Ver via Magic Link | /portal-fornecedor | DISABLED FIXO (`disabled`, sem onClick) | Fluxo de magic link inexistente no repo |
| 20 | `src/pages/negociacao-ia/NegociacaoIA.tsx:590` | Saber mais | /negociacao-ia | SEM AÇÃO | Destino (card promocional estático :580-595) |
| 21 | `src/pages/relatorios/RelatoriosCharts.tsx:202` | FULL REPORT | /relatorios (aba geral, `SupplierPerformanceTable` via Relatorios.tsx:230) | SEM AÇÃO | Destino (nenhuma rota de "relatório completo") |
| 22 | `src/pages/relatorios/RelatoriosCharts.tsx:247` | ícone ChevronRight (linha de fornecedor) | /relatorios | SEM AÇÃO | Rota de detalhe de fornecedor (não existe `/fornecedores/:id`) |
| 23 | `src/pages/relatorios/Relatorios.tsx:240` | ABRIR CHAMADO | /relatorios | SEM AÇÃO | Canal de suporte (form, e-mail ou link) |
| 24 | `src/pages/pedidos/PedidoDetailsDialog.tsx:193` | E-MAIL CRIPTOGRAFADO | /pedidos → detalhe | SEM AÇÃO | E-mail do fornecedor no join (`usePedidos.ts`) + ação |
| 25 | `src/pages/pedidos/PedidoDetailsDialog.tsx:196` | HUB DE COMUNICAÇÃO | /pedidos → detalhe | SEM AÇÃO | Definir canal (chat/WhatsApp/e-mail) |
| 26 | `src/pages/pedidos/PedidoDetailsDialog.tsx:430` | AUTORIZAR REDESPACHO | /pedidos → detalhe | SEM AÇÃO | Não existe status/dado de redespacho |
| 27 | `src/pages/historico/HistoricoSourcingTab.tsx:294` | Ver Análise Detalhada | /historico-compras (aba sourcing) | SEM AÇÃO | Rota de benchmark; valores do card são fórmula fixa (ver C) |
| 28 | `src/pages/historico/HistoricoSourcingTab.tsx:329` | Gerar Executive Sourcing Report | /historico-compras (aba sourcing) | SEM AÇÃO | Definir conteúdo/formato; dados fictícios (ver C) |
| 29 | `src/pages/sourcing/Sourcing.tsx:112` | Filtros | /sourcing | SEM AÇÃO | Painel de filtros; `activeTab` setado e não usado |
| 30 | `src/pages/sourcing/RFxDetails.tsx:210` | ícone ArrowRight (por resposta) | /sourcing/:id | SEM AÇÃO | Dialog/rota de detalhe da resposta |
| 31 | `src/pages/sourcing/RFxDetails.tsx:255` | Gerenciar Convites | /sourcing/:id | SEM AÇÃO | UI + escrita em `sourcing_invitations` |
| 32 | `src/pages/sourcing/RFxDetails.tsx:259` | Chat com Fornecedores | /sourcing/:id | SEM AÇÃO | Canal/integração |
| 33 | `src/pages/sourcing/RFxDetails.tsx:263` | Cancelar Evento | /sourcing/:id | SEM AÇÃO | Mutation + status cancelado + regra de quem pode |
| 34 | `src/pages/sourcing/RFxDetails.tsx:307` | Gerar Tabela Comparativa Automática | /sourcing/:id | SEM AÇÃO | Definir saída (export? IA?) |
| 35 | `src/pages/sourcing/RFxDetails.tsx:310` | Cobrar Fornecedores Pendentes (WhatsApp) | /sourcing/:id | SEM AÇÃO | Integração WhatsApp + telefone (hook só traz id/razao_social) |
| 36 | `src/pages/estoque/GestaoEstoque.tsx:166` | Filtros Avançados | /estoque | SEM AÇÃO | Painel de filtros (só existe `search`) |
| 37 | `src/components/compras/IAAdvisor.tsx:40` | Ver Insights | /solicitacoes (Solicitacoes.tsx:297) | SEM AÇÃO | Lista de insights/destino |
| 38 | `src/components/compras/IAAdvisor.tsx:43` | Ação Rápida | /solicitacoes | SEM AÇÃO | Definir a ação |
| 39 | `src/components/compras/executive/ExecutiveAIInsights.tsx:173` | {insight.action} (4 rótulos) | /dashboard-executivo (ExecutiveDashboard.tsx:287) | SEM AÇÃO (`<button>` sem onClick) | Campo de rota/ação por insight |
| 40 | `src/components/compras/BulkPlanningConsole.tsx:105` | Disparar Cotações (n) | /solicitacoes (:299) e /dashboard-executivo (:292) | SEM AÇÃO | Componente inteiro é mock (ver C) |
| 41 | `src/components/compras/BulkPlanningConsole.tsx:242` | VALIDAR | idem | SEM AÇÃO | idem |
| 42 | `src/components/compras/BulkPlanningConsole.tsx:257` | REVISAR FILA | idem | SEM AÇÃO | idem |
| 43 | `src/components/compras/SupplierIntelligenceConsole.tsx:173` | GERAR PEDIDO PREDITIVO | /historico-compras (aba analytics, HistoricoCompras.tsx:350) | SEM AÇÃO | Previsão é texto fixo (ver C) |
| 44 | `src/components/compras/ProductionRoutingEngine.tsx:174` | LISTAR / CONECTAR | /pedidos → detalhe (PedidoDetailsDialog.tsx:175) | SEM AÇÃO (`<button>` nativo) | Lista de fornecedores por item + Dialog |
| 45 | `src/components/compras/SourcingHistoryConsole.tsx:615` | Exportar Dados | **nenhuma — componente não é importado por ninguém (código morto)** | SEM AÇÃO (morto) | Remover arquivo ou integrar |
| 46 | `src/components/compras/SourcingHistoryConsole.tsx:702` | Executar Análise de Demanda Global | código morto | SEM AÇÃO (morto) | idem |
| 47 | `src/components/compras/SourcingHistoryConsole.tsx:763` | Deep Scan | código morto | SEM AÇÃO (morto) | idem |
| 48 | `src/components/compras/SourcingHistoryConsole.tsx:764` | Audit Log | código morto | SEM AÇÃO (morto) | idem |
| 49 | `src/components/compras/SourcingHistoryConsole.tsx:879` | Dossiê Completo | código morto | SEM AÇÃO (morto) | idem |
| 50 | `src/components/compras/EnhancedPedidoTimeline.tsx:294` | {doc.nome} | **nenhuma — só `import { TimelineStep }` (tipo) em AcompanhamentoHelpers.ts:10; o componente não é renderizado** | SEM AÇÃO (morto) | Se for usado: `window.open(doc.url)`; igual em :502 |
| 51 | `src/components/compras/AISupplierSuggestion.tsx:59` | Open Sourcing Panel | /cotacao (Cotacao.tsx:335) e /fornecedores (Fornecedores.tsx:131) | SEM AÇÃO | `navigate('/sourcing')` ou retirar o card (fornecedores fictícios, ver C) |
| 52 | `src/components/compras/SolicitacaoCard.tsx:303` | ícone ArrowRight (enviar nota) | /solicitacoes (:408) | SEM AÇÃO | Thread é mock (:286-299); Input sem estado |
| 53 | `src/components/compras/SolicitacaoCard.tsx:318` | {actions.secondary.label} (View/Select) | /solicitacoes | SEM AÇÃO | Callback de seleção de fornecedor / detalhe |
| 54 | `src/components/compras/SolicitacaoCard.tsx:341` | {actions.primary.label} = View Details (ENTREGUE) | /solicitacoes | SEM AÇÃO (`<button>` sem href) | Rota de detalhe de solicitação |
| 55 | `src/components/compras/DashboardInsights.tsx:186` | {insight.action} (5 rótulos) | /compras (ComprasDashboard.tsx:265, painel dashboard-insights) | SEM AÇÃO | Campo de rota por insight |
| 56 | `src/components/compras/DigitalSignature.tsx:273` | ícone Download | /contratos (Contratos.tsx:135) | SEM AÇÃO | URL do documento; dados são `mockSignatureRequests` (ver C) |
| 57 | `src/components/compras/PendingApprovalsList.tsx:433` | Ver Histórico | /aprovacoes (Aprovacoes.tsx:116) | SEM AÇÃO (`DropdownMenuItem` sem onClick) | Dialog de histórico — `allHistory`/`fetchAllHistory` já existem em `useApprovalWorkflow` (:62) |
| 58 | `src/features/layout/components/chat/ChatArea.tsx:132` | ícone Phone | chat global (SupplierChat em MainLayout.tsx:180) | SEM AÇÃO | Telefone do contato + canal |
| 59 | `src/features/layout/components/chat/ChatArea.tsx:135` | ícone Video | chat global | SEM AÇÃO | Provedor de vídeo |
| 60 | `src/features/layout/components/chat/ChatArea.tsx:145` | Ver perfil completo | chat global | SEM AÇÃO | Rota de perfil de fornecedor |
| 61 | `src/features/layout/components/chat/ChatArea.tsx:146` | Histórico de cotações | chat global | SEM AÇÃO | Filtro por fornecedor em /cotacao ou /historico-compras |
| 62 | `src/features/layout/components/chat/ChatArea.tsx:147` | Análise de performance | chat global | SEM AÇÃO | /supplier-performance não lê fornecedorId |
| 63 | `src/features/layout/components/chat/ChatArea.tsx:149` | Bloquear fornecedor | chat global | SEM AÇÃO | Mutation de bloqueio (destrutivo — dono) |
| 64 | `src/features/layout/components/chat/ChatArea.tsx:221` | ícone Paperclip | chat global | SEM AÇÃO | Upload para Storage + anexo na mensagem |
| 65 | `src/features/layout/components/chat/ChatArea.tsx:240` | ícone Smile | chat global | SEM AÇÃO | Seletor de emoji (dependência nova) |
| 66 | `src/features/layout/components/UserMenu.tsx:75` | Meu Perfil | header (HeaderActions → UserMenu) | SEM AÇÃO | Rota/Sheet de perfil (também `CommandPalette.tsx:166 action: () => {}`) |
| 67 | `src/features/layout/components/UserMenu.tsx:79` | Configurações | header | SEM AÇÃO | Rota /configuracoes não existe |

#### Tabela B — Novos achados fora da lista 5.1

Critério: elemento clicável que **nada faz** ou só finge (toast de sucesso sem efeito). Excluídos os que funcionam por bolha (ver "Limítrofes").

| # | Arquivo:linha | Rótulo | Tela/rota | Estado | Evidência / o que faltaria |
|---|---|---|---|---|---|
| B1 | `src/features/layout/components/HeaderActions.tsx:121-128` ← `MainLayout.tsx:149` | ícone HelpCircle "Ver tour de introdução" (tooltip "Ver tutorial do sistema"; só em /compras) | header do dashboard | SEM AÇÃO (`onRestartTour={() => {}}`) | Ligar ao hook de onboarding (`src/components/onboarding/`) ou remover o botão |
| B2 | `src/features/layout/components/CommandPalette.tsx:144` | Exportar Dados | ⌘K (CommandPalette em MainLayout.tsx:70) | SEM AÇÃO (`action: () => {}`) | Definir o que exporta |
| B3 | `src/features/layout/components/CommandPalette.tsx:145` | Importar Dados | ⌘K | SEM AÇÃO (`action: () => {}`) | idem |
| B4 | `src/features/layout/components/CommandPalette.tsx:165` | Notificações | ⌘K | SEM AÇÃO (`action: () => {}`) | Abrir painel de notificações do header |
| B5 | `src/features/layout/components/CommandPalette.tsx:167` | Ajuda & Suporte (⌘?) | ⌘K | SEM AÇÃO (`action: () => {}`) | Destino de ajuda (não existe rota) |
| B6 | `src/pages/negociacao-ia/NegociacaoIA.tsx:441` | WhatsApp (por fornecedor da análise) | /negociacao-ia | SÓ TOAST ("Preparando script de WhatsApp para X...", nada acontece) | Gerar script real (edge) ou abrir `wa.me` |
| B7 | `src/pages/negociacao-ia/NegociacaoIA.tsx:448` | E-mail | /negociacao-ia | SÓ TOAST ("Gerando e-mail tático...") | Gerar e-mail real / mailto |
| B8 | `src/components/compras/dashboard/UrgencyDetailsSheet.tsx:217` | Escalar para Gerência | /compras → UrgentItemsList (:183) → sheet | SÓ TOAST — `toast.info("Notificação de prioridade máxima enviada para a gerência")` **sem enviar nada** | Notificação real (tabela `notifications`/edge) — hoje mente para o usuário |
| B9 | `src/components/compras/dashboard/UrgencyDetailsSheet.tsx:291` | Alertar Comprador Responsável | /compras → sheet | SÓ TOAST — `toast.success("Notificação enviada ao comprador")` sem envio | idem |
| B10 | `src/pages/historico/HistoricoCompras.tsx:214` | Desfazer Global | /historico-compras | SÓ TOAST — `toast.success("Ação desfeita com sucesso (Neural Undo)")` sem desfazer nada | Remover ou ligar a um undo real |
| B11 | `src/components/compras/PriceComparator.tsx:377-382` | Disparar RFQ (n) | /fornecedores (PriceComparator em Fornecedores.tsx:200) | SÓ TOAST — "RFQs Iniciadas / Disparando cotações automáticas para N fornecedores" sem disparar | Criar cotações reais ou remover |
| B12 | `src/pages/documentos/DocumentosFiscais.tsx:261` | Importar PDF (IA) | /documentos-fiscais | **PROVÁVEL BUG — NÃO VERIFICADO em browser**: `<Button>` real dentro de `<label>` que envolve `<input type="file" hidden>`; o botão irmão "Importar XML" (:255) usa `asChild` + `<span>` justamente para o clique chegar ao label. Clique num `<button>` dentro de `<label>` não aciona o input na maioria dos browsers | Trocar para `asChild` com `<span>` como o XML, ou `onClick` abrindo o input via ref |
| B13 | `src/components/compras/EnhancedPedidoTimeline.tsx:502` | {doc.nome} (variante vertical) | código morto (ver A50) | SEM AÇÃO (morto) | Mesmo caso de A50; a doc 5.1 cita só :294 |
| B14 | `src/components/compras/SourcingHistoryConsole.tsx:131` / `:246` / `:247` | Exportar Dossier Elite 10/10 · Selecionar Tudo · Gerar Dossier Combinado | código morto | SÓ TOAST (morto) — `toast.success("Dossier ... Exportado")` sem exportar | Arquivo inteiro (972 linhas) não é importado: candidato a remoção |

Limítrofes (funcionam por bolha de clique no pai — **não contam**): `src/pages/pedidos/Pedidos.tsx:316` (MoreHorizontal; `TableRow onClick` :264 abre detalhe), `src/pages/contratos/Contratos.tsx:256` (row :227), `src/pages/pagamentos/Pagamentos.tsx:248` (row :212-215 `handlePagar`), `src/pages/fornecedores/Fornecedores.tsx:262` (row :226 `handleOpenModal`), `src/pages/devolucoes/Devolucoes.tsx:140` (Eye; row :127 `setSelectedDev`), `src/components/compras/ActiveSourcingWidget.tsx:63/72/83` (dentro de `<Link to="/sourcing">`), `EnhancedPedidoTimeline.tsx:463` (chevron; div pai :434). Falsos positivos descartados: `AdminTelemetria.tsx:219` (PopoverTrigger asChild na mesma linha), `NotFound.tsx:47` (dentro de `<Link>`), `ThemeToggle.tsx:40` (placeholder pré-mount), `UserMenu.tsx:64` (item `disabled` proposital — badge de perfil), `Solicitacoes.tsx:344 onApply={() => {}}` (inofensivo: `FiltrosAvancados.handleApply` :104-108 já chama `onFiltersChange`).

#### Tabela C — Dado fictício em produção

| # | Arquivo:linha | O que é fixo | Quem renderiza (arquivo:linha → rota) |
|---|---|---|---|
| C1 | `src/components/compras/executive/executiveDashboardData.ts:3-156` (`currentPeriodMetrics`, `previousPeriodMetrics`, `executiveMetrics`, `monthlyTrend`, `comparisonTrend`, `categorySpend`, `topSuppliers`, `pendingItems`, `allCategories`, `allSuppliers`) | Métricas, séries mensais, fornecedores e pendências escritos no código | `ExecutiveDashboard.tsx:71-109` (fallback `rm.x \|\| executiveMetrics.x`; `previousValue`/`change`/`target` **sempre** fictícios; `realDataLoading` → tudo fictício) · `ExecutiveChartsRow.tsx:17,73-91` (gráficos de tendência **só** usam `monthlyTrend`/`comparisonTrend` fictícios) · `ExecutiveDrillDownModal.tsx:118` (`pendingItems`) · `ExecutiveFiltersBar.tsx:58,73` (filtros listam categorias/fornecedores fictícios) → `DashboardExecutivo.tsx:12` → **/dashboard-executivo** |
| C2 | `src/components/compras/procurement-kpis/kpiMockData.ts:2+` (`kpiData`: ROI 4.2, maverick R$ 187.500, compliance 78%, etc.) | Todos os KPIs; 53 usos de `kpiData.` e nenhum `supabase`/`useQuery` em `AdvancedProcurementKPIs.tsx` | `AdvancedProcurementKPIs.tsx:47` → `Relatorios.tsx:37,248` (aba "kpis") → **/relatorios** |
| C3 | `src/components/compras/SLABySupplierAnalysis.tsx:44-56` (`generateHistoricalSLAData`: 'XBZ Brindes', 'Tech Brindes', 'Stricker', 'Premium Gifts', 'Asia Import', 'Eco Brindes' com `Math.random`) + `sla-analysis/slaAnalysisData.ts:31-69` (`generateSupplierSLAData`, `Math.random` em compliance, atrasos, radar) | Nomes de fornecedores e todos os índices de SLA; **mudam a cada carregamento** | `SLABySupplierAnalysis.tsx:57-58` → `Relatorios.tsx:35,244` (aba geral) → **/relatorios** |
| C4 | `src/components/compras/AISupplierSuggestion.tsx:35` ("12 qualified suppliers") e `:40-43` ("AluTech Indústria" 98% / "Brindes Prime Sul" 94%, "Target: Aluminum Mug" :32) | Fornecedores e match fictícios (§5 cita :36-39; hoje :40-43) | `Cotacao.tsx:335` → **/cotacao**; `Fornecedores.tsx:131` → **/fornecedores** |
| C5 | `src/components/compras/BulkPlanningConsole.tsx:23-57` (`mockPlanningData`: 'Brindes Premium', 'Mochila Executiva', 1200 un., R$ 85,50…) e `:62-66` (`freightAnalysis` fixo) | Lotes de planejamento, preços-alvo, frete | `Solicitacoes.tsx:299` → **/solicitacoes**; `ExecutiveDashboard.tsx:292` → **/dashboard-executivo** |
| C6 | `src/components/compras/digital-signature/signatureHelpers.ts:16` (`mockSignatureRequests`) → `DigitalSignature.tsx:37,46` (`useState(mockSignatureRequests)`, sem fetch) | Pedidos de assinatura fictícios | `Contratos.tsx:135` → **/contratos** |
| C7 | `src/components/compras/DynamicApprovalMatrix.tsx:15-27`, `approval/ApprovalRuleModal.tsx:14-28`, `approval/ApprovalDelegationModal.tsx:12-18` (`mockUsers` João Silva/Maria Santos/Carlos Lima/Ana Oliveira/Roberto Costa; `mockCategories`) | Aprovadores e categorias selecionáveis são fictícios; regras reais vêm de `useApprovalWorkflow` mas gravariam `user-1…5`/`cat-1…5` | `Aprovacoes.tsx:120` → **/aprovacoes**; `Solicitacoes.tsx:243` → **/solicitacoes** |
| C8 | `src/components/compras/SupplierInteractionLog.tsx:16+` (`mockInteractions`; só recebe `supplierName`, sem fetch :40) | Conversa com fornecedor fictícia | `PedidoDetailsDialog.tsx:203` → **/pedidos** (detalhe) |
| C9 | `src/components/compras/SolicitacaoCard.tsx:286-299` ("Neural Context Thread": @João Silva "há 2h", @Maria Santos "há 15min") | Notas/autores fixos no JSX | `Solicitacoes.tsx:408` → **/solicitacoes** |
| C10 | `src/components/compras/SupplierIntelligenceConsole.tsx:168-171` ("Alumínio deve subir 8%") e `:21` (`costEfficiency` "mocked logic") | Previsão em texto fixo; eixo Y do gráfico por fórmula arbitrária | `HistoricoCompras.tsx:350` (aba analytics) → **/historico-compras** |
| C11 | `src/pages/historico/HistoricoSourcingTab.tsx:314` (Target Price AI = `unitPrice * 0.92`) e `:320` (Economia = `totalPrice * 0.08`) | "IA" é um percentual fixo | `HistoricoCompras.tsx:318` (aba sourcing) → **/historico-compras** |
| C12 | `src/pages/cotacao/cotacaoHelpers.ts:123-168` (`simulateAPISearch`: `setTimeout(2000)`, `Math.random` para encontrado/preço/frete/prazo/estoque/pagamento; a consulta a `produto_fornecedores` :134-137 é lida e **ignorada**) | Cotações "descobertas" para fornecedores reais com `integrado_api` são aleatórias | `Cotacao.tsx:100` via botão "START AUTO SEARCH" (`Cotacao.tsx:285`), toast "N optimized quotes discovered" (:103) → **/cotacao** |
| C13 | `src/components/compras/price-comparator/priceComparatorHelpers.ts:45-75` (`generateQuotesFromSuppliers`: preço `Math.random` quando não há `produto_fornecedores`; `stock`, `onTimeDelivery`, `rating`, `paymentTerms`, `deliveryDays` aleatórios) | Comparação de preços parcialmente aleatória | `PriceComparator.tsx:115` → `Fornecedores.tsx:200` → **/fornecedores** |
| C14 | `src/components/compras/executive/ExecutiveAIInsights.tsx:37,60,85` e `DashboardInsights.tsx:41-49` ("média do setor 18%", "potencial de 5.2%", "ciclo subiu 12%", "3% a mais") | Benchmarks fixos no texto sobre métricas reais (semi-fictício) | `ExecutiveDashboard.tsx:287` → **/dashboard-executivo**; `ComprasDashboard.tsx:265` → **/compras** |
| C15 | `src/components/compras/pending-approvals/pendingApprovalsData.ts:22` (`mockPendingApprovals`) | Export **não usado** — `PendingApprovalsList.tsx:51-57` importa só tipos/helpers e usa `useApprovalWorkflow` (:62) | ninguém (código morto) |
| C16 | `src/components/compras/SourcingHistoryConsole.tsx:632-637` (Eletrônicos R$ 450…), `:681-685` (Cimento CP II, Vergalhão…), `:769-773` | Matriz competitiva, previsões, cards de custo | ninguém — componente não importado (código morto) |

Conferência das linhas da §5: "Dados fixos (mock) em produção" (prod-readiness.md:297) e "Card fictício AISupplierSuggestion" (:298) continuam verdadeiras; a linha do card cita `:36-39`, hoje é `:35` + `:40-43`. `TourVisualComponents.tsx:11-19` e `CatalogoProdutos.tsx:71` usam `Math.random` só para animação/nome de arquivo — não são dado fictício.

---

## Anexo A7 — Promessas de 38 documentos × código

### Promessas das docs manuais × código atual (HEAD 2a86602, 2026-11-20)

Método: leitura integral dos 38 documentos listados; cada "existe X / vamos fazer X / pendente X" conferido por `ls`/`grep`/leitura em `src/`, `supabase/`, `scripts/`, `.github/workflows/`. Só constam abaixo as linhas **NÃO_EXISTE / PARCIAL / OBSOLETO**; o que bateu entra no contador "EXISTE" de cada doc. `types.ts` = `src/integrations/supabase/types.ts`. Nada foi executado contra Supabase/Vercel/GitHub (só `--check` locais de scripts Node que leem o repo).

Legenda: **NÃO_EXISTE** = caminho/função/tabela citada não está no repo · **PARCIAL** = existe mas não ligado ou divergente do descrito · **OBSOLETO** = doc descreve estado já superado (removido/corrigido de propósito).

---

#### README.md — EXISTE: 9 (RBAC/`PermissionGate`, `auditService`, MFA+Passkeys, lockout, CSP, i18n 3 idiomas c/ localStorage, Framer Motion, `bun run test`, página `/admin/docs`)

| Doc (arquivo:linha) | Promessa/afirmação | Estado | Evidência | O que falta |
|---|---|---|---|---|
| README.md:27 | Link `./DOCS/ADR/README.md` ("Decisões de Arquitetura") | NÃO_EXISTE | `ls DOCS/ADR/README.md` → No such file; só `0001-*.md` e `0002-*.md` | Criar índice ou apontar o link para `DOCS/ADR/` |
| README.md:29 | "Documentação disponível dentro do sistema no painel administrativo" | PARCIAL | `/admin/docs` existe (`AppRoutes.tsx:131`, menu `AppSidebar.tsx:144`), mas `DeveloperDocs.tsx:10-230` é **cópia hardcoded** (`DOCS_CONTENT`) de ARCHITECTURE_GUIDE/ENGINEERING_EXCELLENCE/ADR — não lê `DOCS/`; botão "copiar caminho" gera `DOCS/ADR/ADR-0001.md` (`:305`), caminho inexistente | Ler os `.md` reais ou remover a cópia; corrigir o caminho gerado |
| README.md:16-18 | Estrutura: `src/components`, `src/pages`, `src/hooks` | PARCIAL | Arquitetura migrou para `src/features/*` (ADR 0001) — `src/features/{auth,cotacoes,pedidos,solicitacoes,empresas,layout,aprovacoes}`; README não cita `features/` | Atualizar seção |
| README.md:58 | "Pronto para produção. Blindagem 10/10" | PARCIAL | `ESTADO_ATUAL.md:138` lista edge `process-solicitacao-neural` invocada em `NovaSolicitacaoModal.tsx:113` e inexistente em `supabase/functions/` (fio cortado na entrada principal) | Afirmação de marketing sem base |

#### DOCS/ARCHITECTURE_GUIDE.md — EXISTE: 4 (camadas, `external-db-bridge` existe c/ operações, `src/services/auditService.ts`, diagrama)

| Doc | Promessa | Estado | Evidência | O que falta |
|---|---|---|---|---|
| ARCHITECTURE_GUIDE.md:84-97 | "Exemplo real": `useNeuralSolicitacao()` + edge `process-solicitacao-neural` | NÃO_EXISTE | `grep -rn useNeuralSolicitacao src` → só dentro do texto de `DeveloperDocs.tsx:39`; `ls supabase/functions | grep neural` → vazio; porém `NovaSolicitacaoModal.tsx:113` **invoca** a edge inexistente | Criar a edge ou remover a chamada em `NovaSolicitacaoModal.tsx:113` |
| ARCHITECTURE_GUIDE.md:1 | Título "Freight Quest" | OBSOLETO | Projeto é Promo Supply; nome herdado (também em `main.yml:10`) | Renomear |
| ARCHITECTURE_GUIDE.md:101-182 | Bridge aceita qualquer `table`/`rpcName` | OBSOLETO | `external-db-bridge/index.ts:6` importa `assertBridgeRequest` de `_shared/external-bridge-allowlist.ts` — tabela fora da allowlist é recusada | Documentar a allowlist |

#### DOCS/ENGINEERING_EXCELLENCE.md — EXISTE: 8 (lazy routes 53×, `usePerformanceMonitor`/`useRenderProfiler` em `MainLayout`, `useAutoImageCompression` em 2 chamadores, Google OAuth, WebAuthn, testes `useAuth`/`usePermissions`/`PipelineChart`, `DOCS/ADR/`, strict TS)

| Doc | Promessa | Estado | Evidência | O que falta |
|---|---|---|---|---|
| ENGINEERING_EXCELLENCE.md:258 | Próximo passo "Storybook" | NÃO_EXISTE | `ls .storybook` → No such file; `grep storybook package.json` → 0 | — |
| ENGINEERING_EXCELLENCE.md:259 | Próximo passo "Edge Cache headers" | NÃO_EXISTE | `grep Cache-Control supabase/functions/_shared/http.ts` → 0 | — |
| ENGINEERING_EXCELLENCE.md:238 | "Telemetria de banco externo via dashboard administrativo" | PARCIAL | `query_telemetry` só lido em `src/pages/admin-telemetria/AdminTelemetria.tsx`; `external-db-bridge` grava em `query_telemetry` (MATRIZ) — ok, mas nada mede "banco externo" separado | Confirmar na UI |
| ENGINEERING_EXCELLENCE.md:215-262 | "Status 10/10", "certificado por PhD QA" | PARCIAL | Vide fio cortado (`process-solicitacao-neural`); `AUDIT-COMPREHENSIVE` (mesma pasta) lista 12 CRÍTICAS | Texto de marketing |

#### DOCS/SECURITY.md — EXISTE: 14 funções (`has_role`, `has_permission`, `get_user_role`, `get_my_organization`, `current_tenant_id`, `user_belongs_to_tenant`, 4 KPIs, `find_approval_rule`, `fx_convert`, `check_workflow_sod`, `log_audit_event` — todas em migrations) + `sanitize_audit_metadata`/`mask_sensitive_data`/`enforce_audit_integrity` + `useDashboardKPIs.ts:75`

| Doc | Promessa | Estado | Evidência | O que falta |
|---|---|---|---|---|
| SECURITY.md:274,292 | "14 WARNs" de SECURITY DEFINER executáveis por authenticated | OBSOLETO | `docs/agentes/secdef-classificacao.md:572` mediu 154 SECDEF/150 exec. por anon em 2026-11-12 e a migration `20261112171300_secdef_revoga_anon.sql` revogou — classificação atual ≠ 14 | Reescrever §3 a partir de `secdef-classificacao.md` |
| SECURITY.md:313-319 | `get_user_role` usado "via RPC" na UI; `has_permission` em "tabelas com RBAC granular" | OBSOLETO | `secdef-classificacao.md:638`: `get_user_role(uuid)` e `has_permission(uuid,text,text)` classificadas **"sem chamador"** → só service_role | Remover da lista de "quebra o app" |
| SECURITY.md:278,280,352 | HIBP ativo; rate-limit login 5/15min→1h | PARCIAL | Config de Auth do Cloud não é versionada (`grep hibp supabase/config.toml` → 0); lockout existe no front (`useAccountLockout.ts`, RPCs `is_account_locked`/`record_failed_login` em migrations) mas os parâmetros não estão conferidos | NÃO VERIFICADO sem painel |
| SECURITY.md:349-350 | Revisão trimestral com `supabase--linter` e `security--run_security_scan` | PARCIAL | São tools da Lovable, não existem no repo nem em workflow; nada agenda a revisão | Processo manual sem rastro |
| SECURITY.md:266 | "Última auditoria 2026-06-19" | OBSOLETO | Auditorias posteriores (QA Q3, secdef 11/2026) não refletidas | Atualizar |

#### DOCS/BACKUP_STRATEGY.md — EXISTE: 2 (tabelas `solicitacoes`/`pedidos`/`approval_workflows` em types.ts; menção a `DOCS/SECURITY.md`)

| Doc | Promessa | Estado | Evidência | O que falta |
|---|---|---|---|---|
| BACKUP_STRATEGY.md:398,500 | Script `scripts/backup-db.sh` ("to be created") | NÃO_EXISTE | `ls scripts/backup-db.sh` → No such file; `grep -l pg_dump .github/workflows scripts` → nenhum script de backup | Criar ou retirar da doc |
| BACKUP_STRATEGY.md:426 | Cron noturno espelhando buckets `nf-e`, `contratos`, `receipts` | NÃO_EXISTE | Buckets em migrations: só `comprovantes`, `product-images`; `src` usa `storage.from('documentos')`; nenhum workflow/rclone | Nomes de bucket errados e nenhuma automação |
| BACKUP_STRATEGY.md:373 | Segredos em "Supabase Vault + `.env.production`" | NÃO_EXISTE | `ls .env.production` → No such file; `.env` comitado (AGENTS.md) | — |
| BACKUP_STRATEGY.md:380-388,450 | Backups/PITR do plano Supabase | PARCIAL | Nada no repo prova plano/retention; `docs/agentes/banco.md:102` diz que nem ledger de migration existe | NÃO VERIFICADO (painel) |
| BACKUP_STRATEGY.md:466-481 | Runbook mensal de verificação + "engineering changelog" | NÃO_EXISTE | Nenhum workflow agendado, nenhum changelog no repo | — |

#### DOCS/page-transitions.md — EXISTE: 5 (wrapper em `MainLayout.tsx:169`, 12 presets em `presets.ts`, `ROUTE_OVERRIDES` em `config.ts:17`, reduced-motion em `usePageTransition.ts:10`, `willChange` em `PageTransition.tsx:19`)

| Doc | Promessa | Estado | Evidência | O que falta |
|---|---|---|---|---|
| page-transitions.md:516-517 | Exemplo `ROUTE_OVERRIDES` com `/admin` `duration: 0.25` | PARCIAL | `config.ts:19` tem `/admin → fade` sem `duration`, e há 3ª regra `/auth → zoom-in 0.35` não documentada | Sincronizar exemplo |

#### DOCS/ADR/0001 + 0002 — EXISTE: 6 (`src/features/*` com `hooks/components/schemas/index.ts`; Supabase Auth; RLS; `useAuth`+`PermissionGate`; `audit_logs`; `login_attempts`)

| Doc | Promessa | Estado | Evidência | O que falta |
|---|---|---|---|---|
| ADR/0001:548-553 | Cada feature com `services/` opcional e `schemas/` | PARCIAL | Só `auth` e `solicitacoes` têm `schemas/`; nenhuma feature tem `services/`; `layout` sem `index.ts`; ~60 hooks seguem em `src/hooks/` (estrutura "técnica" que o ADR queria abandonar) | Status real: "em implementação", parado |
| ADR/0002:582 | Roles hierárquicas "Administrador > Gerente > Comprador > Solicitante" | OBSOLETO | `src/features/auth/types/authRoles.ts`: `admin | coordinator | buyer | finance | viewer` (+ `supplier` em `AppRoutes.tsx:136`) | Atualizar nomes |
| ADR/0002:578 | Role em `user_metadata` **ou** tabela de perfis | OBSOLETO | Atlas 04/08 e `secdef`: role só em `user_roles` + `has_role`; "nunca em `profiles`" | Corrigir ADR |

#### DOCS/CODEBASE_ATLAS (12 arquivos) — EXISTE: ~190 (todas as 118 tabelas do doc 04 em types.ts; todas as funções/trigger-functions SQL citadas em migrations; 45 rotas do doc 03; todos os arquivos `src/lib`, atoms/molecules/organisms, hooks do doc 07; 31 edges do doc 05; `_shared/*` do doc 05; testes do doc 10 exceto `ci.yml`)

| Doc | Promessa | Estado | Evidência | O que falta |
|---|---|---|---|---|
| 10_TESTES_CI.md:466 | Pipeline em `.github/workflows/ci.yml` com 8 passos (inclui RLS e "bloqueia merge") | NÃO_EXISTE | `ls .github/workflows/ci.yml` → No such file; pipeline real é `main.yml` (lint, typecheck, RLS Audit **no-op**, vitest, deno, playwright); sem branch protection (`github-ci.md:212`) | Reescrever doc 10 |
| 10_TESTES_CI.md:468 | Type-check com `tsgo` | OBSOLETO | `package.json:30` `typecheck` = `tsc --noEmit` | — |
| 10_TESTES_CI.md:471 | Passo RLS (`vitest.rls.config.ts`) no CI | NÃO_EXISTE | `grep -n "vitest.rls\|test:rls" .github/workflows/*.yml` → 0; `main.yml:51-59` roda `rls-audit.ts --strict` que sai 0 sem `SUPABASE_DB_URL` (`banco.md:83`) | Nada testa RLS no CI |
| 10_TESTES_CI.md:457 | Ferramenta `supabase--test_edge_functions` | NÃO_EXISTE | Tool Lovable, não está no repo | — |
| 05_EDGE_FUNCTIONS.md:3,24; 01:73; 00:19 | "32 funções" | OBSOLETO | 37 pastas de função (+`_shared`, `tests`); faltam no Atlas `health-dashboard`, `maintain-partitions`, `punchout-encrypt`, `spot-api`, `xbz-proxy`, `xbz-sync-pedidos` | Atualizar lista |
| 05:73; 08:316 | Risco "`external-db-bridge` sem allowlist" | OBSOLETO | `_shared/external-bridge-allowlist.ts` existe e é usado (`external-db-bridge/index.ts:6`) | Marcar como resolvido |
| 05:70-71,77; 08:315 | Risco "`run-audit`/`system-simulation`/`process-invoice-idp` sem JWT" | OBSOLETO | `run-audit/index.ts:11` "A-02: guarda dupla (JWT + role admin)"; `process-invoice-idp/index.ts:17` `getAuthUser`; `system-simulation/index.ts:73` repassa authorization | Marcar resolvido (parcial em system-simulation) |
| 05:46 | `guided-buying-ai` "resposta mock por keyword, sem chamada real" | EXISTE-como-mock (PARCIAL funcional) | `guided-buying-ai/index.ts:99-101` ainda decide por `includes("notebook")`/`"caneta"`; nenhum `callAIGateway` | Função em produção continua mock — ligada em `/negociacao-ia` via `useGuidedBuying` |
| 05:44 | `process-invoice-idp` "mockado hoje" | EXISTE-como-mock (PARCIAL funcional) | `process-invoice-idp/index.ts:57` `mockExtractedData` | Fluxo fiscal de IDP não extrai nada real |
| 05:80 | "`SpotProxyContract` existe mas não é usado" | PARCIAL | `grep SpotProxyContract supabase/functions` → só `contracts.ts` — dívida ainda aberta | — |
| 05:31,47; 01:47 | IA = "Lovable AI Gateway (Gemini)" | OBSOLETO | `_shared/ai_gateway.ts:12` `GATEWAY_URL = https://openrouter.ai/...`; `servicos-externos.md:343` confirma OpenRouter + `OPENROUTER_API_KEY` | Atualizar |
| 01_ARQUITETURA_GERAL.md:79-81 | Integrações "Bitrix24, Banco Inter, WhatsApp" | NÃO_EXISTE | `grep -rni bitrix\|banco inter\|whatsapp supabase/functions` → só comentário em `process-outbox/index.ts:24` (`target: 'bitrix' | 'inter' | 'whatsapp'`); nenhuma edge/handler; `servicos-externos.md:351` "integração declarada, nunca implementada" | Remover do diagrama |
| 04_BACKEND_MAP.md:445; 01:72 | "123 tabelas em `public`" | OBSOLETO | types.ts lista 218 entradas (tabelas+views); AGENTS.md: 162 tabelas em produção, 99 vazias | Regerar a partir de `inventario/estado/banco.json` (que não existe) |
| 04:556-570; 09:30-46 | Jobs pg_cron `alert-dispatcher-1min`, `scan-*-daily/weekly/10min`, `check-*`, `weekly-*`, `process-outbox` | PARCIAL | Em migrations há `cron.schedule` para 13 nomes literais (`scan-cache-hit-ratio-30m`, `scan-connection-saturation-5m`, `scan-long-running-queries-2m`, `scan-unindexed-fks-weekly`, 9 `cleanup-*`) + nomes dinâmicos via `PERFORM cron.schedule(` (75 ocorrências); `scan-wal-generation-rate-5min`, `scan-checkpoint-health-5min`, `scan-replication-lag-5min`, `scan-connection-saturation-5min` (grafia do doc) → 0 hits; o próprio doc diz "lista real só no painel" | NÃO VERIFICADO no banco vivo; `banco.json` cruzaria isso |
| 04:530; 09:56 | `cleanup_old_audit_logs` na lista de limpezas | OBSOLETO | `20261117190000_remove_cleanup_old_audit_logs_quebrado.sql:17` `DROP FUNCTION ... cleanup_old_audit_logs()`; `MELHORIAS_PENDENTES.md:44` confirma substituição por `apply_lgpd_retention` | Atualizar listas |
| 08_SEGURANCA_RLS.md:298 | Geo-restrição com "edge middleware" | PARCIAL | Tabelas `allowed_countries`/`blocked_*`/`geo_access_logs` em types.ts e hook `useGeoRestriction` (2 chamadores), mas `grep -rl geo_access_logs\|blocked_countries supabase/functions` → 0 — nenhuma edge aplica | Só configuração; não bloqueia ninguém |
| 08:303 | Buckets `fiscal-documents`, `comprovantes`, `documentos` | PARCIAL | Migrations criam só `comprovantes` e `product-images`; `src` usa `storage.from('documentos')` (bucket não criado em migration) | NÃO VERIFICADO no Storage vivo |
| 08:309 | Trigger `audit_user_roles_changes` "confirmar attach" | EXISTE (resolvido) | `20260805100000_promo_supply_v2_seed_and_fixes.sql:58` `CREATE TRIGGER audit_user_roles_changes_trigger` | Atualizar nota |
| 06_UI_COMPONENTS.md:123 | Botão "Rodar simulação" em `pages/admin/DeveloperDocs.tsx` → edge `system-simulation` | PARCIAL | `grep system-simulation src` → `src/pages/admin-telemetria/AdminTelemetria.tsx:65`; `DeveloperDocs.tsx` não chama | Corrigir local |
| 06:124 | Edge `ai-supplier-suggestion` acionada em NegociacaoIA | NÃO_EXISTE (chamador) | `grep -rl ai-supplier-suggestion src supabase/migrations` → 0; edge existe mas sem chamador algum | Edge morta ou ligar na UI |
| 07_HOOKS_STORES.md:189,195 | Hooks `useFormDataProtection`, `useBulkOperations` | PARCIAL | Arquivos existem; `grep -rn` em `src/**/*.tsx` → 0 chamadores (código morto) | Ligar ou remover |
| 07:183 | `useRealPushNotifications` → push | PARCIAL | Hook existe; edge `send-push-notification` não é chamada por `src`, outra edge nem migration (só `contracts.ts`) | Fio cortado do Web Push |
| 03_FRONTEND_MAP.md:364-412 | Tabela de rotas | PARCIAL | Faltam `/catalogo-xbz`, `/admin/health`, `/admin/health/alerts/:id`, `/__dev/xbz-network-panel` (`AppRoutes.tsx`) | Regerar de `inventario/estado/rotas.json` (que também está desatualizado: `gerar-rotas.mjs --check` falha) |
| 03:362 | "Todas as páginas dentro de `ProtectedRoute` … controle fino via `usePermissions`" | OBSOLETO | Hoje as 12 rotas `/admin/*` têm `requiredRole="admin"` e `/portal-fornecedor` `requiredRole={['supplier','admin']}` (`AppRoutes.tsx:131,136`) | Atualizar |
| 09_OBSERVABILIDADE.md (Ondas 10-17) | Scanners `scan_connection_saturation`, `scan_replication_lag`, `scan_wal_generation_rate`, `scan_checkpoint_health`, `scan_tables_without_pk`, `scan_temp_file_usage`, `scan_deadlocks_and_conflicts`, `scan_autovacuum_starvation`, `scan_toast_bloat`, tabelas `*_snapshots` | EXISTE (funções e tabelas em migrations/types.ts) — cron dos 5min: ver linha "Jobs pg_cron" acima | — | — |

#### DOCS/AUDIT-COMPREHENSIVE-SYSTEM-REPORT.md (2026-07-19) — EXISTE/CORRIGIDO: 15 achados já resolvidos no código (F-001/007/048 vitest 5.1.1 + `@testing-library/dom`; F-008/047 `webServer` + `storageState` em `playwright.config.ts:6`/`global-setup.ts:40`; F-013 12 rotas admin com `requiredRole`; F-015 `ALLOWED_ORIGINS` em `security.ts:46-51`; F-016 `rules-of-hooks` não está mais desligada (`grep eslint.config.js` → 0); F-024 `DEFAULT_MAX_ROWS = 50_000` em `paginatedFetch.ts:8`; F-027/F-045 badges dinâmicos `badgeKey` + `useCriticalAlertsBadge` em `AppSidebar.tsx:60,328`; F-029/F-035 demo data e "Av. Paulista" removidos; F-036 workbox Supabase REST `NetworkFirst` 5 min (`vite.config.ts:91-97`); F-044 `/portal-fornecedor` com role `supplier`; F-050 11 rotas admin no menu; F-053 BACKUP_STRATEGY criado; F-055 `scim-v2/conformance.test.ts`)

| Doc | Promessa/plano | Estado | Evidência | O que falta |
|---|---|---|---|---|
| AUDIT:5,514 | "26 Edge Functions", "265 migrações", "46 rotas" | OBSOLETO | 37 funções, 314 migrations, 55 `path=` em `AppRoutes.tsx` | Métricas de julho |
| AUDIT:227-230 (F-014) | Crons `check-expiry-alerts` etc. sem verificação de chamador | PARCIAL | `verifyCronSecret` existe (`security.ts:289`), mas `grep -n CRON_SECRET\|authorization check-expiry-alerts/index.ts` → 0 | Ainda aberto nessa edge |
| AUDIT:276-279 (F-023) | Escalation polling client-side (`setInterval`) | PARCIAL | `useApprovalWorkflow.ts:315` ainda tem `setInterval`; edge `check-approval-escalations` existe (cron) — convivem | Remover polling do browser |
| AUDIT:257-260 (F-020) | CSV sem proteção a formula injection | PARCIAL | `exportData.ts` sem escape de `= + - @` (grep padrão → 0 hits legíveis) | NÃO VERIFICADO em detalhe |
| AUDIT:404-407 (F-046) | i18n "efetivamente inexistente" | PARCIAL | `src/locales/{pt,en,es}/translation.json` existem; `grep -rl useTranslation src/**/*.tsx` → **3 arquivos** | README promete multi-idioma; UI ~toda em PT hardcoded |
| AUDIT:419-422 (F-049) | Componentes não-rota em `src/pages/` | PARCIAL | 10 arquivos citados em `docs/conventions/pages-directory.md:526-535` continuam lá (`AlertSubscriptionsPanel`, `WorkflowAdmin`, `PedidoDetailsDialog`, `BuyerComparisonView`…) | Migração não começou |
| AUDIT:433-435 (F-051) | Nenhum teste de integração com banco real | PARCIAL | `tests-rls/rls-isolation.test.ts` existe mas fala com **produção** e CI não roda (`banco.md:79-84`) | Sem banco de teste |
| AUDIT:437-439 (F-052) | Health check de crons | EXISTE-parcial | `health_scan_runs`, `cron_watchdog`, `/admin/health` existem; `maintain-partitions`, `xbz-sync-pedidos` sem chamador em migrations/src (`gerar-repo.mjs --check`: 4 edges sem chamador) | Confirmar agendamento no banco |

#### DOCS/AUDITORIA_BACKEND.md (v1) — EXISTE/CORRIGIDO: 11 (M-02 `getTenantId`; M-03 partições `audit_logs`/`telemetry_logs` + `maintain-partitions`; M-05 `_shared/rate_limit.ts`; M-06 `webhook_events` + `idempotency.ts`; B-01 CORS allowlist; B-03 `scripts/db-explain-analyze.ts`; B-05 `fetchWithTimeout`; outbox `process-outbox`; alerting `alert-dispatcher`; `x-request-id`; runbook template; `tests-rls/`)

| Doc | Promessa | Estado | Evidência | O que falta |
|---|---|---|---|---|
| AUDITORIA_BACKEND.md:99-105 | Integrações "Bitrix24 OK", "Banco Inter OK", "WhatsApp OK" | NÃO_EXISTE | Nenhuma edge/handler/tabela para Bitrix, Inter ou WhatsApp (`grep -rni` em `supabase/functions` → só string em `process-outbox/index.ts:24`); `servicos-externos.md:351` | Tabela inteira fictícia |
| AUDITORIA_BACKEND.md:43-46 (M-02) | Depreciar `validateTenant` | PARCIAL | `security.ts:218` ainda exporta `validateTenant` (stub com `_req`) | Remover |
| AUDITORIA_BACKEND.md:124 | Suíte `tests/rls-isolation.test.ts` "roda contra staging com dois JWTs" | PARCIAL | Arquivo é `tests-rls/rls-isolation.test.ts`; não há staging — fala com produção; CI não executa | — |
| AUDITORIA_BACKEND.md:125 | `scripts/rls-audit.ts` depende de `exec_sql`, "não roda hoje" | OBSOLETO | Reescrito para `psql` via `scripts/lib/psql-leitura.mjs` (`banco.md:86`); `exec_sql` revogada em `20261112165500_revoga_exec_sql_e_chaves_xbz.sql` | — |

#### DOCS/AUDITORIA_BACKEND_V2.md — EXISTE/CORRIGIDO: 10 (A-01 allowlist; A-02 `requireAdmin` `security.ts:343`; A-03 — ver abaixo; A-13 `run_all_health_scans` + `health_scan_runs`; A-14 índice `notifications` em migrations; webhooks `withIdempotency` `idempotency.ts:105`; `secret_rotation_schedule`; `security_definer_baseline`)

| Doc | Promessa | Estado | Evidência | O que falta |
|---|---|---|---|---|
| V2:201,330-338 (A-03) | `SupplierRiskContract` em `_shared/contracts.ts` | NÃO_EXISTE | `grep SupplierRiskContract contracts.ts` → 0 | `ai-supplier-risk` segue sem Zod |
| V2:202,340 (A-04) | Desmockar `process-invoice-idp` ou desabilitar botão | NÃO_EXISTE | `process-invoice-idp/index.ts:57` mock | — |
| V2:203,342 (A-05) | `guided-buying-ai` → `callAIGateway` | NÃO_EXISTE | `index.ts:99-101` keywords; sem import de `ai_gateway.ts` | — |
| V2:210,361-380 (A-12) | Tabela `data_retention_policies` + cron único | NÃO_EXISTE | types.ts sem `data_retention_policies`; retenção implementada como `apply_lgpd_retention()` (8 migrations) + `20261117230000_retencao_fonte_unica.sql` — abordagem diferente | Doc diverge da solução adotada |
| V2:209,354 (A-11) | `generate-contract-pdf` gerar PDF real | PARCIAL | Edge segue gerando HTML (nome mantido) | — |
| V2:204,277-295 (A-06) | Migration removendo policies `get_my_organization()` | PARCIAL | `get_my_organization` ainda usada em policies (`secdef-classificacao.md:600`) | NÃO VERIFICADO no banco |
| V2:189 | "32 edge functions", "~130 tabelas" | OBSOLETO | 37 / 218 em types.ts | — |

#### DOCS/AUDITORIA_BACKEND_V3.md — EXISTE/CORRIGIDO: 7 (`withIdempotency`; `securityHeaders` em `http.ts:48`; `cleanup_expired_password_resets` em 2 migrations; `statement_timeout` em 1 migration; `secret_rotation_schedule` + `check_secret_rotation_due` cron; `refresh_mv_dashboard_kpis`/`mv_dashboard_kpis` em 8 migrations; partições + `maintain-partitions`)

| Doc | Promessa | Estado | Evidência | O que falta |
|---|---|---|---|---|
| V3:511,588,601 (R-01) | Edges `pagamentos-baixa`, `pedido-fracionar`, `estoque-movimentar` "fazem INSERT sem idempotência" | NÃO_EXISTE | `ls supabase/functions/{pagamentos-baixa,pedido-fracionar,estoque-movimentar}` → No such file — nunca existiram | Achado sobre código inexistente |
| V3:550-552 (R-07) | `CHECK`/enum em `sourcing_events.status`, `sourcing_pipeline.stage`, `sourcing_awards.decision` | NÃO_EXISTE | `grep -c CHECK supabase/migrations/*sourcing*` → 0 | — |
| V3:554 (R-08) | Índice `contract_penalties(contract_id)` | NÃO VERIFICADO | não grepado por nome; não listado em MELHORIAS | — |
| V3:578 (R-11) | Staleness de cron no `/admin/health` | PARCIAL | `ScanRunsSlaCard.tsx` + `admin_scan_runs_sla_status()` existem (`secdef:614`); UI de "hours_since" não conferida | — |
| V3:489,629 | "43 cron jobs" | PARCIAL | Só 13 nomes literais em migrations; `secdef-classificacao.md:587` mediu **20 jobs** em produção (2026-11-12) | Número inflado |

#### DOCS/AUDITORIA_CODIGO_2026Q3.md — EXISTE: 3 (`EliteButton` corrigido; `useAccountLockout`/`useContactNotes` com logger; `useBulkOperations`/`useRecentlyViewed` existem)

| Doc | Promessa | Estado | Evidência | O que falta |
|---|---|---|---|---|
| CODIGO:162 | Allowlist documentada em `mem://constraints/security-definer-grants` | NÃO_EXISTE | URI de memória da Lovable; no repo o equivalente é `docs/agentes/secdef-classificacao.md` | Trocar referência |
| CODIGO:157 | `useBulkOperations` (console.* → logger) | PARCIAL | Hook sem chamador algum em `.tsx` — corrigir logger em código morto | Remover hook |
| CODIGO:203 (QA) e 168 | `tsgo --noEmit` | OBSOLETO | `tsc` (`package.json:30`) | — |

#### DOCS/AUDITORIA_QA_2026Q3.md — EXISTE: 5 (6 specs E2E listadas existem; `tests-rls/rls-isolation.test.ts`; `scripts/stress-test.ts`; `fuzzing_suite.ts`; `system-simulation`)

| Doc | Promessa | Estado | Evidência | O que falta |
|---|---|---|---|---|
| QA:267-273,294 | 6 specs planejados `tests-e2e/simulations/*.spec.ts` (rfx-lifecycle, reverse-auction, contract-penalties, three-way-match, multi-tenant-switch, mobile-nav) | NÃO_EXISTE | `ls tests-e2e/simulations` → No such file; `tests-e2e/` tem 8 specs, nenhum desses | Plano não executado |
| QA:239,288 | Migração `qa_2026q3_rls_hardening` "aplicada" | NÃO_EXISTE (arquivo) | `ls supabase/migrations | grep -i "qa_2026\|rls_hardening"` → 0 (nomes UUID da Lovable; sem ledger não dá para mapear) | Não rastreável |
| QA:295 | `tests-rls` com `RLS_TEST_USER_A/B` no CI | NÃO_EXISTE | `grep RLS_TEST_USER .github/workflows` → 0; `MELHORIAS:66` "TEST-02 ação DevOps humana" | — |
| QA:253 | "`fuzzing_suite.ts` + `integrity_test.ts`: sem regressões" | PARCIAL | `fuzzing_suite.ts` tem `Deno.test` mas nome fora de `*_test.ts`/`*.test.ts` → `deno test supabase/functions/` **não o coleta** (`servicos-externos.md:362`) | Renomear para contar |
| QA:210,299 | "Score 96/100, nível de produção" | PARCIAL | Vide fio cortado `process-solicitacao-neural`, mocks em produção (IDP, guided-buying) | — |

#### DOCS/MELHORIAS_PENDENTES.md — EXISTE: 23 (todas as funções das Ondas 18-21 e 77-84 em migrations: `scan_xid_wraparound`, `scan_replication_slots`, `scan_invalid_and_duplicate_indexes`, `scan_unused_indexes`, `scan_rollback_rate`, `scan_connection_saturation`, `scan_cache_hit_ratio`, `scan_long_running_queries`, `scan_unindexed_fks`, `scan_blocking_locks`, `scan_temp_files_spill`, `scan_idle_in_transaction`, `scan_slow_query_hotspots`; crons nomeados `scan-unused-indexes-weekly`, `scan-invalid-dup-indexes-daily`, `scan-replication-slots-30m`, `scan-xid-wraparound-daily`, `scan-rollback-rate-15m`, `scan-blocking-locks-1m`, `scan-temp-spill-15m`, `scan-idle-in-txn-2m`, `scan-slow-query-hotspots-1h` todos com 1 hit em migrations; `_invoke_edge_function` (3); `apply_lgpd_retention`; `ai_gateway.ts`; `retry.ts`; `realtime-audit.ts`; `rls-audit.ts`; `db-explain-analyze.ts`; partições Onda 77)

| Doc | Promessa | Estado | Evidência | O que falta |
|---|---|---|---|---|
| MELHORIAS:63 (M-04) | Assincronizar triggers pesados | NÃO_EXISTE | Triggers `handle_pedido_budget_realization`, `sync_budget_on_payment`, `auto_calculate_delivery_penalty` continuam síncronos em migrations; nenhuma fila | Backlog assumido |
| MELHORIAS:64 (INT-03/04/05) | Reconciliação Inter, quota WhatsApp, checkpoint ERP | NÃO_EXISTE | Integrações Inter/WhatsApp não existem (ver v1); `erp-sync` sem checkpoint | INT-03/04 são backlog de integrações inexistentes |
| MELHORIAS:66 (TEST-02) | Secrets `RLS_TEST_USER_A/B` no CI | NÃO_EXISTE | ver QA acima | — |
| MELHORIAS:59 (TEST-03) | "`tests-rls/rls-isolation.test.ts` no CI" | NÃO_EXISTE | nenhum workflow roda `vitest.rls.config.ts` | Afirmação falsa |
| MELHORIAS:60 | "CRON: 5 jobs auto-invocados" | PARCIAL | `_invoke_edge_function` em 3 migrations; quais 5 e se ativos → NÃO VERIFICADO (banco) | — |
| MELHORIAS:39,68-77 | "Status 10/10 em todas as dimensões" (Testes 10/10 com "RLS no CI") | PARCIAL | RLS Audit do CI é no-op; `tests-rls` não roda; fuzzing_suite não é coletado | Placar sem base |
| MELHORIAS:82-83 | "`db-explain-analyze` falha CI se > 250ms", "`realtime-audit` bloqueia PR" | NÃO_EXISTE | Nenhum workflow chama `db-explain-analyze.ts` nem `realtime-audit.ts` (`AUTOMACAO_LOCAL.md:79,86` "sem chamador literal") | Cenários "simulados mentalmente" |
| MELHORIAS:3 | "Última atualização 2026-07-13" e Onda 77 como última | OBSOLETO | Migrations até 2026-11-19 (`20261119000000_entity_versions_politicas_authenticated.sql`), ondas secdef/retencao não listadas | Doc parado em julho |

#### DOCS/RUNBOOKS/rollback-template.md — EXISTE: 2 (`vitest.rls.config.ts`; `audit_logs`)

| Doc | Promessa | Estado | Evidência | O que falta |
|---|---|---|---|---|
| rollback-template.md:598-599 | "Duplicar como `rollback-<ts>-<slug>.md` a cada migration nova" | PARCIAL | `ls DOCS/RUNBOOKS` → só o template; 314 migrations, 0 runbooks | Processo nunca seguido |
| rollback-template.md:642 | Validação `supabase--linter` | NÃO_EXISTE | tool Lovable | — |
| rollback-template.md:651 | Anunciar em `#eng-ops` | NÃO VERIFICADO | canal Slack não rastreável no repo | — |

#### .lovable/plan.md — EXISTE: 4 (`supabase/functions/tests/fuzzing_suite.ts`; `scripts/stress-test.ts` — Bun, `localhost:54321` fallback `:65`; `workflow-engine/fuzz.test.ts`; `main.yml` com lint/typecheck/vitest/deno/playwright)

| Doc | Promessa | Estado | Evidência | O que falta |
|---|---|---|---|---|
| plan.md:668 | Testes para `erp-sync` e `ai-negotiation` | NÃO_EXISTE | `ls supabase/functions/erp-sync/*test* ai-negotiation/*test*` → No such file; 12 testes Deno no total, nenhum para essas | — |
| plan.md:669 | "Mocks globais para ERP e fiscal" | NÃO_EXISTE | `grep -n erp\|fiscal\|mock src/test/setup.ts` → 0 | — |
| plan.md:673 | E2E "Workflow Approval: solicitação → aprovação → contrato" | PARCIAL | `critical-flows.spec.ts` cobre solicitação→cotação→pedido→pagamento; "contrato" não | — |
| plan.md:674 | E2E "Error States" 4xx/5xx | PARCIAL | só `critical-flows.spec.ts` usa `route(`/`fulfill`; sem spec dedicado | — |
| plan.md:685 | CI "Security: Supabase RLS audit" | PARCIAL | Passo existe (`main.yml:51`) mas sai verde sem auditar (sem `SUPABASE_DB_URL`) | Secret ou falhar fechado |
| plan.md:663 | `fuzzing_suite.ts` como suíte | PARCIAL | Não coletado pelo `deno test` (nome) | Renomear |
| plan.md:659 | "Freight Quest" | OBSOLETO | nome herdado | — |

#### docs/agentes/*.md — EXISTE: ~45 (refs do banco; `deploy_edge_functions_promo_supply.sh` com 31 funções/`BLOCKED_FUNCTIONS`/`NO_JWT_FUNCTIONS`; `config.toml` ref oficial; `.env` comitado; `rls-audit.ts` no-op; scripts de contexto + `npm run contexto:*`; `TEMPLATE-regras-de-negocio.md`; `gerar.unit.mjs`; migrations secdef `20261112171300`/`20261112223649`; tabelas `spot_produtos/skus/estoque`, `xbz_*`; `useSpotCatalog.ts`; helpers `security.ts`; `guards`/`docs:ci`/`docs:matriz-edge` scripts; `--check` do `render-workflow-docs` passa com 11 workflows; matriz passa)

| Doc | Promessa | Estado | Evidência | O que falta |
|---|---|---|---|---|
| deploy.md:23-24; github-ci.md:260-261; AGENTS.md "Serviços" | "Edge functions: deploy manual, **nenhum workflow publica**"; "grep `functions deploy` em workflows = zero" | OBSOLETO | `.github/workflows/deploy-edge-functions.yml` existe (`on: push main paths supabase/functions/**` + dispatch; `docs/ci/README.md:138`) | Atualizar deploy.md, github-ci.md e AGENTS.md |
| github-ci.md:230,239-245; AGENTS.md; AUTOMACAO_LOCAL.md:113-121 | "Sete arquivos em `.github/workflows/`" | OBSOLETO | 11 arquivos: + `automation-local.yml`, `dependency-review.yml`, `deploy-edge-functions.yml`, `paridade-banco.yml`; `docs/ci/README.md:130` "11 workflows" | Tabela manual desatualizada |
| github-ci.md:217 | "não existe … `dependabot.yml`" | OBSOLETO | `ls .github` → `dependabot.yml`, `toolchain.json`, `workflows` | — |
| deploy.md:29-32 | `supabase/functions/migrate-helper/index.ts` existe e "voltou em 97b6efc" | OBSOLETO | `ls -d supabase/functions/migrate-helper` → No such file (removida; segue em `BLOCKED_FUNCTIONS` do script) | Marcar como removida |
| deploy.md:36-38 | `config.toml` declara `verify_jwt=false` só para `migrate-helper` | OBSOLETO | `grep verify_jwt supabase/config.toml` → 0 (nenhuma declaração) | Divergência script × config persiste, de outra forma |
| servicos-externos.md:356-357 | Linhas `validateAuth :84`, `getAuthUser :133`, `getTenantId :154`, `verifyCronSecret :192`, `requireAdmin :224` | OBSOLETO | reais: `:119`, `:228`, `:251`, `:289`, `:343` | Refs de linha |
| banco.md:135-136; inventario/README.md:443; contexto-ia.md:416-417 | `inventario/estado/banco.json` não existe (falta `SUPABASE_ACCESS_TOKEN`); `SUPABASE_DB_URL` "não existe ainda" | NÃO_EXISTE (confirmado) | `ls inventario/estado` → só `edges.json`, `rotas.json`; `main.yml:53` já referencia `secrets.SUPABASE_DB_URL` (existência do secret não verificável daqui) | Secret + geração |
| banco.md:102 | Ledger `supabase_migrations.schema_migrations` ausente ("não reverificado") | NÃO VERIFICADO | exige banco | — |
| banco.md:110-113 | Crons em migrations antigas apontando refs errados (`weekly-summary-report` → `apuzcrkeqodktmpwobnz`) | PARCIAL | arquivos citados existem; estado vivo NÃO VERIFICADO | — |
| estado-spot-sync.md:491-493 | 3 crons `spot-api-sync-*` ativos | PARCIAL (repo) | `grep -rl spot-api-sync-catalog\|stock supabase/migrations` → 1 migration; estado vivo citado por Management API, não reverificado | — |
| estado-spot-sync.md:512 | "`deploy_edge_functions_promo_supply.sh` publica e configura as funções SPOT" | PARCIAL | Script lista `spot-proxy` mas **não** `spot-api` (`FUNCTIONS=(` linhas 63-102) | `spot-api` só via workflow novo |
| secdef-classificacao.md:587 | "todos os 20 jobs rodam como postgres" | PARCIAL | contradiz "43 cron jobs" (V3) e tabela do Atlas 04; número vivo NÃO VERIFICADO | — |
| contexto-ia.md:439-442; banco.md:114-117 | Comentários de `contexto.yml:30`, `types-sync.yml:20`, `inventario-estado-semanal.yml:23`, `inventario/README.md:24`, READMEs de scripts descrevem ref errado como atual | PARCIAL (confirmado em inventario/README.md:448-449: "`config.toml` diz `trwgmplubeqxrxpncdgf`") | `supabase/config.toml:1` = `lmypcdfsrgfftzhxawao` | Corrigir 6 comentários |

#### docs/AUTOMACAO_LOCAL.md — EXISTE: 12 (`scripts/automation.mjs`, `.config.json`, `automation-local.yml`, suites `automation.unit`/`maintenance.unit`/`graphify-local.unit`, registro dos scripts, `scripts/maintenance/*`)

| Doc | Promessa | Estado | Evidência | O que falta |
|---|---|---|---|---|
| AUTOMACAO_LOCAL.md:29 | Noturno local `repo-maintenance.service` (systemd 04:30) | NÃO VERIFICADO | Infra da máquina do dono; nada no repo | — |
| AUTOMACAO_LOCAL.md:31 | Ponte `.tools/repo-automation/` | NÃO_EXISTE (no repo) | `ls .tools/repo-automation/hooks` → No such file (local/gitignored; `github-ci.md:179` descreve só no clone WSL) | Hooks não versionados |
| AUTOMACAO_LOCAL.md:113-121 | "Workflows anteriores preservados: 7" | OBSOLETO | 11 | — |
| AUTOMACAO_LOCAL.md:79,86,92,93 | `db-explain-analyze.ts`, `realtime-audit.ts`, `squash-migrations.sh`, `stress-test.ts` "sem chamador literal" | PARCIAL (confirmado) | só manual; `squash-migrations.sh` destrutivo e nunca executado (`banco.md:142`) | Scripts órfãos |
| AUTOMACAO_LOCAL.md:107-111 | "Nenhum hook versionado" | EXISTE (confirmado: sem `.husky/`) | — | — |

#### docs/ci/README.md (gerado) — EXISTE: 11/11 (`render-workflow-docs.mjs --check` → "OK … bate com os 11 workflows")

| Doc | Promessa | Estado | Evidência | O que falta |
|---|---|---|---|---|
| ci/README.md:141 | `main.yml` prova "lint, typecheck, guard AGENTS.md, Vitest, Deno, E2E" — não cita o passo "Security RLS Audit" | PARCIAL | passo existe em `main.yml:51` e é no-op; bloco `# docs:` omite de propósito? | Declarar o no-op em `# nao-e-bug:` |

#### docs/mapa/MATRIZ_EDGE_TABELA.md (gerado) — EXISTE (`gerar-matriz-edge-tabela.mjs --check` exit 0)

| Doc | Promessa | Estado | Evidência | O que falta |
|---|---|---|---|---|
| MATRIZ:297 | Linha `tests` como função | PARCIAL | `supabase/functions/tests/` é pasta de suítes, não function (`deploy-edge-functions.yml` "nao-e-bug" diz o mesmo) | Excluir `tests` no gerador |
| MATRIZ:283,290,295 | `maintain-partitions`, `run-audit`, `system-simulation` sem tabela | PARCIAL | usam RPC/SQL, fora do escopo `.from()` — por design | — |

#### docs/arsenal-auditoria/README.md — EXISTE: 4 arquivos citados

| Doc | Promessa | Estado | Evidência | O que falta |
|---|---|---|---|---|
| arsenal/README.md:374 | Stack-alvo "Bitrix24 + n8n + Evolution API + Docker Swarm/Portainer + Cloudflare Workers" | PARCIAL | É arsenal genérico da Promo Brindes; nada disso existe neste repo (sem Dockerfile/compose — `deploy.md:13`) | Marcar como genérico |

#### inventario/README.md — EXISTE: 5 scripts (`banco.sql`, `gerar-banco/rotas/repo`, `mudou-conteudo`) + `rotas.json`/`edges.json`

| Doc | Promessa | Estado | Evidência | O que falta |
|---|---|---|---|---|
| inventario/README.md:436 | `estado/banco.json` | NÃO_EXISTE | `ls inventario/estado` → `edges.json`, `rotas.json` | Secret `SUPABASE_ACCESS_TOKEN` |
| inventario/README.md:439 | `estado/tabelas-uso.json` | NÃO_EXISTE | idem ("não gerado pelo CI") | — |
| inventario/README.md:448-449 | "`config.toml` diz `trwgmplubeqxrxpncdgf` … divergência não resolvida" | OBSOLETO | `supabase/config.toml:1` `project_id = "lmypcdfsrgfftzhxawao"` | Corrigir texto |
| inventario/README.md:474-477 | Conferência por `supabase/schema-manifest.json` | NÃO_EXISTE | `ls supabase/schema-manifest.json` → No such file (doc já diz "desligada enquanto não existir") | — |
| inventario/README.md:437 | `rotas.json` em dia | PARCIAL | `node scripts/inventario/gerar-rotas.mjs --check` → "desatualizado: rode … e commite" | PR semanal atrasado |
| inventario/README.md (scripts) | `scripts/inventario/` com README | NÃO_EXISTE | única pasta de `scripts/` sem `README.md` (AGENTS.md exige) | Criar README |

#### docs/conventions/pages-directory.md — EXISTE: 1 (regra descrita)

| Doc | Promessa | Estado | Evidência | O que falta |
|---|---|---|---|---|
| pages-directory.md:526-535 | 10 arquivos "tracked for migration" para `src/components/` | PARCIAL | Todos os 10 continuam em `src/pages/**` (`AlertSubscriptionsPanel`, `ScanRunsSlaCard`, `WorkflowAdmin`, `AuthBranding`, `DevolucoesModals`, `PedidosKPIs`, `PedidoDetailsDialog`, `RelatoriosCharts`, `buyerDashboardHelpers`, `SpotFinancialTab`) | Nenhum migrado |
| pages-directory.md:542 | `docs/conventions/linting-roadmap.md` + `eslint-plugin-boundaries` | NÃO_EXISTE | `ls docs/conventions/linting-roadmap.md` → No such file; plugin ausente em `package.json` | Link quebrado |

---

#### Síntese transversal (o que mais pesa)

1. **Fio cortado em produção não documentado como tal nas docs "10/10":** `src/components/compras/NovaSolicitacaoModal.tsx:113` invoca edge `process-solicitacao-neural` que não existe em `supabase/functions/` (confirmado por `ESTADO_ATUAL.md:138`); ARCHITECTURE_GUIDE e DeveloperDocs ainda a vendem como "exemplo real".
2. **Mocks em produção documentados como pendência e nunca fechados:** `guided-buying-ai/index.ts:99-101` (keywords) e `process-invoice-idp/index.ts:57` (`mockExtractedData`).
3. **Edges/hook sem chamador:** `ai-supplier-suggestion`, `send-push-notification` (nenhum invoke em src/edges/migrations), hooks `useFormDataProtection`, `useBulkOperations`; `gerar-repo.mjs --check` aponta 4 edges sem chamador no repo.
4. **CI não prova o que as docs dizem:** sem `ci.yml`; RLS Audit no-op; `tests-rls` fora do CI; `fuzzing_suite.ts` não coletado pelo `deno test`.
5. **Docs de agentes/AGENTS.md atrasadas em relação ao próprio repo:** 11 workflows (não 7), `deploy-edge-functions.yml` publica edge, `dependabot.yml` existe, `migrate-helper` removida, `config.toml` já correto.
6. **Integrações fictícias:** Bitrix24, Banco Inter, WhatsApp aparecem como "OK" na AUDITORIA_BACKEND v1 e no Atlas 01 — nenhuma linha de código.
7. **Backup/PITR:** só documento; `scripts/backup-db.sh`, cron de storage, buckets citados e `.env.production` não existem.
8. **Inventário incompleto:** `banco.json` nunca gerado (secret), `rotas.json` desatualizado, `scripts/inventario/` sem README.
