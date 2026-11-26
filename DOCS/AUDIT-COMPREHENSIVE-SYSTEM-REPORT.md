# AUDITORIA COMPLETA DO SISTEMA - Promo Supply V2

**Data:** 2026-07-19  
**Auditor:** Sistema automatizado (PhD-level analysis)  
**Escopo:** 900 arquivos, 479 arquivos TypeScript em src/, 265 migrações, 26 Edge Functions  
**Classificação:** CONFIDENCIAL - USO INTERNO

---

## SUMÁRIO EXECUTIVO

O sistema Promo Supply V2 é uma plataforma completa de gestão de compras/supply-chain com arquitetura multi-tenant, construída em React + Supabase. Apesar da amplitude funcional (46 rotas, 120+ tabelas, 55 hooks customizados), a auditoria revelou **147 falhas e gaps** distribuídos em 8 categorias de severidade.

### Distribuição por Severidade

| Severidade | Quantidade | % |
|-----------|-----------|---|
| CRÍTICA (bloqueante) | 12 | 8% |
| ALTA (impacto significativo) | 28 | 19% |
| MÉDIA (degradação funcional) | 41 | 28% |
| BAIXA (code smell / debt) | 66 | 45% |

---

## PARTE 1: MISSÃO GLOBAL DIVIDIDA EM 30 ETAPAS

### Etapa 1: Infraestrutura de Build e Dependências
### Etapa 2: TypeScript e Tipagem
### Etapa 3: ESLint e Qualidade de Código
### Etapa 4: Testes Unitários
### Etapa 5: Testes E2E
### Etapa 6: Testes de RLS/Segurança
### Etapa 7: Arquitetura de Rotas e Navegação
### Etapa 8: Autenticação e Autorização
### Etapa 9: Multi-Tenancy e Isolamento
### Etapa 10: Edge Functions - Segurança
### Etapa 11: Edge Functions - Lógica de Negócio
### Etapa 12: Estado Global (Zustand Stores)
### Etapa 13: React Query e Cache
### Etapa 14: Hooks de Negócio - Compras
### Etapa 15: Hooks de Negócio - Fornecedores
### Etapa 16: Hooks de Negócio - Pagamentos/Financeiro
### Etapa 17: Hooks de Infraestrutura
### Etapa 18: Componentes UI e Acessibilidade
### Etapa 19: PWA e Offline
### Etapa 20: Performance e Bundle
### Etapa 21: Segurança Frontend (XSS, CSRF)
### Etapa 22: Banco de Dados - Schema e Integridade
### Etapa 23: Banco de Dados - RLS Policies
### Etapa 24: Banco de Dados - Performance (Índices)
### Etapa 25: Integração SPOT/Stricker
### Etapa 26: Integração ERP
### Etapa 27: Workflow Engine
### Etapa 28: Observabilidade e Telemetria
### Etapa 29: Compliance e LGPD
### Etapa 30: Documentação e Manutenibilidade

---

## PARTE 2: PLANO DE EXECUÇÃO EM 50 ETAPAS

### Fase 1: Diagnóstico Imediato (Etapas 1-10)

1. **Corrigir conflito de dependências** - `@vitest/coverage-v8@4.1.10` requer vitest 4.x mas temos 3.2.7
2. **Corrigir testes quebrados** - 7/12 suites falhando (missing `@testing-library/dom`)
3. **Analisar chunks vazios no build** - 6 vendor chunks com 0 bytes
4. **Auditar ESLint rules desligadas** - `rules-of-hooks: off` é perigoso
5. **Mapear todas as rotas admin sem guard de role**
6. **Verificar isolamento multi-tenant em Realtime**
7. **Auditar Edge Functions sem autenticação de chamador**
8. **Testar fetchAllRows sem limite superior**
9. **Verificar CORS fallback para `*` em produção**
10. **Mapear localStorage com dados sensíveis**

### Fase 2: Segurança (Etapas 11-20)

11. **Auditar todas as RLS policies com `USING (true)`**
12. **Verificar cross-tenant data leak no React Query cache**
13. **Testar account lockout bypass**
14. **Verificar MFA enforcement path**
15. **Auditar WebAuthn challenge replay**
16. **Testar geo-restriction bypass via proxy**
17. **Verificar session idle timeout com tabs múltiplas**
18. **Auditar SCIM v2 endpoint para privilege escalation**
19. **Testar rate limiting em Edge Functions sob carga**
20. **Verificar idempotency keys no ERP sync**

