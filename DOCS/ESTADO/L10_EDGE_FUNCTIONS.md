# L10 — Edge Functions

> Auditoria por leitura de código. Escopo: `supabase/functions/` (69 arquivos, 12.714 linhas, 36 funções + diretório `tests/`).
> **Runtime: `NAO_VERIFICADO (runtime)` em 100% dos casos.** Não houve acesso ao banco, aos logs de invocação nem ao painel Supabase. Nada aqui afirma que uma função "roda" ou "já processou" — apenas que existe código e que existe/não existe chamador no repositório.
>
> **Regra de classificação usada para "quem chama":** foi rodado grep do nome de cada função em `src/`, `supabase/migrations/`, `.github/`, `scripts/` e `supabase/functions/`. `⬛` = zero invocação encontrada em qualquer um desses lugares. `🟨` = existe caminho de invocação, mas falta camada/secret ou há defeito comprovado no código.

---

## 🔴 ACHADOS DE SEGURANÇA

### S-1 — CRÍTICO: `webauthn-authenticate` não verifica assinatura criptográfica nenhuma → bypass total de autenticação

`supabase/functions/webauthn-authenticate/index.ts:134-233`. No ramo `action === 'finish'`, a função faz **apenas** duas checagens sobre um JSON que o cliente controla integralmente:

```
167  const clientDataJSON = base64UrlDecode(authResponse.clientDataJSON);
168  const clientData = JSON.parse(new TextDecoder().decode(clientDataJSON));
170  if (clientData.challenge !== challengeData.challenge) { throw ... }
173  if (clientData.type !== 'webauthn.get') { throw ... }
```

Não existe, em lugar nenhum do arquivo:
- verificação de `authResponse.signature` contra a chave pública armazenada;
- verificação de `authenticatorData` / `rpIdHash` / `origin`;
- verificação do contador anti-replay do autenticador (linha 178 apenas **incrementa um contador próprio**: `const newCounter = (storedCred.counter || 0) + 1`).

Em seguida, linha 195-201, emite um magic link real e devolve o token ao chamador:

```
195  const { data: signInData } = await supabase.auth.admin.generateLink({ type: 'magiclink', email: email, ... });
227      token: token,
230      actionLink: signInData.properties?.action_link,
```

**Cadeia de exploração:** o atacante chama `action:'start'` com o e-mail da vítima — a função devolve o `challenge` em texto claro (linha 129, `{ options, userId: user.id }`); depois chama `action:'finish'` com o mesmo e-mail e um `clientDataJSON` fabricado contendo aquele challenge e `type:"webauthn.get"`, mais qualquer `credential.id` que exista na tabela (linha 155-159 busca a credencial **só por `credential_id`, sem vincular ao e-mail**). Resultado: token de sessão da vítima.

**Agravante 1:** a função é deployada **sem verificação de JWT** — `deploy_edge_functions_promo_supply.sh:95` inclui `webauthn-authenticate` na lista `NO_JWT_FUNCTIONS`. Endpoint anônimo.
**Agravante 2:** `webauthn-register/index.ts:192` grava `public_key: credResponse.attestationObject`, ou seja, o objeto de atestação bruto, e não a chave pública COSE extraída. Mesmo que alguém adicione verificação depois, não há chave utilizável armazenada. Isso confirma que a verificação **nunca foi implementada**, não que foi removida.

Mitigação parcial existente: rate limit por IP+e-mail em `webauthn-authenticate/index.ts:58-64` (10 req/min no `start`). Não impede o ataque, só o desacelera.

### S-2 — ALTO: contradição no `CRON_SECRET` deixa 9 endpoints de cron abertos ou quebra o agendamento

`_shared/security.ts:192-208`:

```
193  const secret = Deno.env.get("CRON_SECRET");
196  if (!secret) {
197    console.warn("CRON_SECRET not configured — cron endpoint is unprotected");
198    return null;              // ← libera a requisição
199  }
200  const provided = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
201  if (!provided || provided !== secret) { return 401 }
```

Mas o invocador de cron do banco manda a **anon key**, não o `CRON_SECRET` — `supabase/migrations/20260711153258_f292f3e6-aff3-4382-9b85-99a3edd5224b.sql:19,25`:

```
19  v_anon TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
25  'Authorization', 'Bearer ' || v_anon,
```

Idem em `20260402114640_...sql:13,27,41,55,69` (`current_setting('app.settings.supabase_anon_key')`).

Portanto só existem dois estados possíveis, ambos ruins:
- `CRON_SECRET` **não** configurado → `verifyCronSecret` libera qualquer requisição, e qualquer portador da anon key (que é pública, embutida no frontend) pode disparar `alert-dispatcher`, `process-outbox`, `check-approval-escalations`, `check-cotacao-followup`, `check-expiry-alerts`, `check-sla-alerts`, `weekly-report`, `weekly-summary-report`, `maintain-partitions` — todas rodando com `SUPABASE_SERVICE_ROLE_KEY`.
- `CRON_SECRET` **configurado** → o cron do banco passa a receber 401 e todos os jobs param silenciosamente.

### S-3 — MÉDIO: `punchout-receive` é webhook anônimo sem verificação de segredo compartilhado

`punchout-receive/index.ts:72-181` é deployada com `--no-verify-jwt` (`deploy_edge_functions_promo_supply.sh:95`). Ela lê o cXML e cria uma `solicitacao` real (linhas 137-147) apenas validando que o `BuyerCookie` bate com uma sessão aberta (linha 121-127). O `<Credential>`/`SharedSecret` do cXML **nunca é validado** — não há nenhuma referência a segredo do catálogo no arquivo. Único controle: rate limit por IP (linhas 85-92).

### S-4 — MÉDIO: anon keys hardcoded no repositório (fora de `supabase/functions/`, mas com impacto direto nas functions)

- `supabase/migrations/20260711153258_...sql:19` — JWT anon do projeto `trwgmplubeqxrxpncdgf` literal na migration.
- `deploy_edge_functions_promo_supply.sh:10` — JWT anon do projeto `lmypcdfsrgfftzhxawao`.
- `tests-rls/rls-isolation.test.ts:21` — mesmo JWT anon de `trwgmplubeqxrxpncdgf`.

**Verificação pedida sobre o commit `58f4fc8` ("remove migrate-helper edge function (exposes service_role key)"):** varri `supabase/functions/` com regex para `eyJhbGciOi`, `service_role_key = "..."`, `sk-...`, `secret = "..."`, `password = "..."`, `apikey = "..."`. **Zero ocorrências.** Não sobrou caso análogo de service_role hardcoded dentro das edge functions. O que sobrou foi anon key (não service_role) nos três arquivos acima, e a referência órfã a `migrate-helper` em `deploy_edge_functions_promo_supply.sh:72`, que aponta para um diretório que não existe mais.

### S-5 — MÉDIO: `scim-v2` está deployada com `verify_jwt` ligado, o que torna o token SCIM inutilizável

`scim-v2/index.ts:86-110` autentica comparando o SHA-256 do Bearer contra `sso_configurations.scim_token_hash`. Mas `scim-v2` **não** está na lista `NO_JWT_FUNCTIONS` de `deploy_edge_functions_promo_supply.sh:95`. Com `verify_jwt` ativo, o gateway do Supabase rejeita o token SCIM do IdP antes de o código rodar. Ou a função nunca funcionou por esse caminho, ou foi deployada por fora do script.

### S-6 — BAIXO: `rate_limit` falha aberto e `health-dashboard` ignora a allowlist de CORS

- `_shared/rate_limit.ts:34-38`: se a RPC `check_rate_limit` der erro, retorna `{ allowed: true }` — degradação silenciosa de todo o rate limiting do sistema.
- `health-dashboard/index.ts:11-16` define `corsHeaders` local com `"Access-Control-Allow-Origin": "*"`, ignorando a allowlist `ALLOWED_ORIGINS` implementada em `_shared/security.ts:50-64`.

---

## Resumo

