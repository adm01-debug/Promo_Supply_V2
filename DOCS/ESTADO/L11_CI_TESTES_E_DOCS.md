# L11 — CI, Testes e Auditoria da Documentação

> ## ⚠️ ERRATA DO AGENTE COORDENADOR — leia antes do relatório
>
> Duas afirmações deste documento nasceram de **premissas erradas que eu, agente coordenador,
> repassei no briefing**. O relatório original está preservado abaixo, sem edição do corpo. As
> correções são estas:
>
> ### Errata 1 — a linha "Type-check no CI ✅ IMPLEMENTADO_TOTAL" está ERRADA
>
> Eu informei a este lote que *"`tsc --noEmit` passa limpo"*, e ele corretamente registrou o
> que recebeu. **O fato estava errado.**
>
> `tsconfig.json` declara `"files": []` com *project references*. Sem `--build`, o `tsc`
> **não segue as referências** e typecheca **zero arquivos**. Medido com `--listFiles`:
>
> | Comando | Arquivos de `src/` verificados | Resultado |
> |---|---|---|
> | `tsc --noEmit` (o que o CI roda) | **0** | exit 0, vazio |
> | `tsc --noEmit -p tsconfig.app.json` | **592** | **8 erros** |
>
> **Classificação correta: ⬛ MORTO_OU_ABANDONADO** — o gate de tipos é um no-op que passa verde
> em toda execução, nos dois workflows (`ci.yml:29-30`, `main.yml:22-23`). Isso **reforça** a tese
> central deste documento ("CI que mente") em vez de contradizê-la: são **três** gates falsos
> (tipos, RLS audit, carga), não dois. Detalhamento em `L14_VERIFICACAO_INDEPENDENTE.md`.
>
> ### Errata 2 — são 3 falhas determinísticas + 1 flaky, não 4 fixas
>
> Eu informei *"4 testes falharam"* a partir de **uma única execução**. Reexecutei: o arquivo
> isolado dá **3 falhas** de forma idêntica em 3 rodadas, e a suíte completa reexecutada dá
> **3 failed | 2242 passed**. A 4ª falha (*"Aborting after running 10000 timers"*) apareceu só na
> primeira execução — é **flaky**, dependente de ordem/tempo.
>
> Onde este documento diz "4 falham", leia **"3 falham deterministicamente + 1 flaky"**. O
> diagnóstico de causa-raiz que o lote fez (mock sem `auth`, `catch` engolindo o `TypeError`)
> **está correto e foi confirmado** por mim independentemente.
>
> — *Fim da errata. O relatório original começa aqui.*

---


> Auditoria de estado. Princípio: **medir, não confiar**. Tudo abaixo foi verificado no repositório
> em `/home/user/promo-supply-v2`. Onde não pude medir (execuções reais do GitHub Actions, estado do
> banco de produção), a linha está marcada `NAO_VERIFICADO (runtime)`.
>
> Comandos efetivamente executados nesta auditoria: `npx eslint .` (exit 1),
> `npx vitest run src/lib/__tests__/logger.fuzz.test.ts` (exit 1), além de `find`/`grep`/`wc`
> sobre a árvore. Os números globais do Vitest (2241 pass / 4 fail / 12 skip) vêm da medição do
> agente principal e foram reconciliados com a árvore real (101 arquivos de teste em `src/`).

---

## Resumo

**18 capacidades de infra/qualidade avaliadas.**

| Classificação | Qtd | Denominador |
|---|---:|---:|
| ✅ IMPLEMENTADO_TOTAL | 1 | 18 |
| 🟨 IMPLEMENTADO_PARCIAL | 7 | 18 |
| 🟦 SUGERIDO_OU_INICIADO | 4 | 18 |
| ⬛ MORTO_OU_ABANDONADO | 6 | 18 |

**Três fatos que dominam este relatório:**

1. **O CI não pode estar verde hoje.** `npx eslint .` retorna **exit code 1** (2 erros
   `@typescript-eslint/ban-ts-comment`). Lint é o **primeiro** passo executável de *ambos* os
   workflows (`ci.yml:27`, `main.yml:20`). O job morre antes de chegar ao teste. E se chegasse,
   morreria de novo: `bun run test` → `vitest run` → exit 1.
2. **Os testes que protegeriam o backend não são executados por runner nenhum.** Há **9 arquivos
   de teste Deno** sob `supabase/functions/` (51 blocos `Deno.test`) que nenhum pipeline alcança, e
   os 2 arquivos que estão no diretório que o CI aponta (`supabase/functions/tests/`) têm nomes que
   **não casam com o padrão de descoberta do `deno test`**.
3. **Existem 4 project IDs de Supabase divergentes no repo**, não 3. O quarto
   (`apuzcrkeqodktmpwobnz`) está em `vite.config.ts` e `index.html` — ou seja, o cache PWA e o
   preconnect apontam para um projeto que a aplicação nunca usa.

---

## Capacidades de infra e qualidade