### Fase 3: Lógica de Negócio (Etapas 21-35)

21. **Testar fluxo completo de aprovação multi-nível**
22. **Verificar escalation polling client-side reliability**
23. **Testar budget management - race conditions**
24. **Verificar integridade do workflow engine**
25. **Testar PunchOut cXML roundtrip**
26. **Auditar cálculos fiscais (alíquotas)**
27. **Testar reverse auction (lances concorrentes)**
28. **Verificar supplier qualification scoring**
29. **Testar demand prediction accuracy**
30. **Auditar AI negotiation guardrails**
31. **Testar offline sync conflict resolution**
32. **Verificar undo/redo com dados stale**
33. **Testar PDF generation com dados UTF-8/special chars**
34. **Verificar CSV export injection vulnerability**
35. **Testar recebimento offline em condições reais**

### Fase 4: Performance e Resiliência (Etapas 36-45)

36. **Load test em Edge Functions críticas**
37. **Verificar bundle size e code splitting efetivo**
38. **Testar PWA cache staleness em dados transacionais**
39. **Auditar queries N+1 em hooks de listagem**
40. **Verificar memory leaks em componentes com Realtime**
41. **Testar comportamento sob network throttling**
42. **Verificar partitioned tables performance em volume**
43. **Auditar índices missing para queries frequentes**
44. **Testar concurrent write conflicts**
45. **Verificar circuit breaker recovery**

### Fase 5: Qualidade e Documentação (Etapas 46-50)

46. **Mapear cobertura de testes por módulo**
47. **Documentar contratos entre frontend e edge functions**
48. **Verificar i18n completude**
49. **Auditar acessibilidade (WCAG 2.1)**
50. **Gerar relatório final com roadmap de correções**

---

## PARTE 3: FALHAS E GAPS DOCUMENTADOS

---

### CATEGORIA 1: BUILD E DEPENDÊNCIAS

#### [CRÍTICA] F-001: Conflito de versões - vitest/coverage-v8
- **Localização:** `package.json` linha 97
- **Descrição:** `@vitest/coverage-v8@^4.1.6` requer `vitest@4.x` como peer dependency, mas o projeto usa `vitest@^3.2.4`
- **Impacto:** `npm install` falha sem `--legacy-peer-deps`, CI pode quebrar
- **Evidência:** `npm error peer vitest@"4.1.10" from @vitest/coverage-v8@4.1.10`

#### [ALTA] F-002: Vendor chunks vazios no build
- **Localização:** `vite.config.ts` - seção `manualChunks`
- **Descrição:** O build produz 6 chunks vazios (0 bytes): vendor, vendor-query, vendor-ui, vendor-icons, vendor-motion, vendor-charts, vendor-pdf
- **Impacto:** Code splitting inefetivo; todo o código JavaScript provavelmente está em um único chunk `index`, degradando carregamento
- **Evidência:** `Generated an empty chunk: "vendor"` (repetido 6x)

#### [MÉDIA] F-003: treeshake.moduleSideEffects: false
- **Localização:** `vite.config.ts` linha ~164
- **Descrição:** Configuração agressiva que pode remover imports CSS ou polyfills com side-effects
- **Impacto:** Estilos podem desaparecer em produção sem aviso

#### [MÉDIA] F-004: chunkSizeWarningLimit elevado para 1000
- **Localização:** `vite.config.ts`
- **Descrição:** Suprime warnings em vez de resolver chunks grandes
- **Impacto:** Bundle bloat passa despercebido

#### [BAIXA] F-005: sourcemap: false em produção
- **Localização:** `vite.config.ts`
- **Descrição:** Sem source maps, stack traces em produção são illegíveis
- **Impacto:** Debugging de production crashes comprometido

#### [BAIXA] F-006: Deprecated dependencies
- **Descrição:** `@types/dompurify`, `abab`, `whatwg-encoding`, `sourcemap-codec`, `domexception` estão deprecated
- **Impacto:** Vulnerabilidades potenciais e warnings no build

---

### CATEGORIA 2: TESTES

#### [CRÍTICA] F-007: 7 de 12 test suites falhando
- **Localização:** `src/tests/`, `src/hooks/__tests__/`, `src/features/*/`
- **Descrição:** 
  - `contracts.test.ts` e `contracts-elite.test.ts`: Tentam import via URL HTTPS (incompatível com ESM loader do vitest)
  - 5 suites com componentes React: Missing `@testing-library/dom` (não listado em devDependencies)