| Classificação | Qtd | Denominador |
|---|---|---|
| ✅ IMPLEMENTADO_TOTAL | 15 | / 37 |
| 🟨 IMPLEMENTADO_PARCIAL | 13 | / 37 |
| 🟦 SUGERIDO_OU_INICIADO | 3 | / 37 |
| ⬛ MORTO_OU_ABANDONADO | 6 | / 37 |

- **6 funções sem nenhum chamador** em todo o repositório (seção dedicada abaixo).
- **3 funções são fachada**: retornam dado fabricado ou fixo (`guided-buying-ai`, `process-invoice-idp`, `erp-sync`).
- **2 funções têm bug fatal em toda requisição** (`workflow-engine`, `fiscal-orchestrator` — argumento errado em `getTenantId`).
- **1 função quebra na primeira linha útil** por import ausente (`punchout-receive` / `safeTruncate`).
- **1 função chamada pelo frontend não existe no repositório**: `process-solicitacao-neural`.

---

## Tabela mestra: 37 funções × quem chama

| Função | Classificação | Quem chama (arquivo:linha) ou SEM CHAMADOR | Objetos de banco tocados | Secrets exigidos | Autentica? |
|---|---|---|---|---|---|
| ai-demand-prediction | 🟨 | `src/components/compras/DemandPredictionPanel.tsx:139` | **nenhum** (só lê o body e devolve) | `LOVABLE_API_KEY` (`index.ts:38`) | Sim — JWT via `auth.getUser()` `index.ts:29` + rate limit `:32` |
| ai-negotiation | 🟨 | `src/pages/negociacao-ia/NegociacaoIA.tsx:92`; `system-simulation/index.ts:37` | **nenhum** | `LOVABLE_API_KEY` (`:53`) | Sim — JWT `:29` + rate limit `:35` |
| ai-supplier-risk | 🟨 | `src/components/compras/SupplierRiskAnalysis.tsx:131` | **nenhum** | `LOVABLE_API_KEY` (`:46`) | Sim — `verifyAuthUser` `:14-30` + rate limit `:42` |
| ai-supplier-suggestion | ⬛ | **SEM CHAMADOR** (grep abaixo) | **nenhum** | `LOVABLE_API_KEY` (`:38`) | Sim — JWT `:29` + rate limit `:32` |
| alert-dispatcher | 🟨 | pg_cron `migrations/20260711153258_...sql:58-62` (`'* * * * *'` → `_invoke_edge_function('alert-dispatcher')`) | lê `system_alerts` `:245`; escreve `notifications` `:306`, `system_alerts` `:357`; RPC `alert_subscribers_for` `:286`; `cron_heartbeats` via `:388` | `SLACK_WEBHOOK_URL` `:24`, `RESEND_API_KEY` `:25`, `ALERT_EMAIL_FROM` `:26`, `APP_URL` `:27` | `verifyCronSecret` `:236` — ver S-2 |
| check-approval-escalations | ✅ | pg_cron `migrations/20260402114640_...sql:62-73` (`'*/15 * * * *'`) | `approval_steps` `:30,:90,:147,:216`; `approval_workflows` `:73`; `approval_history` `:102`; `notifications` `:124,:159,:199`; `cron_heartbeats` `:231` | `SUPABASE_SERVICE_ROLE_KEY` `:21` | `verifyCronSecret` `:11` — ver S-2 |
| check-cotacao-followup | ✅ | pg_cron `migrations/20260402114640_...sql:20-31` (`'0 12 * * *'`) | `cotacoes` `:32`; `notifications` `:51,:63`; `profiles` `:79`; `cron_heartbeats` `:139` | `SUPABASE_SERVICE_ROLE_KEY` `:19`, `RESEND_API_KEY` `:20` (opcional — `if (resendApiKey)` `:75`, degrada em silêncio) | `verifyCronSecret` `:10` — ver S-2 |
| check-expiry-alerts | ✅ | pg_cron `migrations/20260402114640_...sql:48-59` (`'0 10 * * *'`) | `cotacoes` `:31,:42,:56(update)`; `pagamentos` `:63,:73,:85(update)`; `user_roles` `:101`; `notifications` `:176,:184`; `cron_heartbeats` `:200` | `SUPABASE_SERVICE_ROLE_KEY` `:16` | `verifyCronSecret` `:10` — ver S-2 |
| check-sla-alerts | ✅ | pg_cron `migrations/20260402114640_...sql:34-45` (`'*/30 * * * *'`); também botão manual `src/components/notifications/NotificationSettingsPanel.tsx:59` | `pedidos` `:67,:99`; `solicitacoes` `:131`; `pagamentos` `:170`; `user_roles` `:144,:182`; `notifications` `:21,:30`; `cron_heartbeats` `:208` | `SUPABASE_SERVICE_ROLE_KEY` `:43` | `verifyCronSecret` `:38` — ver S-2 |
| dependency-health | ✅ | `src/pages/admin/DependencyHealth.tsx:47,:76,:188,:263` | `dependency_health` `:479,:617`; `dependency_health_history` `:353,:659,:669,:677`; `audit_logs` `:623` | `GITHUB_REPO_RAW_BASE` `:8` (falha explícita 500 `:561-563`), `GITHUB_DISPATCH_TOKEN` `:9` (degrada: `if (!TOKEN) return {}` `:52,:89`) | Sim — GET exige JWT `:462-468`; POST exige JWT + `has_role('admin')` `:545-559` |
| erp-sync | 🟦 | `src/pages/admin/ERPConnections.tsx:53`; `system-simulation/index.ts:56` | lê `erp_connections` `:60`; escreve `erp_sync_log` `:79` | `SUPABASE_SERVICE_ROLE_KEY` `:20` | Sim — `getAuthUser` `:25` + rate limit `:34` + idempotência `:44` |
| external-db-bridge | 🟨 | apenas `scripts/validate-bridge.ts:20,:33` (script de validação, não produção). Documentada em `src/pages/admin/DeveloperDocs.tsx:53-111` mas **sem hook que a invoque** | escreve `query_telemetry` `:57`; opera no **DB externo** via allowlist `_shared/external-bridge-allowlist.ts` | `EXTERNAL_DB_URL` + `EXTERNAL_DB_KEY` `:169-170` — **ausentes de `.env.example`**; falha explícita 500 `:174-179` | Sim — JWT `:119` + allowlist `:147` + rate limit `:157` |
| fiscal-orchestrator | ⬛ | **SEM CHAMADOR** — a única menção (`src/tests/fuzzing/edge-functions.test.ts:8`) é uma lista de strings; esse teste não faz requisição nenhuma (ver Achados) | `fiscal_events` insert `:116`, update `:146` | `SEFAZ_WEBHOOK_URL` `:22` (degrada em silêncio: `return {}` `:24-25`), `SEFAZ_API_TOKEN` `:34` | Sim — JWT `:84` + idempotência `:105`. **Mas quebra sempre — ver Achados G-2** |
| generate-contract-pdf | ✅ | `src/components/compras/ContractDetailsModal.tsx:145` | lê `contracts` `:75,:92`, `contract_items` `:100`, `contract_penalties` `:107` | `SUPABASE_SERVICE_ROLE_KEY` `:88` | Sim — JWT `:50` + rate limit `:59` + pré-checagem RLS antes de escalar `:74-84` |
| guided-buying-ai | 🟦 | `src/hooks/useGuidedBuying.ts:56` | lê `produtos` `:61`, `fornecedores` `:67` (só para montar um prompt que **nunca é enviado**) | `SUPABASE_SERVICE_ROLE_KEY` `:40` | Sim — `getAuthUser` `:25` + rate limit `:29` + tenant `:52` |
| health-dashboard | ✅ | `src/pages/admin/AlertDetail.tsx:70` (`method:"GET"`) e `src/pages/admin/HealthDashboard.tsx:236` | lê `system_alerts` `:66,:77,:103,:111`; `audit_logs` `:71`; view `v_system_health_overview` `:96`; `health_scan_runs` `:98`; RPCs `alerts_severity_timeseries`/`alerts_mttr_by_type`/`alerts_noisy_scanners` `:107-109` | `SUPABASE_SERVICE_ROLE_KEY` `:30`, `SUPABASE_ANON_KEY` `:31` | Sim — JWT `:45` + `has_role('admin')` `:53-58`. CORS aberto (S-6) |
| maintain-partitions | ⬛ | **SEM CHAMADOR** — consta como job esperado em `migrations/20260719000002_cron_heartbeats.sql:37`, mas **não existe `cron.schedule` para ela** em migration alguma | RPC `maintain_monthly_partitions` `:38`; `cron_heartbeats` `:56` | `SUPABASE_SERVICE_ROLE_KEY` `:28` | `verifyCronSecret` `:19` — ver S-2 |
| migrate-storage-paths | ✅ | `src/pages/admin/StorageMigration.tsx:51` | Storage buckets `documentos`/`comprovantes` `:143,:170`; lê `profiles` `:118`; atualiza `pagamentos`, `payment_history`, `contract_documents`, `supplier_documents` `:17-26,:196` | `SUPABASE_SERVICE_ROLE_KEY` `:79` | Sim — JWT `:94` + `has_role('admin')` `:103-112` |
| process-invoice-idp | 🟦 | `src/pages/documentos/DocumentosFiscais.tsx:135` | lê Storage `fiscal-documents` `:44-46`; **não grava nada** | `SUPABASE_SERVICE_ROLE_KEY` `:40` | Sim — `getAuthUser` `:17` + bloqueio de path traversal `:29` |
| process-outbox | ✅ | pg_cron `migrations/20260711153258_...sql:65-69` (`'* * * * *'`) | `integration_outbox` `:43,:71,:87`; `system_alerts` `:109`; `cron_heartbeats` `:51,:126` | `SUPABASE_SERVICE_ROLE_KEY` `:38` | `verifyCronSecret` `:33` — ver S-2 |
| punchout-receive | 🟨 | Webhook externo — a URL é emitida pela própria `punchout-setup/index.ts:90` (`BrowserFormPost`) | lê `punchout_sessions` `:122`; insere `solicitacoes` `:138`; atualiza `punchout_sessions` `:152`; `webhook_events` via idempotência | `SUPABASE_SERVICE_ROLE_KEY` `:104` | **Não** — `--no-verify-jwt` (`deploy:95`), sem validação de shared secret (S-3). Só rate limit por IP `:86` |
| punchout-setup | ✅ | `src/pages/admin/PunchOutCatalogs.tsx:27` | lê `punchout_catalogs` `:42`, `user_tenants` `:51`; insere `punchout_sessions` `:62` | `SUPABASE_SERVICE_ROLE_KEY` `:29` | Sim — JWT `:37` + checagem de membership `:50-57` + idempotência `:22` |
| run-audit | ⬛ | **SEM CHAMADOR** (grep abaixo) | RPC `exec_sql` `:22` sobre `pg_policies` (existe: `migrations/20260523172611_...sql:16`) | `SUPABASE_SERVICE_ROLE_KEY` `:18` | Sim — `requireAdmin` (JWT + `has_role`) `:12` |
| scim-v2 | 🟨 | Nenhum chamador no repo; endpoint apenas **exibido** ao admin em `src/pages/admin/SSOConfig.tsx:202`. Chamador previsto é IdP externo | lê `sso_configurations` `:93`; `auth.admin.*` (getUserById `:122`, listUsers `:129`, createUser `:155`, updateUserById `:194`, deleteUser `:206`) | `SUPABASE_SERVICE_ROLE_KEY` `:89` | Sim — hash SHA-256 do token contra `scim_token_hash` com comparação em tempo constante `:46-53,:101-110` + rate limit por IP `:77`. **Mas ver S-5** |
| send-push-notification | ⬛ | **SEM CHAMADOR** (grep abaixo) | lê `push_subscriptions` `:147`; insere `notifications` `:165`; deleta `push_subscriptions` `:216` | `VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` `:129-130` (falha explícita 500 `:132-138`) | Sim — `verifyAuthUser` `:23-39` + rate limit `:124`. **Push em si não funciona — ver G-4** |
| spot-api | ⬛ | **SEM CHAMADOR** — só citada em comentário `src/pages/catalogo-spot/useSpotCatalog.ts:7`. Não há `cron.schedule` nem RPC que a invoque; também está **fora** de `deploy_edge_functions_promo_supply.sh` | `spot_sessions` `:143,:145,:157`; `spot_api_sync_log` `:201,:221`; `spot_produtos` `:373`; `spot_skus` `:401`; `spot_customization_options` `:445`; `spot_estoque` `:469`; `spot_pedidos` `:505,:543` | `SPOT_API_BASE_URL` `:34` (default), `SPOT_API_ACCESS_KEY` `:35` (falha explícita 500 `:133`), `SPOT_CRON_KEY` `:92` | Sim — 3 caminhos: chave de cron com comparação em tempo constante `:82-96`, service role key `:105`, JWT + `user_roles` `:110-123` |
| spot-proxy | ✅ | `src/hooks/useSpotIntegration.ts:51` | `spot_sessions` `:94,:105,:113,:121,:204,:211`; `spot_pedidos` upsert `:600`; lê `user_roles` `:79` | `SPOT_USERNAME` + `SPOT_PASSWORD` `:131-132` (falha explícita `:134-136`); **ausentes de `.env.example`** | Sim — JWT `:70` + `user_roles ∈ {admin,coordinator,buyer}` `:79-87` + rate limit `:790` |
| system-simulation | 🟨 | CI: `.github/workflows/ci.yml:75` (`curl -f -X POST .../system-simulation`); UI: `src/pages/admin-telemetria/AdminTelemetria.tsx:65`; load test `src/tests/load/backend-stress.yml:19`; script `package.json:20` | Nenhum direto — dispara HTTP para `ai-negotiation`/`workflow-engine`/`erp-sync` `:78` | `SUPABASE_SERVICE_ROLE_KEY` `:19`, `SUPABASE_ANON_KEY` `:74` | Sim — `requireAdmin` `:12`. **Mas o CI manda a service role key onde se espera JWT de usuário — ver G-5** |
| telemetry | ✅ | `src/lib/logger.ts:117` | insere `telemetry_logs` `:81` | `SUPABASE_SERVICE_ROLE_KEY` `:57` | Sim — exige `Authorization` `:30` + `auth.getUser()` `:36`, apesar de `--no-verify-jwt` (`deploy:95`) |
| webauthn-authenticate | 🟨 | `src/hooks/useWebAuthn.ts:185,:231` | lê `webauthn_credentials` `:83,:155`, atualiza `:179`; `webauthn_challenges` `:99,:136,:188`; `auth.admin.listUsers` `:72`, `generateLink` `:195`; RPC `log_security_event` `:218` | `SUPABASE_SERVICE_ROLE_KEY` `:44` | **Não** — `--no-verify-jwt` (`deploy:95`) e **sem verificação de assinatura (S-1)**. Só rate limit `:58` |
| webauthn-register | 🟨 | `src/hooks/useWebAuthn.ts:86,:139` | `webauthn_challenges` `:98,:161,:205`; `webauthn_credentials` `:113,:188` | `SUPABASE_SERVICE_ROLE_KEY` `:70` | Sim — `verifyAuthUser` `:58` + amarração `userId` do body ao usuário autenticado `:84-87` + rate limit `:61` |
| weekly-report | ✅ | pg_cron `migrations/20260402114640_...sql:6-17` (`'0 11 * * 1'`) | lê `solicitacoes`/`pedidos`/`pagamentos`/`cotacoes` `:33-36`, `user_roles` `:68`; insere `notifications` `:75`; `cron_heartbeats` `:87` | `SUPABASE_SERVICE_ROLE_KEY` `:20` | `verifyCronSecret` `:10` — ver S-2 |
| weekly-summary-report | ✅ | pg_cron `migrations/20260507194402_...sql:5-17` (`'0 8 * * 1'`) — **mas aponta para o projeto `apuzcrkeqodktmpwobnz`**, não para `trwgmplubeqxrxpncdgf` de `supabase/config.toml:1` | lê `solicitacoes` `:30`, `pedidos` `:36,:43`, `cotacoes` `:50`, `user_roles` `:81`; insere `notifications` `:88`; `cron_heartbeats` `:99` | `SUPABASE_SERVICE_ROLE_KEY` `:16` | `verifyCronSecret` `:10` — ver S-2 |
| workflow-engine | 🟨 | `system-simulation/index.ts:45`; `scripts/stress-test.ts:8`; `src/tests/load/backend-stress.yml:29`. **Sem chamador de produção no frontend** | `workflow_instances` `:51,:88`; `workflow_nodes` `:65`; `workflow_logs` `:73`; `workflow_edges` `:82`; `workflow_approvals` `:122`; RPC `check_workflow_sod` `:110` | `SUPABASE_SERVICE_ROLE_KEY` `:34` | Sim — `getAuthUser` `:25`. **Mas quebra sempre — ver G-2** |
| xbz-proxy | ✅ | `src/hooks/useXbzIntegration.ts:178` | `xbz_credentials` `:146,:179,:202`; `xbz_carrinho_log` `:383,:405,:417`; espelho de catálogo via `_shared/xbz_catalog_cache.ts:97` | `XBZ_ENCRYPTION_KEY` (`_shared/xbz_crypto.ts:18`, falha explícita se <32 chars `:19-21`), `SUPABASE_SERVICE_ROLE_KEY` (`xbz_auth.ts:19`) | Sim — JWT + tenant de `user_tenants` + papéis de `user_roles` (`_shared/xbz_auth.ts:28-64`) + rate limit por ação `:458-468` |
| xbz-sync-pedidos | 🟨 | Invocador SQL existe (`migrations/20260726150655_...sql:52-83`, `_invoke_xbz_sync()`), e há watchdog que **assume** o job `'xbz-sync-pedidos-30min'` (`20260726151043_...sql:17,:23`) — **mas não existe `cron.schedule` criando esse job**. Sem chamador no frontend | `xbz_credentials` `:206`; `xbz_pedidos` `:91,:150`; `xbz_pedido_status_history` `:155`; `system_alerts` `:156` | `SUPABASE_SERVICE_ROLE_KEY`, `XBZ_ENCRYPTION_KEY` (via `_shared`) | Sim — chave de cron validada por RPC `verify_xbz_cron_key` `:188` (compara digests) **ou** JWT+papel admin/coordinator `:212-213` |
| tests/ (`integration_suite.ts`, `fuzzing_suite.ts`) | 🟨 | `.github/workflows/main.yml:55` (`deno test ... supabase/functions/tests/`) | — | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (`integration_suite.ts:6-7`) | — Pula tudo se o Supabase não responder (`integration_suite.ts:26-30`). **Os `*.test.ts` dentro das pastas de função nunca são executados — ver G-8** |

