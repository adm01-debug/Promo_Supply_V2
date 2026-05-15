import { lazy } from "react";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/features/auth/components/ProtectedRoute";
import { ModuleErrorBoundary } from "@/features/layout/components/ModuleErrorBoundary";
import { motion, AnimatePresence } from "framer-motion";
import { Shell } from "@/features/layout/components/Shell";

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
const NotFound = lazy(() => import("@/pages/NotFound"));

export const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <div className="w-full min-h-screen">
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/auth" element={<Auth />} />

          {/* Protected Routes wrapped in Shell */}
          <Route element={<ProtectedRoute><Shell /></ProtectedRoute>}>
            <Route path="/" element={<Navigate to="/compras" replace />} />
            <Route path="/compras" element={<ModuleErrorBoundary module="dashboard"><ComprasDashboard /></ModuleErrorBoundary>} />
            <Route path="/cotacao" element={<ModuleErrorBoundary module="cotacoes"><Cotacao /></ModuleErrorBoundary>} />
            <Route path="/cotacao/:id" element={<ModuleErrorBoundary module="cotacoes"><Cotacao /></ModuleErrorBoundary>} />
            <Route path="/solicitacoes" element={<ModuleErrorBoundary module="solicitacoes"><Solicitacoes /></ModuleErrorBoundary>} />
            <Route path="/pedidos" element={<ModuleErrorBoundary module="pedidos"><Pedidos /></ModuleErrorBoundary>} />
            <Route path="/pagamentos" element={<ModuleErrorBoundary module="pagamentos"><Pagamentos /></ModuleErrorBoundary>} />
            <Route path="/fornecedores" element={<ModuleErrorBoundary module="fornecedores"><Fornecedores /></ModuleErrorBoundary>} />
            <Route path="/acompanhamento" element={<ModuleErrorBoundary module="pedidos"><Acompanhamento /></ModuleErrorBoundary>} />
            <Route path="/gerar-ordem" element={<ModuleErrorBoundary module="pedidos"><GerarOrdem /></ModuleErrorBoundary>} />
            <Route path="/relatorios" element={<ModuleErrorBoundary module="relatorios"><Relatorios /></ModuleErrorBoundary>} />
            <Route path="/relatorios/negociacoes" element={<ModuleErrorBoundary module="relatorios"><RelatorioNegociacoes /></ModuleErrorBoundary>} />
            <Route path="/aprovacoes" element={<ModuleErrorBoundary module="solicitacoes"><Aprovacoes /></ModuleErrorBoundary>} />
            <Route path="/supplier-performance" element={<ModuleErrorBoundary module="fornecedores"><SupplierPerformance /></ModuleErrorBoundary>} />
            <Route path="/dashboard-executivo" element={<ModuleErrorBoundary module="dashboard"><DashboardExecutivo /></ModuleErrorBoundary>} />
            <Route path="/buyer-performance" element={<ModuleErrorBoundary module="dashboard"><BuyerPerformanceDashboard /></ModuleErrorBoundary>} />
            <Route path="/historico-compras" element={<ModuleErrorBoundary module="pedidos"><HistoricoCompras /></ModuleErrorBoundary>} />
            <Route path="/contratos" element={<ModuleErrorBoundary module="fornecedores"><Contratos /></ModuleErrorBoundary>} />
            <Route path="/compliance" element={<ModuleErrorBoundary module="fornecedores"><ComplianceDashboard /></ModuleErrorBoundary>} />
            <Route path="/auditoria" element={<ModuleErrorBoundary module="relatorios"><Auditoria /></ModuleErrorBoundary>} />
            <Route path="/seguranca" element={<ModuleErrorBoundary module="default"><Seguranca /></ModuleErrorBoundary>} />
            <Route path="/catalogo-spot" element={<ModuleErrorBoundary module="fornecedores"><CatalogoSpot /></ModuleErrorBoundary>} />
            <Route path="/qualificacao-fornecedores" element={<ModuleErrorBoundary module="fornecedores"><QualificacaoFornecedores /></ModuleErrorBoundary>} />
            <Route path="/orcamentos" element={<ModuleErrorBoundary module="default"><Orcamentos /></ModuleErrorBoundary>} />
            <Route path="/negociacao-ia" element={<ModuleErrorBoundary module="cotacoes"><NegociacaoIA /></ModuleErrorBoundary>} />
            <Route path="/kanban" element={<ModuleErrorBoundary module="solicitacoes"><KanbanWorkflow /></ModuleErrorBoundary>} />
            <Route path="/documentos-fiscais" element={<ModuleErrorBoundary module="default"><DocumentosFiscais /></ModuleErrorBoundary>} />
            <Route path="/recompra-inteligente" element={<ModuleErrorBoundary module="pedidos"><RecompraInteligente /></ModuleErrorBoundary>} />
            <Route path="/devolucoes" element={<ModuleErrorBoundary module="pedidos"><Devolucoes /></ModuleErrorBoundary>} />
            <Route path="/catalogo-produtos" element={<ModuleErrorBoundary module="default"><CatalogoProdutos /></ModuleErrorBoundary>} />
            <Route path="/sourcing" element={<ModuleErrorBoundary module="cotacoes"><Sourcing /></ModuleErrorBoundary>} />
            <Route path="/sourcing/novo" element={<ModuleErrorBoundary module="cotacoes"><RFxCreate /></ModuleErrorBoundary>} />
            <Route path="/sourcing/:id" element={<ModuleErrorBoundary module="cotacoes"><RFxDetails /></ModuleErrorBoundary>} />
            <Route path="/sourcing/:id/auction" element={<ModuleErrorBoundary module="cotacoes"><AuctionRoom /></ModuleErrorBoundary>} />
            <Route path="/licitacoes" element={<ModuleErrorBoundary module="default"><Licitacoes /></ModuleErrorBoundary>} />
            <Route path="/recebimento" element={<ModuleErrorBoundary module="pedidos"><RecebimentoOffline /></ModuleErrorBoundary>} />
            <Route path="/admin/telemetria" element={<ModuleErrorBoundary module="default"><AdminTelemetria /></ModuleErrorBoundary>} />
            <Route path="/admin/dependency-health" element={<ModuleErrorBoundary module="default"><DependencyHealth /></ModuleErrorBoundary>} />
            <Route path="/admin/sso" element={<ModuleErrorBoundary module="default"><SSOConfig /></ModuleErrorBoundary>} />
            <Route path="/admin/punchout" element={<ModuleErrorBoundary module="default"><PunchOutCatalogs /></ModuleErrorBoundary>} />
            <Route path="/admin/erp" element={<ModuleErrorBoundary module="default"><ERPConnections /></ModuleErrorBoundary>} />
            <Route path="/admin/fiscal" element={<ModuleErrorBoundary module="default"><FiscalDashboard /></ModuleErrorBoundary>} />
            <Route path="/admin/sourcing-pipeline" element={<ModuleErrorBoundary module="default"><SourcingPipeline /></ModuleErrorBoundary>} />
            <Route path="/admin/workflows" element={<ModuleErrorBoundary module="default"><WorkflowDesigner /></ModuleErrorBoundary>} />
            <Route path="/portal-fornecedor" element={<ModuleErrorBoundary module="fornecedores"><PortalFornecedor /></ModuleErrorBoundary>} />
            <Route path="/configuracoes-centro-custo" element={<ModuleErrorBoundary module="default"><ConfiguracoesCentroCusto /></ModuleErrorBoundary>} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </AnimatePresence>
    </div>
  );
};
