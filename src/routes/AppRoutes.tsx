import { lazy, Suspense } from "react";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/features/auth/components/ProtectedRoute";
import type { AppRole } from "@/features/auth/types/authRoles";
import { ModuleErrorBoundary } from "@/features/layout/components/ModuleErrorBoundary";

import { Shell } from "@/features/layout/components/Shell";
import { RouteSkeleton } from "@/components/navigation/RouteSkeleton";
import { PageLoader } from "@/features/layout/components/PageLoader";

// Lazy load all pages
const ComprasDashboard = lazy(() => import("@/pages/dashboard/ComprasDashboard"));
const Cotacao = lazy(() => import("@/pages/cotacao/Cotacao"));
const Solicitacoes = lazy(() => import("@/pages/solicitacoes/Solicitacoes"));
const Pedidos = lazy(() => import("@/pages/pedidos/Pedidos"));
const Pagamentos = lazy(() => import("@/pages/pagamentos/Pagamentos"));
const Fornecedores = lazy(() => import("@/pages/fornecedores/Fornecedores"));
const Acompanhamento = lazy(() => import("@/pages/acompanhamento/Acompanhamento"));
const GerarOrdem = lazy(() => import("@/pages/gerar-ordem/GerarOrdem"));
const Relatorios = lazy(() => import("@/pages/relatorios/Relatorios"));
const RelatorioNegociacoes = lazy(() => import("@/pages/relatorio-negociacoes/RelatorioNegociacoes"));
const Aprovacoes = lazy(() => import("@/pages/aprovacoes/Aprovacoes"));
const Auditoria = lazy(() => import("@/pages/auditoria/Auditoria"));
const SupplierPerformance = lazy(() => import("@/pages/fornecedores/SupplierPerformance"));
const DashboardExecutivo = lazy(() => import("@/pages/dashboard/DashboardExecutivo"));
const BuyerPerformanceDashboard = lazy(() => import("@/pages/buyer/BuyerPerformanceDashboard"));
const HistoricoCompras = lazy(() => import("@/pages/historico/HistoricoCompras"));
const Contratos = lazy(() => import("@/pages/contratos/Contratos"));
const ComplianceDashboard = lazy(() => import("@/pages/compliance/ComplianceDashboard"));
const Auth = lazy(() => import("@/pages/auth/Auth"));
const Seguranca = lazy(() => import("@/pages/seguranca/Seguranca"));
const CatalogoSpot = lazy(() => import("@/pages/catalogo-spot/CatalogoSpot"));
const CatalogoXbz = lazy(() => import("@/pages/catalogo-xbz/CatalogoXbz"));

const QualificacaoFornecedores = lazy(() => import("@/pages/qualificacao/QualificacaoFornecedores"));
const Orcamentos = lazy(() => import("@/pages/orcamentos/Orcamentos"));
const NegociacaoIA = lazy(() => import("@/pages/negociacao-ia/NegociacaoIA"));
const KanbanWorkflow = lazy(() => import("@/pages/kanban/KanbanWorkflow"));
const DocumentosFiscais = lazy(() => import("@/pages/documentos/DocumentosFiscais"));
const RecompraInteligente = lazy(() => import("@/pages/recompra/RecompraInteligente"));
const Devolucoes = lazy(() => import("@/pages/devolucoes/Devolucoes"));
const CatalogoProdutos = lazy(() => import("@/pages/catalogo-produtos/CatalogoProdutos"));
const GestaoEstoque = lazy(() => import("@/pages/estoque/GestaoEstoque"));
const Licitacoes = lazy(() => import("@/pages/licitacoes/Licitacoes"));
const RecebimentoOffline = lazy(() => import("@/pages/recebimento/RecebimentoOffline"));
const AdminTelemetria = lazy(() => import("@/pages/admin-telemetria/AdminTelemetria"));
const DependencyHealth = lazy(() => import("@/pages/admin/DependencyHealth"));
const SSOConfig = lazy(() => import("@/pages/admin/SSOConfig"));
const Sourcing = lazy(() => import("@/pages/sourcing/Sourcing"));
const PunchOutCatalogs = lazy(() => import("@/pages/admin/PunchOutCatalogs"));
const ERPConnections = lazy(() => import("@/pages/admin/ERPConnections"));
const RFxCreate = lazy(() => import("@/pages/sourcing/RFxCreate"));
const RFxDetails = lazy(() => import("@/pages/sourcing/RFxDetails"));
const AuctionRoom = lazy(() => import("@/pages/sourcing/AuctionRoom"));
const PortalFornecedor = lazy(() => import("@/pages/portal-fornecedor/PortalFornecedor"));
const ConfiguracoesCentroCusto = lazy(() => import("@/pages/configuracoes/ConfiguracoesCentroCusto"));
const FiscalDashboard = lazy(() => import("@/pages/admin/FiscalDashboard"));
const SourcingPipeline = lazy(() => import("@/pages/admin/SourcingPipeline"));
const WorkflowDesigner = lazy(() => import("@/pages/admin/WorkflowAdmin"));
const DeveloperDocs = lazy(() => import("@/pages/admin/DeveloperDocs"));
const StorageMigration = lazy(() => import("@/pages/admin/StorageMigration"));
const HealthDashboard = lazy(() => import("@/pages/admin/HealthDashboard"));
const AlertDetail = lazy(() => import("@/pages/admin/AlertDetail"));

