# L09 — lib, stores, services, schemas, types

> Auditoria por **medição**, não por documentação. Nenhuma linha deste relatório vem de README, DOCS/*.md ou de nome de arquivo.
> Tudo abaixo foi lido no código-fonte, contado por `grep` ou executado (`vitest`, `tsc`).
> Data da medição: 2026-08-16 · HEAD `58f4fc8` · working tree limpo (exceto `package-lock.json` modificado).

## Resumo

Escopo lido: **33 módulos de produção** (21 em `src/lib/`, 5 em `src/stores/`, 2 em `src/services/`, 1 em `src/schemas/`, 2 em `src/types/`, 1 em `src/i18n/`, 1 em `src/integrations/supabase/client.ts`) + 29 arquivos de teste.

| Classificação | Qtd | Denominador |
|---|---|---|
| ✅ IMPLEMENTADO_TOTAL | 24 | 33 (73%) |
| 🟨 IMPLEMENTADO_PARCIAL | 6 | 33 (18%) |
| 🟦 SUGERIDO_OU_INICIADO | 0 | 33 (0%) |
| ⬛ MORTO_OU_ABANDONADO | 3 | 33 (9%) |

Quebra por diretório:

| Diretório | ✅ | 🟨 | 🟦 | ⬛ | Total |
|---|---|---|---|---|---|
| `src/lib/` | 14 | 4 | 0 | 3 | 21 |
| `src/stores/` | 4 | 1 | 0 | 0 | 5 |
| `src/services/` | 2 | 0 | 0 | 0 | 2 |
| `src/schemas/` | 1 | 0 | 0 | 0 | 1 |
| `src/types/` | 2 | 0 | 0 | 0 | 2 |
| `src/i18n/` | 0 | 1 | 0 | 0 | 1 |
| `src/integrations/supabase/client.ts` | 1 | 0 | 0 | 0 | 1 |

Estado dos testes (medido, não inferido):

```
npx vitest run                → Test Files 1 failed | 99 passed | 1 skipped (101)
                                Tests 3 failed | 2242 passed | 12 skipped (2257)
npx tsc --noEmit              → exit 0, 0 linhas de erro
```

O único arquivo com falha em toda a suíte do repositório é `src/lib/__tests__/logger.fuzz.test.ts`.

---

## Diagnóstico: os testes falhando do logger — defeito de produção ou de teste?

### Divergência com o fato recebido

O briefing informou **4 testes falhando**, um deles com `"Aborting after running 10000 timers, assuming an infinite loop"`.
**Não reproduzi isso.** Medição real, executada 5 vezes (o seed do fuzz é aleatório a cada execução — `src/lib/__tests__/fuzzSeed.ts:58`):

| Execução | Seed | Resultado |
|---|---|---|
| arquivo isolado | 907827673 | 3 failed \| 8 passed |
| isolado (rerun) | 469491229 | 3 failed \| 8 passed |
| isolado (rerun) | 3297082477 | 3 failed \| 8 passed |
| isolado (rerun) | 796456831 | 3 failed \| 8 passed |
| `logger.test.ts` + `logger.fuzz.test.ts` juntos | — | 3 failed \| 32 passed |
| escopo L09 (`src/lib src/stores src/services src/schemas src/types`) | — | 3 failed \| 734 passed |
| **suíte completa do repositório (`npx vitest run`)** | — | **3 failed \| 2242 passed** |

`grep -E "Aborting|10000 timers"` sobre a saída da suíte completa: **zero ocorrências**. Reporto o que medi: **3 falhas, sempre as mesmas 3, sem loop infinito de timers**. A quarta falha e o abort de timers ou vêm de outra configuração de execução (ex.: `--config vitest.rls.config.ts`, ou execução com `bun`/`bunx` como sugere o comentário em `src/lib/__tests__/fuzzSeed.ts:9`), ou não são reprodutíveis neste ambiente.

### As 3 falhas medidas

| Teste | Linha | Erro |
|---|---|---|
| `redige chaves sensíveis do contexto` | `src/lib/__tests__/logger.fuzz.test.ts:147` | `expected "spy" to be called at least once` |
| `envio em batch: agrupa múltiplas entradas` | `src/lib/__tests__/logger.fuzz.test.ts:170` | `expected "spy" to be called at least once` |
| `tenantId pode ser null sem quebrar o pipeline` | `src/lib/__tests__/logger.fuzz.test.ts:180` | `expected "spy" to be called at least once` |

Todas as três têm a **mesma causa**: `invokeMock` nunca é chamado.

### VEREDITO: defeito **do teste** (mock incompleto), não do código de produção

Cadeia de evidência:

1. `src/lib/logger.ts:114` — o pipeline de telemetria chama:
   ```ts
   const { data: { session } } = await supabase.auth.getSession();
   ```
2. `src/lib/__tests__/logger.fuzz.test.ts:18-20` — o mock fornece **apenas** `functions.invoke`:
   ```ts
   vi.mock("@/integrations/supabase/client", () => ({
     supabase: { functions: { invoke: invokeMock } },
   }));
   ```
   Não há `auth`. Logo `supabase.auth` é `undefined` e `supabase.auth.getSession()` lança `TypeError`.
3. `src/lib/logger.ts:130-132` — o `TypeError` cai no `catch` silencioso:
   ```ts
   } catch {
     // Silent fail to avoid infinite loops
   }
   ```
   `sendBatchToTelemetry` aborta **antes** da linha 117 (`supabase.functions.invoke("telemetry", …)`). Portanto `invokeMock` jamais é invocado.
4. `src/lib/__tests__/logger.test.ts:6-12` tem exatamente o mesmo mock incompleto — e passa nos 32 testes porque **nenhum** deles assere sobre `invoke`.

**Corroboração decisiva** (assinatura de "telemetria nunca enviada", não de "telemetria enviada errado"): *todo* teste do arquivo que exige `invoke` chamado falha; *todo* teste que tolera zero chamadas passa **vacuamente**:

- `src/lib/__tests__/logger.fuzz.test.ts:164` — `expect(invokeMock.mock.calls.length).toBeLessThanOrEqual(60)` → passa com 0.
- `src/lib/__tests__/logger.fuzz.test.ts:190` — `if (invokeMock.mock.calls.length === 0) continue;` → pula o corpo inteiro.
- `src/lib/__tests__/logger.fuzz.test.ts:217` — `if (invokeMock.mock.calls.length > 0) { … }` → bloco nunca executa.

Ou seja: **5 dos 11 testes do arquivo não asseram nada de fato sobre telemetria** — 3 falham e 3 passam vazios (o teste de rate-limit é verde por vacuidade).

**Gravidade:** MÉDIA-BAIXA como bug de produção (o código de produção está correto: o guard de sessão em `src/lib/logger.ts:111-115` é deliberado e documentado para evitar 401-spam no login). **ALTA como bug de teste**: a suíte de telemetria está cega — o rate-limit, o batching e a redaction de segredos **não estão de fato cobertos** hoje. Correção: acrescentar `auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'x' } } }) }` ao mock nos dois arquivos.

**Defeito real de produção encontrado no mesmo arquivo (separado dos testes):** ver "Achados graves #1" — todas as saídas de console do logger estão comentadas.

---

## Feature flags (nome, valor padrão, onde definida, o que controla)

**Não existe sistema de feature flags no código.** Medição:

```
grep -rniE "feature[_ ]?flags?" src --include=*.ts --include=*.tsx
  → 1 única ocorrência, e é um COMENTÁRIO: src/lib/query-client.ts:10
    "/** Static config (org settings, feature flags) — almost never changes */"
