import React from "react";
import {
  Search, LayoutDashboard, FileText, ShoppingCart,
  CreditCard, Building2, FileSignature, TrendingUp, Settings,
} from "lucide-react";
import { normalizeText } from "@/hooks/useFuseSearch";

// Types
export interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  type: SearchCategory;
  icon: React.ElementType;
  href: string;
  metadata?: {
    status?: string;
    value?: number;
    date?: string;
    priority?: string;
  };
  score?: number;
  matchedText?: { key: string; indices: [number, number][] }[];
}

export type SearchCategory = 'all' | 'pages' | 'solicitacoes' | 'pedidos' | 'fornecedores' | 'pagamentos' | 'contratos';

export interface SearchFilter {
  status?: string[];
  dateRange?: { start: string; end: string };
  valueRange?: { min: number; max: number };
  priority?: string[];
}

// Fuse.js configuration
export const fuseOptions = {
  isCaseSensitive: false,
  includeScore: true,
  includeMatches: true,
  shouldSort: true,
  threshold: 0.4,
  location: 0,
  distance: 100,
  minMatchCharLength: 2,
  useExtendedSearch: true,
  keys: [
    { name: 'title', weight: 2.0 },
    { name: 'subtitle', weight: 1.5 },
    { name: 'normalizedTitle', weight: 1.8 },
    { name: 'normalizedSubtitle', weight: 1.3 },
  ],
};

// Category configuration
export const categoryConfig: Record<SearchCategory, { label: string; icon: React.ElementType; color: string }> = {
  all: { label: 'Todos', icon: Search, color: 'text-foreground' },
  pages: { label: 'Páginas', icon: LayoutDashboard, color: 'text-primary' },
  solicitacoes: { label: 'Solicitações', icon: FileText, color: 'text-warning' },
  pedidos: { label: 'Pedidos', icon: ShoppingCart, color: 'text-success' },
  fornecedores: { label: 'Fornecedores', icon: Building2, color: 'text-info' },
  pagamentos: { label: 'Pagamentos', icon: CreditCard, color: 'text-warning' },
  contratos: { label: 'Contratos', icon: FileSignature, color: 'text-purple-500' },
};

// Navigation pages
export const navigationPages: (SearchResult & { normalizedTitle: string; normalizedSubtitle: string })[] = [
  { id: "dashboard", title: "Dashboard", subtitle: "Visão geral do sistema", type: "pages", icon: LayoutDashboard, href: "/compras", normalizedTitle: normalizeText("Dashboard"), normalizedSubtitle: normalizeText("Visão geral do sistema") },
  { id: "solicitacoes", title: "Solicitações", subtitle: "Lista de solicitações de compra", type: "pages", icon: FileText, href: "/solicitacoes", normalizedTitle: normalizeText("Solicitações"), normalizedSubtitle: normalizeText("Lista de solicitações de compra") },
  { id: "cotacoes", title: "Cotações", subtitle: "Gerenciar cotações", type: "pages", icon: Search, href: "/cotacao", normalizedTitle: normalizeText("Cotações"), normalizedSubtitle: normalizeText("Gerenciar cotações") },
  { id: "pedidos", title: "Pedidos", subtitle: "Ordens de compra", type: "pages", icon: ShoppingCart, href: "/pedidos", normalizedTitle: normalizeText("Pedidos"), normalizedSubtitle: normalizeText("Ordens de compra") },
  { id: "pagamentos", title: "Pagamentos", subtitle: "Gestão financeira", type: "pages", icon: CreditCard, href: "/pagamentos", normalizedTitle: normalizeText("Pagamentos"), normalizedSubtitle: normalizeText("Gestão financeira") },
  { id: "fornecedores", title: "Fornecedores", subtitle: "Cadastro de fornecedores", type: "pages", icon: Building2, href: "/fornecedores", normalizedTitle: normalizeText("Fornecedores"), normalizedSubtitle: normalizeText("Cadastro de fornecedores") },
  { id: "contratos", title: "Contratos", subtitle: "Gestão de contratos", type: "pages", icon: FileSignature, href: "/contratos", normalizedTitle: normalizeText("Contratos"), normalizedSubtitle: normalizeText("Gestão de contratos") },
  { id: "relatorios", title: "Relatórios", subtitle: "Analytics e métricas", type: "pages", icon: TrendingUp, href: "/relatorios", normalizedTitle: normalizeText("Relatórios"), normalizedSubtitle: normalizeText("Analytics e métricas") },
  { id: "seguranca", title: "Segurança", subtitle: "Configurações de segurança", type: "pages", icon: Settings, href: "/seguranca", normalizedTitle: normalizeText("Segurança"), normalizedSubtitle: normalizeText("Configurações de segurança") },
];

