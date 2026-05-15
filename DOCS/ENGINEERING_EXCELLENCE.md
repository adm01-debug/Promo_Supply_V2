# Guia de Excelência e Perfeição em Engenharia de Software Full Stack

Este guia foi elaborado para elevar o padrão de desenvolvimento deste projeto ao nível de excelência técnica e operacional, seguindo os princípios de engenharia sênior e garantia de qualidade (QA).

---

## 1. Habilidades Técnicas: Frontend Moderno e Performante

### 1.1 Otimização de Performance
*   **Lazy Loading & Code Splitting:** Já implementado nas rotas (`AppRoutes.tsx`). O próximo passo é aplicar em componentes pesados de UI (ex: gráficos complexos do Dashboard) usando `React.lazy` e `Suspense`.
*   **Renderização Eficiente:** Utilizar `useMemo` e `useCallback` estrategicamente para evitar re-renders desnecessários em listas grandes (ex: tabelas de cotações).
*   **Asset Optimization:** Implementar compressão automática de imagens (já iniciado em `useImageCompression.ts`) e garantir o uso de formatos modernos como WebP.
*   **Métricas Core Web Vitals:** Monitorar LCP (Largest Contentful Paint) e CLS (Cumulative Layout Shift) usando a extensão Lighthouse do Chrome.

### 1.2 Arquitetura Escalável
*   **Feature-Based Folder Structure:** Migrar de uma estrutura por tipo (hooks, components) para uma estrutura por funcionalidade (ex: `features/auth`, `features/compras`) para facilitar a manutenção em escala.
*   **Design System:** Continuar a expansão do `tailwind.config.ts` para garantir que 100% dos tokens de design sejam semânticos.

---

## 2. Backend e Infraestrutura: Segurança e Resiliência

### 2.1 Segurança (OWASP Top 10)
*   **Sanitização de Dados:** Garantir que todas as chamadas via Supabase RPC e Edge Functions validem tipos rigorosamente usando `zod`.
*   **RLS (Row Level Security):** Auditoria contínua de políticas para garantir isolamento total entre tenants (já iniciado com `tenant_id`).

### 2.2 Estratégias de Caching e Estado
*   **Query Caching:** Otimizar o `PersistQueryClientProvider` para ajustar o `staleTime` baseado na volatilidade dos dados (ex: cotações precisam de staleTime menor que perfis).
*   **Edge Computing:** Utilizar Supabase Edge Functions para processamento pesado fora do cliente, mantendo a latência baixa.

---

## 3. Qualidade de Código e QA

### 3.1 Testes Automatizados
*   **Unitários:** Implementar testes para hooks críticos (ex: `useAuth`, `usePermissions`) usando Vitest.
*   **E2E (End-to-End):** Configurar Playwright ou Cypress para fluxos críticos como "Criar Cotação" e "Aprovar Pedido".

### 3.2 Análise Estática
*   **Strict TypeScript:** Habilitar `strict: true` no `tsconfig.json` para eliminar gradualmente o uso de `any`.
*   **Linting:** Configurar regras customizadas no `eslint.config.js` para proibir padrões de código legados.

---

## 4. Soft Skills e Produtividade

### 4.1 Documentação Progressiva
*   **ADRs (Architecture Decision Records):** Registrar decisões arquiteturais importantes para contexto futuro do time.
*   **Storybook:** Implementar Storybook para documentar e testar componentes isoladamente.

### 4.2 Automação de Workflow
*   **Git Hooks:** Usar `husky` e `lint-staged` para garantir que nenhum código quebre o build ou as regras de estilo antes do commit.

---

## 5. Próximos Passos: Como Começar Hoje

1.  **Refatoração de Tipos:** Substituir o que resta de `any` em hooks de dados por interfaces geradas pelo Supabase CLI.
2.  **Profiling de Renderização:** Usar o React DevTools "Profiler" para identificar o gargalo de performance no Dashboard Executivo.
3.  **Setup de Testes:** Criar o primeiro arquivo de teste em `src/hooks/__tests__/useAuth.test.ts`.

---
*Documento mantido por [Especialista Sênior em Engenharia / PhD QA]*