const NotFound = lazy(() => import("@/pages/NotFound"));

/** Harness dev-only usado pelos testes E2E do painel de rede XBZ. */
const XbzNetworkPanelHarness = lazy(() => import("@/pages/dev/XbzNetworkPanelHarness"));

/**
 * Papéis exigidos por rota, derivados das policies de RLS de `SELECT` vigentes.
 * Rotas sem `requiredRole` continuam acessíveis a qualquer sessão autenticada.
 */
const ROLES_ORDEM: AppRole[] = ["admin", "coordinator", "buyer", "finance"];
const ROLES_FINANCEIRO: AppRole[] = ["admin", "coordinator", "finance", "buyer"];
const ROLES_CONTRATO: AppRole[] = ["admin", "coordinator", "finance", "buyer"];
const ROLES_APROVACAO: AppRole[] = ["admin", "coordinator", "finance"];
const ROLES_ORCAMENTO: AppRole[] = ["admin", "coordinator", "finance"];
const ROLES_ADMIN: AppRole[] = ["admin"];
const ROLES_LICITACAO: AppRole[] = ["admin", "coordinator"];

export const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <div className="w-full min-h-screen">
      <Routes location={location}>

          <Route path="/auth" element={
            <Suspense fallback={<PageLoader />}>
              <Auth />
            </Suspense>
          } />

          {/* Protected Routes wrapped in Shell */}
          <Route element={<ProtectedRoute><Shell /></ProtectedRoute>}>
            <Route path="/" element={<Navigate to="/compras" replace />} />
            <Route path="/compras" element={<ModuleErrorBoundary module="dashboard"><RouteSkeleton variant="dashboard"><ComprasDashboard /></RouteSkeleton></ModuleErrorBoundary>} />
            <Route path="/cotacao" element={<ProtectedRoute requiredRole={ROLES_ORDEM}><ModuleErrorBoundary module="cotacoes"><RouteSkeleton variant="table"><Cotacao /></RouteSkeleton></ModuleErrorBoundary></ProtectedRoute>} />
            <Route path="/cotacao/:id" element={<ProtectedRoute requiredRole={ROLES_ORDEM}><ModuleErrorBoundary module="cotacoes"><RouteSkeleton variant="form"><Cotacao /></RouteSkeleton></ModuleErrorBoundary></ProtectedRoute>} />
            <Route path="/solicitacoes" element={<ModuleErrorBoundary module="solicitacoes"><RouteSkeleton variant="table"><Solicitacoes /></RouteSkeleton></ModuleErrorBoundary>} />
            <Route path="/pedidos" element={<ProtectedRoute requiredRole={ROLES_ORDEM}><ModuleErrorBoundary module="pedidos"><RouteSkeleton variant="table"><Pedidos /></RouteSkeleton></ModuleErrorBoundary></ProtectedRoute>} />
            <Route path="/pagamentos" element={<ProtectedRoute requiredRole={ROLES_FINANCEIRO}><ModuleErrorBoundary module="pagamentos"><RouteSkeleton variant="table"><Pagamentos /></RouteSkeleton></ModuleErrorBoundary></ProtectedRoute>} />
            <Route path="/fornecedores" element={<ProtectedRoute requiredRole={ROLES_ORDEM}><ModuleErrorBoundary module="fornecedores"><RouteSkeleton variant="table"><Fornecedores /></RouteSkeleton></ModuleErrorBoundary></ProtectedRoute>} />
            <Route path="/acompanhamento" element={<ProtectedRoute requiredRole={ROLES_ORDEM}><ModuleErrorBoundary module="pedidos"><RouteSkeleton variant="table"><Acompanhamento /></RouteSkeleton></ModuleErrorBoundary></ProtectedRoute>} />
            <Route path="/gerar-ordem" element={<ProtectedRoute requiredRole={ROLES_ORDEM}><ModuleErrorBoundary module="pedidos"><RouteSkeleton variant="form"><GerarOrdem /></RouteSkeleton></ModuleErrorBoundary></ProtectedRoute>} />
            <Route path="/relatorios" element={<ProtectedRoute requiredRole={ROLES_ORDEM}><ModuleErrorBoundary module="relatorios"><RouteSkeleton variant="dashboard"><Relatorios /></RouteSkeleton></ModuleErrorBoundary></ProtectedRoute>} />
            <Route path="/relatorios/negociacoes" element={<ProtectedRoute requiredRole={ROLES_ORDEM}><ModuleErrorBoundary module="relatorios"><RouteSkeleton variant="table"><RelatorioNegociacoes /></RouteSkeleton></ModuleErrorBoundary></ProtectedRoute>} />
            <Route path="/aprovacoes" element={<ProtectedRoute requiredRole={ROLES_APROVACAO}><ModuleErrorBoundary module="solicitacoes"><RouteSkeleton variant="table"><Aprovacoes /></RouteSkeleton></ModuleErrorBoundary></ProtectedRoute>} />
            <Route path="/supplier-performance" element={<ProtectedRoute requiredRole={ROLES_ORDEM}><ModuleErrorBoundary module="fornecedores"><RouteSkeleton variant="dashboard"><SupplierPerformance /></RouteSkeleton></ModuleErrorBoundary></ProtectedRoute>} />
            <Route path="/dashboard-executivo" element={<ProtectedRoute requiredRole={ROLES_ORDEM}><ModuleErrorBoundary module="dashboard"><RouteSkeleton variant="dashboard"><DashboardExecutivo /></RouteSkeleton></ModuleErrorBoundary></ProtectedRoute>} />
            <Route path="/buyer-performance" element={<ProtectedRoute requiredRole={ROLES_ORDEM}><ModuleErrorBoundary module="dashboard"><RouteSkeleton variant="dashboard"><BuyerPerformanceDashboard /></RouteSkeleton></ModuleErrorBoundary></ProtectedRoute>} />
            <Route path="/historico-compras" element={<ProtectedRoute requiredRole={ROLES_ORDEM}><ModuleErrorBoundary module="pedidos"><RouteSkeleton variant="table"><HistoricoCompras /></RouteSkeleton></ModuleErrorBoundary></ProtectedRoute>} />
            <Route path="/contratos" element={<ProtectedRoute requiredRole={ROLES_CONTRATO}><ModuleErrorBoundary module="fornecedores"><RouteSkeleton variant="table"><Contratos /></RouteSkeleton></ModuleErrorBoundary></ProtectedRoute>} />
            <Route path="/compliance" element={<ProtectedRoute requiredRole={ROLES_ORDEM}><ModuleErrorBoundary module="fornecedores"><RouteSkeleton variant="dashboard"><ComplianceDashboard /></RouteSkeleton></ModuleErrorBoundary></ProtectedRoute>} />
            <Route path="/auditoria" element={<ProtectedRoute requiredRole={ROLES_ADMIN}><ModuleErrorBoundary module="relatorios"><RouteSkeleton variant="table"><Auditoria /></RouteSkeleton></ModuleErrorBoundary></ProtectedRoute>} />
            <Route path="/seguranca" element={<ModuleErrorBoundary module="default"><RouteSkeleton variant="form"><Seguranca /></RouteSkeleton></ModuleErrorBoundary>} />
            <Route path="/catalogo-spot" element={<ProtectedRoute requiredRole={ROLES_ORDEM}><ModuleErrorBoundary module="fornecedores"><RouteSkeleton variant="table"><CatalogoSpot /></RouteSkeleton></ModuleErrorBoundary></ProtectedRoute>} />
            <Route path="/catalogo-xbz" element={<ProtectedRoute requiredRole={ROLES_ORDEM}><ModuleErrorBoundary module="fornecedores"><RouteSkeleton variant="table"><CatalogoXbz /></RouteSkeleton></ModuleErrorBoundary></ProtectedRoute>} />

            <Route path="/qualificacao-fornecedores" element={<ProtectedRoute requiredRole={ROLES_ORDEM}><ModuleErrorBoundary module="fornecedores"><RouteSkeleton variant="table"><QualificacaoFornecedores /></RouteSkeleton></ModuleErrorBoundary></ProtectedRoute>} />
            <Route path="/orcamentos" element={<ProtectedRoute requiredRole={ROLES_ORCAMENTO}><ModuleErrorBoundary module="default"><RouteSkeleton variant="table"><Orcamentos /></RouteSkeleton></ModuleErrorBoundary></ProtectedRoute>} />
            <Route path="/negociacao-ia" element={<ProtectedRoute requiredRole={ROLES_ORDEM}><ModuleErrorBoundary module="cotacoes"><RouteSkeleton variant="full"><NegociacaoIA /></RouteSkeleton></ModuleErrorBoundary></ProtectedRoute>} />
            <Route path="/kanban" element={<ModuleErrorBoundary module="solicitacoes"><RouteSkeleton variant="kanban"><KanbanWorkflow /></RouteSkeleton></ModuleErrorBoundary>} />
            <Route path="/documentos-fiscais" element={<ProtectedRoute requiredRole={ROLES_ORDEM}><ModuleErrorBoundary module="default"><RouteSkeleton variant="table"><DocumentosFiscais /></RouteSkeleton></ModuleErrorBoundary></ProtectedRoute>} />
            <Route path="/recompra-inteligente" element={<ProtectedRoute requiredRole={ROLES_ORDEM}><ModuleErrorBoundary module="pedidos"><RouteSkeleton variant="dashboard"><RecompraInteligente /></RouteSkeleton></ModuleErrorBoundary></ProtectedRoute>} />
            <Route path="/devolucoes" element={<ProtectedRoute requiredRole={ROLES_ORDEM}><ModuleErrorBoundary module="pedidos"><RouteSkeleton variant="table"><Devolucoes /></RouteSkeleton></ModuleErrorBoundary></ProtectedRoute>} />
            <Route path="/catalogo-produtos" element={<ModuleErrorBoundary module="default"><RouteSkeleton variant="table"><CatalogoProdutos /></RouteSkeleton></ModuleErrorBoundary>} />
            <Route path="/estoque" element={<ModuleErrorBoundary module="default"><RouteSkeleton variant="table"><GestaoEstoque /></RouteSkeleton></ModuleErrorBoundary>} />
            <Route path="/sourcing" element={<ProtectedRoute requiredRole={ROLES_ORDEM}><ModuleErrorBoundary module="cotacoes"><RouteSkeleton variant="table"><Sourcing /></RouteSkeleton></ModuleErrorBoundary></ProtectedRoute>} />
            <Route path="/sourcing/novo" element={<ProtectedRoute requiredRole={ROLES_ORDEM}><ModuleErrorBoundary module="cotacoes"><RouteSkeleton variant="form"><RFxCreate /></RouteSkeleton></ModuleErrorBoundary></ProtectedRoute>} />
            <Route path="/sourcing/:id" element={<ProtectedRoute requiredRole={ROLES_ORDEM}><ModuleErrorBoundary module="cotacoes"><RouteSkeleton variant="full"><RFxDetails /></RouteSkeleton></ModuleErrorBoundary></ProtectedRoute>} />
            <Route path="/sourcing/:id/auction" element={<ProtectedRoute requiredRole={ROLES_ORDEM}><ModuleErrorBoundary module="cotacoes"><RouteSkeleton variant="full"><AuctionRoom /></RouteSkeleton></ModuleErrorBoundary></ProtectedRoute>} />
            <Route path="/licitacoes" element={<ProtectedRoute requiredRole={ROLES_LICITACAO}><ModuleErrorBoundary module="default"><RouteSkeleton variant="table"><Licitacoes /></RouteSkeleton></ModuleErrorBoundary></ProtectedRoute>} />
            <Route path="/recebimento" element={<ProtectedRoute requiredRole={ROLES_ORDEM}><ModuleErrorBoundary module="pedidos"><RouteSkeleton variant="form"><RecebimentoOffline /></RouteSkeleton></ModuleErrorBoundary></ProtectedRoute>} />
            <Route path="/admin/telemetria" element={<ProtectedRoute requiredRole="admin"><ModuleErrorBoundary module="default"><RouteSkeleton variant="dashboard"><AdminTelemetria /></RouteSkeleton></ModuleErrorBoundary></ProtectedRoute>} />
            <Route path="/admin/dependency-health" element={<ProtectedRoute requiredRole="admin"><ModuleErrorBoundary module="default"><RouteSkeleton variant="dashboard"><DependencyHealth /></RouteSkeleton></ModuleErrorBoundary></ProtectedRoute>} />
            <Route path="/admin/sso" element={<ProtectedRoute requiredRole="admin"><ModuleErrorBoundary module="default"><RouteSkeleton variant="form"><SSOConfig /></RouteSkeleton></ModuleErrorBoundary></ProtectedRoute>} />
            <Route path="/admin/punchout" element={<ProtectedRoute requiredRole="admin"><ModuleErrorBoundary module="default"><RouteSkeleton variant="table"><PunchOutCatalogs /></RouteSkeleton></ModuleErrorBoundary></ProtectedRoute>} />
            <Route path="/admin/erp" element={<ProtectedRoute requiredRole="admin"><ModuleErrorBoundary module="default"><RouteSkeleton variant="table"><ERPConnections /></RouteSkeleton></ModuleErrorBoundary></ProtectedRoute>} />
            <Route path="/admin/fiscal" element={<ProtectedRoute requiredRole="admin"><ModuleErrorBoundary module="default"><RouteSkeleton variant="dashboard"><FiscalDashboard /></RouteSkeleton></ModuleErrorBoundary></ProtectedRoute>} />
            <Route path="/admin/sourcing-pipeline" element={<ProtectedRoute requiredRole="admin"><ModuleErrorBoundary module="default"><RouteSkeleton variant="kanban"><SourcingPipeline /></RouteSkeleton></ModuleErrorBoundary></ProtectedRoute>} />
            <Route path="/admin/workflows" element={<ProtectedRoute requiredRole="admin"><ModuleErrorBoundary module="default"><RouteSkeleton variant="full"><WorkflowDesigner /></RouteSkeleton></ModuleErrorBoundary></ProtectedRoute>} />
            <Route path="/admin/docs" element={<ProtectedRoute requiredRole="admin"><ModuleErrorBoundary module="default"><RouteSkeleton variant="full"><DeveloperDocs /></RouteSkeleton></ModuleErrorBoundary></ProtectedRoute>} />
            <Route path="/admin/storage-migration" element={<ProtectedRoute requiredRole="admin"><ModuleErrorBoundary module="default"><RouteSkeleton variant="dashboard"><StorageMigration /></RouteSkeleton></ModuleErrorBoundary></ProtectedRoute>} />
            <Route path="/admin/health" element={<ProtectedRoute requiredRole="admin"><ModuleErrorBoundary module="default"><RouteSkeleton variant="dashboard"><HealthDashboard /></RouteSkeleton></ModuleErrorBoundary></ProtectedRoute>} />
            <Route path="/admin/health/alerts/:id" element={<ProtectedRoute requiredRole="admin"><ModuleErrorBoundary module="default"><RouteSkeleton variant="dashboard"><AlertDetail /></RouteSkeleton></ModuleErrorBoundary></ProtectedRoute>} />

            <Route path="/portal-fornecedor" element={<ProtectedRoute requiredRole={['supplier', 'admin']}><ModuleErrorBoundary module="fornecedores"><RouteSkeleton variant="dashboard"><PortalFornecedor /></RouteSkeleton></ModuleErrorBoundary></ProtectedRoute>} />
            <Route path="/configuracoes-centro-custo" element={<ModuleErrorBoundary module="default"><RouteSkeleton variant="form"><ConfiguracoesCentroCusto /></RouteSkeleton></ModuleErrorBoundary>} />
          </Route>

          {import.meta.env.DEV ? (
            <Route path="/__dev/xbz-network-panel" element={
              <Suspense fallback={<PageLoader />}>
                <XbzNetworkPanelHarness />
              </Suspense>
            } />
          ) : null}

          <Route path="*" element={
            <Suspense fallback={<PageLoader />}>
              <NotFound />
            </Suspense>
        } />
      </Routes>
    </div>
  );
};