// Quick actions
export const quickActions = [
  { id: 'nova-solicitacao', label: 'Nova Solicitação', icon: FileText, action: '/solicitacoes?action=new' },
  { id: 'novo-fornecedor', label: 'Novo Fornecedor', icon: Building2, action: '/fornecedores?action=new' },
  { id: 'novo-contrato', label: 'Novo Contrato', icon: FileSignature, action: '/contratos?action=new' },
];

// Search history
export const SEARCH_HISTORY_KEY = 'advanced_search_history';
export const MAX_HISTORY_ITEMS = 10;

// Natural language intent parser
export interface NLIntent {
  category: SearchCategory;
  statusFilter?: string;
  description: string;
  redirectPath?: string;
}

export function parseNaturalLanguageIntent(query: string): NLIntent | null {
  const q = query.toLowerCase().trim();

  const patterns: { test: RegExp; result: NLIntent }[] = [
    { test: /pedidos?\s+(atrasad|pendente|em.atraso)/i, result: { category: 'pedidos', statusFilter: 'pendente', description: 'Pedidos atrasados/pendentes', redirectPath: '/pedidos?status=pendente' } },
    { test: /pedidos?\s+entreg/i, result: { category: 'pedidos', statusFilter: 'entregue', description: 'Pedidos entregues', redirectPath: '/pedidos?status=entregue' } },
    { test: /pagamentos?\s+(pendente|atrasad|vencid)/i, result: { category: 'pagamentos', statusFilter: 'pendente', description: 'Pagamentos pendentes', redirectPath: '/pagamentos?status=pendente' } },
    { test: /pagamentos?\s+pag[oa]/i, result: { category: 'pagamentos', statusFilter: 'pago', description: 'Pagamentos realizados', redirectPath: '/pagamentos?status=pago' } },
    { test: /fornecedor.*(melhor|top|rank)/i, result: { category: 'fornecedores', description: 'Ranking de fornecedores', redirectPath: '/supplier-performance' } },
    { test: /solicit.*(urgent|alta.priorid)/i, result: { category: 'solicitacoes', statusFilter: 'urgente', description: 'Solicitações urgentes', redirectPath: '/solicitacoes?prioridade=urgente' } },
    { test: /cotac.*(pendente|aberta)/i, result: { category: 'all', description: 'Cotações pendentes', redirectPath: '/cotacao?status=pendente' } },
    { test: /contrat.*(venc|expir)/i, result: { category: 'contratos', description: 'Contratos vencendo', redirectPath: '/contratos?status=expiring' } },
    { test: /relat[oó]rio|dashboard|resumo/i, result: { category: 'pages', description: 'Relatórios e dashboards', redirectPath: '/relatorios' } },
    { test: /aprovaç|aprovac|aprovar/i, result: { category: 'pages', description: 'Aprovações pendentes', redirectPath: '/aprovacoes' } },
    { test: /cat[aá]logo|produto/i, result: { category: 'pages', description: 'Catálogo de produtos', redirectPath: '/catalogo-produtos' } },
  ];

  for (const { test, result } of patterns) {
    if (test.test(q)) return result;
  }
  return null;
}

// Status badge color helper
export const getStatusColor = (status?: string) => {
  switch (status?.toLowerCase()) {
    case 'aprovado': case 'ativo': case 'pago': case 'entregue':
      return 'bg-success/10 text-success';
    case 'pendente': case 'aguardando':
      return 'bg-warning/10 text-warning';
    case 'rejeitado': case 'cancelado': case 'atrasado':
      return 'bg-destructive/10 text-destructive';
    default:
      return 'bg-muted text-muted-foreground';
  }
};