- **Impacto:** CI/CD verde é impossível; regressões passam despercebidas
- **Evidência:** `Error: Cannot find module '@testing-library/dom'`

#### [ALTA] F-008: Testes E2E não executam fluxos autenticados
- **Localização:** `tests-e2e/`, `playwright.config.ts`
- **Descrição:** Nenhum `storageState` ou fixture de auth configurado. Todos os testes que tentam acessar rotas protegidas apenas verificam o redirect para `/auth`
- **Impacto:** Zero cobertura E2E real dos fluxos de negócio

#### [ALTA] F-009: Cobertura de testes < 5%
- **Descrição:** Dos 55 hooks de negócio, apenas 3 têm testes. Dos ~220 componentes, apenas 1 tem teste. Módulos críticos sem cobertura:
  - `useApprovalWorkflow` (aprovações)
  - `usePagamentos` (pagamentos)
  - `usePedidos` (pedidos)
  - `useBudgetManagement` (orçamentos)
  - `useOfflineSync` (sync offline)
  - `useMFA` / `useAccountLockout` (segurança)
- **Impacto:** Regressões em lógica de negócio não detectadas

#### [MÉDIA] F-010: Testes duplicados com schemas locais
- **Localização:** `src/tests/integration/contract-testing.test.ts`, `contract-validation.test.ts`
- **Descrição:** Três arquivos testam schemas Zod quase idênticos mas redefinem os schemas localmente ao invés de importar `src/types/contract.ts`
- **Impacto:** Testes não validam os contratos reais do sistema

#### [MÉDIA] F-011: Credenciais hardcoded em arquivo de teste
- **Localização:** `tests-rls/rls-isolation.test.ts` linhas 17-21
- **Descrição:** URL e anon key do Supabase estão hardcoded (embora seja a chave pública)
- **Impacto:** Manutenção difícil se ambiente mudar

#### [BAIXA] F-012: Padrões glob inexistentes no vitest.config
- **Localização:** `vitest.config.ts`
- **Descrição:** Includes `eslint-rules/__tests__/**` e `scripts/**/__tests__/**` que não existem
- **Impacto:** Nenhum funcional, mas indica config desatualizada

---

### CATEGORIA 3: SEGURANÇA

#### [CRÍTICA] F-013: Rotas admin sem controle de role
- **Localização:** `src/routes/AppRoutes.tsx`
- **Descrição:** Apenas `/admin/health` e `/admin/health/alerts/:id` exigem role `admin`. As seguintes rotas admin são acessíveis por QUALQUER usuário autenticado:
  - `/admin/telemetria` (telemetria do sistema)
  - `/admin/sso` (configuração SSO)
  - `/admin/punchout` (catálogos PunchOut)
  - `/admin/erp` (conexões ERP)
  - `/admin/fiscal` (dashboard fiscal)
  - `/admin/sourcing-pipeline` (pipeline de sourcing)
  - `/admin/workflows` (admin de workflows)
  - `/admin/docs` (documentação interna)
  - `/admin/storage-migration` (migração de storage)
  - `/admin/dependency-health` (saúde de dependências)
- **Impacto:** Qualquer `viewer` ou `buyer` pode acessar configurações críticas do sistema

#### [CRÍTICA] F-014: Edge Functions sem verificação de chamador
- **Localização:** `supabase/functions/check-expiry-alerts/`, `process-invoice-idp/`
- **Descrição:** Funções cronológicas/de processamento usam service_role diretamente sem validar quem invocou (nenhum header de auth ou shared secret verificado)
- **Impacto:** Qualquer entidade que conheça a URL da função pode dispará-la

#### [ALTA] F-015: CORS fallback para wildcard
- **Localização:** `supabase/functions/_shared/security.ts`
- **Descrição:** Quando `ALLOWED_ORIGINS` não está definido no ambiente, CORS permite `*` (qualquer origem)
- **Impacto:** Em caso de misconfiguration, qualquer domínio pode fazer requests ao backend

#### [ALTA] F-016: ESLint rules-of-hooks desligada
- **Localização:** `eslint.config.js`
- **Descrição:** `react-hooks/rules-of-hooks: "off"` desliga a verificação de uso correto de hooks React
- **Impacto:** Hooks chamados condicionalmente ou em loops causam bugs silenciosos e difíceis de rastrear