---

## Funções de IA — real ou fabricado?

| Função | Provedor real? | Endpoint | Chave via secret? | Veredito |
|---|---|---|---|---|
| ai-demand-prediction | **Sim** | Lovable AI Gateway `https://ai.gateway.lovable.dev/v1/chat/completions` (`_shared/ai_gateway.ts:12`), modelo `google/gemini-2.0-flash` (`index.ts:96`) | Sim — `Deno.env.get("LOVABLE_API_KEY")` `index.ts:38`, falha explícita `:39-41` | **Real.** Mas não persiste nada e tem fallback determinístico que devolve estrutura vazia com HTTP 200 (`index.ts:103-116`, `_shared/ai_gateway.ts:102-108`) |
| ai-negotiation | **Sim** | Mesmo gateway, modelo `google/gemini-3-flash-preview` (`index.ts:70`), com `tool_choice` forçado para JSON estruturado `:109` | Sim — `index.ts:53`, falha explícita `:54-57` | **Real.** Não persiste |
| ai-supplier-risk | **Sim** | Mesmo gateway, modelo `google/gemini-2.5-flash` (`index.ts:90`) | Sim — `index.ts:46` | **Real.** Não persiste. Bug de escopo no `catch` (G-3) |
| ai-supplier-suggestion | **Sim** | Mesmo gateway, `google/gemini-2.0-flash` (`index.ts:87`) | Sim — `index.ts:38` | **Real, mas ninguém chama** |
| **guided-buying-ai** | **NÃO — fabricado** | — | `SUPABASE_SERVICE_ROLE_KEY` só para ler catálogo | **FACHADA.** Ver abaixo |
| **process-invoice-idp** | **NÃO — fabricado** | — | — | **FACHADA.** Ver abaixo |

