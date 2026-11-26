# 10. Testes e CI/CD

## Pirâmide de testes

```text
   E2E (Playwright)  ─ tests-e2e/*.spec.ts
   RLS (Vitest)      ─ tests-rls/*.test.ts
   Integração        ─ src/tests/integration/*
   Unit (Vitest+RTL) ─ src/**/__tests__/*
   Edge (Deno test)  ─ supabase/functions/**/*.test.ts
```

## Unit + Component (Vitest + React Testing Library)
- Setup: `src/test/setup.ts`, config `vitest.config.ts`.
- Exemplos:
  - `src/features/auth/__tests__/useAuth.test.tsx`
  - `src/features/solicitacoes/hooks/__tests__/useSolicitacoes.test.tsx`
  - `src/hooks/__tests__/usePermissions.test.tsx`, `useImageCompression.test.ts`
- Padrão: `userEvent.setup()`, `vi.fn()` para mocks, `vi.mock('@/integrations/supabase/client')`.

## Integração / contratos
- `src/tests/contracts.test.ts`, `contracts-elite.test.ts` — validam `FunctionContracts` Zod × payloads reais.
- `src/tests/integration/contract-testing.test.ts`, `contract-validation.test.ts`, `core-integrity.test.ts`.
- `src/tests/fuzzing/edge-functions.test.ts`, `payload-integrity.test.ts` — payloads mutados via `PayloadFuzzer`.
- `src/tests/load/backend-stress.yml` — perfil de stress (artillery-style).

## RLS
- `tests-rls/rls-isolation.test.ts` — cria dois usuários em tenants diferentes e valida isolamento em todas as tabelas críticas.
- Config: `vitest.rls.config.ts`.

## E2E (Playwright)
Diretório `tests-e2e/`:
- `auth-navigation.spec.ts` — login/logout, rotas protegidas.
- `critical-flows.spec.ts` — solicitação → cotação → pedido → pagamento.
- `dashboard-ui.spec.ts` — dashboards executivo/compras.
- `elite-validation.spec.ts`, `production-ready.spec.ts`, `workflow-advanced.spec.ts`.

Config: `playwright.config.ts` — sobe Vite localmente antes de rodar.

## Edge (Deno)
- `supabase/functions/dependency-health/index.test.ts`
- `supabase/functions/run-audit/rls_test.ts`
- `supabase/functions/workflow-engine/fuzz.test.ts`
- `supabase/functions/tests/fuzzing_suite.ts`, `integration_suite.ts`

Ferramenta: `supabase--test_edge_functions` no dev flow.

## Scripts auxiliares (`scripts/`)
- `db-explain-analyze.ts` — plano de execução de queries suspeitas.
- `realtime-audit.ts` — audita canais Realtime.
- `rls-audit.ts` — snapshot local de policies vs. esperadas.
- `stress-test.ts` — carrega edges/API.
- `validate-bridge.ts` — valida `external-db-bridge` contra allowlist.

## Pipeline CI (`.github/workflows/ci.yml`)
Ordem:
1. Lint (ESLint) + type-check (`tsgo`).
2. Unit tests (Vitest).
3. Contracts (Zod × edge functions).
4. RLS (`vitest.rls.config.ts`).
5. Build de dev + preview (Vite).
6. E2E Playwright.
7. Upload artefatos: `playwright-report/` (retenção 30 dias), logs.
8. Falha o build em qualquer erro; bloqueia merge.

Workflow adicional: `.github/workflows/main.yml`.

## Contratos com o banco
Toda alteração de schema deve:
- Vir em migration versionada.
- Incluir `GRANT` correspondente (ver doc 08).
- Ter RLS + policies.
- Ser refletida em `src/integrations/supabase/types.ts` (auto-gerado — nunca editar à mão).

## Cobertura desejada (metas)
- Fluxos P1 (auth, RLS, CRUD principal) — 100%.
- Formulários (Zod, error handling) — 100%.
- Animações/acessibilidade — cobertura por Playwright + testes visuais.