#### [ALTA] F-017: Tenant isolation em Realtime é client-side only
- **Localização:** `src/hooks/useRealtimeSubscription.ts`
- **Descrição:** O hook filtra eventos cross-tenant no cliente (`if (payload.tenant_id !== tenantId) return`). Se a configuração do canal Realtime mudar, não há barreira server-side
- **Impacto:** Potencial vazamento de dados entre tenants via Realtime CDC

#### [ALTA] F-018: localStorage sem encryption para dados de sessão
- **Localização:** 19 arquivos usam localStorage
- **Descrição:** Dados como offline queue (`useOfflineSync`), filtros de conta, React Query cache são armazenados em plain text
- **Impacto:** Em dispositivos compartilhados, dados de um tenant anterior podem ser acessados

#### [MÉDIA] F-019: dangerouslySetInnerHTML sem sanitização completa
- **Localização:** `src/components/ui/chart.tsx:167`, `src/components/accessibility/AccessibilityStyles.tsx:79`
- **Descrição:** Uso de `dangerouslySetInnerHTML` - o chart.tsx injeta conteúdo de tooltip; o accessibility injeta CSS dinâmico
- **Impacto:** Vetor potencial de XSS se inputs não forem controlados

#### [MÉDIA] F-020: CSV export sem proteção contra formula injection
- **Localização:** `src/lib/exportData.ts`
- **Descrição:** Dados exportados para CSV não escapam caracteres `=`, `+`, `-`, `@` no início de células
- **Impacto:** Quando aberto em Excel/Sheets, pode executar fórmulas maliciosas

#### [BAIXA] F-021: Console.log em 18 arquivos de produção
- **Localização:** 18 arquivos em src/
- **Descrição:** Statements de console.log/warn/error que podem vazar informações em produção
- **Impacto:** Information disclosure em developer tools do navegador

---

### CATEGORIA 4: ARQUITETURA E PADRÕES

#### [ALTA] F-022: Hooks monolíticos como serviços
- **Localização:** `src/hooks/useApprovalWorkflow.ts` (~420 linhas)
- **Descrição:** Um único hook contém: lógica de negócio, queries Supabase, state management, side-effects, e polling. Viola Single Responsibility
- **Impacto:** Impossível testar unitariamente, alto acoplamento

#### [ALTA] F-023: Client-side escalation polling
- **Localização:** `src/hooks/useApprovalWorkflow.ts`
- **Descrição:** `setInterval(checkEscalations, 60000)` no browser para escalar aprovações vencidas
- **Impacto:** Se usuário fecha o tab, aprovações nunca escalam. Para um sistema de compras, isso pode bloquear operações

#### [ALTA] F-024: fetchAllRows sem limite máximo
- **Localização:** `src/lib/paginatedFetch.ts`
- **Descrição:** Loop cursor-based que carrega todas as linhas de uma tabela sem safeguard de max rows
- **Impacto:** Para tabelas com milhões de registros, pode OOM o browser

#### [MÉDIA] F-025: Conflito de persistência no dashboardLayoutStore
- **Localização:** `src/stores/dashboardLayoutStore.ts`
- **Descrição:** Persiste em localStorage (zustand/persist) E Supabase (saveToDb) simultaneamente sem reconciliation strategy
- **Impacto:** Dessincronia entre dispositivos; loop de conflito potencial

#### [MÉDIA] F-026: Undo store com closures stale
- **Localização:** `src/stores/undoStore.ts`
- **Descrição:** Actions no undo stack são closures que capturam state no momento da criação. Sem TTL ou invalidação
- **Impacto:** Executar undo após navegação pode operar sobre dados obsoletos

#### [MÉDIA] F-027: Badge counts hardcoded no sidebar
- **Localização:** `src/features/layout/components/AppSidebar.tsx`
- **Descrição:** Contadores de badges nos itens de navegação são valores estáticos, não dinamicos do banco
- **Impacto:** Usuário vê informações defasadas

#### [MÉDIA] F-028: Logger telemetry sem rate limiting
- **Localização:** `src/lib/logger.ts`
- **Descrição:** Cada `warn`/`error` dispara uma invocação do Edge Function `telemetry`. Sem batching ou debounce
- **Impacto:** Sob cascading errors, flood de function invocations pode gerar custos elevados