### `guided-buying-ai` — resposta escrita à mão, prompt descartado

`guided-buying-ai/index.ts:74-105`. A função monta um `systemPrompt` de 20 linhas com catálogo e fornecedores reais do tenant (linhas 74-93) e **joga fora** — a variável `systemPrompt` nunca é referenciada de novo no arquivo. O que é devolvido ao usuário é um `if/else` de três galhos sobre substring:

```
95    // Here we would call the Lovable AI Gateway (OpenAI/Anthropic)
96    // For now, we simulate a smart response.
99    if (message.toLowerCase().includes("notebook") || message.toLowerCase().includes("computador")) {
100     aiResponse = "Entendi que você precisa de um Notebook. Temos opções no catálogo como 'Notebook Dell Latitude'. ...";
101   } else if (message.toLowerCase().includes("caneta") || message.toLowerCase().includes("escritório")) {
102     aiResponse = "Temos diversos itens de papelaria. Recomendo o fornecedor 'Stricker' para estes itens. ...";
103   } else {
104     aiResponse = "Olá! Como posso ajudar você com suas compras hoje? ...";
105   }
```

Note que "Notebook Dell Latitude" e "Stricker" são **strings literais**, não vêm dos `products`/`suppliers` que foram lidos do banco. O frontend (`src/hooks/useGuidedBuying.ts:56`) consome isso como resposta de IA.

### `process-invoice-idp` — dados fiscais inventados com `Math.random()`

`process-invoice-idp/index.ts:53-74`. A função autentica, baixa o PDF real do bucket `fiscal-documents` (linha 44-46)… e então devolve um objeto inteiramente fabricado:

```
53    logger.info("Arquivo baixado com sucesso, simulando extração IA", ...);
55    // Use Lovable AI Gateway to process document
56    // Simulate AI response
57    const mockExtractedData = {
58      numero_nf: `PDF-${Math.floor(Math.random() * 100000)}`,
59      chave_acesso: "35231200000000000000000000000000000000000000",
60      data_emissao: new Date().toISOString().split('T')[0],
61      valor_total: 1250.50,
62      valor_produtos: 1200.00,
63      valor_frete: 50.50,
64      items: [ { descricao: "Extracted Item 1", quantidade: 10, valor_unitario: 120.00, valor_total: 1200.00 } ],
72    return new Response(JSON.stringify(mockExtractedData), ...);
```

O conteúdo do PDF baixado nunca é lido — só o `fileData.size` é logado. O frontend em `src/pages/documentos/DocumentosFiscais.tsx:135` recebe isso tipado como `ExtractedInvoiceData` e o apresenta como extração real de nota fiscal. **Número de NF aleatório, chave de acesso constante, valor fixo de R$ 1.250,50.**

---

## Integrações externas — real ou stub?

