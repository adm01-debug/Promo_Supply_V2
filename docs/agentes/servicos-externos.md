# Serviços externos — referência para agentes

Ler quando mexer em qualquer edge function que fale com fora, ou quando uma integração "não funciona".
Nomes de variável abaixo; **valores só em `supabase secrets` / secret do GitHub**, nunca no repo.

| Integração | Edges | Fala com | Configuração |
|---|---|---|---|
| **XBZ** (catálogo e pedidos de fornecedor) | `xbz-proxy`, `xbz-sync-pedidos` | `https://api.minhaxbz.com.br:5001` (base fixa em `supabase/functions/_shared/xbz_client.ts:18`) | credenciais ficam **no banco, cifradas** com `XBZ_ENCRYPTION_KEY` (`_shared/xbz_crypto.ts:18-20`); autenticação em `_shared/xbz_auth.ts`; cache em `_shared/xbz_catalog_cache.ts` |
| **Spot Gifts (API)** | `spot-api` | `https://ws.spotgifts.com.br/api/v1` | `SPOT_API_BASE_URL`, `SPOT_API_ACCESS_KEY`, `SPOT_CRON_KEY` |
| **Spot Gifts (portal)** | `spot-proxy` | `https://www.spotgifts.com.br` (login no portal) | `SPOT_USERNAME`, `SPOT_PASSWORD` |
| **Banco externo (ponte)** | `external-db-bridge` | outro Postgres/Supabase | `EXTERNAL_DB_URL`, `EXTERNAL_DB_KEY`; **allowlist** de tabelas/RPC em `_shared/external-bridge-allowlist.ts` — tabela fora da lista é recusada por design, não é bug |
| **IA** | `ai-demand-prediction`, `ai-negotiation`, `ai-supplier-risk`, `ai-supplier-suggestion`, `guided-buying-ai` | AI Gateway da Lovable, `https://ai.gateway.lovable.dev/v1/chat/completions` (`_shared/ai_gateway.ts:12`) | `LOVABLE_API_KEY` |
| **SEFAZ / fiscal** | `fiscal-orchestrator`, `process-invoice-idp` | SEFAZ | `SEFAZ_API_TOKEN`, `SEFAZ_WEBHOOK_URL` |
| **E-mail e Slack** | `alert-dispatcher`, `weekly-report`, `weekly-summary-report`, `check-*` | Resend e Slack | `RESEND_API_KEY`, `ALERT_EMAIL_FROM`, `SLACK_WEBHOOK_URL`, `APP_URL` |
| **Punchout (e-procurement)** | `punchout-setup`, `punchout-receive` | cXML do cliente | sessão/credencial vêm do banco; `punchout-receive` roda **sem verificação de JWT** |
| **ERP do cliente** | `erp-sync` | endpoint lido da tabela `erp_connections` (`erp-sync/index.ts:60`), log em `erp_sync_log` (`:79`) | sem env própria |
| **Provedor de identidade** | `scim-v2` | SCIM 2.0 | `SCIM_TEST_BASE_URL`, `SCIM_TEST_TOKEN` (só teste de conformidade) |
| **Passkeys / WebAuthn** | `webauthn-register`, `webauthn-authenticate` | o navegador (sem terceiro) | `SUPABASE_URL`, `SUPABASE_ANON_KEY`. **`ESTADO_ATUAL.md` aponta falha crítica de bypass de autenticação aqui**, hoje não explorável porque ninguém registrou passkey — leia antes de mexer |
| **GitHub (dispatch)** | `dependency-health`, `run-audit` | API do GitHub | `GITHUB_DISPATCH_TOKEN`, `GITHUB_REPO_RAW_BASE` |
| **Bitrix24** | — | CRM Bitrix24 | `VITE_BITRIX_WEBHOOK_URL` em `.env.example:11` e **zero leituras no código**: integração declarada, nunca implementada. Não trate como existente |

## Padrões compartilhados (`supabase/functions/_shared/`)

- **Não há `auth.ts` nem `cors.ts`.** O que existe é `_shared/security.ts`: `buildCorsHeaders`/`corsHeaders`
  (`:50,71`, com `ALLOWED_ORIGINS`), `validateAuth` (`:84`), `getAuthUser` (`:133`), `getTenantId` (`:154`),
  `verifyCronSecret` (`:192`, header `Authorization: Bearer <CRON_SECRET>`), `requireAdmin` (`:224`).
  Edge nova usa esses helpers — não reimplemente CORS nem checagem de tenant.
- Resiliência já pronta: `retry.ts`, `circuit_breaker.ts`, `rate_limit.ts`, `idempotency.ts`,
  `validation.ts`, `logger.ts` (+ `logLevel.ts`), `telemetry.ts`, `contracts.ts`, `cronHealth.ts`.
- Testes Deno das edges rodam no CI com `deno test --allow-net --allow-env --allow-read supabase/functions/`
  (`main.yml:59`). `supabase/functions/tests/fuzzing_suite.ts` e `integration_suite.ts` **não** são
  reconhecidos como teste pelo Deno (nome fora de `*_test.ts`/`*.test.ts`) — não contam como cobertura.
- Chamada de edge pelo front: `functions.invoke` / `invokeEdge` / `fetch /functions/v1/<edge>`;
  quem invoca cada uma está em `inventario/estado/edges.json` (gerado), com os segredos que cada uma lê.