```

Não há `useFeatureFlag`, `flags.ts`, tabela de flags consumida, nem leitura de flag em `import.meta.env`.

O que existe são **flags declaradas em `.env.example` que nenhum código lê**:

| Flag em `.env.example` | Valor padrão declarado | Onde definida | O que controla no código |
|---|---|---|---|
| `VITE_ENABLE_ANALYTICS` | `true` | `.env.example` (seção `# FEATURES FLAGS`) | **NADA** — `grep -rn "VITE_ENABLE_ANALYTICS" src` → 0 resultados |
| `VITE_ENABLE_DEBUG` | `false` | `.env.example` (seção `# FEATURES FLAGS`) | **NADA** — 0 resultados |

O que de fato funciona como interruptor de comportamento são flags **de build do Vite**, não flags de produto:

| Interruptor | Padrão | Onde | O que controla |
|---|---|---|---|
| `import.meta.env.PROD` | build | `src/lib/logger.ts:45` | suprime nível `debug` em produção |
| `import.meta.env.PROD` | build | `src/lib/logger.ts:72` | força enfileiramento de telemetria para todos os níveis em produção |
| `import.meta.env.DEV` | build | `src/routes/AppRoutes.tsx:140` | registra rota de harness só em dev |
| `import.meta.env.DEV` | build | `src/components/ui/error-boundary.tsx:94`, `src/components/feedback/GlobalErrorBoundary.tsx:25`, `src/features/layout/components/ModuleErrorBoundary.tsx:63`, `src/hooks/useRenderProfiler.ts:13` | detalhes de erro / profiler só em dev |

Flags "de negócio" existem, mas como **estado persistido em store Zustand**, não como feature flag (todos ligados por padrão):

| Chave | Valor padrão | Onde | Controla |
|---|---|---|---|
| `enableBrowserNotifications` | `true` | `src/stores/slaSettingsStore.ts:35` | notificações de SLA no browser |
| `enableEmailNotifications` | `true` | `src/stores/slaSettingsStore.ts:36` | notificações de SLA por e-mail |
| `enableSupplierAlerts` | `true` | `src/stores/slaSettingsStore.ts:39` | alertas por fornecedor |
| `KPITarget.enabled` | `true` (8 alvos) | `src/stores/kpiTargetsStore.ts:37-110` | avaliação de cada KPI em `checkKPIStatus` (`:173`) |
| `BuyerTarget.enabled` | `true` no default | `src/stores/buyerAlertsStore.ts:92` | avaliação em `checkBuyerPerformance` (`:172`) — **inócuo, ver 🟨 buyerAlertsStore** |
| `soundEnabled` / `hapticEnabled` | fora do escopo L09 | `src/hooks/useFeedback.ts:19` | lidas por `src/lib/feedbackToast.ts:19` |

---

## Variáveis de ambiente lidas no código × `.env.example`

Levantamento por `grep -rhoE "import\.meta\.env\.[A-Za-z_]+" src supabase scripts`:

| Variável | Lida em (arquivo:linha) | Presente em `.env.example`? | Presente em `.env`? |
|---|---|---|---|
| `VITE_SUPABASE_URL` | `src/integrations/supabase/client.ts:4` | ✅ sim | ✅ sim |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `src/integrations/supabase/client.ts:5` | ❌ **AUSENTE** | ✅ sim |
| `PROD` (build-time Vite) | `src/lib/logger.ts:45`, `src/lib/logger.ts:72` | n/a | n/a |
| `DEV` (build-time Vite) | 4 arquivos fora do escopo L09 | n/a | n/a |