| Capacidade | Classificação | Evidência (arquivo:linha) | O que falta |
|---|---|---|---|
| Type-check no CI | ✅ IMPLEMENTADO_TOTAL | `package.json:21` (`tsc --noEmit`); `ci.yml:29-30`; `main.yml:22-23`; medição do principal: passa limpo | nada |
| Lint no CI | 🟨 IMPLEMENTADO_PARCIAL | `package.json:11` (`eslint .`); `ci.yml:26-27`; `main.yml:20-21`. **Medido: exit 1, 2 erros** | corrigir os 2 `@ts-ignore`; `eslint.config.js:8` ignora `supabase/functions` e `tests-e2e` inteiros; sem `--max-warnings 0` |
| Testes unitários (Vitest) | 🟨 IMPLEMENTADO_PARCIAL | `vitest.config.ts:12-14`; 101 arquivos em `src/`; 2241 passam, **4 falham** em `src/lib/__tests__/logger.fuzz.test.ts` | consertar o mock incompleto (ver "Achados graves" #3) |
| Cobertura de teste medida | 🟦 SUGERIDO_OU_INICIADO | `vitest.config.ts:25-35` (provider v8); `package.json:18` (`test:coverage`) | **nenhum workflow roda `test:coverage`**; sem `thresholds` — cobertura nunca é gate |
| Testes de contrato edge×frontend | ⬛ MORTO_OU_ABANDONADO | `src/tests/contracts.test.ts:12-21`, `contracts-elite.test.ts:18-57` — redefinem os schemas localmente; **nunca importam** `supabase/functions/_shared/contracts.ts` | importar o alvo real (via alias, como já é feito em `src/tests/spot/spotApi.test.ts:1`) |
| Testes de fuzzing (Vitest) | ⬛ MORTO_OU_ABANDONADO | `src/tests/fuzzing/edge-functions.test.ts:23-38` e `payload-integrity.test.ts:4-9` — fuzzam validadores definidos dentro do próprio teste | usar `_shared/fuzzer.ts::PayloadFuzzer` de verdade |
| Testes Deno de edge functions | ⬛ MORTO_OU_ABANDONADO | `main.yml:55` roda `deno test ... supabase/functions/tests/`; esse dir só tem `fuzzing_suite.ts` e `integration_suite.ts` (nomes fora do padrão `*_test.ts`/`*.test.ts`) | renomear os suites e/ou apontar o `deno test` para `supabase/functions/` |
| Testes de integração com Supabase real | 🟦 SUGERIDO_OU_INICIADO | `src/tests/integration/supabase-db.test.ts:21-22` (`describe.skip` sem `INTEGRATION_TESTS=true`) — os 12 testes skipped medidos são estes | nenhum workflow define `INTEGRATION_TESTS` |
| E2E (Playwright) | 🟨 IMPLEMENTADO_PARCIAL | `playwright.config.ts:1-21`; `ci.yml:45-51`; `main.yml:76-80`. Único spec sólido: `tests-e2e/xbz-network-panel.spec.ts` | maioria dos asserts é guardada por `if (await x.isVisible())` ou early-return — ver tabela seguinte |
| RLS regression (Vitest) | 🟨 IMPLEMENTADO_PARCIAL | `tests-rls/rls-isolation.test.ts:51-90` (bloco anon, real e útil); `:99` `describe.runIf(!!USER_A && !!USER_B)` dormente | secrets `RLS_TEST_USER_A/B` inexistentes — admitido em `DOCS/MELHORIAS_PENDENTES.md:66` |
| Teste de carga (Artillery) | 🟨 IMPLEMENTADO_PARCIAL | `src/tests/load/backend-stress.yml:2` — target **hardcoded** `trwgmplubeqxrxpncdgf`; `ci.yml:61-66` | config não tem bloco `ensure`/threshold → **não pode reprovar o build**; ignora o env `SUPABASE_URL` que o CI passa |
| Auditoria de RLS por script no CI | ⬛ MORTO_OU_ABANDONADO | `main.yml:26-31` roda `scripts/rls-audit.ts` **sem bloco `env:`**; `scripts/rls-audit.ts:13-16` faz `process.exit(0)` quando faltam as vars | passo é garantidamente no-op verde |
| Benchmark EXPLAIN ANALYZE | 🟦 SUGERIDO_OU_INICIADO | `scripts/db-explain-analyze.ts` existe; **zero referências** em `ci.yml`/`main.yml`/`package.json` | nenhum pipeline o executa (contradiz `MELHORIAS_PENDENTES.md:82`) |
| Auditoria Realtime | 🟦 SUGERIDO_OU_INICIADO | `scripts/realtime-audit.ts` existe; zero referências em CI/`package.json` | idem (contradiz `MELHORIAS_PENDENTES.md:83`) |
| Build no CI | ⬛ MORTO_OU_ABANDONADO | `package.json:8-9` tem `build`/`build:dev`; **nenhum passo de build** em `ci.yml` nem em `main.yml` | um `bun run build` quebrado nunca seria detectado pelo CI |
| Deploy automatizado | ⬛ MORTO_OU_ABANDONADO | Nenhum passo de deploy nos 2 workflows; nenhum `vercel.json`/`netlify.toml`/`Dockerfile`. Só `deploy_edge_functions_promo_supply.sh` (bash manual) | ver "Achados graves" #5 (o script sempre reporta sucesso) |
| Backup | 🟦 SUGERIDO_OU_INICIADO | `DOCS/BACKUP_STRATEGY.md:40-41` — "`scripts/backup-db.sh` (to be created)"; confirmado inexistente | o próprio doc lista os gaps em §9 — **doc honesto** |
| Observabilidade / telemetria frontend | 🟨 IMPLEMENTADO_PARCIAL | `src/lib/logger.ts:77-133` (batch + rate-limit + redação em `:135-148`) — implementado de verdade | o teste que o protege (`logger.fuzz.test.ts:144-181`) está vermelho → redação de segredos **não está sendo verificada hoje** |

---

## Testes que NÃO protegem (espelho, skip, vacuamente verdadeiro, sem runner, alvo inexistente)

### Teste-espelho (reimplementa o alvo em vez de importá-lo)

Verifiquei os imports de **todos os 101** arquivos de teste em `src/`. **96 importam o módulo alvo.**
Os 5 abaixo não importam nada além de `vitest`/`zod` — são autotestes.

| Arquivo de teste | Problema | Evidência (arquivo:linha) |
|---|---|---|
| `src/tests/contracts.test.ts` | **Espelho.** Define `NegotiationContract` localmente e valida contra si mesmo. O comentário admite: *"Estes schemas são definidos localmente ... Os contratos reais em supabase/functions/_shared/contracts.ts usam import Deno."* | `src/tests/contracts.test.ts:7-8` (comentário), `:11` (`// Mirror of NegotiationContract`), `:12-21` (definição local) |
| `src/tests/contracts-elite.test.ts` | **Espelho.** Redefine `ciEnum`, `NegotiationContract`, `WorkflowContract`, `ERPSyncContract`. 8 testes verdes que não tocam o backend | `src/tests/contracts-elite.test.ts:8` (*"Espelham exatamente ..."*), `:12-57` |
| `src/tests/fuzzing/edge-functions.test.ts` | **Espelho puro.** `mockValidator` é definido *dentro* do `it`. 4 endpoints × 5 payloads = **20 testes** que exercitam 13 linhas escritas no próprio arquivo. Os nomes dos endpoints (`ai-negotiation`, `workflow-engine`…) são só strings — nada é invocado | `src/tests/fuzzing/edge-functions.test.ts:23-38` |
| `src/tests/fuzzing/payload-integrity.test.ts` | **Espelho.** `validatePayload` local, 3 testes | `src/tests/fuzzing/payload-integrity.test.ts:4-9` |
| `src/tests/integration/core-integrity.test.ts` | **Espelho + tautologia.** `const isSystemStable = true; expect(isSystemStable).toBe(true)`. Mocka `@supabase/supabase-js` e nunca usa o mock | `src/tests/integration/core-integrity.test.ts:14-18` |
| `src/tests/integration/contract-testing.test.ts`, `contract-validation.test.ts` | **Espelho de segundo grau.** Importam `./shared-schemas`, que é uma **terceira** cópia dos schemas, divergente das outras duas (ex.: `decision: ['approved','rejected','delegated']` vs. `['approve','reject']` em `contracts-elite`) | `src/tests/integration/shared-schemas.ts:15-28` vs. `src/tests/contracts-elite.test.ts:47` |

> **Contraprova (honestidade):** `src/tests/spot/spotApi.test.ts:1` importa
> `../../../supabase/functions/_shared/spot_api` de verdade. Ou seja, o padrão correto **já existe
> no repo** e o alias de zod-Deno já está resolvido em `vitest.config.ts:41`. Os 5 espelhos acima não
> têm desculpa técnica.

### Suíte desligada

| Arquivo de teste | Problema | Evidência (arquivo:linha) |
|---|---|---|
| `src/tests/integration/supabase-db.test.ts` | **Os 12 testes skipped medidos são todos deste arquivo.** `describeIf = INTEGRATION ? describe : describe.skip`. Contagem: schema (4) + stored functions (3) + RLS (2) + integridade (3) = 12 | `src/tests/integration/supabase-db.test.ts:21-22`, blocos em `:54`, `:95`, `:128`, `:164` |
| `tests-rls/rls-isolation.test.ts` (bloco 2) | `describe.runIf(!!USER_A && !!USER_B)` — o bloco mais valioso (regressão "Onda 122", vazamento cross-tenant para role privilegiada) está dormente por falta de secrets | `tests-rls/rls-isolation.test.ts:96-99`, `:158-178` |

Não há nenhum `it.skip`, `test.todo` ou bloco comentado fora destes dois pontos — grep confirmou.

### Asserção vacuamente verdadeira

| Arquivo de teste | Problema | Evidência (arquivo:linha) |
|---|---|---|
| `tests-e2e/dashboard-ui.spec.ts` | **"Mobile Responsiveness Check" nunca executa.** `if (viewport && viewport.width < 768)` — o viewport default do Playwright é 1280×720 e nenhum projeto em `playwright.config.ts:17-20` o altera. Condição sempre falsa → teste verde sem um único assert | `tests-e2e/dashboard-ui.spec.ts:29-35`; `playwright.config.ts:17-20` |
| `tests-e2e/dashboard-ui.spec.ts` | **"Validate presence of KPI cards" não valida nada.** `const count = await kpiCards.count();` seguido de um comentário `// We expect at least some dashboard cards` — o assert nunca foi escrito | `tests-e2e/dashboard-ui.spec.ts:13-16` |
| `tests-e2e/production-ready.spec.ts` | **Assert comentado.** Coleta `logs`, filtra `errors`, e a linha que verificaria está desativada: `// expect(errors.length).toBe(0);` | `tests-e2e/production-ready.spec.ts:52-58` |
| `tests-e2e/workflow-advanced.spec.ts` | `await expect(menuBtn).toBeDefined()` — um `Locator` do Playwright **é sempre** definido; o matcher é síncrono e não faz query no DOM. Nunca falha | `tests-e2e/workflow-advanced.spec.ts:32` |
| `tests-e2e/auth-navigation.spec.ts` | **Assert dentro de listener + `catch` que engole a falha.** Os `expect(json).toHaveProperty(...)` estão num `page.on('request')` cujo corpo é envolvido por `try/catch { }`. Se o request nunca ocorrer (o caso normal sem credenciais), zero asserts rodam; se ocorrer e falhar, a exceção é engolida | `tests-e2e/auth-navigation.spec.ts:55-69` (o `catch (e) {}` em `:64-66`) |
| `tests-e2e/critical-flows.spec.ts` | **Early-return por redirect.** `if (page.url().includes('/auth')) return;` — sem credenciais tudo redireciona para `/auth`, então o teste "Validação de Contratos e Compliance" retorna antes do único assert | `tests-e2e/critical-flows.spec.ts:30` (e o mesmo padrão em `:12-15`) |
| `tests-e2e/critical-flows.spec.ts` | **Tautologia guardada.** `if (await errorFeedback.isVisible()) { await expect(errorFeedback).toBeVisible(); }` — o assert só roda quando já é verdade | `tests-e2e/critical-flows.spec.ts:45-47` |
| `tests-e2e/elite-validation.spec.ts` | **Loop guardado.** `if (await link.isVisible())` — sem sessão não há sidebar, o `for` de 4 módulos não executa nenhuma iteração e o teste passa | `tests-e2e/elite-validation.spec.ts:27-32`; mesmo padrão em `:47-52` |
| `tests-e2e/production-ready.spec.ts` | Guarda `if (await helpLink.isVisible())` no teste "Navigation to Support/Documentation" | `tests-e2e/production-ready.spec.ts:35-37` |
| `tests-e2e/workflow-advanced.spec.ts` | Guarda `if (await addBtn.isVisible())` cobre **todo** o fluxo "Multi-step Solicitation" (preencher, salvar, verificar sucesso) | `tests-e2e/workflow-advanced.spec.ts:10-22` |
| `src/tests/integration/supabase-db.test.ts` | Mesmo se `INTEGRATION_TESTS=true`, os 2 testes de RLS caem em `expect(true).toBe(true); return;` quando falta a anon key | `src/tests/integration/supabase-db.test.ts:133-137` e `:148-152` |
| `tests-rls/rls-isolation.test.ts` | 8 testes do bloco cross-tenant abrem com `if (!tenantB) return;` — passam sem asserts se a query de tenant vier vazia | `tests-rls/rls-isolation.test.ts:130`, `:142`, `:171`, `:181`, `:191` |
| `tests-e2e/global-setup.ts` | O setup de autenticação **degrada em silêncio**: sem env → `return` (linha 21); com env mas login falhando → `catch` que só faz `console.warn`. Em ambos os casos a suíte inteira roda deslogada e as guardas acima transformam isso em verde | `tests-e2e/global-setup.ts:19-22`, `:42-44` |

> **Contraprova (honestidade):** `tests-e2e/xbz-network-panel.spec.ts` é o único E2E que protege
> de verdade — usa um harness determinístico (`/__dev/xbz-network-panel`, rota real em
> `src/routes/AppRoutes.tsx:141`), injeta contadores por query string e faz asserts fortes sobre
> `data-level`, textos e ausência de alerta. Zero guardas condicionais. É o modelo a seguir.

### Sem runner (nenhum pipeline os executa)

| Arquivo de teste | Problema | Evidência (arquivo:linha) |
|---|---|---|
| `supabase/functions/_shared/logLevel.test.ts` (13 `Deno.test`) | Fora de `src/**` → invisível ao Vitest (`vitest.config.ts:12-14`); fora de `supabase/functions/tests/` → invisível ao `deno test` do CI (`main.yml:55`) | `main.yml:55`; `vitest.config.ts:12-14` |
| `supabase/functions/_shared/logger.fuzz.test.ts` (9) | idem | idem |
| `supabase/functions/_shared/xbz_catalog_cache.test.ts` (6) | idem | idem |
| `supabase/functions/dependency-health/index.test.ts` (7) | idem | idem |
| `supabase/functions/run-audit/rls_test.ts` (1) | idem | idem |
| `supabase/functions/scim-v2/conformance.test.ts` (8) | idem | idem |
| `supabase/functions/telemetry/index.test.ts` (5) | idem | idem |
| `supabase/functions/workflow-engine/fuzz.test.ts` (2) | idem — e é o **único** consumidor real de `PayloadFuzzer` em teste | `supabase/functions/workflow-engine/fuzz.test.ts:4,30` |
| `supabase/functions/_shared/integrity_test.ts` | Não usa `Deno.test` (0 ocorrências); é um script, não uma suíte. Também sem runner | — |
| `supabase/functions/tests/fuzzing_suite.ts` (1 `Deno.test`) | **É o único diretório que o CI aponta, e o nome não casa.** `deno test <dir>` só descobre `*_test.*`, `*.test.*` ou `test.*`. `fuzzing_suite.ts` não casa | `main.yml:55` |
| `supabase/functions/tests/integration_suite.ts` (3 `Deno.test`) | idem | `main.yml:55` |
| `scripts/db-explain-analyze.ts`, `scripts/realtime-audit.ts`, `scripts/stress-test.ts`, `scripts/validate-bridge.ts`, `scripts/squash-migrations.sh` | Nenhum é invocado por `ci.yml` ou `main.yml`. Só `validate-bridge` tem um script npm (`package.json:14`), que nenhum job chama | `package.json:14`; grep em `.github/workflows/` |

**Total: 51 blocos `Deno.test` distribuídos em 9 arquivos que nenhum runner alcança.**
`ci.yml` sequer tenta rodar Deno; `main.yml:39-55` tenta e mira no lugar errado.

> Nota: com o diretório-alvo sem módulos casáveis, o `deno test` do `main.yml:55` provavelmente
> aborta com "No test modules found" e **quebra o job** — mas isso é `NAO_VERIFICADO (runtime)`,
> pois não há Deno instalado neste ambiente para confirmar o comportamento exato da versão `v1.x`.

### Alvo inexistente

Não encontrei teste apontando para módulo removido — todos os 101 arquivos de `src/` resolvem seus
imports (coerente com o `tsc --noEmit` limpo). O caso análogo que existe é **código de produção**
chamando função inexistente (ver "Achados graves" #6).

---

## CI que mente

| Problema | Evidência (arquivo:linha) | Consequência |
|---|---|---|
| **Lint está vermelho e é o primeiro gate.** Medi `npx eslint .` → **exit 1**, 2 erros `@typescript-eslint/ban-ts-comment` em `src/hooks/__tests__/useToastReducer.test.ts:143` e `src/lib/__tests__/performance.test.ts:90` | `ci.yml:26-27`; `main.yml:20-21`; `package.json:11` | **Ambos os workflows falham no passo 1.** Nada depois roda. O passo de teste vermelho nem chega a ser alcançado no `ci.yml` (job único e sequencial) |
| **`bun run test` também está vermelho.** 4 falhas em `logger.fuzz.test.ts` (3 reproduzidas isoladamente por mim; a 4ª — "Aborting after running 10000 timers" — só aparece na suíte completa) | `ci.yml:32-33`; `main.yml:46-47`; `src/lib/__tests__/logger.fuzz.test.ts:147,170,180` | Segundo bloqueio independente. Resposta à pergunta do escopo: **o CI está quebrado hoje**, por dois motivos separados, não por algo que o impeça de rodar |
| **Gates `if: secrets.X != ''` — 3 ocorrências.** A doc oficial do GitHub ("Using secrets in GitHub Actions → Limitations") afirma que *secrets não podem ser referenciados diretamente em `if:`*, enquanto a tabela de disponibilidade de contextos lista `secrets` para `steps[*].if`. Não consigo arbitrar isso sem executar | `ci.yml:37` (RLS), `ci.yml:63` (carga), `ci.yml:70` (contrato edge) | Qual dos 3 comportamentos ocorre é `NAO_VERIFICADO (runtime)`, mas **a conclusão é robusta nos três casos**: (a) se avalia, os secrets estão ausentes (`MELHORIAS_PENDENTES.md:66` admite) → skip; (b) se é sempre falso → skip; (c) se é inválido → o workflow inteiro não parseia. Em nenhum cenário esses gates protegem |
| **"Security RLS Audit" é garantidamente no-op.** O passo roda `bun run scripts/rls-audit.ts` **sem nenhum bloco `env:`**; o script sai com `process.exit(0)` quando faltam `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` | `main.yml:26-31` (sem `env:`); `scripts/rls-audit.ts:10-16` | O job se chama "Quality Gate (Lint, Typecheck, **RLS Audit**)" e o terceiro termo é decorativo. Passa verde 100% das vezes |
| **Teste de carga não pode reprovar nada.** `backend-stress.yml` não tem bloco `ensure`/threshold; Artillery sai 0 mesmo com 100% de 401 | `src/tests/load/backend-stress.yml:1-32`; `ci.yml:61-66` | Passo roda (quando roda) e o resultado não bloqueia |
| **Teste de carga aponta para o projeto errado, ignorando o secret.** O CI exporta `SUPABASE_URL` no `env:` do passo, mas o `target` do Artillery é literal | `ci.yml:64-66` (`env: SUPABASE_URL`) vs. `src/tests/load/backend-stress.yml:2` (`trwgmplubeqxrxpncdgf` hardcoded) | Mesmo com secrets corretos, a carga bateria no projeto de `config.toml`, não no de `.env` |
| **Suíte RLS cai em credencial hardcoded.** Se o `if` do passo passar mas `secrets.SUPABASE_URL` estiver vazio, `VITE_SUPABASE_URL` vira `''` e o teste usa o fallback literal | `ci.yml:39-40`; `tests-rls/rls-isolation.test.ts:17-21` | O "teste de RLS de produção" pode estar auditando outro projeto Supabase |
| **Dois workflows disputam o mesmo push.** `ci.yml:4-5` dispara em `main`+`master`; `main.yml:4-5` em `main`+`develop`. Em `push:main` **os dois rodam** | `ci.yml:3-7`; `main.yml:3-7` | Duplicação de `bun install`, lint, typecheck, `bun run test`, Playwright + download de browsers. Nenhum tem bloco `concurrency:` → runs empilham |
| **…e divergem no que cobrem.** `ci.yml` tem RLS + carga + contrato edge, e **não** tem Deno nem rls-audit. `main.yml` tem Deno + rls-audit, e **não** tem RLS/carga/contrato | `ci.yml:35-79` vs. `main.yml:26-55` | Nenhum dos dois é "o" pipeline. Um PR para `develop` roda um conjunto de checks; para `master`, outro |
| **Nenhum build.** Não existe `bun run build` em nenhum dos dois workflows | `.github/workflows/*.yml` (grep); `package.json:8-9` | Uma quebra de build de produção (ex.: um plugin PWA mal configurado) passa pelo CI intacta |
| **Nenhum deploy.** Zero passos de deploy; zero `vercel.json`/`netlify.toml`/`Dockerfile` | `.github/workflows/*.yml`; raiz do repo | Deploy é 100% manual — ver "Achados graves" #5 |
| **`bun install` sem `--frozen-lockfile`, em ambos** | `ci.yml:24`; `main.yml:18,44,71` | Drift de lockfile não é detectado. Agravante: há **3 lockfiles versionados** (`bun.lock`, `bun.lockb`, `package-lock.json`) |
| **Runtime não pinado.** `main.yml:15,38,68` usa `oven-sh/setup-bun@v1` sem `with:`; `ci.yml:19-21` pede `bun-version: latest` | `ci.yml:19-21`; `main.yml:15` | Build não é reprodutível; um release do Bun pode quebrar o CI sem nenhum commit |
| **ESLint não vê o backend nem o E2E** | `eslint.config.js:8` — `ignores: ["dist","tests-e2e","playwright.config.ts","supabase/functions","coverage"]` | O passo "Linting" do CI não olha uma linha das 36 edge functions nem dos 9 specs Playwright |
| **Regras que pegariam exatamente estes bugs estão desligadas** | `eslint.config.js:22-24` (`no-unused-vars: off`, `@typescript-eslint/no-unused-expressions: off`), `:20,32` (`no-explicit-any` e `exhaustive-deps` só `warn`) | `no-unused-expressions` é a regra que sinalizaria `const count = await kpiCards.count()` sem uso e asserts pendurados. Está off |
| **`.env` versionado e ausente do `.gitignore`** | `git ls-files` retorna `.env`; `.gitignore` não tem entrada `.env` | Hoje só contém project id + anon key (públicos), mas qualquer segredo futuro colocado ali vai para o Git por default |
| Conclusão real dos checks no GitHub | — | `NAO_VERIFICADO (runtime)` — não tenho acesso ao histórico do Actions. Tudo acima é análise de YAML + medição local |

---

## Documentação × realidade

Amostrei **483 caminhos de arquivo** citados em `DOCS/`, `docs/` e `README.md` e verifiquei **um a um**
com `test -e`. Resultado que merece crédito: **apenas 1 é uma citação genuinamente quebrada**
(`DOCS/ADR/README.md`). Outros 18 "inexistentes" são, na verdade, honestos: 6 são specs
explicitamente rotulados "planejados" (`AUDITORIA_QA_2026Q3.md:74-80`), 1 é declarado "to be created"
(`BACKUP_STRATEGY.md:41`), 10 são o **lado-destino** de migrações pendentes num documento que os
rotula como "Existing Violations (tracked for migration)" (`DOCS/conventions/pages-directory.md:22-34`),
e 1 é um caminho elidido com `...`.

**A fabricação nesta base não está nos caminhos — está nos identificadores e nas descrições de
comportamento.** Abaixo, 27 afirmações verificáveis.

| Documento | Afirmação | Verdadeiro? | Evidência da verificação |
|---|---|---|---|
| `CODEBASE_ATLAS/10_TESTES_CI.md:57` | "Lint (ESLint) + type-check (**`tsgo`**)" | ❌ NÃO | `package.json:21` usa `tsc --noEmit`. `tsgo` não aparece em nenhum lugar fora de 3 linhas de DOCS. Ferramenta inventada |
| `CODEBASE_ATLAS/10_TESTES_CI.md:22` | "`contracts.test.ts`, `contracts-elite.test.ts` — validam **`FunctionContracts`** Zod × payloads reais" | ❌ NÃO | Nenhum dos 2 arquivos importa nada além de `vitest` e `zod`. `FunctionContracts` existe só em `supabase/functions/_shared/contracts.ts:124` e é usado apenas por `tests/fuzzing_suite.ts:4` e `_shared/integrity_test.ts:2` |
| `CODEBASE_ATLAS/10_TESTES_CI.md:24` | "`src/tests/fuzzing/*` — payloads mutados via **`PayloadFuzzer`**" | ❌ NÃO | Grep de `PayloadFuzzer` em todo o repo: 4 arquivos, **nenhum** em `src/`. Os 2 arquivos citados usam validadores locais |
| `CODEBASE_ATLAS/10_TESTES_CI.md:46` | "Ferramenta: **`supabase--test_edge_functions`** no dev flow" | ❌ NÃO | Zero ocorrências no repo fora dessa linha. Nome inventado |
| `CODEBASE_ATLAS/10_TESTES_CI.md:61` | Pipeline etapa 5: "**Build de dev + preview (Vite)**" | ❌ NÃO | Nenhum passo de build em `ci.yml` (79 linhas lidas) nem em `main.yml` |
| `CODEBASE_ATLAS/10_TESTES_CI.md:59` | Pipeline etapa 3: "Contracts (Zod × edge functions)" como passo próprio | ❌ NÃO | `ci.yml` tem 6 passos executáveis; nenhum é de contratos. Os testes de contrato rodam dentro do Vitest |
| `CODEBASE_ATLAS/10_TESTES_CI.md:28` | "`rls-isolation.test.ts` — **cria dois usuários** em tenants diferentes" | ❌ NÃO | `tests-rls/rls-isolation.test.ts:113-114` faz `signInWithPassword` com credenciais pré-existentes de secrets; não cria ninguém. E o bloco é `runIf` (`:99`) |
| `CODEBASE_ATLAS/10_TESTES_CI.md:34` e `AUDITORIA_QA_2026Q3.md:66` | "`critical-flows.spec.ts` — solicitação → cotação → pedido → pagamento" | ❌ NÃO | O arquivo tem 3 testes (`:8`, `:28`, `:36`): `/compras`, `/contratos` e falha de rede em `/pedidos`. Não há cotação nem pagamento |
| `AUDITORIA_QA_2026Q3.md:70` | "`workflow-advanced.spec.ts` — aprovações + escalonamento" | ❌ NÃO | O arquivo testa: fluxo de "Nova" solicitação (guardado), viewport, tempo de load de `/dashboard`. Nenhuma menção a aprovação ou escalonamento |
| `CODEBASE_ATLAS/10_TESTES_CI.md:10` | "Edge (Deno test) ─ `supabase/functions/**/*.test.ts`" | ❌ NÃO (como runner) | Os arquivos existem, mas `main.yml:55` só aponta para `supabase/functions/tests/`. O glob `**` da pirâmide não corresponde a nenhum comando real |
| `AUDITORIA_QA_2026Q3.md:11` | "ESLint (`src/**`) ✅ **0 erros**" | ❌ NÃO | **Medido: 2 erros, 11 warnings, exit 1** — e os 2 erros estão dentro de `src/` |
| `AUDITORIA_QA_2026Q3.md:26` | "`@ts-ignore`: **0**" | ❌ NÃO | 2 ocorrências: `src/hooks/__tests__/useToastReducer.test.ts:143`, `src/lib/__tests__/performance.test.ts:90` — exatamente os 2 erros do lint |
| `AUDITORIA_QA_2026Q3.md:27` | "`console.log`: 0 · `TODO/FIXME`: 0" | ✅ SIM | Medido: 0 e 0 em `src/` |
| `AUDITORIA_QA_2026Q3.md:29` | "`dangerouslySetInnerHTML`: **2**" | ✅ SIM | Medido: exatamente 2 |
| `AUDITORIA_QA_2026Q3.md:28,30` | "`key={index}`: 26" · "`bg-[#...]`: 43" | 🟨 QUASE | Medido: 23 e 42. Drift pequeno (doc de 2026-07-15) |
| `AUDITORIA_QA_2026Q3.md:31` | "Arquivos > 400 linhas: **30**; `DependencyHealth.tsx` (**1314**), `SourcingHistoryConsole.tsx` (**969**)" | 🟨 PARCIAL | Medido: **39** arquivos; 1337 e 972 linhas. Arquivos certos, números defasados |
| `AUDITORIA_QA_2026Q3.md:84` | "`rls-isolation.test.ts` cobre **18 tabelas** críticas contra o cliente anônimo" | ✅ SIM | `tests-rls/rls-isolation.test.ts:24-43` — contei exatamente 18 |
| `AUDITORIA_QA_2026Q3.md:86` | A migração deixou `system_alerts`, `order_contracts`, `approval_hierarchy`, `permissions`, `role_permissions`, `qualification_requirements`, `allowed_countries`, `blocked_countries` cobertas ✅ | ❌ NÃO (quanto à cobertura) | **Nenhuma dessas 8 tabelas está em `PROTECTED_TABLES`** (`:24-43`). O ✅ na seção "Fase 3 — RLS isolation" sugere validação por teste que não existe |
| `AUDITORIA_QA_2026Q3.md:59` | "Suíte Deno (`workflow-engine`, `dependency-health`, `run-audit/rls_test`): verde em runs anteriores" | ❌ NÃO (não auditável) | Esses 3 arquivos não têm runner (ver tabela anterior). "Verde em runs anteriores" é `NAO_VERIFICADO (runtime)` e não pode ter vindo do CI atual |
| `MELHORIAS_PENDENTES.md:82` | "`db-explain-analyze` falha CI se > 250ms" | ❌ NÃO | O script tem o `LIMIT_MS` (`scripts/db-explain-analyze.ts:22`), mas **nenhum workflow o executa** |
| `MELHORIAS_PENDENTES.md:83` | "`realtime-audit` bloqueia PR" | ❌ NÃO | `scripts/realtime-audit.ts` não é referenciado por CI nem por `package.json` |
| `MELHORIAS_PENDENTES.md:74` | "Testes **10/10** — RLS + E2E + contratos + realtime audit + explain bench" | ❌ NÃO | Dos 5 itens: contratos são espelhos, realtime-audit e explain-bench não rodam, RLS está gated, E2E é majoritariamente vacuoso. E a suíte está vermelha |
| `MELHORIAS_PENDENTES.md:65` | "B-04: **21 edge functions** padronizadas para `corsHeaders` de `_shared/security.ts`" | ✅ SIM (superado) | Medido: 35 dos 36 `index.ts` referenciam `corsHeaders`. Claim conservador |
| `MELHORIAS_PENDENTES.md:51-52` | "helper `_shared/ai_gateway.ts` nas 4 funções AI" · "`_shared/retry.ts`" | ✅ SIM | `ai_gateway` importado em exatamente 4 `index.ts`; `_shared/retry` em 3 arquivos; `circuit_breaker` em 3 |
| `CODEBASE_ATLAS/00_INDEX.md:19`, `05_EDGE_FUNCTIONS.md:3` e `01_ARQUITETURA_GERAL.md` (bloco "Camadas lógicas") | "**32 funções** Deno" | ❌ NÃO | 36 diretórios em `supabase/functions/` (excluindo `_shared` e `tests`). O número errado está replicado em 3 documentos |
| `CODEBASE_ATLAS/00_INDEX.md:18` e `01_ARQUITETURA_GERAL.md` (bloco "Camadas lógicas") | "**123 tabelas** em public" | ❌ NÃO (pelo proxy disponível) | `src/integrations/supabase/types.ts` declara **156 tabelas**, 3 views e 115 funções. Sem acesso ao banco, uso os tipos gerados como melhor proxy — `NAO_VERIFICADO (runtime)` contra o Postgres real |
| `CODEBASE_ATLAS/01_ARQUITETURA_GERAL.md` (tabela Stack) | "Testes: Vitest + RTL + Playwright + **Deno `test` (edge)**" | ❌ NÃO | Deno `test` não alcança nenhum dos 51 blocos `Deno.test` (ver Achados graves #2) |
| `CODEBASE_ATLAS/00_INDEX.md:21` | "~60 hooks + 5 stores Zustand" | ✅ SIM | Medido: 61 hooks em `src/hooks/`, 5 stores em `src/stores/` |
| `ARCHITECTURE_GUIDE.md:26-38` | "**Exemplo Real** (Solicitação Neural)": componente `NovaSolicitacaoModal.tsx`, hook `useNeuralSolicitacao`, edge `process-solicitacao-neural` | 🟨 1 de 3 | `NovaSolicitacaoModal.tsx` existe (`src/components/compras/`). `useNeuralSolicitacao` **não existe**. `process-solicitacao-neural` **não existe** em `supabase/functions/` — e mesmo assim é invocada em produção (ver Achados graves #6) |
| `ARCHITECTURE_GUIDE.md:1` | Título "Guia de Arquitetura - **Freight Quest**" | ❌ NÃO | O produto é "Promo Supply" (`README.md:3`). Branding legado também nos 2 workflows (`ci.yml:1`, `main.yml:1`) e em 5 dos 9 specs E2E |
| `README.md:27` | Link "[Decisões de Arquitetura (ADRs)](./DOCS/ADR/README.md)" | ❌ NÃO | `DOCS/ADR/` contém só `0001-*.md` e `0002-*.md`. **Único link de arquivo quebrado em 483 citações** |
| `README.md:37` | "CSP & Headers: Configurações **rígidas** de segurança no `index.html`" | 🟨 EXAGERO | CSP existe (`index.html:36`), mas `script-src` inclui `'unsafe-inline' 'unsafe-eval'`. Existe ≠ rígida |
| `README.md:58` | "Pronto para produção. Blindagem **10/10**." | ❌ NÃO | Lint vermelho, suíte de teste vermelha, sem build no CI, sem deploy automatizado |
| `ENGINEERING_EXCELLENCE.md:42` | "Strict TypeScript: configuração `strict: true`" | ✅ SIM | `tsconfig.json:5` e `tsconfig.app.json` (`strict`, `strictNullChecks`, `noImplicitAny`) |
| `ENGINEERING_EXCELLENCE.md:11-12` | Hooks `usePerformanceMonitor` e `useRenderProfiler` | ✅ SIM | Ambos existem em `src/hooks/` |
| `SECURITY.md:11` | "WARNs no linter Supabase: **14**" | ⚠️ CONTRADIÇÃO INTERNA | 4 documentos dão 4 números: `SECURITY.md:11` = 14; `AUDITORIA_QA_2026Q3.md:13` = 117; `AUDITORIA_CODIGO_2026Q3.md:24` = 109; `MELHORIAS_PENDENTES.md:8` = "119 → 109". Sem acesso ao banco: `NAO_VERIFICADO (runtime)` — mas no máximo um deles pode estar certo |
| `AUDIT-COMPREHENSIVE-SYSTEM-REPORT.md:136-137` | F-001: "`package.json` **linha 97**: `@vitest/coverage-v8@^4.1.6` requer vitest 4.x" | ❌ OBSOLETO | `package.json:126` hoje diz `"^3.2.4"`. Corrigido; a citação de linha também mudou |
| idem `:170-176` | F-007: "**7 de 12** test suites falhando · `@testing-library/dom` não listado" | ❌ OBSOLETO | Hoje: **101** arquivos de teste; `@testing-library/dom` está em `package.json:127` |
| idem `:178-181` | F-008: "Nenhum `storageState` ou fixture de auth configurado" | ❌ OBSOLETO | `tests-e2e/global-setup.ts` e `fixtures.ts` existem e citam "F-008" nos cabeçalhos |
| idem `:157-158` | F-005: "`sourcemap: false` em produção" | ❌ OBSOLETO | `vite.config.ts:167` → `sourcemap: 'hidden'` |
| idem `:152-153` | F-004: "`chunkSizeWarningLimit` elevado para 1000" | ❌ OBSOLETO | `vite.config.ts:169` → `600` |
| idem `:203-206` | F-012: "vitest.config inclui `eslint-rules/__tests__/**`" | ❌ OBSOLETO | `vitest.config.ts:12-14` inclui só `src/**/*.{test,spec}.{ts,tsx}` |
| idem `:237-240` | F-016: "`react-hooks/rules-of-hooks: off`" | ❌ OBSOLETO | Não existe mais em `eslint.config.js` |
| idem `:212-225` | F-013: 10 rotas admin sem guard de role | ❌ OBSOLETO | `src/routes/AppRoutes.tsx:123-134` — **todas as 10** têm `requiredRole="admin"` |
| idem `:281-284` | F-024: "`fetchAllRows` sem limite máximo" | ❌ OBSOLETO | `src/lib/paginatedFetch.ts:8` → `DEFAULT_MAX_ROWS = 50_000`, aplicado em `:20,26` |
| idem `:257-260` | F-020: "CSV export sem proteção contra formula injection" | ❌ OBSOLETO | `src/lib/exportData.ts:33` → `escapeCSV`, usado em `:51` |
| idem `:301-304` | F-028: "Logger telemetry sem rate limiting nem batching" | ❌ OBSOLETO | `src/lib/logger.ts:18-21,77-106` — batch de 20, janela de 60s, teto de 60 |
| idem `:198-201` | F-011: "credenciais hardcoded em `tests-rls/rls-isolation.test.ts` **linhas 17-21**" | ✅ SIM, AINDA ABERTO | Exatamente `:17-21`. Citação precisa e ainda válida |
| idem `:276-279` | F-023: "`setInterval(checkEscalations, 60000)` client-side" | ✅ SIM, AINDA ABERTO | `src/hooks/useApprovalWorkflow.ts:315` (o arquivo tem 359 linhas, não "~420" como diz `:272`) |
| idem `:193-196` | F-010: "testes redefinem schemas localmente em vez de importar `src/types/contract.ts`" | ✅ SIM | `src/types/contract.ts` existe. **Este achado, de 2026-07-19, é exatamente o "teste-espelho" que a Missão 1 pediu — e continua aberto um mês depois** |
| idem `:340-343` / `:306-309` | F-035 "Av. Paulista" em `pdfGenerator.ts` · F-029 "Ana Silva" em `buyerAlertsStore.ts` | 🟨 CITAÇÃO ERRADA | "Paulista" não existe em `src/`. "Ana Silva" existe, mas em `src/components/compras/executive/executiveDashboardData.ts:141`, não no store citado |

### Evidência fabricada encontrada (citações que não existem no repo)

Ordenado por gravidade. Nenhum destes identificadores existe fora do próprio documento:

1. **`tsgo`** — ferramenta de type-check inventada. `CODEBASE_ATLAS/10_TESTES_CI.md:57`,
   `AUDITORIA_QA_2026Q3.md:10`, `AUDITORIA_QA_2026Q3.md:22`. O projeto usa `tsc`
   (`package.json:21`). Uma tabela de sumário executivo ("`tsgo --noEmit` ✅ 0 erros") atribui um
   resultado a um comando que nunca foi rodado porque não existe.
2. **`supabase--test_edge_functions`** — `CODEBASE_ATLAS/10_TESTES_CI.md:46`. Zero ocorrências.
3. **`PayloadFuzzer` em `src/tests/fuzzing/*`** — `CODEBASE_ATLAS/10_TESTES_CI.md:24`. O símbolo
   existe (`supabase/functions/_shared/fuzzer.ts:7`) mas em nenhum arquivo sob `src/`. É a evidência
   mais enganosa do lote: cita um símbolo real para credibilizar arquivos que não o usam.
4. **`FunctionContracts` em `src/tests/contracts*.test.ts`** — `CODEBASE_ATLAS/10_TESTES_CI.md:22`.
   Mesmo padrão: símbolo real (`_shared/contracts.ts:124`), arquivo errado.
5. **`useNeuralSolicitacao`** — `ARCHITECTURE_GUIDE.md:29`, apresentado como "Exemplo Real". Não existe.
6. **`process-solicitacao-neural`** — `ARCHITECTURE_GUIDE.md:34`. Não existe como edge function
   (ver Achados graves #6).
7. **`DOCS/ADR/README.md`** — `README.md:27`. Link quebrado.
8. **`scripts/backup-db.sh`** — `BACKUP_STRATEGY.md:41`. **Não conta como fabricação**: o próprio
   texto diz "(to be created — see §7)" e §9 lista como gap prioritário. Listado aqui só para
   fechar a contagem com honestidade.

Fora isso: **475 de 483 caminhos citados existem**. Os documentos não inventam arquivos; inventam
comportamentos e ferramentas.

### Ranking de confiabilidade dos documentos

**Mais confiáveis:**

1. **`DOCS/BACKUP_STRATEGY.md`** — o melhor documento do repositório. Marca explicitamente o que
   não existe (`:41` "to be created"), tem uma seção §9 "Gaps and Next Steps" com owner e prioridade,
   e não se atribui nota. É o único que **declara a própria incompletude**.
2. **`DOCS/conventions/pages-directory.md`** — regra clara, e a lista de 10 arquivos aparece sob o
   título "Existing Violations (tracked for migration)" (`:22`), deixando inequívoco que os caminhos
   `src/components/...` são alvo, não estado.
3. **`DOCS/SECURITY.md`** — argumentação técnica sólida sobre `SECURITY DEFINER` (§3, §4), com
   mitigação por função e uma justificativa explícita para *não* corrigir. Todos os 14 nomes de
   função citados existem nas migrations. Único problema: a contagem "14 warns" contradiz outros 3 docs.
4. **`DOCS/ADR/0001` e `0002`** — curtos, com status honesto ("Proposto e em implementação"), sem
   afirmar conclusão.
5. **`DOCS/CODEBASE_ATLAS/` (01-09, 11)** — **100% dos 46 caminhos citados existem**. É um mapa
   confiável para *navegar*. Torna-se não confiável no doc 10 (ver abaixo).

**Menos confiáveis:**

6. **`DOCS/AUDITORIA_CODIGO_2026Q3.md`** — todos os arquivos citados existem, mas todas as métricas
   estão defasadas (144 `as any` → 33; 13 `console.*` em hooks → 0). Envelheceu, mas envelheceu
   *honestamente*: os itens que marcou como abertos, checados hoje, ou foram corrigidos ou seguem abertos.
7. **`DOCS/AUDIT-COMPREHENSIVE-SYSTEM-REPORT.md`** — **o mais desatualizado por volume**. Verifiquei
   19 achados: **12 já foram corrigidos** e o documento não registra isso; 4 seguem exatos e válidos
   (F-010, F-011, F-023, F-019 parcial); 2 citam o arquivo errado. Paradoxalmente é o documento com
   o *melhor* diagnóstico do repo — F-010 (2026-07-19) já dizia "testes não validam os contratos
   reais do sistema", e um mês depois continua verdade. Precisa de um passe de fechamento, não de
   descarte.
8. **`DOCS/MELHORIAS_PENDENTES.md`** — mistura conteúdo técnico verificável e correto (Ondas 18-84
   sobre scanners DBA, com thresholds e crons plausíveis; `ai_gateway`/`retry`/`corsHeaders`
   confirmados) com uma seção de auto-avaliação insustentável: "Status Atual: **10/10**" (`:39`) e
   uma tabela de 5 dimensões todas **10/10** (`:69-77`). E `:80` admite que os "100+ cenários" foram
   "simulados **mentalmente**" — o que é honesto, mas está lado a lado com notas máximas.
9. **`DOCS/AUDITORIA_QA_2026Q3.md`** — reporta "ESLint 0 erros" e "`@ts-ignore` 0" quando são 2 e 2,
   e o **mesmo arquivo** causa ambos. Atribui resultado a `tsgo`, que não existe. Descreve 2 specs
   E2E com conteúdo que eles não têm. Marca ✅ para 8 tabelas em uma suíte RLS que não as cobre.
   **Score global: 96/100** (`:17`).
10. **`DOCS/CODEBASE_ATLAS/10_TESTES_CI.md` — o pior documento do repositório.** É o documento do
    meu escopo e concentra 4 das 6 fabricações: `tsgo`, `supabase--test_edge_functions`,
    `PayloadFuzzer` no lugar errado, `FunctionContracts` no lugar errado. Descreve um pipeline de 8
    etapas (`:56-64`) do qual **2 não existem** (build/preview, contracts como passo) e cuja ordem
    não corresponde a `ci.yml`. É perigoso porque um dev novo lendo a "pirâmide de testes" (`:5-11`)
    conclui que edge functions estão cobertas por Deno — quando 51 blocos `Deno.test` não têm runner.
11. **`DOCS/ENGINEERING_EXCELLENCE.md`** — três "Status: 10/10" e a assinatura *"Documento certificado
    por Engenharia de Software Sênior / PhD QA"* (`:54`). As afirmações pontuais que checei são
    verdadeiras (strict TS, hooks existem), mas o documento é essencialmente uma auto-declaração.
12. **`README.md`** — "Blindagem 10/10" (`:58`) com o CI vermelho, e o único link quebrado do repo.

**Padrão transversal:** o repositório documenta **intenção** com muito mais rigor do que documenta
**estado**. Onde a doc lista o que falta (BACKUP_STRATEGY §9, conventions "Existing Violations",
MELHORIAS_PENDENTES §Backlog, plan.md em futuro do presente), ela é precisa. Onde ela pontua a si
mesma, o número é sempre 10/10 ou 96/100 — e nunca sobrevive à medição.

---

## Achados graves

**1 — O CI não pode passar hoje, por dois motivos independentes, e nenhum documento registra isso.**
`npx eslint .` → exit 1 (`src/hooks/__tests__/useToastReducer.test.ts:143`,
`src/lib/__tests__/performance.test.ts:90`). Lint é o primeiro passo executável de ambos os workflows
(`ci.yml:26-27`, `main.yml:20-21`). Mesmo corrigido, `bun run test` também sai 1. Enquanto isso
`AUDITORIA_QA_2026Q3.md:11` diz "ESLint 0 erros" e `README.md:58` diz "Blindagem 10/10".
Correção mínima: trocar os 2 `@ts-ignore` por `@ts-expect-error`.

**2 — 51 testes Deno protegem o backend e nenhum runner os alcança.**
São 9 arquivos sob `supabase/functions/` (`_shared/logLevel.test.ts` 13, `_shared/logger.fuzz.test.ts` 9,
`scim-v2/conformance.test.ts` 8, `dependency-health/index.test.ts` 7, `_shared/xbz_catalog_cache.test.ts` 6,
`telemetry/index.test.ts` 5, `workflow-engine/fuzz.test.ts` 2, `run-audit/rls_test.ts` 1). O Vitest não
os vê (`vitest.config.ts:12-14` restringe a `src/**`). O `deno test` do CI aponta para
`supabase/functions/tests/` (`main.yml:55`), onde os 2 arquivos existentes se chamam `fuzzing_suite.ts`
e `integration_suite.ts` — nomes que não casam com o padrão de descoberta do Deno (`*_test.*`,
`*.test.*`, `test.*`). Resultado: o `deno test` do CI descobre zero módulos. Somando: **é a maior
lacuna de proteção do repositório**, e o `ci.yml` sequer tem passo de Deno.

**3 — A redação de segredos do logger não está sendo verificada, e a causa é drift entre código e mock.**
`src/lib/logger.ts:110-115` passou a exigir sessão (`supabase.auth.getSession()`) antes de enviar
telemetria. O teste mocka `@/integrations/supabase/client` fornecendo só `{ functions: { invoke } }`
(`logger.fuzz.test.ts:18-20`) — sem `auth`. A chamada lança, o `catch {}` de `logger.ts:130-132` engole,
e `invokeMock` nunca é chamado. Isso derruba 3 testes (`:147`, `:170`, `:180`), incluindo
**"redige chaves sensíveis do contexto"** — a única verificação de que `password`/`token`/`secret`
viram `[REDACTED]` antes de sair do browser. Ou seja: a falha vermelha não é ruído — ela desligou a
proteção de PII do pipeline de telemetria.

**4 — São 4 project IDs de Supabase divergentes, não 3, e o quarto quebra o PWA.**
- `.env:1,3` e `supabase/.temp/linked-project.json` → **`lmypcdfsrgfftzhxawao`** (o que a app usa)
- `supabase/config.toml:1` → `trwgmplubeqxrxpncdgf` (também hardcoded em
  `tests-rls/rls-isolation.test.ts:18`, `src/tests/load/backend-stress.yml:2`, `src/pages/admin/SSOConfig.tsx:264,268`)
- `deploy_edge_functions_promo_supply.sh:9` → `lmypcdfsrgfftzhxawao`
- **`apuzcrkeqodktmpwobnz`** → `vite.config.ts:90,106,121` (workbox `runtimeCaching` para
  `/rest/`, `/storage/`, `/functions/`), `index.html:13-14` (dns-prefetch + preconnect) e
  `supabase/migrations/20260507194402_*.sql:9`

Consequência concreta e mensurável: os `urlPattern` do service worker **nunca casam** com o host real,
então toda a estratégia de cache offline do PWA (`NetworkFirst` para REST, `CacheFirst` para Storage)
está inerte; e o `preconnect` do `index.html` abre conexão TCP+TLS para um projeto que a aplicação
nunca chama. Também explica por que o teste de carga e a suíte RLS podem estar auditando outro banco.

**5 — O script de deploy sempre reporta sucesso, mesmo quando falha.**
`deploy_edge_functions_promo_supply.sh:104`:
```bash
if supabase functions deploy "$fn" --project-ref "$PROJECT_REF" $VERIFY_FLAG 2>&1 | tail -3; then
```
Em bash, o status de saída de um *pipeline* é o do **último** comando — aqui, `tail -3`, que retorna 0
sempre. O `else` (`:107-111`) que incrementaria `FAILED` é inalcançável para falhas reais de deploy.
O contador "✅ Sucesso: N / 40" (`:118`) é ficção. A verificação pós-deploy (`:145-160`) mitiga
parcialmente, mas só para 6 das 40 funções e sem afetar o exit code do script. Agravantes: o script
lista 38 funções das quais **`migrate-helper` não tem diretório**, e **5 funções existentes nunca são
deployadas** por não estarem na lista — `health-dashboard`, `maintain-partitions`, `spot-api`,
`xbz-proxy`, `xbz-sync-pedidos`. Este script é o **único** mecanismo de deploy do projeto:
não há step de deploy em nenhum workflow, nem `vercel.json`/`netlify.toml`/`Dockerfile`.

**6 — Código de produção invoca uma edge function que não existe — e a doc a apresenta como "Exemplo Real".**
`process-solicitacao-neural` não tem diretório em `supabase/functions/` (36 diretórios verificados),
mas é invocada em `src/components/compras/NovaSolicitacaoModal.tsx:108` e
`src/pages/admin/DeveloperDocs.tsx:44`. `DOCS/ARCHITECTURE_GUIDE.md:34` documenta essa chamada sob o
título "Exemplo Real (Solicitação Neural)". Encontrei isso auditando a documentação, não o código —
mas o impacto é de runtime. Confirmação de que a função não está deployada no projeto de produção é
`NAO_VERIFICADO (runtime)` (sem acesso ao banco/API). Nenhum teste cobre esse caminho: nem os E2E
(guardados por redirect de auth), nem os de contrato (espelhos).

**7 — Os gates opcionais do CI criam a aparência de cobertura que não existe.**
Quatro passos do `ci.yml` (RLS `:35`, carga `:61`, contrato edge `:68`) e o "Security RLS Audit" do
`main.yml:26` **não protegem em nenhum cenário**: os três primeiros dependem de secrets que
`MELHORIAS_PENDENTES.md:66` admite não existirem (TEST-02 "ação DevOps humana"), e o quarto roda sem
`env:` contra um script que faz `process.exit(0)` sem credenciais (`scripts/rls-audit.ts:13-16`).
A leitura do YAML sugere um pipeline com 6 camadas de qualidade; o que efetivamente roda é
lint + typecheck + vitest + playwright — e as duas primeiras estão vermelhas.

**8 — Dois workflows sem `concurrency:` disputam todo push para `main`, com coberturas divergentes.**
`ci.yml:4-5` (main, master) e `main.yml:4-5` (main, develop) rodam ambos em `push:main`, duplicando
install/lint/typecheck/vitest/Playwright (incluindo dois downloads de Chromium). E cobrem coisas
diferentes: só o `ci.yml` tem RLS/carga/contrato; só o `main.yml` tem Deno/rls-audit. Não existe um
único pipeline que represente "o build passou".

**9 — O ESLint não enxerga o backend nem o E2E, e as regras que pegariam estes bugs estão desligadas.**
`eslint.config.js:8` ignora `supabase/functions` (36 funções) e `tests-e2e` (9 specs) por completo.
`:24` desliga `@typescript-eslint/no-unused-expressions` — exatamente a regra que sinalizaria
`const count = await kpiCards.count();` sem uso (`dashboard-ui.spec.ts:15`) e asserts pendurados.
`:20,32` deixam `no-explicit-any` e `exhaustive-deps` como `warn`, e `package.json:11` não usa
`--max-warnings 0`, então warnings são puramente decorativos.

**10 — Higiene de repositório: `.env` versionado e 3 lockfiles.**
`.env` está em `git ls-files` e o `.gitignore` **não tem nenhuma entrada `.env`**. Hoje só contém
project id + `PUBLISHABLE_KEY` (públicos), mas o default do repo é commitar o arquivo de ambiente.
Além disso há `bun.lock`, `bun.lockb` e `package-lock.json` versionados simultaneamente, com
`bun install` sem `--frozen-lockfile` no CI (`ci.yml:24`, `main.yml:18,44,71`) — três fontes de
verdade para dependências, nenhuma travada.

---

## ARQUIVOS LIDOS

Lidos **integralmente**, salvo os 8 marcados `[parcial]` — nesses, li seções específicas e fiz
buscas dirigidas (`grep`) pelos identificadores e caminhos que precisava confrontar, mas não o
documento inteiro. Registro isso para que ninguém trate minha ausência de achados nesses arquivos
como evidência de que estão corretos.

/home/user/promo-supply-v2/.github/workflows/ci.yml
/home/user/promo-supply-v2/.github/workflows/main.yml
/home/user/promo-supply-v2/.gitignore
/home/user/promo-supply-v2/.env
/home/user/promo-supply-v2/.lovable/plan.md
/home/user/promo-supply-v2/README.md
/home/user/promo-supply-v2/package.json
/home/user/promo-supply-v2/vite.config.ts
/home/user/promo-supply-v2/vitest.config.ts
/home/user/promo-supply-v2/vitest.rls.config.ts
/home/user/promo-supply-v2/playwright.config.ts
/home/user/promo-supply-v2/eslint.config.js
/home/user/promo-supply-v2/tsconfig.json
/home/user/promo-supply-v2/tsconfig.app.json
/home/user/promo-supply-v2/index.html
/home/user/promo-supply-v2/deploy_edge_functions_promo_supply.sh
/home/user/promo-supply-v2/supabase/config.toml
/home/user/promo-supply-v2/supabase/.temp/linked-project.json
/home/user/promo-supply-v2/scripts/db-explain-analyze.ts
/home/user/promo-supply-v2/scripts/realtime-audit.ts
/home/user/promo-supply-v2/scripts/rls-audit.ts
/home/user/promo-supply-v2/scripts/stress-test.ts
/home/user/promo-supply-v2/scripts/validate-bridge.ts
/home/user/promo-supply-v2/scripts/squash-migrations.sh
/home/user/promo-supply-v2/tests-e2e/auth-navigation.spec.ts
/home/user/promo-supply-v2/tests-e2e/critical-flows.spec.ts
/home/user/promo-supply-v2/tests-e2e/dashboard-ui.spec.ts
/home/user/promo-supply-v2/tests-e2e/elite-validation.spec.ts
/home/user/promo-supply-v2/tests-e2e/fixtures.ts
/home/user/promo-supply-v2/tests-e2e/global-setup.ts
/home/user/promo-supply-v2/tests-e2e/production-ready.spec.ts
/home/user/promo-supply-v2/tests-e2e/workflow-advanced.spec.ts
/home/user/promo-supply-v2/tests-e2e/xbz-network-panel.spec.ts
/home/user/promo-supply-v2/tests-rls/rls-isolation.test.ts
/home/user/promo-supply-v2/src/test/setup.ts
/home/user/promo-supply-v2/src/tests/contracts.test.ts
/home/user/promo-supply-v2/src/tests/contracts-elite.test.ts
/home/user/promo-supply-v2/src/tests/fuzzing/edge-functions.test.ts
/home/user/promo-supply-v2/src/tests/fuzzing/payload-integrity.test.ts
/home/user/promo-supply-v2/src/tests/integration/contract-testing.test.ts
/home/user/promo-supply-v2/src/tests/integration/contract-validation.test.ts
/home/user/promo-supply-v2/src/tests/integration/core-integrity.test.ts
/home/user/promo-supply-v2/src/tests/integration/shared-schemas.ts
/home/user/promo-supply-v2/src/tests/integration/supabase-db.test.ts
/home/user/promo-supply-v2/src/tests/spot/spotApi.test.ts
/home/user/promo-supply-v2/src/tests/load/backend-stress.yml
/home/user/promo-supply-v2/src/lib/__tests__/logger.fuzz.test.ts
/home/user/promo-supply-v2/src/lib/logger.ts
/home/user/promo-supply-v2/src/lib/paginatedFetch.ts
/home/user/promo-supply-v2/src/lib/exportData.ts
/home/user/promo-supply-v2/src/routes/AppRoutes.tsx
/home/user/promo-supply-v2/src/components/ui/chart.tsx
/home/user/promo-supply-v2/src/components/accessibility/AccessibilityStyles.tsx
/home/user/promo-supply-v2/src/hooks/useApprovalWorkflow.ts
/home/user/promo-supply-v2/src/integrations/supabase/types.ts
/home/user/promo-supply-v2/supabase/functions/tests/fuzzing_suite.ts
/home/user/promo-supply-v2/supabase/functions/tests/integration_suite.ts
/home/user/promo-supply-v2/supabase/functions/_shared/security.ts
/home/user/promo-supply-v2/supabase/functions/_shared/contracts.ts
/home/user/promo-supply-v2/supabase/functions/_shared/fuzzer.ts
/home/user/promo-supply-v2/supabase/functions/workflow-engine/fuzz.test.ts
/home/user/promo-supply-v2/DOCS/CODEBASE_ATLAS/00_INDEX.md
/home/user/promo-supply-v2/DOCS/CODEBASE_ATLAS/01_ARQUITETURA_GERAL.md
/home/user/promo-supply-v2/DOCS/CODEBASE_ATLAS/02_FLUXOS_CRITICOS.md   [parcial]
/home/user/promo-supply-v2/DOCS/CODEBASE_ATLAS/03_FRONTEND_MAP.md   [parcial]
/home/user/promo-supply-v2/DOCS/CODEBASE_ATLAS/04_BACKEND_MAP.md   [parcial]
/home/user/promo-supply-v2/DOCS/CODEBASE_ATLAS/05_EDGE_FUNCTIONS.md   [parcial]
/home/user/promo-supply-v2/DOCS/CODEBASE_ATLAS/06_UI_COMPONENTS.md
/home/user/promo-supply-v2/DOCS/CODEBASE_ATLAS/07_HOOKS_STORES.md   [parcial]
/home/user/promo-supply-v2/DOCS/CODEBASE_ATLAS/08_SEGURANCA_RLS.md   [parcial]
/home/user/promo-supply-v2/DOCS/CODEBASE_ATLAS/09_OBSERVABILIDADE.md   [parcial]
/home/user/promo-supply-v2/DOCS/CODEBASE_ATLAS/10_TESTES_CI.md
/home/user/promo-supply-v2/DOCS/CODEBASE_ATLAS/11_GLOSSARIO.md
/home/user/promo-supply-v2/DOCS/AUDIT-COMPREHENSIVE-SYSTEM-REPORT.md   [parcial]
/home/user/promo-supply-v2/DOCS/AUDITORIA_BACKEND.md   [parcial]
/home/user/promo-supply-v2/DOCS/AUDITORIA_BACKEND_V2.md   [parcial]
/home/user/promo-supply-v2/DOCS/AUDITORIA_BACKEND_V3.md   [parcial]
/home/user/promo-supply-v2/DOCS/AUDITORIA_CODIGO_2026Q3.md
/home/user/promo-supply-v2/DOCS/AUDITORIA_QA_2026Q3.md
/home/user/promo-supply-v2/DOCS/MELHORIAS_PENDENTES.md
/home/user/promo-supply-v2/DOCS/ARCHITECTURE_GUIDE.md
/home/user/promo-supply-v2/DOCS/SECURITY.md
/home/user/promo-supply-v2/DOCS/ENGINEERING_EXCELLENCE.md
/home/user/promo-supply-v2/DOCS/BACKUP_STRATEGY.md
/home/user/promo-supply-v2/DOCS/page-transitions.md   [parcial]
/home/user/promo-supply-v2/DOCS/ADR/0001-feature-based-architecture.md
/home/user/promo-supply-v2/DOCS/ADR/0002-auth-strategy.md
/home/user/promo-supply-v2/DOCS/RUNBOOKS/rollback-template.md
/home/user/promo-supply-v2/DOCS/conventions/pages-directory.md
/home/user/promo-supply-v2/docs/conventions/pages-directory.md