| Integração | Endpoint real e configurável? | Secrets no `.env.example`? | Comportamento se o secret faltar |
|---|---|---|---|
| **spot-api** (API oficial SPOT/Stricker) | **Sim, real e completo.** `SPOT_API_BASE_URL` com default `https://ws.spotgifts.com.br/api/v1SSL` (`:34`). Auth, quota diária, retry, upsert em lote, mapeamento de erro | ❌ Não | **Falha explícita** — `HttpError(500,"SPOT_API_ACCESS_KEY não configurada")` `:133` |
| **spot-proxy** (scraping do portal) | **Sim, real.** `https://www.spotgifts.com.br` `:10`, **hardcoded, não configurável**. Login por form + parsing de HTML por regex `:389-473` | ❌ Não (`SPOT_USERNAME`, `SPOT_PASSWORD`) | **Falha explícita** — `"Credenciais SPOT não configuradas no backend"` `:134-136` |
| **xbz-proxy** (API XBZ) | **Sim, real.** `https://api.minhaxbz.com.br:5001` (`_shared/xbz_client.ts:18`), **hardcoded**. Credenciais por tenant, cifradas em AES-GCM no banco | ❌ Não (`XBZ_ENCRYPTION_KEY`) | **Falha explícita** — `"XBZ_ENCRYPTION_KEY ausente ou muito curta"` (`xbz_crypto.ts:19-21`) |
| **xbz-sync-pedidos** | **Sim, real.** Detecta transição de pagamento e gera `system_alerts` `:120-135` | ❌ Não | Falha explícita (via `xbz_crypto`) |
| **erp-sync** | **NÃO — stub declarado.** `:72-77` | n/a | Sempre grava `status:"pending"` em `erp_sync_log` e devolve **HTTP 501 fixo** `:105`. É honesto sobre isso |
| **external-db-bridge** | **Sim, real**, com allowlist estrita de tabelas/RPCs (`_shared/external-bridge-allowlist.ts:16-27`) e clamp de `limit` `:144` | ❌ Não (`EXTERNAL_DB_URL`, `EXTERNAL_DB_KEY`) | **Falha explícita** 500 `:174-179` |
| **fiscal-orchestrator** (SEFAZ) | Parcial. `SEFAZ_WEBHOOK_URL` configurável `:22`, retry com backoff `:28-59` | ❌ Não | **Degrada em silêncio** — `logger.warn(...); return {}` `:23-26`. O evento vai para `status:"failed"` `:148` mas a resposta ao cliente é **HTTP 200 com `success:true`** e a mensagem "agendado para reprocessamento" `:157-159`, sendo que **não existe mecanismo de reprocessamento** de `fiscal_events` em lugar nenhum do repositório |
| **process-invoice-idp** | **NÃO — fabricado** (ver acima) | n/a | n/a |
| **punchout-setup / punchout-receive** | Parcial. cXML gerado à mão `:72-94` (comentado como "Simplified for MVP"), campo de resposta chamado `mock_redirect` `:103`. `punchout-receive` usa parser XML real (`fast-xml-parser`) mas **quebra por import ausente (G-1)** | n/a | — |
| **scim-v2** | **Sim, real e conforme RFC 7643/7644** (Location header `:165`, 204 no DELETE `:209`, erro no schema SCIM `:27-36`) | n/a | — mas ver S-5 |
| **send-push-notification** (Web Push) | **NÃO funcional** — ver G-4 | ❌ Não (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`) | Falha explícita 500 `:132-138` |
| **alert-dispatcher → Slack / Resend / webhook** | Slack e Resend reais com retry `:70-167`. Webhook com HMAC-SHA256 `:170-232` | ❌ Não (`SLACK_WEBHOOK_URL`, `RESEND_API_KEY`, `ALERT_EMAIL_FROM`, `APP_URL`) | Slack: sem URL global e sem assinatura → nenhum envio, silencioso `:314`. Resend: `return { ok:false, error:"resend_not_configured" }` `:129`. Canal webhook é **inalcançável** — ver G-6 |

**Nota geral sobre `.env.example`:** o arquivo (`/.env.example`) contém apenas 6 variáveis, todas `VITE_*` de frontend (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_BITRIX_WEBHOOK_URL`, `VITE_APP_NAME`, `VITE_APP_ENV`, flags). **Nenhum** dos 17 secrets exigidos pelas edge functions está documentado ali: `LOVABLE_API_KEY`, `SPOT_API_ACCESS_KEY`, `SPOT_API_BASE_URL`, `SPOT_CRON_KEY`, `SPOT_USERNAME`, `SPOT_PASSWORD`, `XBZ_ENCRYPTION_KEY`, `EXTERNAL_DB_URL`, `EXTERNAL_DB_KEY`, `SEFAZ_WEBHOOK_URL`, `SEFAZ_API_TOKEN`, `SLACK_WEBHOOK_URL`, `RESEND_API_KEY`, `ALERT_EMAIL_FROM`, `APP_URL`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `GITHUB_REPO_RAW_BASE`, `GITHUB_DISPATCH_TOKEN`, `CRON_SECRET`, `ALLOWED_ORIGINS`.

---

## Jobs agendados × agendamento encontrado em migrations

| Função | Agendamento encontrado | Cron | Heartbeat esperado |
|---|---|---|---|
| alert-dispatcher | ✅ `20260711153258_...sql:58-62` | `* * * * *` | ✅ seed `20260719000002:29` |
| process-outbox | ✅ `20260711153258_...sql:65-69` | `* * * * *` | ✅ seed `:34` |
| check-approval-escalations | ✅ `20260402114640_...sql:62-73` | `*/15 * * * *` | ✅ seed `:30` |
| check-cotacao-followup | ✅ `20260402114640_...sql:20-31` (e `20260402113249_...sql:20-31`) | `0 12 * * *` | ✅ seed `:31` |
| check-expiry-alerts | ✅ `20260402114640_...sql:48-59` | `0 10 * * *` | ✅ seed `:32` |
| check-sla-alerts | ✅ `20260402114640_...sql:34-45` | `*/30 * * * *` | ✅ seed `:33` |
| weekly-report | ✅ `20260402114640_...sql:6-17` | `0 11 * * 1` | ✅ seed `:35` |
| weekly-summary-report | ⚠️ `20260507194402_...sql:5-17` — **URL aponta para outro projeto** (`apuzcrkeqodktmpwobnz` vs `trwgmplubeqxrxpncdgf` em `config.toml:1`) e usa `current_setting('app.settings.service_role_key')`, com o comentário `:53-54` admitindo que a setting pode não existir | `0 8 * * 1` | ✅ seed `:36` |
| **maintain-partitions** | ❌ **NENHUM.** Existe a RPC `maintain_monthly_partitions` (`20260719000004_partition_maintenance.sql:9`) e um bootstrap único `:113-122`, mas **nenhum `cron.schedule` chama a edge function nem a RPC de forma recorrente** | — | ✅ seed `:37` (job semeado como esperado, mas nunca agendado) |
| **spot-api** | ❌ **NENHUM.** O cabeçalho do arquivo (`spot-api/index.ts:9-10`) descreve "cron a cada 15 min" e "1 sync/dia", e o código tem toda a infraestrutura de `SPOT_CRON_KEY` `:91-96` — mas não há `cron.schedule` correspondente | — | ❌ nem seed |
| **xbz-sync-pedidos** | ⚠️ **PARCIAL.** Invocador `_invoke_xbz_sync()` criado em `20260726150655_...sql:52-83`; watchdog em `20260726151043_...sql:2-65` consulta `cron.job_run_details` do job `'xbz-sync-pedidos-30min'` — **que nenhuma migration cria**. O cabeçalho do arquivo (`xbz-sync-pedidos/index.ts:4`) afirma "Executado por pg_cron (30/30 min)" | — | ❌ nem seed |

Também notado: `20260402113249_...sql` e `20260402114640_...sql` criam jobs **duplicados** para `weekly-report`, `check-cotacao-followup`, `check-sla-alerts` e `check-expiry-alerts` com nomes de job diferentes e sem `cron.unschedule` prévio — potencial execução dupla.

---

## Funções sem nenhum chamador (com prova de grep)

Comando executado para cada nome, com exclusão de `supabase/functions/` do resultado quando irrelevante:

```
grep -rn "<nome>" src/ supabase/migrations/ .github/ scripts/
```