Variáveis **declaradas em `.env.example` e nunca lidas por nenhum código** (`grep` em `src/` + `supabase/` + `scripts/`):

| Variável | Ocorrências em código de produção |
|---|---|
| `VITE_SUPABASE_ANON_KEY` | 0 em produção. Aparece só em `src/tests/integration/supabase-db.test.ts:131,149` (via `process.env`, não `import.meta.env`) |
| `VITE_BITRIX_WEBHOOK_URL` | 0 |
| `VITE_APP_NAME` | 0 |
| `VITE_APP_ENV` | 0 |
| `VITE_ENABLE_ANALYTICS` | 0 |
| `VITE_ENABLE_DEBUG` | 0 |

Variável declarada em `.env` e em `src/vite-env.d.ts:11` mas não lida em runtime: `VITE_SUPABASE_PROJECT_ID` (0 leituras via `import.meta.env`).

**ACHADO:** `.env.example` está dessincronizado do código. Quem seguir o `.env.example` literalmente terá `VITE_SUPABASE_PUBLISHABLE_KEY` indefinido → `createClient(SUPABASE_URL, undefined)` em `src/integrations/supabase/client.ts:13` → app não sobe. 6 das 8 variáveis do `.env.example` são ficção; a única realmente obrigatória e não documentada é justamente a chave do Supabase.

---

## `src/integrations/supabase/types.ts` — contagem em altitude

Arquivo **não lido linha a linha** (fora de escopo). Contagem feita por script de parsing das chaves de primeiro nível dentro de `public`:

| Seção | Chaves de primeiro nível declaradas |
|---|---|
| `Tables` | **156** |
| `Views` | **3** |
| `Functions` | **118** |
| `Enums` | **18** |
| `CompositeTypes` | **0** |
| Total de linhas do arquivo | 10.093 |

`Views` declaradas: `mv_dashboard_kpis`, `supplier_compliance_summary`, `v_system_health_overview`.

Observações para cruzamento com o banco vivo pelo agente principal:
- Entre as 156 `Tables` há **12 partições/legados** de particionamento incluídos como tabelas: `audit_logs_202605..202609`, `audit_logs_legacy_20260712`, `telemetry_logs_202605..202609`, `telemetry_logs_legacy_20260712`. O número "efetivo" de tabelas lógicas é ~144.
- Das 118 `Functions` declaradas, apenas **19** têm wrapper tipado em `src/lib/supabaseRpc.ts` — e nenhum desses wrappers é usado (ver ⬛ supabaseRpc).
- `NAO_VERIFICADO (runtime)`: se as 156/3/118 correspondem ao banco vivo — não tenho acesso ao banco.

---

## Tabela de evidências

### `src/lib/` (21 módulos)