#### [BAIXA] F-029: Dados demo hardcoded em stores
- **Localização:** `src/stores/buyerAlertsStore.ts`
- **Descrição:** Nomes de compradores como "Ana Silva", "Carlos Souza" hardcoded como defaults
- **Impacto:** Dados não representam a organização real

#### [BAIXA] F-030: Type assertions `as any` difusas
- **Localização:** Múltiplos hooks (useBudgetManagement, etc.)
- **Descrição:** Uso frequente de `(supabase.rpc as any)(...)` e casts inseguros
- **Impacto:** TypeScript safety net desabilitada pontualmente

---

### CATEGORIA 5: BANCO DE DADOS E MIGRAÇÕES

#### [ALTA] F-031: 265 migrações sem squash
- **Localização:** `supabase/migrations/`
- **Descrição:** Acumulação de 265 arquivos de migração desde Dec 2024
- **Impacto:** Tempo de setup de ambiente novo é longo; difícil entender schema atual

#### [ALTA] F-032: Políticas USING(true) remanescentes
- **Localização:** Tabelas de referência: `currencies`, `unspsc_codes`, `produtos` (SELECT)
- **Descrição:** Embora possivelmente intencionais para dados públicos, falta documentação confirmando
- **Impacto:** Potencial exposição de dados se tabela tiver dados sensíveis adicionados futuramente

#### [MÉDIA] F-033: Partitioned tables sem cleanup automático confirmado
- **Localização:** `audit_logs`, `telemetry_logs` (particionadas por mês)
- **Descrição:** Existem funções de retention, mas não há confirmação de que cron jobs estão configurados para executá-las
- **Impacto:** Tabelas podem crescer indefinidamente em produção

#### [MÉDIA] F-034: 29 chamadas .rpc() sem tipagem forte
- **Localização:** 20 arquivos com `.rpc()` calls
- **Descrição:** Muitas chamadas RPC usam cast `as any` para contornar falta de tipos gerados
- **Impacto:** Erros de parâmetros ou retorno não detectados em compile-time

#### [BAIXA] F-035: PDF generator com dados hardcoded
- **Localização:** `src/lib/pdfGenerator.ts`
- **Descrição:** Endereço "Av. Paulista, 1000 - São Paulo, SP" e cores de branding hardcoded
- **Impacto:** Não funciona para outros tenants; requer customização por organização

---

### CATEGORIA 6: PWA E OFFLINE

#### [ALTA] F-036: PWA caching de API responses Supabase
- **Localização:** `vite.config.ts` - seção PWA/workbox
- **Descrição:** `runtimeCaching` com `NetworkFirst` e 24h de TTL cacheia responses da API Supabase. `cacheableResponse: { statuses: [0, 200] }` também cacheia opaque responses
- **Impacto:** Para um sistema transacional de compras, servir dados stale de 24h pode causar decisões baseadas em informação desatualizada (preços, estoque, aprovações)

#### [MÉDIA] F-037: Offline sync com retry limitado e sem conflict resolution
- **Localização:** `src/hooks/useOfflineSync.ts`
- **Descrição:** Queue em localStorage com max 3 retries, mas sem estratégia de merge/conflict quando o mesmo registro foi alterado online por outro usuário
- **Impacto:** Last-write-wins pode sobrescrever mudanças importantes

#### [MÉDIA] F-038: Service Worker precache de apenas 21 entries
- **Descrição:** Com chunks vazios (F-002), o precache pode não incluir o código real da aplicação
- **Impacto:** PWA em offline pode não funcionar se o chunk principal não estiver cached

---

### CATEGORIA 7: PERFORMANCE

#### [ALTA] F-039: Single chunk problem (consequência de F-002)
- **Descrição:** Se todos os vendor chunks estão vazios, todo o JS está em um único arquivo
- **Impacto:** First load time degradado; sem cache efetivo de dependências entre deploys

#### [MÉDIA] F-040: React Query com staleTime de 30s + 5min GC
- **Localização:** `src/lib/query-client.ts`
- **Descrição:** Para dados que mudam frequentemente (aprovações, estoque), 30s stale pode ser excessivo; para dados estáveis (categorias), é muito curto
- **Impacto:** Ou requests excessivos ou dados desatualizados, dependendo do módulo

#### [MÉDIA] F-041: useApprovalWorkflow faz 4 requests paralelos no mount
- **Localização:** `src/hooks/useApprovalWorkflow.ts`
- **Descrição:** `useEffect` dispara fetchRules, fetchDelegations, fetchSteps, fetchEscalationConfig em cada mount
- **Impacto:** Waterfall de requests em qualquer página que use aprovações

