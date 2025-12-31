# 📦 Sistema de Compras - Documentação Técnica Completa

> Documento de referência para replicação de padrões em novos projetos

---

## 📋 Índice

1. [Stack Tecnológica](#-stack-tecnológica)
2. [Dependências e Bibliotecas](#-dependências-e-bibliotecas)
3. [Estrutura do Banco de Dados](#-estrutura-do-banco-de-dados)
4. [Edge Functions (IA)](#-edge-functions-ia)
5. [Hooks Customizados](#-hooks-customizados)
6. [Stores (Estado Global)](#-stores-estado-global)
7. [Serviços](#-serviços)
8. [Páginas do Sistema](#-páginas-do-sistema)
9. [Componentes Principais](#-componentes-principais)
10. [Design System](#-design-system)
11. [Controle de Acesso](#-controle-de-acesso)
12. [PWA (Progressive Web App)](#-pwa-progressive-web-app)
13. [Atalhos de Teclado](#-atalhos-de-teclado)
14. [Padrões de Código](#-padrões-de-código)

---

## 🛠 Stack Tecnológica

| Tecnologia | Versão | Função |
|------------|--------|--------|
| **React** | ^18.3.1 | Framework UI |
| **Vite** | - | Build tool e dev server |
| **TypeScript** | - | Tipagem estática |
| **Tailwind CSS** | - | Estilização utility-first |
| **shadcn/ui** | - | Biblioteca de componentes |
| **Lovable Cloud** | - | Backend (Supabase) |

---

## 📦 Dependências e Bibliotecas

### Gerenciamento de Estado

| Biblioteca | Versão | Função | Uso no Projeto |
|------------|--------|--------|----------------|
| `zustand` | ^5.0.9 | Estado global leve | Stores persistentes (SLA, layout, KPIs) |
| `@tanstack/react-query` | ^5.83.0 | Cache e sincronização de dados | Todas as operações CRUD |

### Roteamento

| Biblioteca | Versão | Função | Uso no Projeto |
|------------|--------|--------|----------------|
| `react-router-dom` | ^6.30.1 | Navegação SPA | Rotas públicas e protegidas |

### Componentes UI (Radix UI)

| Biblioteca | Função |
|------------|--------|
| `@radix-ui/react-accordion` | Painéis expansíveis |
| `@radix-ui/react-alert-dialog` | Diálogos de confirmação |
| `@radix-ui/react-avatar` | Avatares de usuário |
| `@radix-ui/react-checkbox` | Checkboxes acessíveis |
| `@radix-ui/react-collapsible` | Seções colapsáveis |
| `@radix-ui/react-context-menu` | Menus de contexto |
| `@radix-ui/react-dialog` | Modais |
| `@radix-ui/react-dropdown-menu` | Menus dropdown |
| `@radix-ui/react-hover-card` | Cards ao passar o mouse |
| `@radix-ui/react-label` | Labels acessíveis |
| `@radix-ui/react-menubar` | Barras de menu |
| `@radix-ui/react-navigation-menu` | Navegação complexa |
| `@radix-ui/react-popover` | Popovers |
| `@radix-ui/react-progress` | Barras de progresso |
| `@radix-ui/react-radio-group` | Grupos de radio |
| `@radix-ui/react-scroll-area` | Scroll customizado |
| `@radix-ui/react-select` | Selects acessíveis |
| `@radix-ui/react-separator` | Separadores visuais |
| `@radix-ui/react-slider` | Sliders |
| `@radix-ui/react-slot` | Composição de componentes |
| `@radix-ui/react-switch` | Switches toggle |
| `@radix-ui/react-tabs` | Tabs |
| `@radix-ui/react-toast` | Toasts/notificações |
| `@radix-ui/react-toggle` | Botões toggle |
| `@radix-ui/react-toggle-group` | Grupos de toggle |
| `@radix-ui/react-tooltip` | Tooltips |

### Drag and Drop

| Biblioteca | Versão | Função | Uso no Projeto |
|------------|--------|--------|----------------|
| `@dnd-kit/core` | ^6.3.1 | Core drag and drop | Kanban, ordenação |
| `@dnd-kit/sortable` | ^10.0.0 | Ordenação de listas | Kanban board |
| `@dnd-kit/utilities` | ^3.2.2 | Utilitários DnD | Helpers |
| `@hello-pangea/dnd` | ^17.0.0 | DnD alternativo | Kanban alternativo |

### Formulários e Validação

| Biblioteca | Versão | Função | Uso no Projeto |
|------------|--------|--------|----------------|
| `react-hook-form` | ^7.61.1 | Gerenciamento de forms | Todos os formulários |
| `@hookform/resolvers` | ^3.10.0 | Resolvers de validação | Integração com Zod |
| `zod` | ^3.25.76 | Schema de validação | Validação de dados |

### Gráficos e Visualização

| Biblioteca | Versão | Função | Uso no Projeto |
|------------|--------|--------|----------------|
| `recharts` | ^2.15.4 | Gráficos React | Dashboards, relatórios |

### Data e Tempo

| Biblioteca | Versão | Função | Uso no Projeto |
|------------|--------|--------|----------------|
| `date-fns` | ^3.6.0 | Manipulação de datas | Formatação, cálculos |
| `react-day-picker` | ^8.10.1 | Seletor de datas | Calendários |

### Ícones

| Biblioteca | Versão | Função | Uso no Projeto |
|------------|--------|--------|----------------|
| `lucide-react` | ^0.462.0 | Biblioteca de ícones | Todos os ícones |

### Notificações

| Biblioteca | Versão | Função | Uso no Projeto |
|------------|--------|--------|----------------|
| `sonner` | ^1.7.4 | Toasts modernos | Feedback ao usuário |

### Outros UI

| Biblioteca | Versão | Função | Uso no Projeto |
|------------|--------|--------|----------------|
| `embla-carousel-react` | ^8.6.0 | Carrosséis | Slideshows |
| `react-resizable-panels` | ^2.1.9 | Painéis redimensionáveis | Layouts flexíveis |
| `vaul` | ^0.9.9 | Drawers mobile | Menus mobile |
| `cmdk` | ^1.1.1 | Command palette | Busca global (Ctrl+K) |
| `input-otp` | ^1.4.2 | Input de OTP | Verificação |

### Utilitários CSS

| Biblioteca | Versão | Função | Uso no Projeto |
|------------|--------|--------|----------------|
| `class-variance-authority` | ^0.7.1 | Variantes de componentes | Botões, badges |
| `clsx` | ^2.1.1 | Merge de classes | Condicional de classes |
| `tailwind-merge` | ^2.6.0 | Merge inteligente Tailwind | Evita conflitos |
| `tailwindcss-animate` | ^1.0.7 | Animações Tailwind | Transições |

### PWA

| Biblioteca | Versão | Função | Uso no Projeto |
|------------|--------|--------|----------------|
| `vite-plugin-pwa` | ^1.2.0 | Plugin PWA para Vite | Service worker, manifest |

### Temas

| Biblioteca | Versão | Função | Uso no Projeto |
|------------|--------|--------|----------------|
| `next-themes` | ^0.3.0 | Gerenciamento de tema | Dark/light mode |

---

## 🗄 Estrutura do Banco de Dados

### Tabelas Core

| Tabela | Função | RLS | Campos Principais |
|--------|--------|-----|-------------------|
| `solicitacoes` | Requisições de compra | ✅ | id, numero, titulo, descricao, status, prioridade, categoria_id, solicitante_id, comprador_id, data_necessidade, valor_estimado |
| `fornecedores` | Cadastro de fornecedores | ✅ | id, nome, cnpj, email, telefone, endereco, contato_nome, status, rating, categoria |
| `cotacoes` | Cotações de fornecedores | ✅ | id, solicitacao_id, fornecedor_id, valor_unitario, valor_total, prazo_entrega, condicoes_pagamento, status, validade |
| `pedidos` | Pedidos de compra | ✅ | id, numero, solicitacao_id, fornecedor_id, cotacao_id, valor_total, status, data_emissao, data_entrega_prevista |
| `pagamentos` | Controle de pagamentos | ✅ | id, pedido_id, valor, data_vencimento, data_pagamento, status, metodo_pagamento, comprovante_url |
| `contracts` | Contratos com fornecedores | ✅ | id, numero, fornecedor_id, titulo, tipo, valor_total, data_inicio, data_fim, status |

### Tabelas de Suporte

| Tabela | Função | RLS | Campos Principais |
|--------|--------|-----|-------------------|
| `categorias` | Categorias de produtos | ✅ | id, nome, descricao, cor |
| `produtos` | Catálogo de produtos | ✅ | id, nome, descricao, unidade, preco_referencia, categoria_id |
| `itens_solicitacao` | Itens das solicitações | ✅ | id, solicitacao_id, produto_id, quantidade, valor_unitario, valor_total |
| `itens_cotacao` | Itens das cotações | ✅ | id, cotacao_id, produto_id, quantidade, valor_unitario, valor_total |
| `itens_pedido` | Itens dos pedidos | ✅ | id, pedido_id, produto_id, quantidade, valor_unitario, valor_total |

### Tabelas de Sistema

| Tabela | Função | RLS | Campos Principais |
|--------|--------|-----|-------------------|
| `profiles` | Perfis de usuários | ✅ | id, user_id, full_name, avatar_url, department |
| `user_roles` | Papéis dos usuários | ✅ | id, user_id, role |
| `notifications` | Notificações do sistema | ✅ | id, user_id, title, message, type, read, created_at |
| `audit_logs` | Logs de auditoria | ✅ | id, user_id, action, entity_type, entity_id, old_values, new_values, created_at |
| `approval_workflows` | Fluxos de aprovação | ✅ | id, name, min_value, max_value, required_roles, sequence |
| `approval_requests` | Solicitações de aprovação | ✅ | id, workflow_id, entity_type, entity_id, status, requested_by, approved_by |

### Tabelas de Configuração

| Tabela | Função | RLS | Campos Principais |
|--------|--------|-----|-------------------|
| `sla_configurations` | Configurações de SLA | ✅ | id, entity_type, warning_days, critical_days, target_days |
| `kpi_targets` | Metas de KPIs | ✅ | id, kpi_name, target_value, period, department |

### Enums do Banco

```sql
-- Roles do sistema
CREATE TYPE app_role AS ENUM ('admin', 'coordinator', 'buyer', 'finance');

-- Status de solicitação
CREATE TYPE solicitacao_status AS ENUM ('rascunho', 'pendente', 'em_cotacao', 'aprovada', 'rejeitada', 'em_pedido', 'concluida', 'cancelada');

-- Prioridade
CREATE TYPE prioridade AS ENUM ('baixa', 'media', 'alta', 'urgente');

-- Ações de auditoria
CREATE TYPE audit_action_type AS ENUM ('create', 'update', 'delete', 'approve', 'reject', 'cancel');

-- Entidades auditáveis
CREATE TYPE audit_entity_type AS ENUM ('solicitacao', 'cotacao', 'pedido', 'pagamento', 'fornecedor', 'contrato');
```

### Funções do Banco

| Função | Parâmetros | Retorno | Uso |
|--------|------------|---------|-----|
| `generate_sequential_number` | prefix TEXT | TEXT | Gera números sequenciais (SOL-001, PED-001) |
| `get_user_role` | user_id UUID | app_role | Retorna o papel do usuário |
| `has_role` | user_id UUID, role app_role | BOOLEAN | Verifica se usuário tem papel |

---

## 🤖 Edge Functions (IA)

### ai-supplier-suggestion

| Atributo | Valor |
|----------|-------|
| **Endpoint** | `/functions/v1/ai-supplier-suggestion` |
| **Modelo** | Lovable AI (Gemini) |
| **Função** | Sugere fornecedores ideais com base em requisitos |
| **Input** | `{ requirements: string, category: string, budget: number }` |
| **Output** | `{ suggestions: Supplier[], reasoning: string }` |

### ai-demand-prediction

| Atributo | Valor |
|----------|-------|
| **Endpoint** | `/functions/v1/ai-demand-prediction` |
| **Modelo** | Lovable AI (Gemini) |
| **Função** | Prevê demanda futura com base em histórico |
| **Input** | `{ category: string, period: string, history: PurchaseData[] }` |
| **Output** | `{ predictions: Prediction[], confidence: number }` |

### ai-supplier-risk

| Atributo | Valor |
|----------|-------|
| **Endpoint** | `/functions/v1/ai-supplier-risk` |
| **Modelo** | Lovable AI (Gemini) |
| **Função** | Analisa risco de fornecedores |
| **Input** | `{ supplier_id: string, metrics: SupplierMetrics }` |
| **Output** | `{ risk_score: number, factors: RiskFactor[], recommendations: string[] }` |

---

## 🪝 Hooks Customizados

### Autenticação

| Hook | Arquivo | Função |
|------|---------|--------|
| `useAuth` | `src/hooks/useAuth.tsx` | Login, logout, signup, verificação de roles |

### CRUD de Entidades

| Hook | Arquivo | Função |
|------|---------|--------|
| `useSolicitacoes` | `src/hooks/useSolicitacoes.ts` | CRUD de solicitações |
| `useFornecedores` | `src/hooks/useFornecedores.ts` | CRUD de fornecedores |
| `useCotacoes` | `src/hooks/useCotacoes.ts` | CRUD de cotações |
| `usePedidos` | `src/hooks/usePedidos.ts` | CRUD de pedidos |
| `usePagamentos` | `src/hooks/usePagamentos.ts` | CRUD de pagamentos |

### Funcionalidades Específicas

| Hook | Arquivo | Função |
|------|---------|--------|
| `useDashboardFilters` | `src/hooks/useDashboardFilters.ts` | Filtros persistentes do dashboard |
| `useNotifications` | `src/hooks/useNotifications.ts` | Sistema de notificações |
| `useApprovalNotifications` | `src/hooks/useApprovalNotifications.ts` | Notificações de aprovação |
| `useSLAMonitor` | `src/hooks/useSLAMonitor.ts` | Monitoramento de SLA |
| `useSupplierSLAMonitor` | `src/hooks/useSupplierSLAMonitor.ts` | SLA por fornecedor |
| `useOfflineSync` | `src/hooks/useOfflineSync.ts` | Sincronização offline |
| `useRealPushNotifications` | `src/hooks/useRealPushNotifications.ts` | Push notifications |
| `useRealtimePushNotifications` | `src/hooks/useRealtimePushNotifications.ts` | Notificações em tempo real |
| `useKeyboardShortcuts` | `src/hooks/useKeyboardShortcuts.ts` | Atalhos de teclado |

### Utilitários UI

| Hook | Arquivo | Função |
|------|---------|--------|
| `use-mobile` | `src/hooks/use-mobile.tsx` | Detecção de dispositivo móvel |
| `use-toast` | `src/hooks/use-toast.ts` | Sistema de toasts |

---

## 🏪 Stores (Estado Global)

| Store | Arquivo | Persistência | Função |
|-------|---------|--------------|--------|
| `slaSettingsStore` | `src/stores/slaSettingsStore.ts` | ✅ LocalStorage | Configurações de SLA |
| `dashboardLayoutStore` | `src/stores/dashboardLayoutStore.ts` | ✅ LocalStorage | Layout do dashboard customizável |
| `kpiTargetsStore` | `src/stores/kpiTargetsStore.ts` | ✅ LocalStorage | Metas de KPIs |
| `buyerAlertsStore` | `src/stores/buyerAlertsStore.ts` | ✅ LocalStorage | Alertas de compradores |
| `pushNotificationStore` | `src/stores/pushNotificationStore.ts` | ❌ | Estado de push notifications |

### Exemplo de Store com Persistência

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SLASettingsState {
  warningDays: number;
  criticalDays: number;
  setWarningDays: (days: number) => void;
  setCriticalDays: (days: number) => void;
}

export const useSLASettingsStore = create<SLASettingsState>()(
  persist(
    (set) => ({
      warningDays: 3,
      criticalDays: 1,
      setWarningDays: (days) => set({ warningDays: days }),
      setCriticalDays: (days) => set({ criticalDays: days }),
    }),
    { name: 'sla-settings' }
  )
);
```

---

## 🔧 Serviços

### auditService

| Arquivo | `src/services/auditService.ts` |
|---------|-------------------------------|
| **Função** | Registra ações no log de auditoria |

```typescript
interface AuditLog {
  action: 'create' | 'update' | 'delete' | 'approve' | 'reject';
  entityType: 'solicitacao' | 'cotacao' | 'pedido' | 'pagamento' | 'fornecedor';
  entityId: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
}

// Uso
await auditService.log({
  action: 'update',
  entityType: 'solicitacao',
  entityId: '123',
  oldValues: { status: 'pendente' },
  newValues: { status: 'aprovada' }
});
```

### notificationService

| Arquivo | `src/services/notificationService.ts` |
|---------|--------------------------------------|
| **Função** | Gerencia notificações do sistema |

```typescript
// Criar notificação
await notificationService.create({
  userId: 'user-123',
  title: 'Nova aprovação pendente',
  message: 'Solicitação SOL-001 aguarda sua aprovação',
  type: 'approval'
});

// Marcar como lida
await notificationService.markAsRead('notification-id');
```

---

## 📄 Páginas do Sistema

| Página | Rota | Arquivo | Função | Acesso |
|--------|------|---------|--------|--------|
| Landing Page | `/` | `Index.tsx` | Página inicial pública | Público |
| Login | `/auth` | `Auth.tsx` | Autenticação | Público |
| Dashboard | `/compras` | `ComprasDashboard.tsx` | Visão geral | Todos autenticados |
| Solicitações | `/solicitacoes` | `Solicitacoes.tsx` | Gestão de requisições | Todos autenticados |
| Cotações | `/cotacao` | `Cotacao.tsx` | Gestão de cotações | buyer, coordinator, admin |
| Fornecedores | `/fornecedores` | `Fornecedores.tsx` | Cadastro de fornecedores | buyer, coordinator, admin |
| Pedidos | `/pedidos` | `Pedidos.tsx` | Gestão de pedidos | buyer, coordinator, admin |
| Pagamentos | `/pagamentos` | `Pagamentos.tsx` | Controle financeiro | finance, admin |
| Contratos | `/contratos` | `Contratos.tsx` | Gestão de contratos | coordinator, admin |
| Aprovações | `/aprovacoes` | `Aprovacoes.tsx` | Workflow de aprovação | coordinator, admin |
| Acompanhamento | `/acompanhamento` | `Acompanhamento.tsx` | Tracking de pedidos | Todos autenticados |
| Histórico | `/historico` | `HistoricoCompras.tsx` | Histórico de compras | Todos autenticados |
| Gerar Ordem | `/gerar-ordem` | `GerarOrdem.tsx` | Criação de OC | buyer, coordinator, admin |
| Relatórios | `/relatorios` | `Relatorios.tsx` | Relatórios gerais | coordinator, admin |
| Dashboard Executivo | `/dashboard-executivo` | `DashboardExecutivo.tsx` | Visão executiva | admin |
| Performance Buyer | `/buyer-performance` | `BuyerPerformanceDashboard.tsx` | Métricas de compradores | coordinator, admin |
| Performance Fornecedor | `/supplier-performance` | `SupplierPerformance.tsx` | Métricas de fornecedores | Todos autenticados |
| Auditoria | `/auditoria` | `Auditoria.tsx` | Logs de auditoria | admin |
| Negociações | `/relatorio-negociacoes` | `RelatorioNegociacoes.tsx` | Relatório de negociações | coordinator, admin |
| 404 | `*` | `NotFound.tsx` | Página não encontrada | Público |

---

## 🧩 Componentes Principais

### Layout

| Componente | Arquivo | Função |
|------------|---------|--------|
| `MainLayout` | `MainLayout.tsx` | Layout principal com sidebar |
| `AppSidebar` | `AppSidebar.tsx` | Sidebar de navegação |
| `NavLink` | `NavLink.tsx` | Links de navegação |
| `ProtectedRoute` | `ProtectedRoute.tsx` | Proteção de rotas por role |
| `UserMenu` | `UserMenu.tsx` | Menu do usuário logado |

### IA e Sugestões

| Componente | Arquivo | Função |
|------------|---------|--------|
| `AISupplierSuggestion` | `AISupplierSuggestion.tsx` | Sugestões de fornecedores via IA |
| `DemandPredictionPanel` | `DemandPredictionPanel.tsx` | Previsão de demanda |
| `SupplierRiskAnalysis` | `SupplierRiskAnalysis.tsx` | Análise de risco |

### Dashboard

| Componente | Arquivo | Função |
|------------|---------|--------|
| `KpiCard` | `KpiCard.tsx` | Cards de KPIs |
| `PipelineChart` | `PipelineChart.tsx` | Gráfico de pipeline |
| `ExecutiveDashboard` | `ExecutiveDashboard.tsx` | Dashboard executivo |
| `DashboardCustomizer` | `DashboardCustomizer.tsx` | Customização de dashboard |
| `AdvancedProcurementKPIs` | `AdvancedProcurementKPIs.tsx` | KPIs avançados |
| `PurchaseClimateWidget` | `PurchaseClimateWidget.tsx` | Widget de clima de compras |

### SLA e Monitoramento

| Componente | Arquivo | Função |
|------------|---------|--------|
| `SLAPerformanceDashboard` | `SLAPerformanceDashboard.tsx` | Dashboard de SLA |
| `SLADistributionChart` | `SLADistributionChart.tsx` | Gráfico de distribuição |
| `SLABySupplierAnalysis` | `SLABySupplierAnalysis.tsx` | SLA por fornecedor |
| `SLASettingsPanel` | `SLASettingsPanel.tsx` | Configurações de SLA |
| `KPITargetsConfig` | `KPITargetsConfig.tsx` | Configuração de metas |
| `KPIAlertsPanel` | `KPIAlertsPanel.tsx` | Alertas de KPI |

### Solicitações

| Componente | Arquivo | Função |
|------------|---------|--------|
| `NovaSolicitacaoModal` | `NovaSolicitacaoModal.tsx` | Criar nova solicitação |
| `SolicitacaoCard` | `SolicitacaoCard.tsx` | Card de solicitação |
| `SolicitacaoKanban` | `SolicitacaoKanban.tsx` | Kanban de solicitações |
| `KanbanBoard` | `KanbanBoard.tsx` | Board Kanban genérico |
| `UrgentItemsList` | `UrgentItemsList.tsx` | Lista de itens urgentes |
| `CriticalAlertsBar` | `CriticalAlertsBar.tsx` | Barra de alertas críticos |

### Cotações

| Componente | Arquivo | Função |
|------------|---------|--------|
| `CotacaoManualModal` | `CotacaoManualModal.tsx` | Criar cotação manual |
| `ComparadorCotacoes` | `ComparadorCotacoes.tsx` | Comparar cotações |
| `RankingCotacoes` | `RankingCotacoes.tsx` | Ranking de cotações |
| `PriceComparator` | `PriceComparator.tsx` | Comparador de preços |
| `BuscaAutomatica` | `BuscaAutomatica.tsx` | Busca automática de cotações |

### Fornecedores

| Componente | Arquivo | Função |
|------------|---------|--------|
| `FornecedorModal` | `FornecedorModal.tsx` | Cadastro/edição de fornecedor |
| `SupplierScorecard` | `SupplierScorecard.tsx` | Scorecard do fornecedor |
| `SupplierRankingPanel` | `SupplierRankingPanel.tsx` | Ranking de fornecedores |
| `SupplierAlertsPanel` | `SupplierAlertsPanel.tsx` | Alertas de fornecedores |
| `SupplierChat` | `SupplierChat.tsx` | Chat com fornecedor |
| `RiskHeatMap` | `RiskHeatMap.tsx` | Mapa de calor de risco |

### Pedidos e Pagamentos

| Componente | Arquivo | Função |
|------------|---------|--------|
| `PedidoTimeline` | `PedidoTimeline.tsx` | Timeline do pedido |
| `DeliveryCalendar` | `DeliveryCalendar.tsx` | Calendário de entregas |
| `PagamentoModal` | `PagamentoModal.tsx` | Modal de pagamento |
| `HistoricoComprasModal` | `HistoricoComprasModal.tsx` | Histórico detalhado |

### Contratos

| Componente | Arquivo | Função |
|------------|---------|--------|
| `ContractModal` | `ContractModal.tsx` | Criar/editar contrato |
| `ContractDetailsModal` | `ContractDetailsModal.tsx` | Detalhes do contrato |
| `DigitalSignature` | `DigitalSignature.tsx` | Assinatura digital |

### Aprovações

| Componente | Arquivo | Função |
|------------|---------|--------|
| `PendingApprovalsPanel` | `PendingApprovalsPanel.tsx` | Aprovações pendentes |
| `ApprovalMatrixConfig` | `ApprovalMatrixConfig.tsx` | Configuração de matriz |
| `AuditTrailPanel` | `AuditTrailPanel.tsx` | Trilha de auditoria |

### Notificações

| Componente | Arquivo | Função |
|------------|---------|--------|
| `NotificationCenter` | `NotificationCenter.tsx` | Centro de notificações |
| `RealNotificationCenter` | `RealNotificationCenter.tsx` | Notificações em tempo real |
| `RealtimeNotificationCenter` | `RealtimeNotificationCenter.tsx` | Notificações realtime |

### Performance

| Componente | Arquivo | Função |
|------------|---------|--------|
| `BuyerPerformancePanel` | `BuyerPerformancePanel.tsx` | Performance de compradores |
| `BuyerPerformanceAlerts` | `BuyerPerformanceAlerts.tsx` | Alertas de performance |
| `BuyerDrilldownModal` | `BuyerDrilldownModal.tsx` | Detalhes do comprador |
| `SavingsGoalPanel` | `SavingsGoalPanel.tsx` | Metas de economia |

### Filtros e Ações

| Componente | Arquivo | Função |
|------------|---------|--------|
| `FiltrosAvancados` | `FiltrosAvancados.tsx` | Filtros avançados |
| `FilterFavoritesManager` | `FilterFavoritesManager.tsx` | Favoritos de filtros |
| `GlobalSearch` | `GlobalSearch.tsx` | Busca global (Ctrl+K) |
| `BulkActionsBar` | `BulkActionsBar.tsx` | Ações em massa |

### Outros

| Componente | Arquivo | Função |
|------------|---------|--------|
| `KeyboardShortcutsDialog` | `KeyboardShortcutsDialog.tsx` | Dialog de atalhos |
| `PWAInstallPrompt` | `PWAInstallPrompt.tsx` | Prompt de instalação PWA |

---

## 🎨 Design System

### Fontes

```css
/* Fonte principal */
--font-sans: 'Plus Jakarta Sans', system-ui, sans-serif;

/* Fonte de destaque/display */
--font-display: 'Outfit', sans-serif;
```

### Cores Semânticas

```css
:root {
  /* Backgrounds */
  --background: 222 47% 11%;
  --foreground: 210 40% 98%;
  
  /* Cards e superfícies */
  --card: 217 33% 17%;
  --card-foreground: 210 40% 98%;
  
  /* Popover/Dropdown */
  --popover: 217 33% 17%;
  --popover-foreground: 210 40% 98%;
  
  /* Cores primárias */
  --primary: 199 89% 48%;
  --primary-foreground: 222 47% 11%;
  
  /* Cores secundárias */
  --secondary: 217 33% 25%;
  --secondary-foreground: 210 40% 98%;
  
  /* Muted */
  --muted: 217 33% 25%;
  --muted-foreground: 215 20% 65%;
  
  /* Accent */
  --accent: 199 89% 48%;
  --accent-foreground: 222 47% 11%;
  
  /* Destrutivo/Erro */
  --destructive: 0 84% 60%;
  --destructive-foreground: 210 40% 98%;
  
  /* Bordas */
  --border: 217 33% 25%;
  --input: 217 33% 25%;
  --ring: 199 89% 48%;
}
```

### Cores por Módulo

```css
:root {
  /* Status */
  --status-success: 142 76% 36%;
  --status-warning: 38 92% 50%;
  --status-error: 0 84% 60%;
  --status-info: 199 89% 48%;
  
  /* Prioridades */
  --priority-low: 142 76% 36%;
  --priority-medium: 38 92% 50%;
  --priority-high: 25 95% 53%;
  --priority-urgent: 0 84% 60%;
  
  /* Módulos */
  --module-solicitacoes: 199 89% 48%;
  --module-cotacoes: 262 83% 58%;
  --module-pedidos: 142 76% 36%;
  --module-pagamentos: 38 92% 50%;
  --module-fornecedores: 25 95% 53%;
}
```

### Classes Utilitárias Customizadas

```css
/* Glassmorphism */
.glass {
  @apply bg-white/5 backdrop-blur-lg border border-white/10;
}

.glass-card {
  @apply bg-card/80 backdrop-blur-md border border-border/50 shadow-xl;
}

/* Gradientes */
.gradient-primary {
  @apply bg-gradient-to-r from-primary to-accent;
}

.gradient-surface {
  @apply bg-gradient-to-br from-card to-background;
}

/* Hover effects */
.hover-lift {
  @apply transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg;
}

.hover-glow {
  @apply transition-shadow duration-200 hover:shadow-[0_0_20px_rgba(14,165,233,0.3)];
}

/* Animações */
.animate-fade-in {
  animation: fadeIn 0.3s ease-out;
}

.animate-slide-up {
  animation: slideUp 0.3s ease-out;
}

.animate-pulse-slow {
  animation: pulse 3s infinite;
}

/* Scrollbar customizada */
.scrollbar-thin {
  scrollbar-width: thin;
  scrollbar-color: hsl(var(--border)) transparent;
}

.scrollbar-thin::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}

.scrollbar-thin::-webkit-scrollbar-thumb {
  background: hsl(var(--border));
  border-radius: 3px;
}
```

---

## 🔐 Controle de Acesso

### Roles do Sistema

| Role | Label | Descrição |
|------|-------|-----------|
| `admin` | Administrador | Acesso total ao sistema |
| `coordinator` | Coordenador | Gerencia equipe e aprovações |
| `buyer` | Comprador | Executa processo de compras |
| `finance` | Financeiro | Controle de pagamentos |

### Cores por Role

```typescript
const roleColors = {
  admin: 'bg-red-500/20 text-red-400 border-red-500/30',
  coordinator: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  buyer: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  finance: 'bg-green-500/20 text-green-400 border-green-500/30'
};
```

### Acessos por Role

| Funcionalidade | admin | coordinator | buyer | finance |
|---------------|-------|-------------|-------|---------|
| Dashboard | ✅ | ✅ | ✅ | ✅ |
| Solicitações | ✅ | ✅ | ✅ | 👁 |
| Cotações | ✅ | ✅ | ✅ | ❌ |
| Pedidos | ✅ | ✅ | ✅ | 👁 |
| Pagamentos | ✅ | ❌ | ❌ | ✅ |
| Contratos | ✅ | ✅ | 👁 | ❌ |
| Aprovações | ✅ | ✅ | ❌ | ❌ |
| Relatórios | ✅ | ✅ | 👁 | 👁 |
| Dashboard Executivo | ✅ | ❌ | ❌ | ❌ |
| Auditoria | ✅ | ❌ | ❌ | ❌ |
| Configurações | ✅ | ❌ | ❌ | ❌ |

> ✅ = Acesso total | 👁 = Somente leitura | ❌ = Sem acesso

### Implementação de Proteção de Rota

```tsx
// ProtectedRoute.tsx
interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: AppRole | AppRole[];
}

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, loading, hasRole } = useAuth();
  
  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/auth" />;
  if (requiredRole && !hasRole(requiredRole)) {
    return <Navigate to="/compras" />;
  }
  
  return <>{children}</>;
};

// Uso em App.tsx
<Route 
  path="/pagamentos" 
  element={
    <ProtectedRoute requiredRole={['finance', 'admin']}>
      <Pagamentos />
    </ProtectedRoute>
  } 
/>
```

---

## 📱 PWA (Progressive Web App)

### Configuração (vite.config.ts)

```typescript
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        name: 'Sistema de Compras',
        short_name: 'Compras',
        description: 'Sistema de gestão de compras empresariais',
        theme_color: '#0ea5e9',
        background_color: '#0f172a',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
});
```

### Arquivos Necessários

| Arquivo | Local | Tamanho |
|---------|-------|---------|
| `pwa-192x192.png` | `/public/` | 192x192px |
| `pwa-512x512.png` | `/public/` | 512x512px |
| `favicon.ico` | `/public/` | Multi-size |

### Componente de Instalação

```tsx
// PWAInstallPrompt.tsx
const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };
    
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 right-4 p-4 bg-card rounded-lg shadow-lg">
      <p>Instale o app para acesso rápido!</p>
      <Button onClick={handleInstall}>Instalar</Button>
    </div>
  );
};
```

---

## ⌨️ Atalhos de Teclado

| Atalho | Função | Escopo |
|--------|--------|--------|
| `Ctrl + K` | Abrir busca global | Global |
| `Ctrl + N` | Nova solicitação | Global |
| `Ctrl + S` | Salvar alterações | Formulários |
| `Escape` | Fechar modal/menu | Global |
| `Ctrl + /` | Mostrar atalhos | Global |
| `Ctrl + B` | Toggle sidebar | Global |
| `Ctrl + D` | Ir para Dashboard | Global |

### Implementação

```typescript
// useKeyboardShortcuts.ts
const shortcuts: KeyboardShortcut[] = [
  {
    key: 'k',
    ctrl: true,
    description: 'Abrir busca global',
    action: () => document.getElementById('global-search')?.focus()
  },
  {
    key: 'n',
    ctrl: true,
    description: 'Nova solicitação',
    action: () => navigate('/solicitacoes?new=true')
  },
  // ...
];

useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Ignorar em inputs
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '')) {
      return;
    }
    
    const shortcut = shortcuts.find(s => 
      s.key.toLowerCase() === e.key.toLowerCase() &&
      !!s.ctrl === e.ctrlKey &&
      !!s.meta === e.metaKey &&
      !!s.shift === e.shiftKey
    );
    
    if (shortcut) {
      e.preventDefault();
      shortcut.action();
    }
  };
  
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

---

## 📐 Padrões de Código

### Estrutura de Diretórios

```
src/
├── components/
│   ├── ui/              # Componentes shadcn/ui base
│   ├── compras/         # Componentes específicos do domínio
│   └── pwa/             # Componentes PWA
├── hooks/               # Hooks customizados
├── stores/              # Stores Zustand
├── services/            # Serviços (API, utilitários)
├── pages/               # Páginas/rotas
├── data/                # Dados mock/estáticos
├── lib/                 # Utilitários (utils.ts)
└── integrations/        # Integrações (Supabase)
```

### Padrão de Hook CRUD

```typescript
// hooks/useEntidade.ts
export const useEntidade = () => {
  const queryClient = useQueryClient();
  
  // Query principal
  const { data, isLoading, error } = useQuery({
    queryKey: ['entidades'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('entidades')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });
  
  // Mutations
  const createMutation = useMutation({
    mutationFn: async (novaEntidade: EntidadeInsert) => {
      const { data, error } = await supabase
        .from('entidades')
        .insert(novaEntidade)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entidades'] });
      toast.success('Criado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar: ' + error.message);
    }
  });
  
  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('entidades-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'entidades' },
        () => queryClient.invalidateQueries({ queryKey: ['entidades'] })
      )
      .subscribe();
      
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);
  
  return {
    entidades: data ?? [],
    isLoading,
    error,
    create: createMutation.mutate,
    update: updateMutation.mutate,
    delete: deleteMutation.mutate,
    isCreating: createMutation.isPending,
  };
};
```

### Padrão de Componente

```tsx
// components/compras/MeuComponente.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface MeuComponenteProps {
  titulo: string;
  onAction?: () => void;
}

export const MeuComponente = ({ titulo, onAction }: MeuComponenteProps) => {
  const [estado, setEstado] = useState(false);
  
  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-foreground">{titulo}</CardTitle>
      </CardHeader>
      <CardContent>
        <Button 
          variant="default"
          onClick={onAction}
          className="hover-lift"
        >
          Ação
        </Button>
      </CardContent>
    </Card>
  );
};
```

### Padrão de Página

```tsx
// pages/MinhaPagina.tsx
import { MainLayout } from '@/components/compras/MainLayout';
import { useEntidade } from '@/hooks/useEntidade';
import { Skeleton } from '@/components/ui/skeleton';

const MinhaPagina = () => {
  const { entidades, isLoading, error } = useEntidade();
  
  if (isLoading) {
    return (
      <MainLayout>
        <div className="p-6 space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </MainLayout>
    );
  }
  
  if (error) {
    return (
      <MainLayout>
        <div className="p-6 text-destructive">
          Erro ao carregar: {error.message}
        </div>
      </MainLayout>
    );
  }
  
  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Título</h1>
        {/* Conteúdo */}
      </div>
    </MainLayout>
  );
};

export default MinhaPagina;
```

---

## 📝 Checklist para Novos Projetos

### Configuração Inicial
- [ ] Criar projeto no Lovable
- [ ] Habilitar Lovable Cloud
- [ ] Configurar autenticação (auto-confirm email)
- [ ] Instalar dependências core

### Design System
- [ ] Configurar fontes em index.css
- [ ] Definir cores semânticas
- [ ] Criar classes utilitárias customizadas
- [ ] Configurar tailwind.config.ts

### Estrutura Base
- [ ] Criar MainLayout
- [ ] Configurar rotas com ProtectedRoute
- [ ] Implementar useAuth hook
- [ ] Criar tabelas base no Supabase

### Funcionalidades Core
- [ ] Implementar CRUD hooks
- [ ] Configurar realtime subscriptions
- [ ] Implementar auditoria
- [ ] Configurar notificações

### PWA (opcional)
- [ ] Adicionar ícones
- [ ] Configurar vite-plugin-pwa
- [ ] Criar PWAInstallPrompt

---

> **Última atualização:** Dezembro 2024
> **Versão:** 1.0.0