| Módulo | Classificação | Evidência (arquivo:linha) | Quem consome | O que falta |
|---|---|---|---|---|
| `utils.ts` (`cn`, `formatCurrency`, `formatDate`, `formatDateTime`) | ✅ | `src/lib/utils.ts:6,10,15,18` | **219** arquivos não-teste (`grep -rl "from \"@/lib/utils\"" src`), ex. `src/lib/pdfGenerator.ts:9`, `src/components/compras/SolicitacaoKanban.tsx:40` | — |
| `supabaseQuery.ts` (`escapeIlike`) | ✅ | `src/lib/supabaseQuery.ts:10` | 6: `src/services/auditService.ts:73`, `src/hooks/usePagamentos.ts`, `src/hooks/useDevolucoes.ts`, `src/hooks/useFornecedores.ts`, `src/features/pedidos/hooks/usePedidos.ts`, `src/features/solicitacoes/hooks/useSolicitacoes.ts` | — |
| `safeTruncate.ts` | ✅ | `src/lib/safeTruncate.ts:15` | `src/hooks/useApprovalNotifications.ts` + `src/lib/safeDisplay.ts:1` | — |
| `safeDisplay.ts` | ✅ | `src/lib/safeDisplay.ts:18` | 1 consumidor: `src/pages/admin/DependencyHealth.tsx` | Adoção mínima: o próprio doc do módulo (`:5-6`) diz "substitui usos ad-hoc de `.slice(0,N)`", mas restam **92** ocorrências de `.slice(0, N)` em `src/` não-teste |
| `haptics.ts` | ✅ | `src/lib/haptics.ts:5-40` | 4: `src/components/atoms/EliteButton.tsx:22`, `src/components/atoms/PreloadLink.tsx:26`, `src/components/navigation/BackToTop.tsx:26`, `src/components/navigation/SmartBackButton.tsx:124` | Duplica `hapticPatterns` de `src/hooks/useFeedback.ts:36` (dois sistemas de vibração paralelos) |
| `query-client.ts` (`queryClient`, `persister`) | ✅ | `src/lib/query-client.ts:26,46` | `src/App.tsx:7,39-48` (`PersistQueryClientProvider`), `src/features/auth/hooks/useAuth.tsx`; `queryClient` referenciado 178× | `REFERENCE_STALE_TIME` (`:8`) e `STATIC_STALE_TIME` (`:11`) têm **0 consumidores** em todo o `src/` |
| `paginatedFetch.ts` (`fetchAllRows`) | ✅ | `src/lib/paginatedFetch.ts:10` | 5: `src/hooks/useExecutiveDashboardData.ts`, `src/components/compras/RiskHeatMap.tsx`, `PriceHistoryModal.tsx`, `DemandPredictionPanel.tsx`, `src/features/solicitacoes/hooks/useSolicitacoes.ts` | — |
| `security.ts` | ⬛ | `src/lib/security.ts:9-55` | **NENHUM.** `grep -rn "lib/security" src supabase scripts` → 0 | Ver seção Órfãos |
| `routePrefetch.ts` | ✅ | `src/lib/routePrefetch.ts:45,59` | `src/components/PrefetchLink.tsx`, `src/features/layout/components/Shell.tsx` | — |
| `filterClearReporter.ts` | ✅ | `src/lib/filterClearReporter.ts:48,68` | `src/hooks/useClearFiltersFlow.tsx` (ambos exports) | — |
| `feedbackToast.ts` (`toast`) | ✅ | `src/lib/feedbackToast.ts:64-88` | **84** arquivos não-teste | — |
| `secureStorage.ts` | ⬛ | `src/lib/secureStorage.ts:57-89` | **NENHUM.** `grep -rn "secureStorage" src supabase scripts` → só o próprio arquivo e seu teste | Ver seção Órfãos |
| `dbMapping.ts` | 🟨 | `src/lib/dbMapping.ts:27,32,41,46,49,52,69,92` | 3 arquivos: `src/pages/cotacao/cotacaoHelpers.ts`, `src/pages/solicitacoes/solicitacoesHelpers.ts`, `src/pages/fornecedores/fornecedorHelpers.ts` — usam **apenas** `nullishStr` (23×), `nullishNum` (15×), `nullishBool` (3×) | 5 de 8 exports órfãos: `nullToUndefined` (`:27`), `undefinedToNull` (`:32`), `nullishOr` (`:41`, só uso interno), `nullsToUndefined` (`:69`), `undefinedsToNull` (`:92`) — todos com 0 consumidores externos |
| `performance.ts` (`performanceMonitor`) | ✅ | `src/lib/performance.ts:7,107` | `src/hooks/usePerformanceMonitor.ts:11` → `src/App.tsx:54` e `src/features/layout/components/MainLayout.tsx:49` | `catch (e) {}` mudo em `:25-27` (variável `e` não usada); as métricas só vão para `logger`, que não imprime (ver Achado #1) |
| `exportData.ts` | 🟨 | `src/lib/exportData.ts:45` | `exportToCSV` usado em 3 páginas: `src/pages/auditoria/Auditoria.tsx`, `src/pages/pedidos/Pedidos.tsx`, `src/pages/historico/HistoricoCompras.tsx` | Os **5 conjuntos de colunas pré-definidos** têm 0 consumidores: `pedidoColumns` (`:74`), `solicitacaoColumns` (`:86`), `fornecedorColumns` (`:99`), `cotacaoColumns` (`:114`), `pagamentoColumns` (`:127`) — as páginas montam colunas ad-hoc |
| `clearFiltersShortcut.ts` | ✅ | `src/lib/clearFiltersShortcut.ts:19,45,55,63,78,87,104,113,125` | `src/hooks/useKeyboardShortcuts.ts`, `src/features/layout/components/ClearFiltersShortcutEditor.tsx`, `KeyboardShortcutsDialog.tsx` | — |
| `pdfGenerator.ts` (`generateOrderPDF`) | ✅ | `src/lib/pdfGenerator.ts:44` | 1: `src/pages/gerar-ordem/GerarOrdem.tsx:38` | — |
| `logger.ts` | 🟨 | `src/lib/logger.ts:23-175` | **58** arquivos não-teste (`src/App.tsx:3`, `src/lib/security.ts:2`, `src/stores/undoStore.ts:2`, `src/stores/dashboardLayoutStore.ts:5`, …) | **Toda a saída de console está comentada** (`:61`, `:64`, `:68`); a variável `output` (`:56`) fica sem uso. Único destino real é a Edge Function `telemetry`, que exige sessão (`:114-115`) — logs de tela de login e de usuário deslogado são descartados silenciosamente |
| `imageCompression.ts` | 🟨 | `src/lib/imageCompression.ts:98,172,183,204` | `compressImage` (4 usos), `compressImages` (1), `formatBytes` (7) em `src/hooks/useImageCompression.ts`, `src/components/compras/NovaSolicitacaoModal.tsx`, `SolicitacaoFormSteps.tsx` | `getCompressedPreviewUrl` (`:183`) órfão — 0 consumidores; `supportsWebP` (`:36`) só uso interno (`:133`) |
| `supabaseRpc.ts` | ⬛ | `src/lib/supabaseRpc.ts:86-211` (19 wrappers) | **NENHUM.** Ver seção Órfãos | 56 chamadas `supabase.rpc(` diretas em `src/` ignoram a abstração |
| `types/browser-extensions.d.ts` | ✅ | `src/lib/types/browser-extensions.d.ts:6,12,17` | `LayoutShiftEntry` em `src/lib/performance.ts:54`; `FirstInputEntry` em `src/lib/performance.ts:76`; `Window.webkitAudioContext` em `src/hooks/useFeedback.ts:69`, `src/hooks/useRealPushNotifications.ts:454` | — |

### `src/stores/` (5 stores Zustand)

| Módulo | Classificação | Evidência (arquivo:linha) | Quem consome | O que falta |
|---|---|---|---|---|
| `slaSettingsStore.ts` (`useSLASettings`) | ✅ | `src/stores/slaSettingsStore.ts:43` (`persist`, key `sla-settings` `:88`) | 5: `src/features/layout/components/SLASettingsPanel.tsx`, `sla-settings/SupplierThresholdConfig.tsx`, `src/components/compras/SLADistributionChart.tsx`, `SupplierAlertsPanel.tsx`, `CriticalAlertsBar.tsx` | E-mail hardcoded `compras@promobrindes.com.br` em `:37` |
| `undoStore.ts` (`useUndoStore`) | ✅ | `src/stores/undoStore.ts:39` | `src/hooks/useGlobalUndo.ts`, `src/hooks/useClearFiltersFlow.tsx` | Usa `Math.random()` para gerar id (`:45`) — aceitável para id de UI, mas é `Math.random` no escopo de produção |
| `dashboardLayoutStore.ts` | ✅ | `src/stores/dashboardLayoutStore.ts:60` | `src/pages/dashboard/ComprasDashboard.tsx:78,96-97` (`loadFromDb`), `src/components/compras/DraggableDashboard.tsx:226,232,384,417` (`saveToDb`) | Estado duplicado: persiste em localStorage (`:165`) **e** na tabela `dashboard_layouts` (`:99`), com resolução de conflito manual por timestamp (`:111-133`) fora do TanStack Query |
| `kpiTargetsStore.ts` | ✅ | `src/stores/kpiTargetsStore.ts:112`, helper `checkKPIStatus` `:167` | `src/components/compras/AdvancedProcurementKPIs.tsx`, `src/components/compras/KPITargetsConfig.tsx` | Metas 100% hardcoded (`:37-110`, 8 alvos com valores fixos: `target: 150000`, `target: 5.0`, …) — sem origem no banco |
| `buyerAlertsStore.ts` | 🟨 | `src/stores/buyerAlertsStore.ts:50` | `src/components/compras/BuyerPerformanceAlerts.tsx:39`, `src/pages/buyer/BuyerPerformanceDashboard.tsx:48` | **Fio quebrado**: `targets` inicia `[]` (`:53`) e **nada o popula** — `setTargets` (`:64`) e `loadTargetsFromDb` (`:68`) têm 0 chamadores fora do store. Consequência medida: `src/components/compras/BuyerPerformanceAlerts.tsx:50-51` faz `targets.find(...)` → `if (!target) return;` → **nenhum alerta é jamais gerado**. Além disso `loadTargetsFromDb` consulta colunas inexistentes (ver Achado #3) |

### `src/services/`, `src/schemas/`, `src/types/`, `src/i18n/`, cliente Supabase

| Módulo | Classificação | Evidência (arquivo:linha) | Quem consome | O que falta |
|---|---|---|---|---|
| `services/auditService.ts` | ✅ | `src/services/auditService.ts:13,124-126` | 6 arquivos: `src/hooks/usePagamentos.ts`, `useFornecedores.ts`, `src/features/cotacoes/hooks/useCotacoes.ts`, `src/features/pedidos/hooks/usePedidos.ts`, `src/features/solicitacoes/hooks/useSolicitacoes.ts`, `src/pages/auditoria/Auditoria.tsx`. `auditHelpers` 14 usos, `auditService` 7, `actionTypeLabels` 7 | `logAction` engole erro (`:40-45`) — falha de auditoria é invisível porque o `logger` não imprime (Achado #1) |
| `services/auditTypes.ts` | ✅ | `src/services/auditTypes.ts:3,15,25,35` | `src/services/auditService.ts:1` e re-export em `:7` | — |
| `schemas/solicitacao.schema.ts` | ✅ | `src/schemas/solicitacao.schema.ts:3` | `src/components/compras/NovaSolicitacaoModal.tsx`, `solicitacao/SolicitacaoFormSteps.tsx`, `SolicitacaoReviewStep.tsx`, `src/features/solicitacoes/index.ts` | — |
| `types/contract.ts` | ✅ | `src/types/contract.ts:3,35,42,58,70,81,92,98` | 5: `src/pages/contratos/Contratos.tsx`, `src/components/compras/ContractModal.tsx`, `ContractDetailsModal.tsx`, `contract/ContractItemsEditor.tsx`, `contract/ContractDetailsTabs.tsx`. `Contract` 17 refs, `ContractItem` 8, `ContractPenalty` 5 | `PenaltyClause` (`:35`) só é referenciado dentro do próprio arquivo (`:32`) |
| `types/legacyTypes.ts` | ✅ | `src/types/legacyTypes.ts:7,29,40,59,78,87,103` | 8 arquivos; `LegacyFornecedor` 18 refs, `getTipoLabel`/`getStatusLabel`/`getStatusColor` 14 refs cada | Aliases `Cotacao` (`:73`) e `Pagamento` (`:75`) nunca importados de `@/types/legacyTypes` |
| `i18n/config.ts` | 🟨 | `src/i18n/config.ts:20-34`; importado em `src/main.tsx:5` | Apenas **3** componentes usam `useTranslation`: `src/features/layout/components/LanguageSwitcher.tsx`, `src/pages/catalogo-produtos/CatalogoProdutos.tsx`, `src/pages/dashboard/ComprasDashboard.tsx` | Cobertura: só **9 chaves** são usadas via `t('a.b')` em todo o app; **68 de 74** chaves do `translation.json` nunca são usadas; 3 chaves usadas não existem em nenhum locale (ver Achado #5). O app é 99% strings PT hardcoded |
| `integrations/supabase/client.ts` | ✅ | `src/integrations/supabase/client.ts:13` | Cliente único do app; importado por dezenas de hooks/stores/services | Sem guarda para env ausente: `createClient(undefined, undefined)` se as vars faltarem; `.env.example` documenta a variável errada (ver Achado #4) |

### Arquivos de tradução (`public/locales/` e `src/locales/`)

Listagem e estado (não vazios):

| Arquivo | Bytes | Chaves-folha | Blocos de topo | Estado |
|---|---|---|---|---|
| `public/locales/pt/translation.json` | 2.467 | 74 | `common, dashboard, navigation, status, errors` | **preenchido** |
| `public/locales/en/translation.json` | 2.340 | 74 | idem | **preenchido** |
| `public/locales/es/translation.json` | 2.447 | 74 | idem | **preenchido** |
| `src/locales/pt|en|es/translation.json` | idênticos byte-a-byte aos de `public/` (verificado com `diff`) | 74 cada | idem | **preenchido** |

Os 3 idiomas têm exatamente as mesmas 74 chaves — não há chave faltando entre idiomas. **Mas**: `src/i18n/config.ts:10-12` importa de `@/locales/...`, que o alias `@ → ./src` (`vite.config.ts:307`, `tsconfig.json:8-10`) resolve para **`src/locales/`**. Os arquivos em `public/locales/` são cópias duplicadas nunca carregadas em runtime (não há `i18next-http-backend` no `config.ts`) — apenas servidas estaticamente sem consumidor.

---

## Órfãos (com prova de grep)

### ⬛ 1. `src/lib/security.ts` — 55 linhas, 0 consumidores

```bash
$ grep -rn "lib/security" src supabase scripts
(nenhuma saída)

$ grep -rnwE "security\.(sanitize|isDangerous|auditLog)" src supabase scripts
src/lib/__tests__/security.test.ts:22,26,30,... (apenas o próprio teste)

$ grep -rn "security\|secureStorage\|supabaseRpc" src --include=index.ts
(nenhuma saída — não há re-export via barrel)
```
Exports mortos: `security.sanitize` (`:13`), `security.isDangerous` (`:33`), `security.auditLog` (`:48`).
Gravidade: **ALTA em segurança**. Existe um sanitizador DOMPurify pronto (`:15-18`) que **ninguém chama**. 18 testes verdes dando falsa sensação de proteção XSS ativa.

### ⬛ 2. `src/lib/secureStorage.ts` — 89 linhas, 0 consumidores

```bash
$ grep -rn "secureStorage" src supabase scripts
src/lib/secureStorage.ts:57            (definição)
src/lib/__tests__/secureStorage.test.ts:2,16,17,...  (apenas o teste)
```
Exports mortos: `setItem`/`getItem`/`removeItem`/`getRawItem` (`:58,68,81,86`).
Contraste medido: os stores Zustand persistem **em localStorage puro, sem criptografia** — `src/stores/slaSettingsStore.ts:88` (`sla-settings`), `src/stores/dashboardLayoutStore.ts:165` (`dashboard-layout`), `src/stores/kpiTargetsStore.ts:161` (`kpi-targets-storage`), `src/stores/buyerAlertsStore.ts:158` (`buyer-alerts-storage`), `src/lib/clearFiltersShortcut.ts:106`, `src/lib/query-client.ts:47-48`. O wrapper AES-GCM foi construído, testado (143 linhas de teste) e nunca ligado.

### ⬛ 3. `src/lib/supabaseRpc.ts` — 212 linhas, 19 wrappers, 0 consumidores

```bash
$ grep -rn "supabaseRpc" src supabase scripts
src/lib/__tests__/supabaseRpc.test.ts:22   (apenas o teste)

$ grep -rnoE "rpc(CurrentTenantId|GenerateSequentialNumber|CheckBudgetAvailability|…|HasRole)" src supabase
→ 100% das ocorrências estão em src/lib/supabaseRpc.ts (definições) ou em src/lib/__tests__/supabaseRpc.test.ts

$ grep -rn "supabase\.rpc(" src --include=*.ts --include=*.tsx | grep -v __tests__ | wc -l
56
```
O comentário do próprio arquivo (`:6-7`) admite a intenção — *"Call sites can migrate incrementally"* — e a migração **nunca começou**: 56 chamadas cruas continuam em `src/components/compras/NovaSolicitacaoModal.tsx:156,196`, `src/hooks/usePagamentos.ts:116,279`, `src/hooks/useAccountLockout.ts:46,76`, etc.

### Órfãos parciais (símbolo exportado sem consumidor, módulo vivo)

| Símbolo | Definido em | Consumidores externos |
|---|---|---|
| `REFERENCE_STALE_TIME` | `src/lib/query-client.ts:8` | 0 |
| `STATIC_STALE_TIME` | `src/lib/query-client.ts:11` | 0 |
| `nullToUndefined` | `src/lib/dbMapping.ts:27` | 0 |
| `undefinedToNull` | `src/lib/dbMapping.ts:32` | 0 |
| `nullishOr` | `src/lib/dbMapping.ts:41` | 0 (só uso interno) |
| `nullsToUndefined` | `src/lib/dbMapping.ts:69` | 0 |
| `undefinedsToNull` | `src/lib/dbMapping.ts:92` | 0 |
| `pedidoColumns` | `src/lib/exportData.ts:74` | 0 |
| `solicitacaoColumns` | `src/lib/exportData.ts:86` | 0 |
| `fornecedorColumns` | `src/lib/exportData.ts:99` | 0 |
| `cotacaoColumns` | `src/lib/exportData.ts:114` | 0 |
| `pagamentoColumns` | `src/lib/exportData.ts:127` | 0 |
| `getCompressedPreviewUrl` | `src/lib/imageCompression.ts:183` | 0 |
| `supportsWebP` | `src/lib/imageCompression.ts:36` | 0 (só uso interno `:133`) |
| `setTargets` (store) | `src/stores/buyerAlertsStore.ts:64` | 0 |
| `loadTargetsFromDb` (store) | `src/stores/buyerAlertsStore.ts:68` | 0 |
| `PenaltyClause` | `src/types/contract.ts:35` | 0 (só uso interno `:32`) |

---

## Achados graves

### #1 — O logger central não escreve absolutamente nada em console (produção e dev)

`src/lib/logger.ts:59-69`:
```ts
switch (level) {
  case 'error':
    // console.error(output);
    break;
  case 'warn':
    // console.warn(output);
    break;
  default:
    // console.info(output);
}
```
As três saídas estão comentadas. A variável `output` construída em `:56` fica **sem uso**. Consequência medida: os **58 arquivos** que importam `logger` (incluindo `src/services/auditService.ts:41,44` para falha de auditoria, `src/stores/undoStore.ts:82,110` para falha de undo, `src/stores/dashboardLayoutStore.ts:136,160` para falha de gravação de layout, `src/lib/security.ts:21` para tentativa de XSS) **não produzem sinal algum** no console. O único destino restante é a Edge Function `telemetry`, que só dispara com sessão autenticada (`:114-115`) e cujo envio falha em silêncio (`:130-132`). Em dev, um erro de gravação de layout ou de auditoria é indistinguível de sucesso. Gravidade: **ALTA (observabilidade zero)**.

### #2 — A suíte de telemetria do logger está cega (mock incompleto)

Detalhado na seção de diagnóstico. 3 testes falham e outros 3 passam vacuamente porque `invokeMock` nunca é chamado. Rate-limit (`src/lib/__tests__/logger.fuzz.test.ts:158-165`), batching (`:167-174`) e redaction (`:144-156`) **não têm cobertura efetiva** hoje, apesar de aparecerem no relatório de testes. Correção é no teste (`:18-20` e `src/lib/__tests__/logger.test.ts:6-12`), não no código de produção.

### #3 — `buyerAlertsStore.loadTargetsFromDb` consulta colunas que não existem no schema declarado

`src/stores/buyerAlertsStore.ts:70-74`:
```ts
const { data, error } = await supabase
  .from('profiles')
  .select('id, full_name')
  .eq('organization_id', organizationId)
  .eq('role', 'buyer');
```
Colunas declaradas para `profiles` em `src/integrations/supabase/types.ts` (extraídas por script, sem leitura linha a linha):
`avatar_url, created_at, current_organization_id, department, email, empresa_default_id, full_name, id, phone, preferred_locale, tenant_id, updated_at, user_id`.

Não existe `organization_id` (existe `current_organization_id`) nem `role` (papéis vivem em `user_roles`, tabela separada declarada em types.ts). `npx tsc --noEmit` passa (exit 0) — o tipo não pega esse filtro. Em runtime PostgREST devolveria erro de coluna inexistente, engolido pelo `catch {}` de `:97-99`. **`NAO_VERIFICADO (runtime)`** — não tenho acesso ao banco para confirmar o 400/42703. Duplamente inócuo: a função **não tem nenhum chamador**, então `targets` fica permanentemente `[]` e o painel `BuyerPerformanceAlerts` nunca emite alerta (`src/components/compras/BuyerPerformanceAlerts.tsx:50-51`).

### #4 — `.env.example` documenta a variável errada da chave Supabase

`.env.example` declara `VITE_SUPABASE_ANON_KEY`; o código lê `VITE_SUPABASE_PUBLISHABLE_KEY` (`src/integrations/supabase/client.ts:5`). Quem copiar o `.env.example` sobe o app com a chave `undefined`. Além disso, 6 das 8 variáveis do `.env.example` (`VITE_SUPABASE_ANON_KEY`, `VITE_BITRIX_WEBHOOK_URL`, `VITE_APP_NAME`, `VITE_APP_ENV`, `VITE_ENABLE_ANALYTICS`, `VITE_ENABLE_DEBUG`) têm **0 leituras** em todo o código.

### #5 — 3 chaves i18n usadas não existem em nenhum arquivo de tradução

`src/pages/catalogo-produtos/CatalogoProdutos.tsx:149,150,153` usam `t("catalog.title", …)`, `t("catalog.subtitle", …)`, `t("common.new", …)`. Verificado programaticamente: **nenhum** dos 3 locales (`pt`, `en`, `es`) contém o bloco `catalog` nem a chave `common.new`. O impacto visual é atenuado porque as chamadas passam um default como 2º argumento (fallback em PT), mas as versões `en`/`es` dessa página exibirão texto em português. Simetricamente, **68 das 74 chaves** dos JSONs nunca são referenciadas por `t()`.

### #6 — DOMPurify importado e disponível, sanitização nunca aplicada

`src/lib/security.ts:1` importa `dompurify` e `:15-18` configura allow-list de tags. Como o módulo tem 0 consumidores (Achado ⬛1), **nenhuma string do app passa por sanitização** por esse caminho. Não auditei `dangerouslySetInnerHTML` fora do meu escopo — recomendo cruzamento com o lote de componentes.

### #7 — Segredo de negócio hardcoded no store

`src/stores/slaSettingsStore.ts:37`: `emailRecipients: ['compras@promobrindes.com.br']` — destinatário de e-mail de tenant fixo no código-fonte, em produto que se declara multi-tenant (`current_tenant_id`, `tenants`, `user_tenants` no schema).

### #8 — Estado duplicado store Zustand × TanStack Query

Dois stores fazem I/O de banco por fora do TanStack Query, mantendo cópia própria em localStorage:
- `src/stores/dashboardLayoutStore.ts:92-162` — `loadFromDb`/`saveToDb` contra `dashboard_layouts`, com resolução de conflito escrita à mão (`:111-133`) e persistência paralela em localStorage (`:165`). O `queryClient` já persiste seu cache no mesmo localStorage sob `PROMO_SUPPLY_CACHE` (`src/lib/query-client.ts:48`), com `buster` por usuário (`src/App.tsx:44`) — o store Zustand **não** tem esse buster, então o layout de um usuário sobrevive à troca de conta.
- `src/stores/buyerAlertsStore.ts:68-99` — busca em `profiles` fora do TanStack Query (e quebrada, ver #3).

Os outros três stores (`slaSettings`, `kpiTargets`, `undo`) são puramente locais e não duplicam dados do servidor.

---

## Limites desta auditoria (honestidade)

- **Sem acesso ao banco.** Tudo que depende de schema vivo está marcado `NAO_VERIFICADO (runtime)`: se as 156 Tables / 3 Views / 118 Functions de `types.ts` batem com o banco; se `profiles.organization_id`/`profiles.role` de fato inexistem no servidor (só verifiquei o tipo gerado); se as Edge Functions `telemetry` e as 19 RPCs envolvidas existem.
- **Não reproduzi a 4ª falha nem o abort de 10000 timers** relatados no briefing, em 7 execuções distintas incluindo a suíte completa. Reporto 3 falhas.
- **`src/integrations/supabase/types.ts` não foi lido linha a linha** (fora de escopo). As contagens vieram de parsing programático das chaves de primeiro nível.
- Contagens de consumidores por `grep` cobrem `import ... from`, uso do símbolo por nome (`grep -w`) e barrels (`--include=index.ts`). Não cobrem `import()` dinâmico com string construída em runtime — não encontrei nenhum caso desses no escopo, mas não posso provar ausência.

---

## ARQUIVOS LIDOS

/home/user/promo-supply-v2/src/lib/utils.ts
/home/user/promo-supply-v2/src/lib/supabaseQuery.ts
/home/user/promo-supply-v2/src/lib/safeTruncate.ts
/home/user/promo-supply-v2/src/lib/safeDisplay.ts
/home/user/promo-supply-v2/src/lib/haptics.ts
/home/user/promo-supply-v2/src/lib/query-client.ts
/home/user/promo-supply-v2/src/lib/paginatedFetch.ts
/home/user/promo-supply-v2/src/lib/security.ts
/home/user/promo-supply-v2/src/lib/routePrefetch.ts
/home/user/promo-supply-v2/src/lib/filterClearReporter.ts
/home/user/promo-supply-v2/src/lib/feedbackToast.ts
/home/user/promo-supply-v2/src/lib/secureStorage.ts
/home/user/promo-supply-v2/src/lib/dbMapping.ts
/home/user/promo-supply-v2/src/lib/performance.ts
/home/user/promo-supply-v2/src/lib/exportData.ts
/home/user/promo-supply-v2/src/lib/clearFiltersShortcut.ts
/home/user/promo-supply-v2/src/lib/pdfGenerator.ts
/home/user/promo-supply-v2/src/lib/logger.ts
/home/user/promo-supply-v2/src/lib/imageCompression.ts
/home/user/promo-supply-v2/src/lib/supabaseRpc.ts
/home/user/promo-supply-v2/src/lib/types/browser-extensions.d.ts
/home/user/promo-supply-v2/src/lib/__tests__/logger.fuzz.test.ts
/home/user/promo-supply-v2/src/lib/__tests__/logger.test.ts
/home/user/promo-supply-v2/src/lib/__tests__/fuzzSeed.ts
/home/user/promo-supply-v2/src/stores/slaSettingsStore.ts
/home/user/promo-supply-v2/src/stores/undoStore.ts
/home/user/promo-supply-v2/src/stores/dashboardLayoutStore.ts
/home/user/promo-supply-v2/src/stores/kpiTargetsStore.ts
/home/user/promo-supply-v2/src/stores/buyerAlertsStore.ts
/home/user/promo-supply-v2/src/services/auditService.ts
/home/user/promo-supply-v2/src/services/auditTypes.ts
/home/user/promo-supply-v2/src/schemas/solicitacao.schema.ts
/home/user/promo-supply-v2/src/types/contract.ts
/home/user/promo-supply-v2/src/types/legacyTypes.ts
/home/user/promo-supply-v2/src/i18n/config.ts
/home/user/promo-supply-v2/src/integrations/supabase/client.ts
/home/user/promo-supply-v2/src/locales/pt/translation.json
/home/user/promo-supply-v2/src/locales/en/translation.json
/home/user/promo-supply-v2/src/locales/es/translation.json
/home/user/promo-supply-v2/public/locales/pt/translation.json
/home/user/promo-supply-v2/public/locales/en/translation.json
/home/user/promo-supply-v2/public/locales/es/translation.json
/home/user/promo-supply-v2/.env.example
/home/user/promo-supply-v2/.env (somente nomes das chaves, valores não lidos)
/home/user/promo-supply-v2/src/components/compras/BuyerPerformanceAlerts.tsx (trecho :30-110, para provar consumo de buyerAlertsStore)
/home/user/promo-supply-v2/src/App.tsx (trecho :1-55, para provar wiring de queryClient/persister/usePerformanceMonitor)
/home/user/promo-supply-v2/vite.config.ts (trecho :306-312, alias)
/home/user/promo-supply-v2/tsconfig.json (trecho :7-13, paths)
/home/user/promo-supply-v2/package.json (trecho :12-15, scripts de teste)

Lidos apenas em altitude (contagem programática, sem leitura linha a linha, conforme instrução):
/home/user/promo-supply-v2/src/integrations/supabase/types.ts