| Função | Resultado |
|---|---|
| **ai-supplier-suggestion** | `0 ocorrências`. Consta apenas em `deploy_edge_functions_promo_supply.sh:38,:141` (deploy + smoke test). Nenhum `functions.invoke('ai-supplier-suggestion')` em `src/`. |
| **punchout-receive** | `0 ocorrências` em `src/`/`migrations/`. Tem caminho externo legítimo: a URL é embutida no cXML por `punchout-setup/index.ts:90`. Por isso não é ⬛. |
| **run-audit** | `0 ocorrências`. Só em `deploy_edge_functions_promo_supply.sh:67`. |
| **send-push-notification** | `0 ocorrências`. Só em `deploy_edge_functions_promo_supply.sh:64`. Nenhum trigger de banco, nenhuma outra edge function a chama. |
| **spot-api** | `1 ocorrência`, e é comentário: `src/pages/catalogo-spot/useSpotCatalog.ts:7` — *"function `spot-api` em sincronizações agendadas (quota diária limitada)"*. Não é invocação. Ausente do script de deploy. |
| **maintain-partitions** | `1 ocorrência`: `supabase/migrations/20260719000002_cron_heartbeats.sql:37` — apenas o seed da tabela de heartbeat. Não é invocação. Ausente do script de deploy. |
| **fiscal-orchestrator** | `1 ocorrência`: `src/tests/fuzzing/edge-functions.test.ts:8` — literal dentro de um array de strings. Esse teste **não faz nenhuma requisição HTTP**: as 5 assertions rodam contra um `mockValidator` local definido em `:23-36` e a única expectativa é `expect(mockValidator(payload)).toBe(false)` `:38`. Nome da função nunca é usado. |

Também sem chamador de produção (mas com caminho de teste/CI, por isso 🟨):

| Função | Único caminho |
|---|---|
| **workflow-engine** | `system-simulation/index.ts:45` (edge→edge), `scripts/stress-test.ts:8`, `src/tests/load/backend-stress.yml:29`. Zero `functions.invoke('workflow-engine')` em `src/`. |
| **external-db-bridge** | `scripts/validate-bridge.ts:20,:33` apenas. |
| **scim-v2** | Nenhum — chamador previsto é IdP externo; UI só exibe a URL (`SSOConfig.tsx:202`). |

### Inverso: chamador do frontend apontando para função que não existe

`src/components/compras/NovaSolicitacaoModal.tsx:108` e `src/pages/admin/DeveloperDocs.tsx:44` chamam `supabase.functions.invoke('process-solicitacao-neural', ...)`. **Não existe `supabase/functions/process-solicitacao-neural/`** — confirmado com `ls supabase/functions/ | grep -i neural` (saída vazia, exit 1). O fluxo de criação de solicitação no frontend depende de uma edge function ausente do repositório.

---

## Achados graves

### G-1 — `punchout-receive` quebra em toda requisição válida: `safeTruncate` não é importado

`punchout-receive/index.ts` usa `safeTruncate` nas linhas 58 e 63, dentro de `parsePunchOutOrderMessage`. Os imports do arquivo são as linhas 1-7 e **não incluem** `safeTruncate` (que vive em `_shared/logLevel.ts`). Prova:

```
$ grep -n "safeTruncate|^import" supabase/functions/punchout-receive/index.ts
1: import { corsHeaders } from "../_shared/security.ts";
2: import { buildResponseHeaders } from "../_shared/http.ts";
3: import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
4: import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
5: import { XMLParser } from "https://esm.sh/fast-xml-parser@4.3.6";
6: import { checkRateLimit, rateLimitedResponse } from "../_shared/rate_limit.ts";
7: import { deriveIdempotencyKey, getIdempotentResponse, recordIdempotentResponse } from "../_shared/idempotency.ts";
58:      name: safeTruncate(String(name), 500),
63:        ? safeTruncate(detail.SupplierPartID as string, 200)
```

Qualquer cXML com ao menos um `<ItemIn>` levanta `ReferenceError`. O `catch` da linha 173 converte isso em HTTP 400 com a mensagem `"Invalid PunchOut XML: safeTruncate is not defined"` e **grava esse erro como `status:'failed'` no cache de idempotência** (`:175`), de modo que o retry do fornecedor recebe 409 permanentemente. PunchOut não pode nunca ter funcionado nesta versão do código.

### G-2 — `workflow-engine` e `fiscal-orchestrator` passam um `Request` onde se espera um `string`, e sempre lançam

A assinatura é `_shared/security.ts:154-158`:

```
154 export const getTenantId = async (
155   supabase: any,
156   user: any,
157   preferredTenantId?: string,
158 ): Promise<string> => {
```

E o tratamento do 3º argumento, `_shared/security.ts:172-177`:

```
172   if (preferredTenantId) {
173     if (!allowed.has(preferredTenantId)) {
174       throw new Error("Security error: preferredTenantId does not match user's memberships");
175     }
176     return preferredTenantId;
177   }
```

Mas dois chamadores passam o objeto `Request`:

```
supabase/functions/workflow-engine/index.ts:41       const tenant_id = await getTenantId(supabase, user, req);
supabase/functions/fiscal-orchestrator/index.ts:98   const tenant_id = await getTenantId(supabaseAdmin, user, req);
```

Um `Request` é truthy → entra no ramo `:172` → `allowed` é um `Set<string>` de UUIDs, então `allowed.has(<Request>)` é sempre `false` → lança sempre. Em `workflow-engine` isso acontece **antes** de qualquer ação (`:47`), e em `fiscal-orchestrator` **antes** do `withIdempotency` (`:105`). Como a mensagem contém `"security error"`, `errorResponse` (`_shared/validation.ts:56`) devolve HTTP 403.

Os dois chamadores corretos são `erp-sync/index.ts:55` (`(data as any).tenantId`, string) e `guided-buying-ai/index.ts:52` (dois argumentos).

Consequência em cadeia: `system-simulation` dispara `workflow-engine` (`:45`) e `erp-sync` (`:56`) e, em `mode:"normal"`, trata qualquer não-2xx que não seja 404 como falha (`:96-98`) — logo o gate de simulação do CI nunca pode passar.

### G-3 — `ai-supplier-risk`: o `catch` referencia uma variável fora de escopo

`ai-supplier-risk/index.ts:38` declara `const logger = getLogger(req);` **dentro** do bloco `try` (que começa em `:37`). O `catch` em `:162` usa `logger` em `:163`:

```
37   try {
38     const logger = getLogger(req);
...
162  } catch (error: unknown) {
163    logger.error("Erro fatal na função ai-supplier-risk", { error: (error as Error).message });
```

`const` é block-scoped: `logger` não existe no escopo do `catch`. Todo caminho de erro dessa função lança `ReferenceError: logger is not defined` de dentro do próprio handler de erro — a resposta 401/500 pretendida nas linhas 164-169 nunca é montada. Compare com `spot-proxy/index.ts:866` e `external-db-bridge/index.ts:300`, onde o mesmo padrão é protegido com `typeof logger !== 'undefined'`.

### G-4 — `send-push-notification` gera autenticação VAPID e nunca a usa; nenhum push pode ser entregue

`send-push-notification/index.ts:41-79` implementa `generateVapidAuth()` inteira (JWT ES256, assinatura, header `vapid t=..., k=...`). Prova de que é código morto:

```
$ grep -n "generateVapidAuth" supabase/functions/send-push-notification/index.ts
41: async function generateVapidAuth(endpoint: string, vapidPublicKey: string, vapidPrivateKey: string): ...
```

Uma única ocorrência: a própria declaração. A função de envio real, `sendPushToSubscription` `:81-111`, recebe as chaves como `_vapidPublicKey`/`_vapidPrivateKey` (prefixo `_` = deliberadamente não usados) e faz um POST cru:

```
90     const response = await fetchWithTimeout(subscription.endpoint, {
92       method: 'POST',
93       headers: { 'Content-Type': 'application/json', 'TTL': '86400' },
97       body: payloadString,
```