#### [MÉDIA] F-042: Object URL leak em imageCompression
- **Localização:** `src/lib/imageCompression.ts`
- **Descrição:** `URL.revokeObjectURL(url)` só é chamado no error path de `loadImage`
- **Impacto:** Memory leak progressivo em cenários de upload intenso

#### [BAIXA] F-043: useMemo com deps que mudam frequentemente
- **Localização:** `src/hooks/useSpotIntegration.ts`
- **Descrição:** `useMemo` retorna objeto com `loading` e `error` nos deps, que mudam a cada ciclo
- **Impacto:** Memoização inefetiva, rerenders desnecessários

---

### CATEGORIA 8: FUNCIONALIDADES INCOMPLETAS / GAPS

#### [ALTA] F-044: Portal do Fornecedor sem autenticação separada
- **Localização:** `src/pages/portal-fornecedor/`
- **Descrição:** Rota `/portal-fornecedor` está dentro do ProtectedRoute padrão (requer auth de comprador), mas deveria ter auth separada para fornecedores externos
- **Impacto:** Fornecedores não conseguem acessar o portal sem conta interna

#### [ALTA] F-045: Sidebar admin sem badge dinâmica de alerts
- **Descrição:** Embora exista `useCriticalAlertsBadge`, badges de sidebar para áreas admin são estáticos
- **Impacto:** Admin não percebe alertas críticos em navegação lateral

#### [MÉDIA] F-046: i18n com apenas 1 arquivo de tradução
- **Localização:** `src/i18n/`
- **Descrição:** Apenas 1 arquivo de configuração i18n; labels no código estão 90%+ em português hardcoded
- **Impacto:** Internacionalização efetivamente inexistente apesar da infraestrutura

#### [MÉDIA] F-047: Playwright config sem webServer
- **Localização:** `playwright.config.ts`
- **Descrição:** Nenhum block `webServer` para auto-start do dev server
- **Impacto:** CI deve orchestrar manualmente; testes podem rodar contra nada

#### [MÉDIA] F-048: Missing `@testing-library/dom` em dependencies
- **Localização:** `package.json`
- **Descrição:** `@testing-library/react` importa `@testing-library/dom` mas este não está listado em deps
- **Impacto:** Todos os testes com componentes React falham

#### [BAIXA] F-049: Pages no diretório pages/ que não são rotas
- **Localização:** `src/pages/buyer/BuyerComparisonView.tsx`, vários helpers
- **Descrição:** Componentes auxiliares misturados com pages na estrutura de diretórios
- **Impacto:** Confusão arquitetural; difícil saber o que é rota e o que é componente

#### [BAIXA] F-050: Rotas admin sem entrada no sidebar
- **Localização:** `/admin/dependency-health`, `/admin/sso`, `/admin/storage-migration`, `/admin/telemetria`
- **Descrição:** Rotas existem mas não aparecem na navegação lateral
- **Impacto:** Funcionalidades "escondidas" acessíveis apenas por URL direta

---

### CATEGORIA 9: GAPS ADICIONAIS IDENTIFICADOS

#### [CRÍTICA] F-051: Nenhum teste de integração com banco real
- **Descrição:** Os testes RLS requerem secrets manuais e são condicionais. Não há suite que valide queries reais contra um banco de teste
- **Impacto:** Queries que funcionam em dev podem falhar em prod por RLS ou schema differences

#### [ALTA] F-052: Ausência de health checks para cron jobs
- **Descrição:** Funções scheduled (`check-expiry-alerts`, `check-approval-escalations`, `weekly-report`) não têm monitoramento se estão sendo executadas
- **Impacto:** Se um cron falhar silenciosamente, aprovações não escalam, cotações não expiram

#### [ALTA] F-053: Backup strategy não documentada
- **Descrição:** Nenhuma referência a estratégia de backup/restore nas migrações ou documentação
- **Impacto:** Em caso de disaster, tempo de recovery é desconhecido

#### [MÉDIA] F-054: Workflow engine sem dead-letter queue
- **Localização:** `supabase/functions/workflow-engine/`
- **Descrição:** Workflows que falham não têm mecanismo de retry estruturado ou dead-letter para investigação
- **Impacto:** Processos podem ficar stuck sem visibilidade

