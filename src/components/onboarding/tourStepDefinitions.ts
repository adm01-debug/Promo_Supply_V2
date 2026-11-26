/**
 * Predefined tour step definitions for each page/feature.
 * Extracted from OnboardingTour to keep that component focused on rendering.
 */

import type { TourStep } from './OnboardingTour';

// Dashboard tour
export const dashboardTourSteps: TourStep[] = [
  {
    target: "[data-tour='sidebar']",
    title: "Menu de Navegação",
    content: "Acesse todas as funcionalidades do sistema através do menu lateral. Os itens são organizados por categoria para facilitar a navegação.",
    position: "right",
    highlight: "primary",
  },
  {
    target: "[data-tour='global-search']",
    title: "Busca Global Inteligente",
    content: "Encontre rapidamente solicitações, fornecedores e pedidos. Use Ctrl+K (ou Cmd+K no Mac) para abrir a qualquer momento!",
    position: "bottom",
    highlight: "info",
  },
  {
    target: "[data-tour='kpi-cards']",
    title: "Indicadores em Tempo Real",
    content: "Monitore os principais KPIs do setor de compras. Clique em cada card para ver detalhes, tendências e drill-down de dados.",
    position: "bottom",
    highlight: "success",
  },
  {
    target: "[data-tour='notifications']",
    title: "Central de Notificações",
    content: "Acompanhe alertas importantes, aprovações pendentes e atualizações de pedidos. Configure suas preferências para nunca perder uma ação crítica!",
    position: "left",
    highlight: "warning",
  },
  {
    target: "[data-tour='theme-toggle']",
    title: "Personalize sua Experiência",
    content: "Alterne entre os modos claro e escuro conforme sua preferência. O sistema lembra sua escolha automaticamente.",
    position: "left",
    highlight: "primary",
  },
];

// Cotação page tour
export const cotacaoTourSteps: TourStep[] = [
  {
    target: "[data-tour='cotacao-produto']",
    title: "Detalhes do Produto",
    content: "Visualize todas as informações da solicitação: produto, quantidade, prazo e valor estimado. Essencial para comparar cotações.",
    position: "bottom",
    highlight: "primary",
  },
  {
    target: "[data-tour='cotacao-busca']",
    title: "Busca Automática de Preços",
    content: "Clique para buscar cotações automaticamente em todos os fornecedores integrados por API. O sistema consulta preços em tempo real!",
    position: "bottom",
    highlight: "info",
  },
  {
    target: "[data-tour='cotacao-manual']",
    title: "Cotações Manuais",
    content: "Adicione cotações recebidas por WhatsApp, email ou telefone. Centralize todas as propostas em um só lugar.",
    position: "top",
    highlight: "success",
  },
];

// Fornecedores page tour
export const fornecedorTourSteps: TourStep[] = [
  {
    target: "[data-tour='fornecedor-header']",
    title: "Gestão de Fornecedores",
    content: "Gerencie todos os seus fornecedores em um só lugar. Cadastre novos, edite informações e acompanhe o desempenho de cada um.",
    position: "bottom",
    highlight: "primary",
  },
  {
    target: "[data-tour='fornecedor-kpis']",
    title: "Indicadores de Fornecedores",
    content: "Acompanhe métricas importantes: total de fornecedores, integrações ativas e avaliação média.",
    position: "bottom",
    highlight: "info",
  },
  {
    target: "[data-tour='fornecedor-filtros']",
    title: "Filtros Inteligentes",
    content: "Busque por nome, CNPJ ou filtre por tipo de fornecedor. Encontre rapidamente quem você precisa.",
    position: "bottom",
    highlight: "success",
  },
  {
    target: "[data-tour='fornecedor-tabela']",
    title: "Lista de Fornecedores",
    content: "Veja todos os fornecedores com suas informações, contatos e rating. Clique para editar ou ver histórico de compras.",
    position: "top",
    highlight: "warning",
  },
];

// Pedidos page tour
export const pedidosTourSteps: TourStep[] = [
  {
    target: "[data-tour='pedidos-header']",
    title: "Central de Pedidos",
    content: "Acompanhe todos os pedidos de compra em um único lugar. Visualize status, valores e prazos de entrega.",
    position: "bottom",
    highlight: "primary",
  },
  {
    target: "[data-tour='pedidos-kpis']",
    title: "Resumo dos Pedidos",
    content: "Veja o panorama geral: total de pedidos, pendentes, em trânsito, entregues e valor total comprometido.",
    position: "bottom",
    highlight: "info",
  },
  {
    target: "[data-tour='pedidos-filtros']",
    title: "Filtros Avançados",
    content: "Filtre por status, fornecedor ou busque por número do pedido. Encontre qualquer pedido em segundos.",
    position: "bottom",
    highlight: "success",
  },
  {
    target: "[data-tour='pedidos-tabela']",
    title: "Acompanhamento de Pedidos",
    content: "Clique em qualquer pedido para ver detalhes completos, atualizar status ou entrar em contato com o fornecedor.",
    position: "top",
    highlight: "warning",
  },
];

// Solicitações page tour
export const solicitacoesTourSteps: TourStep[] = [
  {
    target: "[data-tour='solicitacoes-header']",
    title: "Central de Solicitações",
    content: "Gerencie todo o ciclo de vida das suas solicitações de compra. Desde a criação até a aprovação e conclusão.",
    position: "bottom",
    highlight: "primary",
  },
  {
    target: "[data-tour='solicitacoes-stats']",
    title: "Estatísticas Rápidas",
    content: "Acompanhe o resumo das solicitações: total, pendentes, em andamento e valor total comprometido.",
    position: "bottom",
    highlight: "info",
  },
  {
    target: "[data-tour='solicitacoes-busca']",
    title: "Busca e Filtros",
    content: "Encontre solicitações por produto, empresa ou ID. Use os filtros de status e tipo para refinar sua busca.",
    position: "bottom",
    highlight: "success",
  },
  {
    target: "[data-tour='solicitacoes-nova']",
    title: "Nova Solicitação",
    content: "Clique aqui para criar uma nova solicitação de compra. Preencha os dados do produto, quantidade e prazo desejado.",
    position: "left",
    highlight: "warning",
  },
  {
    target: "[data-tour='solicitacoes-kanban']",
    title: "Visualização Kanban",
    content: "Arraste e solte cards entre as colunas para mudar o status. Visualize o fluxo completo das solicitações de forma intuitiva.",
    position: "top",
    highlight: "primary",
  },
];
