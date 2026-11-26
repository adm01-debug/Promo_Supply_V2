# Edge Functions

URL base: `https://lmypcdfsrgfftzhxawao.supabase.co/functions/v1/<slug>`. Metadados por função em `edge-functions/<slug>/README.md`. A Management API devolve só o bundle compilado; o fonte canônico é `supabase/functions/<slug>/` no repo.

| slug | nome | status | versão | verify_jwt | entrypoint |
|---|---|---|---|---|---|
| ai-demand-prediction | ai-demand-prediction | ACTIVE | 37 | sim | file:///home/runner/work/Promo_Supply_V2/Promo_Supply_V2/supabase/functions/ai-demand-prediction/index.ts |
| ai-negotiation | ai-negotiation | ACTIVE | 37 | sim | file:///home/runner/work/Promo_Supply_V2/Promo_Supply_V2/supabase/functions/ai-negotiation/index.ts |
| ai-supplier-risk | ai-supplier-risk | ACTIVE | 33 | sim | file:///home/runner/work/Promo_Supply_V2/Promo_Supply_V2/supabase/functions/ai-supplier-risk/index.ts |
| ai-supplier-suggestion | ai-supplier-suggestion | ACTIVE | 37 | sim | file:///home/runner/work/Promo_Supply_V2/Promo_Supply_V2/supabase/functions/ai-supplier-suggestion/index.ts |
| alert-dispatcher | alert-dispatcher | ACTIVE | 31 | sim | file:///home/runner/work/Promo_Supply_V2/Promo_Supply_V2/supabase/functions/alert-dispatcher/index.ts |
| check-approval-escalations | check-approval-escalations | ACTIVE | 35 | sim | file:///home/runner/work/Promo_Supply_V2/Promo_Supply_V2/supabase/functions/check-approval-escalations/index.ts |
| check-cotacao-followup | check-cotacao-followup | ACTIVE | 35 | sim | file:///home/runner/work/Promo_Supply_V2/Promo_Supply_V2/supabase/functions/check-cotacao-followup/index.ts |
| check-expiry-alerts | check-expiry-alerts | ACTIVE | 33 | sim | file:///home/runner/work/Promo_Supply_V2/Promo_Supply_V2/supabase/functions/check-expiry-alerts/index.ts |
| check-sla-alerts | check-sla-alerts | ACTIVE | 35 | sim | file:///home/runner/work/Promo_Supply_V2/Promo_Supply_V2/supabase/functions/check-sla-alerts/index.ts |
| dependency-health | dependency-health | ACTIVE | 41 | não | file:///home/runner/work/Promo_Supply_V2/Promo_Supply_V2/supabase/functions/dependency-health/index.ts |
| erp-credential-encrypt | erp-credential-encrypt | ACTIVE | 14 | sim | file:///home/runner/work/Promo_Supply_V2/Promo_Supply_V2/supabase/functions/erp-credential-encrypt/index.ts |
| erp-sync | erp-sync | ACTIVE | 35 | sim | file:///home/runner/work/Promo_Supply_V2/Promo_Supply_V2/supabase/functions/erp-sync/index.ts |
| escalate-solicitacao | escalate-solicitacao | ACTIVE | 14 | sim | file:///home/runner/work/Promo_Supply_V2/Promo_Supply_V2/supabase/functions/escalate-solicitacao/index.ts |
| external-db-bridge | external-db-bridge | ACTIVE | 33 | sim | file:///home/runner/work/Promo_Supply_V2/Promo_Supply_V2/supabase/functions/external-db-bridge/index.ts |
| fiscal-orchestrator | fiscal-orchestrator | ACTIVE | 36 | sim | file:///home/runner/work/Promo_Supply_V2/Promo_Supply_V2/supabase/functions/fiscal-orchestrator/index.ts |
| generate-contract-pdf | generate-contract-pdf | ACTIVE | 31 | sim | file:///home/runner/work/Promo_Supply_V2/Promo_Supply_V2/supabase/functions/generate-contract-pdf/index.ts |
| guided-buying-ai | guided-buying-ai | ACTIVE | 37 | sim | file:///home/runner/work/Promo_Supply_V2/Promo_Supply_V2/supabase/functions/guided-buying-ai/index.ts |
| health-dashboard | health-dashboard | ACTIVE | 21 | sim | file:///home/runner/work/Promo_Supply_V2/Promo_Supply_V2/supabase/functions/health-dashboard/index.ts |
| maintain-partitions | maintain-partitions | ACTIVE | 32 | sim | file:///home/runner/work/Promo_Supply_V2/Promo_Supply_V2/supabase/functions/maintain-partitions/index.ts |
| migrate-storage-paths | migrate-storage-paths | ACTIVE | 27 | sim | file:///home/runner/work/Promo_Supply_V2/Promo_Supply_V2/supabase/functions/migrate-storage-paths/index.ts |
| process-invoice-idp | process-invoice-idp | ACTIVE | 32 | sim | file:///home/runner/work/Promo_Supply_V2/Promo_Supply_V2/supabase/functions/process-invoice-idp/index.ts |
| process-outbox | process-outbox | ACTIVE | 25 | não | file:///home/runner/work/Promo_Supply_V2/Promo_Supply_V2/supabase/functions/process-outbox/index.ts |
| process-solicitacao-neural | process-solicitacao-neural | ACTIVE | 25 | sim | file:///home/runner/work/Promo_Supply_V2/Promo_Supply_V2/supabase/functions/process-solicitacao-neural/index.ts |
| punchout-encrypt | punchout-encrypt | ACTIVE | 22 | sim | file:///home/runner/work/Promo_Supply_V2/Promo_Supply_V2/supabase/functions/punchout-encrypt/index.ts |
| punchout-receive | punchout-receive | ACTIVE | 38 | não | file:///home/runner/work/Promo_Supply_V2/Promo_Supply_V2/supabase/functions/punchout-receive/index.ts |
| punchout-setup | punchout-setup | ACTIVE | 27 | sim | file:///home/runner/work/Promo_Supply_V2/Promo_Supply_V2/supabase/functions/punchout-setup/index.ts |
| receive-os-sync | receive-os-sync | ACTIVE | 21 | não | file:///home/runner/work/Promo_Supply_V2/Promo_Supply_V2/supabase/functions/receive-os-sync/index.ts |
| run-audit | run-audit | ACTIVE | 29 | não | file:///home/runner/work/Promo_Supply_V2/Promo_Supply_V2/supabase/functions/run-audit/index.ts |
| scim-v2 | scim-v2 | ACTIVE | 41 | não | file:///home/runner/work/Promo_Supply_V2/Promo_Supply_V2/supabase/functions/scim-v2/index.ts |
| send-push-notification | send-push-notification | ACTIVE | 36 | sim | file:///home/runner/work/Promo_Supply_V2/Promo_Supply_V2/supabase/functions/send-push-notification/index.ts |
| spot-api | spot-api | ACTIVE | 33 | não | file:///home/runner/work/Promo_Supply_V2/Promo_Supply_V2/supabase/functions/spot-api/index.ts |
| spot-proxy | spot-proxy | ACTIVE | 32 | sim | file:///home/runner/work/Promo_Supply_V2/Promo_Supply_V2/supabase/functions/spot-proxy/index.ts |
| system-simulation | system-simulation | ACTIVE | 34 | não | file:///home/runner/work/Promo_Supply_V2/Promo_Supply_V2/supabase/functions/system-simulation/index.ts |
| telemetry | telemetry | ACTIVE | 35 | não | file:///home/runner/work/Promo_Supply_V2/Promo_Supply_V2/supabase/functions/telemetry/index.ts |
| webauthn-authenticate | webauthn-authenticate | ACTIVE | 33 | não | file:///home/runner/work/Promo_Supply_V2/Promo_Supply_V2/supabase/functions/webauthn-authenticate/index.ts |
| webauthn-register | webauthn-register | ACTIVE | 26 | sim | file:///home/runner/work/Promo_Supply_V2/Promo_Supply_V2/supabase/functions/webauthn-register/index.ts |
| weekly-report | weekly-report | ACTIVE | 32 | sim | file:///home/runner/work/Promo_Supply_V2/Promo_Supply_V2/supabase/functions/weekly-report/index.ts |
| weekly-summary-report | weekly-summary-report | ACTIVE | 32 | sim | file:///home/runner/work/Promo_Supply_V2/Promo_Supply_V2/supabase/functions/weekly-summary-report/index.ts |
| workflow-engine | workflow-engine | ACTIVE | 37 | sim | file:///home/runner/work/Promo_Supply_V2/Promo_Supply_V2/supabase/functions/workflow-engine/index.ts |
| xbz-proxy | xbz-proxy | ACTIVE | 33 | sim | file:///home/runner/work/Promo_Supply_V2/Promo_Supply_V2/supabase/functions/xbz-proxy/index.ts |
| xbz-sync-pedidos | xbz-sync-pedidos | ACTIVE | 33 | sim | file:///home/runner/work/Promo_Supply_V2/Promo_Supply_V2/supabase/functions/xbz-sync-pedidos/index.ts |


## Secrets (apenas nomes)

| nome |
|---|
| CRON_SECRET |
| OPENROUTER_API_KEY |
| PROMO_CHAMPIONS_WEBHOOK_SECRET |
| PROMO_DESIGN_WEBHOOK_SECRET |
| PSV2_ENCRYPTION_KEY |
| SCIM_BEARER_TOKEN |
| SPOT_API_ACCESS_KEY |
| SPOT_CRON_KEY |
| SUPABASE_ANON_KEY |
| SUPABASE_DB_URL |
| SUPABASE_JWKS |
| SUPABASE_PUBLISHABLE_KEYS |
| SUPABASE_SECRET_KEYS |
| SUPABASE_SERVICE_ROLE_KEY |
| SUPABASE_URL |
| VAPID_PRIVATE_KEY |
| VAPID_PUBLIC_KEY |
| XBZ_ENCRYPTION_KEY |
