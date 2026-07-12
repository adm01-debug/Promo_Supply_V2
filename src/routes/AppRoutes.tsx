import { lazy, Suspense } from "react";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/features/auth/components/ProtectedRoute";
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
const NotFound = lazy(() => import("@/pages/NotFound"));

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
            <Route path="/cotacao" element={<ModuleErrorBoundary module="cotacoes"><RouteSkeleton variant="table"><Cotacao /></RouteSkeleton></ModuleErrorBoundary>} />
            <Route path="/cotacao/:id" element={<ModuleErrorBoundary module="cotacoes"><RouteSkeleton variant="form"><Cotacao /></RouteSkeleton></ModuleErrorBoundary>} />
            <Route path="/solicitacoes" element={<ModuleErrorBoundary module="solicitacoes"><RouteSkeleton variant="table"><Solicitacoes /></RouteSkeleton></ModuleErrorBoundary>} />
            <Route path="/pedidos" element={<ModuleErrorBoundary module="pedidos"><RouteSkeleton variant="table"><Pedidos /></RouteSkeleton></ModuleErrorBoundary>} />
            <Route path="/pagamentos" element={<ModuleErrorBoundary module="pagamentos"><RouteSkeleton variant="table"><Pagamentos /></RouteSkeleton></ModuleErrorBoundary>} />
            <Route path="/fornecedores" element={<ModuleErrorBoundary module="fornecedores"><RouteSkeleton variant="table"><Fornecedores /></RouteSkeleton></ModuleErrorBoundary>} />
            <Route path="/acompanhamento" element={<ModuleErrorBoundary module="pedidos"><RouteSkeleton variant="table"><Acompanhamento /></RouteSkeleton></ModuleErrorBoundary>} />
            <Route path="/gerar-ordem" element={<ModuleErrorBoundary module="pedidos"><RouteSkeleton variant="form"><GerarOrdem /></RouteSkeleton></ModuleErrorBoundary>} />
            <Route path="/relatorios" element={<ModuleErrorBoundary module="relatorios"><RouteSkeleton variant="dashboard"><Relatorios /></RouteSkeleton></ModuleErrorBoundary>} />
            <Route path="/relatorios/negociacoes" element={<ModuleErrorBoundary module="relatorios"><RouteSkeleton variant="table"><RelatorioNegociacoes /></RouteSkeleton></ModuleErrorBoundary>} />
            <Route path="/aprovacoes" element={<ModuleErrorBoundary module="solicitacoes"><RouteSkeleton variant="table"><Aprovacoes /></RouteSkeleton></ModuleErrorBoundary>} />
            <Route path="/supplier-performance" element={<ModuleErrorBoundary module="fornecedores"><RouteSkeleton variant="dashboard"><SupplierPerformance /></RouteSkeleton></ModuleErrorBoundary>} />
            <Route path="/dashboard-executivo" element={<ModuleErrorBoundary module="dashboard"><RouteSkeleton variant="dashboard"><DashboardExecutivo /></RouteSkeleton></ModuleErrorBoundary>} />
            <Route path="/buyer-performance" element={<ModuleErrorBoundary module="dashboard"><RouteSkeleton variant="dashboard"><BuyerPerformanceDashboard /></RouteSkeleton></ModuleErrorBoundary>} />
            <Route path="/historico-compras" element={<ModuleErrorBoundary module="pedidos"><RouteSkeleton variant="table"><HistoricoCompras /></RouteSkeleton></ModuleErrorBoundary>} />
            <Route path="/contratos" element={<ModuleErrorBoundary module="fornecedores"><RouteSkeleton variant="table"><Contratos /></RouteSkeleton></ModuleErrorBoundary>} />
            <Route path="/compliance" element={<ModuleErrorBoundary module="fornecedores"><RouteSkeleton variant="dashboard"><ComplianceDashboard /></RouteSkeleton></ModuleErrorBoundary>} />
            <Route path="/auditoria" element={<ModuleErrorBoundary module="relatorios"><RouteSkeleton variant="table"><Auditoria /></RouteSkeleton></ModuleErrorBoundary>} />
            <Route path="/seguranca" element={<ModuleErrorBoundary module="default"><RouteSkeleton variant="form"><Seguranca /></RouteSkeleton></ModuleErrorBoundary>} />
            <Route path="/catalogo-spot" element={<ModuleErrorBoundary module="fornecedores"><RouteSkeleton variant="table"><CatalogoSpot /></RouteSkeleton></ModuleErrorBoundary>} />
            <Route path="/qualificacao-fornecedores" element={<ModuleErrorBoundary module="fornecedores"><RouteSkeleton variant="table"><QualificacaoFornecedores /></RouteSkeleton></ModuleErrorBoundary>} />
            <Route path="/orcamentos" element={<ModuleErrorBoundary module="default"><RouteSkeleton variant="table"><Orcamentos /></RouteSkeleton></ModuleErrorBoundary>} />
            <Route path="/negociacao-ia" element={<ModuleErrorBoundary module="cotacoes"><RouteSkeleton variant="full"><NegociacaoIA /></RouteSkeleton></ModuleErrorBoundary>} />
            <Route path="/kanban" element={<ModuleErrorBoundary module="solicitacoes"><RouteSkeleton variant="kanban"><KanbanWorkflow /></RouteSkeleton></ModuleErrorBoundary>} />
            <Route path="/documentos-fiscais" element={<ModuleErrorBoundary module="default"><RouteSkeleton variant="table"><DocumentosFiscais /></RouteSkeleton></ModuleErrorBoundary>} />
            <Route path="/recompra-inteligente" element={<ModuleErrorBoundary module="pedidos"><RouteSkeleton variant="dashboard"><RecompraInteligente /></RouteSkeleton></ModuleErrorBoundary>} />
            <Route path="/devolucoes" element={<ModuleErrorBoundary module="pedidos"><RouteSkeleton variant="table"><Devolucoes /></RouteSkeleton></ModuleErrorBoundary>} />
            <Route path="/catalogo-produtos" element={<ModuleErrorBoundary module="default"><RouteSkeleton variant="table"><CatalogoProdutos /></RouteSkeleton></ModuleErrorBoundary>} />
            <Route path="/estoque" element={<ModuleErrorBoundary module="default"><RouteSkeleton variant="table"><GestaoEstoque /></RouteSkeleton></ModuleErrorBoundary>} />
            <Route path="/sourcing" element={<ModuleErrorBoundary module="cotacoes"><RouteSkeleton variant="table"><Sourcing /></RouteSkeleton></ModuleErrorBoundary>} />
            <Route path="/sourcing/novo" element={<ModuleErrorBoundary module="cotacoes"><RouteSkeleton variant="form"><RFxCreate /></RouteSkeleton></ModuleErrorBoundary>} />
            <Route path="/sourcing/:id" element={<ModuleErrorBoundary module="cotacoes"><RouteSkeleton variant="full"><RFxDetails /></RouteSkeleton></ModuleErrorBoundary>} />
            <Route path="/sourcing/:id/auction" element={<ModuleErrorBoundary module="cotacoes"><RouteSkeleton variant="full"><AuctionRoom /></RouteSkeleton></ModuleErrorBoundary>} />
            <Route path="/licitacoes" element={<ModuleErrorBoundary module="default"><RouteSkeleton variant="table"><Licitacoes /></RouteSkeleton></ModuleErrorBoundary>} />
            <Route path="/recebimento" element={<ModuleErrorBoundary module="pedidos"><RouteSkeleton variant="form"><RecebimentoOffline /></RouteSkeleton></ModuleErrorBoundary>} />
            <Route path="/admin/telemetria" element={<ModuleErrorBoundary module="default"><RouteSkeleton variant="dashboard"><AdminTelemetria /></RouteSkeleton></ModuleErrorBoundary>} />
            <Route path="/admin/dependency-health" element={<ModuleErrorBoundary module="default"><RouteSkeleton variant="dashboard"><DependencyHealth /></RouteSkeleton></ModuleErrorBoundary>} />
            <Route path="/admin/sso" element={<ModuleErrorBoundary module="default"><RouteSkeleton variant="form"><SSOConfig /></RouteSkeleton></ModuleErrorBoundary>} />
            <Route path="/admin/punchout" element={<ModuleErrorBoundary module="default"><RouteSkeleton variant="table"><PunchOutCatalogs /></RouteSkeleton></ModuleErrorBoundary>} />
            <Route path="/admin/erp" element={<ModuleErrorBoundary module="default"><RouteSkeleton variant="table"><ERPConnections /></RouteSkeleton></ModuleErrorBoundary>} />
            <Route path="/admin/fiscal" element={<ModuleErrorBoundary module="default"><RouteSkeleton variant="dashboard"><FiscalDashboard /></RouteSkeleton></ModuleErrorBoundary>} />
            <Route path="/admin/sourcing-pipeline" element={<ModuleErrorBoundary module="default"><RouteSkeleton variant="kanban"><SourcingPipeline /></RouteSkeleton></ModuleErrorBoundary>} />
            <Route path="/admin/workflows" element={<ModuleErrorBoundary module="default"><RouteSkeleton variant="full"><WorkflowDesigner /></RouteSkeleton></ModuleErrorBoundary>} />
            <Route path="/admin/docs" element={<ModuleErrorBoundary module="default"><RouteSkeleton variant="full"><DeveloperDocs /></RouteSkeleton></ModuleErrorBoundary>} />
            <Route path="/admin/storage-migration" element={<ModuleErrorBoundary module="default"><RouteSkeleton variant="dashboard"><StorageMigration /></RouteSkeleton></ModuleErrorBoundary>} />
            <Route path="/admin/health" element={<ModuleErrorBoundary module="default"><RouteSkeleton variant="dashboard"><HealthDashboard /></RouteSkeleton></ModuleErrorBoundary>} />
            <Route path="/portal-fornecedor" element={<ModuleErrorBoundary module="fornecedores"><RouteSkeleton variant="dashboard"><PortalFornecedor /></RouteSkeleton></ModuleErrorBoundary>} />
            <Route path="/configuracoes-centro-custo" element={<ModuleErrorBoundary module="default"><RouteSkeleton variant="form"><ConfiguracoesCentroCusto /></RouteSkeleton></ModuleErrorBoundary>} />
          </Route>

          <Route path="*" element={
            <Suspense fallback={<PageLoader />}>
              <NotFound />
            </Suspense>
        } />
      </Routes>
    </div>
  );
};

