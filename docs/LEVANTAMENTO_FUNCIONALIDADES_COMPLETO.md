# 📦 PROMO SUPPLY — Levantamento Exaustivo de Funcionalidades

> Documento gerado a partir de análise completa do sistema, código-fonte, memórias de projeto e histórico de conversação.
>
> **Data:** 15/03/2026 | **Versão:** 1.0

---

## 📋 Índice

1. [Visão Geral do Sistema](#1-visão-geral-do-sistema)
2. [Autenticação e Controle de Acesso](#2-autenticação-e-controle-de-acesso)
3. [Dashboard Operacional](#3-dashboard-operacional)
4. [Dashboard Executivo](#4-dashboard-executivo)
5. [Módulo de Solicitações](#5-módulo-de-solicitações)
6. [Módulo de Cotações](#6-módulo-de-cotações)
7. [Módulo de Pedidos (Ordens de Compra)](#7-módulo-de-pedidos-ordens-de-compra)
8. [Módulo de Acompanhamento](#8-módulo-de-acompanhamento)
9. [Módulo de Pagamentos](#9-módulo-de-pagamentos)
10. [Módulo de Fornecedores](#10-módulo-de-fornecedores)
11. [Portal do Fornecedor](#11-portal-do-fornecedor)
12. [Qualificação de Fornecedores](#12-qualificação-de-fornecedores)
13. [Performance de Fornecedores](#13-performance-de-fornecedores)
14. [Gestão de Contratos](#14-gestão-de-contratos)
15. [Workflow de Aprovações](#15-workflow-de-aprovações)
16. [Histórico de Compras](#16-histórico-de-compras)
17. [Relatórios e Analytics](#17-relatórios-e-analytics)
18. [Dashboard de Performance do Comprador](#18-dashboard-de-performance-do-comprador)
19. [Inteligência Artificial](#19-inteligência-artificial)
20. [Central de Segurança](#20-central-de-segurança)
21. [Auditoria](#21-auditoria)
22. [Notificações](#22-notificações)
23. [Design System e UX](#23-design-system-e-ux)
24. [PWA e Funcionalidades Offline](#24-pwa-e-funcionalidades-offline)
25. [Acessibilidade](#25-acessibilidade)
26. [Atalhos de Teclado](#26-atalhos-de-teclado)
27. [Infraestrutura e Backend](#27-infraestrutura-e-backend)
28. [Integrações Externas (Planejadas)](#28-integrações-externas-planejadas)

---

## 1. Visão Geral do Sistema

**Promo Supply** é um ERP enterprise-grade de gestão completa do ciclo de compras, inspirado em plataformas como SAP Ariba, Coupa e Oracle Procurement.

| Aspecto | Detalhe |
|---------|---------|
| **Stack** | React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui |
| **Backend** | Lovable Cloud (~49 tabelas PostgreSQL) |
| **Arquitetura** | SPA com lazy loading, PWA, realtime sync |
| **Perfis de Usuário** | Comprador, Coordenador de Compras, Financeiro, Logística, Gestão |
| **Design** | Desktop-first responsivo com suporte mobile |

### Rotas do Sistema

| Rota | Página | Acesso |
|------|--------|--------|
| `/` | Dashboard Operacional | Autenticado |
| `/auth` | Autenticação | Público |
| `/compras` | Dashboard (alias) | Autenticado |
| `/cotacao` | Cotações | Autenticado |
| `/cotacao/:id` | Detalhe da Cotação | Autenticado |
| `/solicitacoes` | Solicitações | Autenticado |
| `/pedidos` | Pedidos / Ordens de Compra | Autenticado |
| `/acompanhamento` | Timeline de Pedidos | Autenticado |
| `/gerar-ordem` | Geração de Ordem | Autenticado |
| `/pagamentos` | Pagamentos | Admin, Coordenador, Financeiro |
| `/fornecedores` | Cadastro de Fornecedores | Autenticado |
| `/supplier-performance` | Performance de Fornecedores | Autenticado |
| `/historico-compras` | Histórico Produto/Fornecedor | Autenticado |
| `/contratos` | Gestão de Contratos | Autenticado |
| `/relatorios` | Relatórios / Analytics | Autenticado |
| `/relatorios/negociacoes` | Relatório de Negociações | Autenticado |
| `/buyer-performance` | Performance do Comprador | Admin, Coordenador |
| `/aprovacoes` | Workflow de Aprovações | Admin, Coordenador |
| `/auditoria` | Trilha de Auditoria | Admin |
| `/seguranca` | Central de Segurança | Autenticado |
| `/dashboard-executivo` | Dashboard Executivo | Admin, Coordenador |

---

## 2. Autenticação e Controle de Acesso

### 2.1 Autenticação
- Login com email e senha
- Cadastro de novo usuário (signup)
- Verificação de email obrigatória
- Autenticação via Passkey (WebAuthn)
- Indicador de força de senha (`PasswordStrengthIndicator`)
- Rota protegida (`ProtectedRoute`) com verificação de role

### 2.2 MFA (Autenticação Multi-Fator)
- Configuração de MFA por usuário (`MFASettings`)
- Suporte a códigos de backup
- Registro de última verificação
- Métodos: TOTP, Passkey

### 2.3 Controle de Acesso por Papéis (RBAC)
- Papéis: `admin`, `coordinator`, `finance`, `buyer`, `user`
- Rotas protegidas por role (`requiredRole`)
- Componente `PermissionGate` para controle granular na UI
- Matriz de permissões configurável (`PermissionMatrix`)
- Tabelas: `permissions` (módulo + ação)

### 2.4 Bloqueio de Conta
- Bloqueio automático após tentativas falhas (`useAccountLockout`)
- Contagem de tentativas com lockout progressivo
- Tabela `account_lockouts`

### 2.5 Gestão de Sessões
- Painel de sessões ativas (`ActiveSessionsPanel`)
- Informações: dispositivo, IP, user agent, última atividade
- Expiração automática de sessões
- Tabela `active_sessions`

### 2.6 Recuperação de Senha
- Solicitação de reset com aprovação administrativa
- Painel de solicitações (`PasswordResetRequestsPanel`)
- Tokens de reset com expiração
- Tabelas: `password_reset_requests`, `password_reset_tokens`

---

## 3. Dashboard Operacional

**Rota:** `/` ou `/compras`
**Componente:** `ComprasDashboard`

### 3.1 KPIs Principais
- Aguardando Cotação (com sparkline)
- Volume do Mês (formato moeda)
- Economia Gerada (% do volume)
- SLA Médio de Atendimento
- Cada KPI com: valor atual, valor anterior, tendência, mini-gráfico sparkline

### 3.2 Widgets do Dashboard
- **Pipeline de Compras** (`PipelineChart`) — Visualização do funil de compras
- **Itens Urgentes** (`UrgentItemsList`) — Lista priorizada de itens críticos
- **Distribuição SLA** (`SLADistributionChart`) — Gráfico de distribuição
- **Alertas Críticos** (`CriticalAlertsBar`) — Barra de alertas em tempo real
- **Alertas de Fornecedores** (`SupplierAlertsPanel`) — SLA por fornecedor
- **Ranking de Fornecedores** (`SupplierRankingPanel`) — Top fornecedores
- **Performance do Comprador** (`BuyerPerformancePanel`) — Métricas individuais
- **Meta de Economia** (`SavingsGoalPanel`) — Acompanhamento de metas
- **Clima de Compras** (`PurchaseClimateWidget`) — Indicador geral
- **Calendário de Entregas** (`DeliveryCalendar`) — Visualização por datas
- **Previsão de Demanda** (`DemandPredictionPanel`) — IA preditiva
- **Mapa de Risco** (`RiskHeatMap`) — Heatmap de riscos

### 3.3 Dashboard Arrastável
- Widgets reorganizáveis via drag-and-drop (`DraggableDashboard`)
- Layout persistente por usuário (`dashboardLayoutStore` com Zustand)
- Configuração de posições e visibilidade

### 3.4 Filtros do Dashboard
- Filtro por período
- Filtro por categoria
- Filtro por fornecedor
- Comparação temporal (toggle)
- Favoritos de filtros (`FilterFavoritesManager`)
- Filtros persistentes entre sessões (`usePersistentFilters`)
- Tabela `dashboard_filter_favorites`

---

## 4. Dashboard Executivo

**Rota:** `/dashboard-executivo`
**Acesso:** Admin, Coordenador

### 4.1 KPIs Consolidados (8 indicadores)
- Total Gasto (spend total)
- Economia Gerada (savings)
- Total de Pedidos (orders)
- Tempo de Ciclo Médio (cycle time)
- Quantidade de Fornecedores
- Aprovações Pendentes
- Pedidos Atrasados
- Conformidade de Contratos

### 4.2 Painéis Analíticos
- Banner de alertas críticos
- Gráficos de tendência (spend/savings)
- Distribuição por categoria
- Top fornecedores
- Ranking de compradores
- Ações pendentes
- Modal drill-down interativo para análise detalhada

---

## 5. Módulo de Solicitações

**Rota:** `/solicitacoes`

### 5.1 Funcionalidades
- Listagem de solicitações com filtros avançados
- Criação de nova solicitação (`NovaSolicitacaoModal`)
- Visualização em lista e Kanban (`SolicitacaoKanban`)
- Cards de solicitação (`SolicitacaoCard`)
- Filtros avançados multi-critério (`FiltrosAvancados`)
- Busca avançada (`AdvancedSearch`)
- Operações em lote (`EnhancedBulkActionsBar`, `BulkOperationsPreview`)

### 5.2 Estados
- Pendente, Em Cotação, Aprovada, Rejeitada, Finalizada

### 5.3 Dados Persistidos
- Tabela `solicitacoes` com vínculo a categorias e aprovações
- Hook: `useSolicitacoes`

---

## 6. Módulo de Cotações

**Rota:** `/cotacao` e `/cotacao/:id`

### 6.1 Funcionalidades
- Listagem de cotações recebidas
- Criação manual de cotação (`CotacaoManualModal`)
- Comparador visual de cotações (`VisualComparadorCotacoes`, `ComparadorCotacoes`)
- Ranking de cotações (`RankingCotacoes`)
- Comparador de preços (`PriceComparator`)
- Busca automática de fornecedores (`BuscaAutomatica`)
- Seleção de melhor cotação
- Sugestão de fornecedor por IA (`AISupplierSuggestion`)

### 6.2 Scores de Avaliação
- Score de preço (`score_preco`)
- Score de prazo (`score_prazo`)
- Score de qualidade (`score_qualidade`)
- Score total composto (`score_total`)

### 6.3 Dados Persistidos
- Tabela `cotacoes` com vínculo a fornecedores e solicitações
- Campos: valor unitário, valor total, quantidade, prazo entrega, desconto, frete, condição pagamento, anexos
- Hook: `useCotacoes`

---

## 7. Módulo de Pedidos (Ordens de Compra)

**Rota:** `/pedidos`

### 7.1 Funcionalidades
- Listagem de pedidos com filtros
- Geração de ordem de compra (`/gerar-ordem`)
- Cards mobile responsivos (`PedidoMobileCard`)
- Timeline do pedido (`PedidoTimeline`, `EnhancedPedidoTimeline`)
- Rastreamento com código de rastreio

### 7.2 Estados
- Pendente, Aprovado, Em Trânsito, Entregue, Cancelado

### 7.3 Itens do Pedido
- Tabela `pedido_itens` com: descrição, quantidade, valor unitário, valor total, quantidade recebida
- Vínculo com tabela de produtos

### 7.4 Dados Persistidos
- Tabela `pedidos` com vínculo a fornecedor, cotação, solicitação
- Campos: número, data emissão, previsão, entrega, valor total, frete, desconto, transportadora, condição pagamento
- Hook: `usePedidos`

---

## 8. Módulo de Acompanhamento

**Rota:** `/acompanhamento`

### 8.1 Funcionalidades
- Timeline visual de progressão dos pedidos
- Visualização Kanban com drag-and-drop (`KanbanBoard`)
- Estágios do pipeline: Solicitação → Cotação → Aprovação → Pedido → Entrega → Pagamento
- Acompanhamento em tempo real

---

## 9. Módulo de Pagamentos

**Rota:** `/pagamentos`
**Acesso:** Admin, Coordenador, Financeiro

### 9.1 Funcionalidades
- Listagem de pagamentos pendentes, aprovados e pagos
- Modal de pagamento (`PagamentoModal`) com suporte a PIX/Boleto
- Upload de comprovante de pagamento
- Confirmação de recebimento
- Cards mobile responsivos (`PagamentoMobileCard`)

### 9.2 Estados
- Pendente, Aprovado, Pago, Vencido, Cancelado

### 9.3 Dados Persistidos
- Tabela `pagamentos` com vínculo a fornecedor e pedido
- Campos: valor, valor pago, vencimento, forma pagamento, NF, chave NF, dados bancários (JSON), comprovante URL
- Hook: `usePagamentos`

---

## 10. Módulo de Fornecedores

**Rota:** `/fornecedores`

### 10.1 Funcionalidades
- Listagem com busca e filtros
- Cadastro/edição de fornecedor (`FornecedorModal`)
- Cards mobile (`FornecedorMobileCard`)
- Histórico de compras por fornecedor (`HistoricoComprasModal`)
- Chat com fornecedor (`SupplierChat`)
- Assinatura digital (`DigitalSignature`)
- Notas de contato (`useContactNotes`)
- Scorecard do fornecedor (`SupplierScorecard`)

### 10.2 Dados do Fornecedor
- Razão social, nome fantasia, CNPJ, código
- Contato: email, telefone, website
- Endereço: logradouro, cidade, estado, CEP
- Classificação: tipo, segmento, status, avaliação
- Integração: API endpoint, flag de integrado
- Condições de pagamento, prazo médio entrega
- Tabela `fornecedores`
- Hook: `useFornecedores`

---

## 11. Portal do Fornecedor

### 11.1 Funcionalidades
- Visualização de pedidos de compra (POs) pelo fornecedor
- Upload de notas fiscais/invoices
- Acompanhamento de recebimentos
- Centralização de comunicação e documentos
- Padrão SAP Ariba / Coupa

---

## 12. Qualificação de Fornecedores

### 12.1 Funcionalidades
- Checklist de verificação de documentos
- Rastreamento de validade de certificados
- Scoring automático baseado em critérios
- Requisitos por categoria (mandatórios e opcionais)
- Histórico de qualificação (`qualification_history`)

### 12.2 Dados Persistidos
- Tabela `qualification_requirements`: nome, categoria, peso, obrigatório, validade em dias, tipos aplicáveis
- Tabela `qualification_history`: ações, valores antigos/novos, descrição

---

## 13. Performance de Fornecedores

**Rota:** `/supplier-performance`

### 13.1 Métricas de Performance
- **SLA Compliance** — peso 40%
- **Tempo de Entrega** — peso 35%
- **Avaliação de Qualidade** — peso 25%

### 13.2 Painéis
- Ranking de fornecedores (`SupplierRankingPanel`) com tendência histórica
- Alertas de fornecedor (`SupplierAlertsPanel`) com gráficos de tendência SLA
- Gráfico comparativo de SLA de todos fornecedores
- Filtros por período: 7, 30, 90 dias

### 13.3 Análises Avançadas
- Análise de risco do fornecedor (`SupplierRiskAnalysis`)
- Análise SLA por fornecedor (`SLABySupplierAnalysis`)
- Scorecard individual (`SupplierScorecard`)

### 13.4 Configuração
- Limiares de SLA por fornecedor (`SLASettingsPanel`)
- Metas de KPI configuráveis (`KPITargetsConfig`)
- Stores persistentes: `slaSettingsStore`, `kpiTargetsStore`

---

## 14. Gestão de Contratos

**Rota:** `/contratos`

### 14.1 Funcionalidades
- CRUD completo de contratos (`ContractModal`)
- Detalhes do contrato (`ContractDetailsModal`)
- Ciclo de vida: Rascunho → Ativo → Expirado → Cancelado → Renovado
- Itens do contrato (`contract_items`)
- Documentos anexados (`contract_documents`)
- Vinculação com ordens de compra (`order_contracts`)
- Alertas de expiração (30 dias)
- Configurações de renovação (automática/manual)

### 14.2 Dados Persistidos
- Tabela `contracts`: número, tipo, valor total, datas, termos pagamento, renovação
- Tabela `contract_items`: itens com quantidade, preço unitário, total
- Tabela `contract_documents`: arquivos com URL, tipo, tamanho
- Tabela `contract_history`: auditoria completa de alterações
- Tabela `order_contracts`: vínculo contrato ↔ pedido

---

## 15. Workflow de Aprovações

**Rota:** `/aprovacoes`
**Acesso:** Admin, Coordenador

### 15.1 Funcionalidades
- Matriz de aprovação dinâmica (`DynamicApprovalMatrix`)
- Aprovações multinível sequenciais
- Escalação automática por tempo (Edge Function `check-approval-escalations`)
- Delegação temporária de aprovação (`approval_delegations`)
- Lista de pendências (`PendingApprovalsList`)
- Histórico de aprovações (`approval_history`)
- Notificações de aprovação em tempo real (`useApprovalNotifications`)

### 15.2 Regras de Aprovação
- Por faixa de valor (min/max)
- Por categoria
- Número de níveis necessários
- Unanimidade obrigatória (flag)
- Tempo limite em horas
- Prioridade da regra
- Tabela `approval_rules`

### 15.3 Fluxo (Workflow)
- Tabela `approval_workflows`: status, etapa atual, total etapas, prazo
- Tabela `approval_steps`: aprovador, status, comentário, prazo limite, lembretes

---

## 16. Histórico de Compras

**Rota:** `/historico-compras`

### 16.1 Funcionalidades
- Visualização por produto/fornecedor
- Dados históricos de preços e volumes
- Tendências de compras ao longo do tempo
- Itens visualizados recentemente (`useRecentlyViewed`, `RecentlyViewedPanel`)
- Dados mock: `purchaseHistoryData.ts`

---

## 17. Relatórios e Analytics

**Rota:** `/relatorios` e `/relatorios/negociacoes`

### 17.1 Relatórios Gerais
- Analytics consolidado de compras
- Gráficos e métricas de performance
- KPIs avançados (`AdvancedProcurementKPIs`)

### 17.2 Relatório de Negociações
- Performance de negociação por comprador
- Economia gerada por negociação
- Métricas de efetividade

---

## 18. Dashboard de Performance do Comprador

**Rota:** `/buyer-performance`
**Acesso:** Admin, Coordenador

### 18.1 Funcionalidades
- Dashboard individual por comprador
- Alertas de performance (`BuyerPerformanceAlerts`)
- Modal drill-down (`BuyerDrilldownModal`)
- Métricas: volume, economia, tempo de ciclo, SLA
- Store de alertas: `buyerAlertsStore`

---

## 19. Inteligência Artificial

### 19.1 Edge Functions (4 módulos IA)

| Função | Descrição |
|--------|-----------|
| `ai-supplier-suggestion` | Recomendação de fornecedores baseada em histórico e orçamento |
| `ai-demand-prediction` | Previsão sazonal de demanda e avaliação de risco |
| `ai-supplier-risk` | Scoring automatizado financeiro e operacional |
| `check-sla-alerts` | Monitoramento e alertas de SLA |

### 19.2 Componentes IA na UI
- `AISupplierSuggestion` — Sugestões de fornecedor
- `DemandPredictionPanel` — Painel de previsão de demanda
- `RiskHeatMap` — Mapa de calor de riscos
- `SupplierRiskAnalysis` — Análise de risco do fornecedor

### 19.3 Busca em Linguagem Natural
- Pesquisa semântica em dados do ERP
- Componente `NaturalLanguageSearch` (referenciado)

---

## 20. Central de Segurança

**Rota:** `/seguranca`

### 20.1 Autenticação
- Configuração de MFA (`MFASettings`)
- Gerenciador de Passkeys (`PasskeyManager`)

### 20.2 Controle de Acesso à Rede
- IPs bloqueados (`BlockedIPsPanel`) — Tabela `blocked_ips`
- Whitelist de IPs (`IPWhitelistPanel`) — Tabela `ip_whitelist`
- Restrição geográfica (`GeoWhitelistPanel`) — Tabelas `allowed_countries`, `blocked_countries`, `geo_settings`
- Logs de acesso geográfico (`geo_access_logs`)

### 20.3 Monitoramento
- Tentativas de login (`LoginAttemptsPanel`) — Tabela `login_attempts`
- Sessões ativas (`ActiveSessionsPanel`)
- Logs de segurança (`SecurityLogsPanel`)
- Rate limiting (`RateLimitDashboard`)
- Solicitações de reset de senha (`PasswordResetRequestsPanel`)

### 20.4 Permissões
- Matriz de permissões (`PermissionMatrix`)
- Gate de permissão por componente (`PermissionGate`)
- Hook: `usePermissions`

### 20.5 Configurações Adicionais
- Notificações (`NotificationSettingsPanel`)
- Tour onboarding (`TourSettingsPanel`)

---

## 21. Auditoria

**Rota:** `/auditoria`
**Acesso:** Admin

### 21.1 Funcionalidades
- Trilha completa de ações do sistema
- Tipos de ação: criação, atualização, exclusão, aprovação, login, etc.
- Tipos de entidade: solicitação, cotação, pedido, fornecedor, etc.
- Valores antigos vs. novos (diff)
- Metadados: IP, user agent, email, nome
- Serviço de auditoria (`auditService`)
- Tabela `audit_logs`

### 21.2 Enums de Auditoria
- `audit_action_type`: tipos de ação
- `audit_entity_type`: tipos de entidade

---

## 22. Notificações

### 22.1 Sistema de Notificações
- Centro de notificações em tempo real (`RealNotificationCenter`)
- Notificações push reais (`useRealPushNotifications`)
- Subscrições push (`push_subscriptions`)
- Edge Function `send-push-notification`

### 22.2 Preferências de Notificação
- Por tipo: email, push, som
- Por categoria: pedidos, pagamentos, preços, SLA, fornecedores
- Tabela `notification_preferences`

### 22.3 Dados
- Tabela `notifications`: título, mensagem, tipo, prioridade, lido, ação

---

## 23. Design System e UX

### 23.1 Arquitetura CSS Modular
- `tokens.css` — Variáveis de design (cores, tipografia, sombras, gradientes, espaçamentos)
- `base.css` — Reset, tipografia base, transições de tema
- `components.css` — Estilos de componentes
- `utilities.css` — Classes utilitárias customizadas
- `animations.css` — Animações e transições

### 23.2 Temas
- Light mode e Dark mode completos
- Toggle de tema (`ThemeToggle`)
- Transições suaves entre temas
- Cores KPI com variantes light/dark (emerald, orange, blue, purple, green, cyan, red, indigo, teal)

### 23.3 Tipografia
- Display: **Outfit** (headings)
- Body: **Plus Jakarta Sans** (texto)

### 23.4 Componentes UI (shadcn/ui + Custom)
- Accordion, Alert Dialog, Avatar, Badge, Breadcrumb, Button, Calendar, Card, Chart
- Checkbox, Collapsible, Command, Dialog, Drawer, Dropdown Menu, Form, Input, Label
- Popover, Progress, Scroll Area, Select, Separator, Sheet, Sidebar, Skeleton, Slider
- Switch, Table, Tabs, Textarea, Toast, Tooltip
- **Customizados:** Celebration, Contextual Skeletons, Enhanced Search, Error Boundary, Floating Input, Illustrated Empty State, Page Header, Sparkline, Status Indicators, Undo Indicator, Undo Toast

### 23.5 Animações
- Transições de página (`AnimatePresence` + `framer-motion`)
- Componentes animados (`MotionComponents`)
- Valores animados (`useAnimatedValue`)

### 23.6 Layout
- `MainLayout` com sidebar colapsável
- `AppSidebar` com grupos de menu, badges animados, indicador de seção ativa
- `Breadcrumbs` para navegação hierárquica
- `UserMenu` para perfil do usuário

---

## 24. PWA e Funcionalidades Offline

### 24.1 Progressive Web App
- Service Worker registrado (`registerSW`)
- Prompt de instalação (`PWAInstallPrompt`)
- Manifest configurado (`manifest.json`)
- Ícones: 192x192 e 512x512
- Atualização automática com prompt ao usuário

### 24.2 Offline
- Indicador de offline (`OfflineIndicator`)
- Sincronização offline (`useOfflineSync`)
- Wrapper com pull-to-refresh mobile (`MobileRefreshWrapper`)

---

## 25. Acessibilidade

### 25.1 Funcionalidades
- Provider de acessibilidade (`AccessibilityProvider`)
- Skip links para navegação (`SkipLinks`)
- Texto visualmente oculto (`VisuallyHidden`)
- Alto contraste (toggle)
- Redução de movimento (toggle)
- Modo de daltonismo (configurável)
- Armazenamento persistente de preferências
- Recovery automático de estado visual em `main.tsx`
- Foco visível aprimorado no dark mode

---

## 26. Atalhos de Teclado

### 26.1 Funcionalidades
- Hook de atalhos globais (`useKeyboardShortcuts`)
- Diálogo de referência (`KeyboardShortcutsDialog`)
- Command Palette (`CommandPalette`) para busca e ações rápidas
- Ações rápidas via FAB (`QuickActionsFAB`)

---

## 27. Infraestrutura e Backend

### 27.1 Banco de Dados (~49 tabelas)
- **Core:** `solicitacoes`, `cotacoes`, `pedidos`, `pedido_itens`, `pagamentos`, `fornecedores`, `produtos`, `categorias`
- **Contratos:** `contracts`, `contract_items`, `contract_documents`, `contract_history`, `order_contracts`
- **Aprovações:** `approval_rules`, `approval_delegations`, `approval_workflows`, `approval_steps`, `approval_history`
- **Usuários:** `profiles`, `permissions`
- **Segurança:** `account_lockouts`, `active_sessions`, `blocked_ips`, `ip_whitelist`, `login_attempts`, `mfa_settings`, `password_reset_requests`, `password_reset_tokens`
- **Geo:** `allowed_countries`, `blocked_countries`, `geo_access_logs`, `geo_settings`
- **Notificações:** `notifications`, `notification_preferences`, `push_subscriptions`
- **Qualificação:** `qualification_requirements`, `qualification_history`
- **Auditoria:** `audit_logs`
- **Dashboard:** `dashboard_filter_favorites`
- **Notas:** `contact_notes`

### 27.2 Edge Functions (6 funções)

| Função | Trigger |
|--------|---------|
| `ai-supplier-suggestion` | Sob demanda (UI) |
| `ai-demand-prediction` | Sob demanda (UI) |
| `ai-supplier-risk` | Sob demanda (UI) |
| `check-approval-escalations` | Periódico (cron) |
| `check-sla-alerts` | Periódico (cron) |
| `send-push-notification` | Sob demanda (eventos) |
| `webauthn-register` | Sob demanda (registro Passkey) |
| `webauthn-authenticate` | Sob demanda (autenticação Passkey) |

### 27.3 Stores (Zustand)
- `dashboardLayoutStore` — Layout do dashboard
- `kpiTargetsStore` — Metas de KPI
- `slaSettingsStore` — Configurações de SLA
- `buyerAlertsStore` — Alertas de comprador
- `undoStore` — Sistema de undo global

### 27.4 Hooks Principais
- `useAuth` — Autenticação e perfil
- `useComprasData` — Dados consolidados de compras
- `useSolicitacoes` — CRUD solicitações
- `useCotacoes` — CRUD cotações
- `usePedidos` — CRUD pedidos
- `usePagamentos` — CRUD pagamentos
- `useFornecedores` — CRUD fornecedores
- `useApprovalWorkflow` — Workflow de aprovações
- `useBulkOperations` — Operações em lote
- `useDashboardFilters` — Filtros do dashboard
- `useFuseSearch` — Busca fuzzy
- `useGlobalUndo` — Desfazer global
- `useMobileGestures` — Gestos mobile
- `useOfflineSync` — Sincronização offline
- `useRecentlyViewed` — Itens recentes
- `useSecurityLogs` — Logs de segurança
- `useWebAuthn` — Autenticação WebAuthn
- `useFeedback` — Sistema de feedback
- `useImageCompression` — Compressão de imagens
- `usePrefetch` — Pré-carregamento de rotas

---

## 28. Integrações Externas (Planejadas)

| Integração | Status | Propósito |
|------------|--------|-----------|
| **Bitrix24** | Protótipo | CRM e fonte de dados principal |
| **Banco Inter** | Protótipo | Pagamentos bancários |
| **Lalamove** | Protótipo | Logística de entregas |

---

## 📊 Resumo Quantitativo

| Métrica | Quantidade |
|---------|------------|
| Rotas/Páginas | 21 |
| Tabelas no banco | ~49 |
| Edge Functions | 8 |
| Hooks customizados | 30+ |
| Componentes de compras | 55+ |
| Componentes de segurança | 12 |
| Componentes UI (shadcn) | 40+ |
| Stores Zustand | 5 |
| Módulos IA | 4 |

---

> **© 2025–2026 Promo Supply** — Todos os direitos reservados.
> Documento gerado automaticamente a partir da análise completa do sistema.