Sem header `Authorization: vapid ...`, sem `Crypto-Key`, sem criptografia `aes128gcm` do payload — os três requisitos do Web Push. Serviços de push reais (FCM, Mozilla autopush) rejeitam. Pior: `:212-225` deleta a assinatura do banco **em qualquer falha**, então cada execução esvaziaria a tabela `push_subscriptions`.

### G-5 — O gate de CI de `system-simulation` autentica com a chave errada

`.github/workflows/ci.yml:74-78`:

```
75  curl -f -X POST "$SUPABASE_URL/functions/v1/system-simulation" \
76    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
```

Mas `system-simulation/index.ts:12` chama `requireAdmin(req)`, que em `_shared/security.ts:256-268` faz `userClient.auth.getUser(token)` — espera um JWT **de usuário**, não a service role key, e devolve 401 quando não há `user`. O mesmo vale para `package.json:20` (`test:simulate`). O gate só roda quando `secrets.SUPABASE_URL` e `secrets.SUPABASE_SERVICE_ROLE_KEY` estão configurados (`ci.yml:70`), então provavelmente está sendo pulado — mas se for habilitado, falha por 401, não por defeito de contrato.

### G-6 — `alert-dispatcher`: filtro de severidade em maiúsculas contra escritores em minúsculas, e canal `webhook` inalcançável

`alert-dispatcher/index.ts:247` filtra:

```
247  .in("severity", ["HIGH", "CRITICAL"])
```

`system_alerts.severity` é `TEXT NOT NULL` **sem CHECK** (`migrations/20260531125027_...sql:15`), e os escritores divergem:
- Scanners SQL escrevem em maiúsculas: `'CRITICAL'`, `'HIGH'`, `'MEDIUM'` (ex.: `20260713105021_...sql:51,:53`) → **são despachados**.
- Edge functions escrevem em minúsculas: `process-outbox/index.ts:111` `severity: "critical"`; `xbz-sync-pedidos/index.ts:125` `severity: "medium"` → **nunca são despachados**. Ou seja, o alerta de DLQ do outbox (item morto após 5 tentativas) e o alerta de pagamento confirmado da XBZ jamais chegam a Slack, e-mail ou in-app.

Além disso, `:337` filtra `s.channel === "webhook"`, mas a constraint da tabela é `CHECK (channel IN ('inapp','email','slack'))` (`20260712203402_...sql:10`) e nenhuma migration posterior a altera — só foram adicionadas as colunas `webhook_url`/`webhook_secret` (`20260712212852_...sql:2-4`). O caminho de fan-out por webhook e o HMAC de `:170-232` são inalcançáveis.

### G-7 — `deploy_edge_functions_promo_supply.sh` está desatualizado e aponta para outro projeto

- Linha 9-10: `PROJECT_REF="lmypcdfsrgfftzhxawao"` e anon key correspondente — mas `supabase/config.toml:1` diz `project_id = "trwgmplubeqxrxpncdgf"` e as migrations usam `trwgmplubeqxrxpncdgf` (`20260711153258_...sql:18`). Rodar o script publica no projeto errado.
- Linha 72: ainda lista `migrate-helper`, removida no commit `58f4fc8`.
- **5 funções ausentes da lista de deploy**: `spot-api`, `xbz-proxy`, `xbz-sync-pedidos`, `maintain-partitions`, `health-dashboard`. Duas delas (`xbz-proxy`, `health-dashboard`) **têm chamador ativo no frontend** — o que prova que o script não é a única via de deploy e, portanto, não serve como prova de o que está ou não publicado.

### G-8 — Metade da suíte de testes das edge functions nunca é executada

`.github/workflows/main.yml:55` roda apenas:

```
deno test --allow-net --allow-env --allow-read supabase/functions/tests/
```

Isso cobre `tests/integration_suite.ts` e `tests/fuzzing_suite.ts` — e ambos **se auto-desabilitam** quando o Supabase não responde (`integration_suite.ts:25-30`, com `VITE_SUPABASE_URL` caindo para `http://localhost:54321` em `main.yml:53`).

Os 8 arquivos de teste que ficam **fora** desse caminho e nunca rodam:
`_shared/logLevel.test.ts` (13 testes), `_shared/logger.fuzz.test.ts` (9), `_shared/xbz_catalog_cache.test.ts` (6), `dependency-health/index.test.ts` (7), `scim-v2/conformance.test.ts` (8), `telemetry/index.test.ts` (5), `workflow-engine/fuzz.test.ts` (2), `run-audit/rls_test.ts` (1). **51 testes escritos, zero executados.**

### G-9 — `src/tests/fuzzing/edge-functions.test.ts` é um teste-placebo

O arquivo (43 linhas) anuncia "Edge Function Fuzzing" sobre `ai-negotiation`, `workflow-engine`, `erp-sync` e `fiscal-orchestrator` (`:4-9`). Nenhuma dessas strings é usada depois: cada `it` define um `mockValidator` local (`:23-36`) e assere `expect(mockValidator(payload)).toBe(false)` (`:38`). Nenhuma requisição de rede, nenhuma função tocada. Os 20 testes passam sempre e não medem nada. Esse é o único "chamador" que a busca por `fiscal-orchestrator` encontra em `src/`.

### G-10 — `fiscal-orchestrator` responde 200/`success:true` quando o despacho falhou

`fiscal-orchestrator/index.ts:144-166`: quando `dispatchToSefaz` volta vazio (secret ausente `:23-26`) ou com `dispatch_error` (`:62`), o registro é gravado com `status:"failed"` `:148`, mas a resposta ao chamador é:

```
156  return { data: { success: true, message: `${type} ${action} agendado para reprocessamento`, ... }, status: 200 };
```

"Agendado para reprocessamento" não corresponde a nada: não há cron, worker ou RPC que releia `fiscal_events` com `status='failed'` — grep por `fiscal_events` em `supabase/migrations/` e `supabase/functions/` não retorna nenhum reprocessador. O chamador é informado de sucesso para uma operação fiscal que não saiu.

### G-11 — Contrato divergente entre `WorkflowContract` e `workflow-engine`

`_shared/contracts.ts:24-40` define a união discriminada com três ações: `start_workflow`, `approve_step`, `submit_decision`. Mas `workflow-engine/index.ts` só implementa duas: `start_workflow` `:47` e `submit_decision` `:105`; qualquer outra cai em `throw new Error('Validation error: Invalid action')` `:143`. E `system-simulation/index.ts:48` envia exatamente `action: "approve_step"` como payload baseline — passa na validação de schema e é rejeitada pela lógica.

---

## Limites desta auditoria

- **Sem acesso a runtime.** Não sei quais funções estão de fato deployadas, quais secrets existem no projeto Supabase, nem se algum job de cron está realmente ativo. Tudo acima é inferido do código e das migrations versionadas. Especificamente: os jobs de `pg_cron` podem ter sido criados/removidos manualmente pelo dashboard sem migration correspondente, e `spot-api`/`xbz-sync-pedidos`/`maintain-partitions` podem ter agendamento fora do repositório.
- **Não verifiquei o schema real do banco** — a existência de tabelas e colunas foi inferida das migrations em `supabase/migrations/`, que podem estar dessincronizadas do banco.
- As migrations foram lidas **apenas** para responder "quem chama" e "existe agendamento". Não auditei RLS, índices ou consistência de schema — isso é escopo de outro lote.

---

## ARQUIVOS LIDOS