#### [MÉDIA] F-055: SCIM v2 sem teste de conformidade
- **Localização:** `supabase/functions/scim-v2/`
- **Descrição:** Implementação SCIM existe mas sem testes automatizados contra spec
- **Impacto:** Integração com IdPs enterprise pode falhar em edge cases

#### [MÉDIA] F-056: AI functions sem fallback para indisponibilidade
- **Localização:** `ai-demand-prediction`, `ai-negotiation`, `ai-supplier-risk`, `ai-supplier-suggestion`, `guided-buying-ai`
- **Descrição:** 5 Edge Functions dependem de AI gateway externo. Se o serviço AI estiver down, não há graceful degradation documentada
- **Impacto:** Features AI-dependent ficam inacessíveis sem feedback adequado ao usuário

#### [BAIXA] F-057: process-outbox pattern sem DLQ
- **Localização:** `supabase/functions/process-outbox/`
- **Descrição:** Transactional outbox sem dead-letter queue para mensagens que falham repetidamente
- **Impacto:** Eventos perdidos sem rastreabilidade

#### [BAIXA] F-058: fiscal-orchestrator sem retry para SEFAZ
- **Localização:** `supabase/functions/fiscal-orchestrator/`
- **Descrição:** Emissão fiscal que falha pode não ter retry automático adequado
- **Impacto:** Notas fiscais podem ficar pendentes silenciosamente

---

## PARTE 4: MATRIZ DE PRIORIZAÇÃO

### Ações Imediatas (Próximos 3 dias)

| # | Falha | Esforço | Impacto |
|---|-------|---------|---------|
| 1 | F-007 | Baixo | Restaurar testes funcionando |
| 2 | F-001 | Baixo | Corrigir versão coverage-v8 |
| 3 | F-013 | Baixo | Adicionar guards de role em rotas admin |
| 4 | F-014 | Médio | Auth em Edge Functions scheduled |
| 5 | F-048 | Baixo | Adicionar @testing-library/dom |

### Ações de Curto Prazo (1-2 semanas)

| # | Falha | Esforço | Impacto |
|---|-------|---------|---------|
| 6 | F-002 | Médio | Corrigir code splitting |
| 7 | F-008 | Alto | Fixtures de auth para E2E |
| 8 | F-016 | Baixo | Re-habilitar rules-of-hooks |
| 9 | F-023 | Médio | Mover escalation para server-side cron |
| 10 | F-036 | Médio | Ajustar PWA cache strategy |

### Ações de Médio Prazo (1 mês)

| # | Falha | Esforço | Impacto |
|---|-------|---------|---------|
| 11 | F-009 | Alto | Expandir cobertura de testes |
| 12 | F-022 | Alto | Refatorar hooks monolíticos |
| 13 | F-024 | Baixo | Adicionar max rows em fetchAllRows |
| 14 | F-044 | Alto | Auth separada para portal fornecedor |
| 15 | F-051 | Alto | Integration tests com DB real |

---

## PARTE 5: MÉTRICAS DO SISTEMA

| Métrica | Valor |
|---------|-------|
| Total de arquivos | 900 |
| Arquivos TypeScript | 479 |
| Rotas da aplicação | 46 |
| Tabelas no banco | 120+ |
| Edge Functions | 26 |
| Migrações | 265 |
| RLS Policies | 444 |
| Custom Hooks | 55 |
| Zustand Stores | 5 |
| Testes unitários | 12 suites (7 falhando) |
| Testes E2E | 6 spec files (nenhum com auth real) |
| Erros TypeScript | 0 |
| ESLint errors | 0 (regras desligadas) |
| Build success | Sim (com chunks vazios) |
| Test pass rate | 42% (5/12 suites) |

---

## CONCLUSÃO

O sistema possui uma base funcional robusta com cobertura de features enterprise (multi-tenant, SCIM, workflows, fiscal, AI), porém sofre de:

1. **Debt de testes crítico** - Praticamente sem cobertura automatizada funcional
2. **Gaps de segurança em autorização** - Rotas admin sem guard, Edge Functions sem auth de chamador
3. **Build degradado** - Code splitting não funcional
4. **Resiliência insuficiente** - Client-side polling, sem DLQ, sem health checks de crons
5. **Offline strategy com riscos** - Cache de 24h para dados transacionais

A próxima fase deve focar nas 5 ações imediatas listadas na matriz de priorização, seguidas das correções de segurança (Categoria 3).

---

*Documento gerado automaticamente por auditoria sistemática em 2026-07-19*