/home/user/promo-supply-v2/supabase/functions/_shared/ai_gateway.ts
/home/user/promo-supply-v2/supabase/functions/_shared/circuit_breaker.ts
/home/user/promo-supply-v2/supabase/functions/_shared/contracts.ts
/home/user/promo-supply-v2/supabase/functions/_shared/cronHealth.ts
/home/user/promo-supply-v2/supabase/functions/_shared/external-bridge-allowlist.ts
/home/user/promo-supply-v2/supabase/functions/_shared/fuzzSeed.ts
/home/user/promo-supply-v2/supabase/functions/_shared/fuzzer.ts
/home/user/promo-supply-v2/supabase/functions/_shared/http.ts
/home/user/promo-supply-v2/supabase/functions/_shared/idempotency.ts
/home/user/promo-supply-v2/supabase/functions/_shared/integrity_test.ts
/home/user/promo-supply-v2/supabase/functions/_shared/logLevel.test.ts
/home/user/promo-supply-v2/supabase/functions/_shared/logLevel.ts
/home/user/promo-supply-v2/supabase/functions/_shared/logger.fuzz.test.ts
/home/user/promo-supply-v2/supabase/functions/_shared/logger.ts
/home/user/promo-supply-v2/supabase/functions/_shared/rate_limit.ts
/home/user/promo-supply-v2/supabase/functions/_shared/retry.ts
/home/user/promo-supply-v2/supabase/functions/_shared/security.ts
/home/user/promo-supply-v2/supabase/functions/_shared/simulation-engine.ts
/home/user/promo-supply-v2/supabase/functions/_shared/spot_api.ts
/home/user/promo-supply-v2/supabase/functions/_shared/telemetry.ts
/home/user/promo-supply-v2/supabase/functions/_shared/validation.ts
/home/user/promo-supply-v2/supabase/functions/_shared/xbz_auth.ts
/home/user/promo-supply-v2/supabase/functions/_shared/xbz_catalog_cache.test.ts
/home/user/promo-supply-v2/supabase/functions/_shared/xbz_catalog_cache.ts
/home/user/promo-supply-v2/supabase/functions/_shared/xbz_client.ts
/home/user/promo-supply-v2/supabase/functions/_shared/xbz_crypto.ts
/home/user/promo-supply-v2/supabase/functions/ai-demand-prediction/index.ts
/home/user/promo-supply-v2/supabase/functions/ai-negotiation/index.ts
/home/user/promo-supply-v2/supabase/functions/ai-supplier-risk/index.ts
/home/user/promo-supply-v2/supabase/functions/ai-supplier-suggestion/index.ts
/home/user/promo-supply-v2/supabase/functions/alert-dispatcher/index.ts
/home/user/promo-supply-v2/supabase/functions/check-approval-escalations/index.ts
/home/user/promo-supply-v2/supabase/functions/check-cotacao-followup/index.ts
/home/user/promo-supply-v2/supabase/functions/check-expiry-alerts/index.ts
/home/user/promo-supply-v2/supabase/functions/check-sla-alerts/index.ts
/home/user/promo-supply-v2/supabase/functions/dependency-health/index.test.ts
/home/user/promo-supply-v2/supabase/functions/dependency-health/index.ts
/home/user/promo-supply-v2/supabase/functions/erp-sync/index.ts
/home/user/promo-supply-v2/supabase/functions/external-db-bridge/index.ts
/home/user/promo-supply-v2/supabase/functions/fiscal-orchestrator/index.ts
/home/user/promo-supply-v2/supabase/functions/generate-contract-pdf/index.ts
/home/user/promo-supply-v2/supabase/functions/guided-buying-ai/index.ts
/home/user/promo-supply-v2/supabase/functions/health-dashboard/index.ts
/home/user/promo-supply-v2/supabase/functions/maintain-partitions/index.ts
/home/user/promo-supply-v2/supabase/functions/migrate-storage-paths/index.ts
/home/user/promo-supply-v2/supabase/functions/process-invoice-idp/index.ts
/home/user/promo-supply-v2/supabase/functions/process-outbox/index.ts
/home/user/promo-supply-v2/supabase/functions/punchout-receive/index.ts
/home/user/promo-supply-v2/supabase/functions/punchout-setup/index.ts
/home/user/promo-supply-v2/supabase/functions/run-audit/index.ts
/home/user/promo-supply-v2/supabase/functions/run-audit/rls_test.ts
/home/user/promo-supply-v2/supabase/functions/scim-v2/conformance.test.ts
/home/user/promo-supply-v2/supabase/functions/scim-v2/index.ts
/home/user/promo-supply-v2/supabase/functions/send-push-notification/index.ts
/home/user/promo-supply-v2/supabase/functions/spot-api/index.ts
/home/user/promo-supply-v2/supabase/functions/spot-proxy/index.ts
/home/user/promo-supply-v2/supabase/functions/system-simulation/index.ts
/home/user/promo-supply-v2/supabase/functions/telemetry/index.test.ts
/home/user/promo-supply-v2/supabase/functions/telemetry/index.ts
/home/user/promo-supply-v2/supabase/functions/tests/fuzzing_suite.ts
/home/user/promo-supply-v2/supabase/functions/tests/integration_suite.ts
/home/user/promo-supply-v2/supabase/functions/webauthn-authenticate/index.ts
/home/user/promo-supply-v2/supabase/functions/webauthn-register/index.ts
/home/user/promo-supply-v2/supabase/functions/weekly-report/index.ts
/home/user/promo-supply-v2/supabase/functions/weekly-summary-report/index.ts
/home/user/promo-supply-v2/supabase/functions/workflow-engine/fuzz.test.ts
/home/user/promo-supply-v2/supabase/functions/workflow-engine/index.ts
/home/user/promo-supply-v2/supabase/functions/xbz-proxy/index.ts
/home/user/promo-supply-v2/supabase/functions/xbz-sync-pedidos/index.ts

### Fora do escopo, lidos como evidência de chamador/agendamento

/home/user/promo-supply-v2/.env
/home/user/promo-supply-v2/.env.example
/home/user/promo-supply-v2/.github/workflows/ci.yml
/home/user/promo-supply-v2/.github/workflows/main.yml
/home/user/promo-supply-v2/deploy_edge_functions_promo_supply.sh
/home/user/promo-supply-v2/package.json
/home/user/promo-supply-v2/supabase/config.toml
/home/user/promo-supply-v2/src/components/compras/ContractDetailsModal.tsx
/home/user/promo-supply-v2/src/pages/admin/AlertDetail.tsx
/home/user/promo-supply-v2/src/pages/admin/HealthDashboard.tsx
/home/user/promo-supply-v2/src/tests/fuzzing/edge-functions.test.ts
/home/user/promo-supply-v2/supabase/migrations/20260402113249_b5e59bf9-8946-423d-8295-96738436f121.sql
/home/user/promo-supply-v2/supabase/migrations/20260402114640_da3f3e68-f49b-4af1-8a41-32869d820cda.sql
/home/user/promo-supply-v2/supabase/migrations/20260507194402_b30cf397-f164-4a9e-b0d1-bbe8d1ecc990.sql
/home/user/promo-supply-v2/supabase/migrations/20260513191456_ed2c760f-4644-4fc0-8822-bbc2306bf219.sql
/home/user/promo-supply-v2/supabase/migrations/20260531125027_8ce8e485-e1fa-4ff6-99d5-57dad22363eb.sql
/home/user/promo-supply-v2/supabase/migrations/20260711153258_f292f3e6-aff3-4382-9b85-99a3edd5224b.sql
/home/user/promo-supply-v2/supabase/migrations/20260712203402_8caedee0-72c7-46f6-a9de-d05ff1d8446b.sql
/home/user/promo-supply-v2/supabase/migrations/20260712212439_404b97e1-f9e2-43cd-8e71-1f2a8b0a3adf.sql
/home/user/promo-supply-v2/supabase/migrations/20260712212629_45959fd5-cf7e-40d8-812a-31d376153f29.sql
/home/user/promo-supply-v2/supabase/migrations/20260712212852_a41e3a17-0990-4bb9-9c19-2bf3ac217e5e.sql
/home/user/promo-supply-v2/supabase/migrations/20260719000002_cron_heartbeats.sql
/home/user/promo-supply-v2/supabase/migrations/20260719000004_partition_maintenance.sql
/home/user/promo-supply-v2/supabase/migrations/20260726150655_1f9cbe7a-16a8-4845-905b-e2a4f3e0848e.sql
/home/user/promo-supply-v2/supabase/migrations/20260726151043_a116a5d7-40e9-4e45-8824-3ad60a74dacc.sql
