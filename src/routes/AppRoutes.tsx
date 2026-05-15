import { lazy } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ModuleErrorBoundary } from "@/components/ModuleErrorBoundary";
import { motion, AnimatePresence } from "framer-motion";

// Lazy load all pages
const ComprasDashboard = lazy(() => import("@/pages/ComprasDashboard"));
const Cotacao = lazy(() => import("@/pages/Cotacao"));
const Solicitacoes = lazy(() => import("@/pages/Solicitacoes"));
const Pedidos = lazy(() => import("@/pages/Pedidos"));
const Pagamentos = lazy(() => import("@/pages/Pagamentos"));
const Fornecedores = lazy(() => import("@/pages/Fornecedores"));
const Acompanhamento = lazy(() => import("@/pages/Acompanhamento"));
const GerarOrdem = lazy(() => import("@/pages/GerarOrdem"));
const Relatorios = lazy(() => import("@/pages/Relatorios"));
const RelatorioNegociacoes = lazy(() => import("@/pages/RelatorioNegociacoes"));
const Aprovacoes = lazy(() => import("@/pages/Aprovacoes"));
const Auditoria = lazy(() => import("@/pages/Auditoria"));
const SupplierPerformance = lazy(() => import("@/pages/SupplierPerformance"));
const DashboardExecutivo = lazy(() => import("@/pages/DashboardExecutivo"));
const BuyerPerformanceDashboard = lazy(() => import("@/pages/BuyerPerformanceDashboard"));
const HistoricoCompras = lazy(() => import("@/pages/HistoricoCompras"));
const Contratos = lazy(() => import("@/pages/Contratos"));
const ComplianceDashboard = lazy(() => import("@/pages/ComplianceDashboard"));
const Auth = lazy(() => import("@/pages/Auth"));
const Seguranca = lazy(() => import("@/pages/Seguranca"));
const CatalogoSpot = lazy(() => import("@/pages/CatalogoSpot"));
const QualificacaoFornecedores = lazy(() => import("@/pages/QualificacaoFornecedores"));
const Orcamentos = lazy(() => import("@/pages/Orcamentos"));
const NegociacaoIA = lazy(() => import("@/pages/NegociacaoIA"));
const KanbanWorkflow = lazy(() => import("@/pages/KanbanWorkflow"));
const DocumentosFiscais = lazy(() => import("@/pages/DocumentosFiscais"));
const RecompraInteligente = lazy(() => import("@/pages/RecompraInteligente"));
const Devolucoes = lazy(() => import("@/pages/Devolucoes"));
const CatalogoProdutos = lazy(() => import("@/pages/CatalogoProdutos"));
const Licitacoes = lazy(() => import("@/pages/Licitacoes"));
const RecebimentoOffline = lazy(() => import("@/pages/RecebimentoOffline"));
const AdminTelemetria = lazy(() => import("@/pages/AdminTelemetria"));
const DependencyHealth = lazy(() => import("@/pages/admin/DependencyHealth"));
const SSOConfig = lazy(() => import("@/pages/admin/SSOConfig"));
const Sourcing = lazy(() => import("@/pages/Sourcing"));
const PunchOutCatalogs = lazy(() => import("@/pages/admin/PunchOutCatalogs"));
const ERPConnections = lazy(() => import("@/pages/admin/ERPConnections"));
const RFxCreate = lazy(() => import("@/pages/sourcing/RFxCreate"));
const RFxDetails = lazy(() => import("@/pages/sourcing/RFxDetails"));
const AuctionRoom = lazy(() => import("@/pages/sourcing/AuctionRoom"));
const PortalFornecedor = lazy(() => import("@/pages/PortalFornecedor"));
const ConfiguracoesCentroCusto = lazy(() => import("@/pages/ConfiguracoesCentroCusto"));
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
          <Route path="/auth" element={
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Auth />
            </motion.div>
          } />

          <Route path="/" element={
            <ProtectedRoute>
              <ModuleErrorBoundary module="dashboard">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <ComprasDashboard />
                </motion.div>
              </ModuleErrorBoundary>
            </ProtectedRoute>
          } />
          {/* ... other routes follow the same pattern if needed, but the MainLayout already handles most of this */}
          {/* Actually, since MainLayout handles animations, let's keep Routes simple and optimize MainLayout instead */}
          <Route path="/compras" element={
            <ProtectedRoute><ModuleErrorBoundary module="dashboard"><ComprasDashboard /></ModuleErrorBoundary></ProtectedRoute>
          } />
          <Route path="/cotacao" element={
            <ProtectedRoute><ModuleErrorBoundary module="cotacoes"><Cotacao /></ModuleErrorBoundary></ProtectedRoute>
          } />
          <Route path="/cotacao/:id" element={
            <ProtectedRoute><ModuleErrorBoundary module="cotacoes"><Cotacao /></ModuleErrorBoundary></ProtectedRoute>
          } />
          <Route path="/solicitacoes" element={
            <ProtectedRoute><ModuleErrorBoundary module="solicitacoes"><Solicitacoes /></ModuleErrorBoundary></ProtectedRoute>
          } />
          <Route path="/pedidos" element={
            <ProtectedRoute><ModuleErrorBoundary module="pedidos"><Pedidos /></ModuleErrorBoundary></ProtectedRoute>
          } />
          <Route path="/pagamentos" element={
            <ProtectedRoute requiredRole={['admin', 'coordinator', 'finance']}><ModuleErrorBoundary module="pagamentos"><Pagamentos /></ModuleErrorBoundary></ProtectedRoute>
          } />
          <Route path="/fornecedores" element={
            <ProtectedRoute><ModuleErrorBoundary module="fornecedores"><Fornecedores /></ModuleErrorBoundary></ProtectedRoute>
          } />
          <Route path="/acompanhamento" element={
            <ProtectedRoute><ModuleErrorBoundary module="pedidos"><Acompanhamento /></ModuleErrorBoundary></ProtectedRoute>
          } />
          <Route path="/gerar-ordem" element={
            <ProtectedRoute><ModuleErrorBoundary module="pedidos"><GerarOrdem /></ModuleErrorBoundary></ProtectedRoute>
          } />
          <Route path="/relatorios" element={
            <ProtectedRoute><ModuleErrorBoundary module="relatorios"><Relatorios /></ModuleErrorBoundary></ProtectedRoute>
          } />
          <Route path="/relatorios/negociacoes" element={
            <ProtectedRoute><ModuleErrorBoundary module="relatorios"><RelatorioNegociacoes /></ModuleErrorBoundary></ProtectedRoute>
          } />
          <Route path="/aprovacoes" element={
            <ProtectedRoute requiredRole={['admin', 'coordinator']}><ModuleErrorBoundary module="solicitacoes"><Aprovacoes /></ModuleErrorBoundary></ProtectedRoute>
          } />
          <Route path="/supplier-performance" element={
            <ProtectedRoute><ModuleErrorBoundary module="fornecedores"><SupplierPerformance /></ModuleErrorBoundary></ProtectedRoute>
          } />
          <Route path="/dashboard-executivo" element={
            <ProtectedRoute requiredRole={['admin', 'coordinator']}><ModuleErrorBoundary module="dashboard"><DashboardExecutivo /></ModuleErrorBoundary></ProtectedRoute>
          } />
          <Route path="/buyer-performance" element={
            <ProtectedRoute requiredRole={['admin', 'coordinator']}><ModuleErrorBoundary module="dashboard"><BuyerPerformanceDashboard /></ModuleErrorBoundary></ProtectedRoute>
          } />
          <Route path="/historico-compras" element={
            <ProtectedRoute><ModuleErrorBoundary module="pedidos"><HistoricoCompras /></ModuleErrorBoundary></ProtectedRoute>
          } />
          <Route path="/contratos" element={
            <ProtectedRoute><ModuleErrorBoundary module="fornecedores"><Contratos /></ModuleErrorBoundary></ProtectedRoute>
          } />
          <Route path="/compliance" element={
            <ProtectedRoute requiredRole={['admin', 'coordinator']}><ModuleErrorBoundary module="fornecedores"><ComplianceDashboard /></ModuleErrorBoundary></ProtectedRoute>
          } />
          <Route path="/auditoria" element={
            <ProtectedRoute requiredRole="admin"><ModuleErrorBoundary module="relatorios"><Auditoria /></ModuleErrorBoundary></ProtectedRoute>
          } />
          <Route path="/seguranca" element={
            <ProtectedRoute><ModuleErrorBoundary module="default"><Seguranca /></ModuleErrorBoundary></ProtectedRoute>
          } />
          <Route path="/catalogo-spot" element={
            <ProtectedRoute requiredRole={['admin', 'coordinator', 'buyer']}><ModuleErrorBoundary module="fornecedores"><CatalogoSpot /></ModuleErrorBoundary></ProtectedRoute>
          } />
          <Route path="/qualificacao-fornecedores" element={
            <ProtectedRoute requiredRole={['admin', 'coordinator']}><ModuleErrorBoundary module="fornecedores"><QualificacaoFornecedores /></ModuleErrorBoundary></ProtectedRoute>
          } />
          <Route path="/orcamentos" element={
            <ProtectedRoute requiredRole={['admin', 'coordinator', 'finance']}><ModuleErrorBoundary module="default"><Orcamentos /></ModuleErrorBoundary></ProtectedRoute>
          } />
          <Route path="/negociacao-ia" element={
            <ProtectedRoute requiredRole={['admin', 'coordinator', 'buyer']}><ModuleErrorBoundary module="cotacoes"><NegociacaoIA /></ModuleErrorBoundary></ProtectedRoute>
          } />
          <Route path="/kanban" element={
            <ProtectedRoute><ModuleErrorBoundary module="solicitacoes"><KanbanWorkflow /></ModuleErrorBoundary></ProtectedRoute>
          } />
          <Route path="/documentos-fiscais" element={
            <ProtectedRoute requiredRole={['admin', 'coordinator', 'buyer', 'finance']}><ModuleErrorBoundary module="default"><DocumentosFiscais /></ModuleErrorBoundary></ProtectedRoute>
          } />
          <Route path="/recompra-inteligente" element={
            <ProtectedRoute requiredRole={['admin', 'coordinator', 'buyer']}><ModuleErrorBoundary module="pedidos"><RecompraInteligente /></ModuleErrorBoundary></ProtectedRoute>
          } />
          <Route path="/devolucoes" element={
            <ProtectedRoute><ModuleErrorBoundary module="pedidos"><Devolucoes /></ModuleErrorBoundary></ProtectedRoute>
          } />
          <Route path="/catalogo-produtos" element={
            <ProtectedRoute><ModuleErrorBoundary module="default"><CatalogoProdutos /></ModuleErrorBoundary></ProtectedRoute>
          } />
          <Route path="/sourcing" element={
            <ProtectedRoute requiredRole={['admin', 'coordinator', 'buyer']}><ModuleErrorBoundary module="cotacoes"><Sourcing /></ModuleErrorBoundary></ProtectedRoute>
          } />
          <Route path="/sourcing/novo" element={
            <ProtectedRoute requiredRole={['admin', 'coordinator', 'buyer']}><ModuleErrorBoundary module="cotacoes"><RFxCreate /></ModuleErrorBoundary></ProtectedRoute>
          } />
          <Route path="/sourcing/:id" element={
            <ProtectedRoute requiredRole={['admin', 'coordinator', 'buyer']}><ModuleErrorBoundary module="cotacoes"><RFxDetails /></ModuleErrorBoundary></ProtectedRoute>
          } />
          <Route path="/sourcing/:id/auction" element={
            <ProtectedRoute requiredRole={['admin', 'coordinator', 'buyer']}><ModuleErrorBoundary module="cotacoes"><AuctionRoom /></ModuleErrorBoundary></ProtectedRoute>
          } />
          <Route path="/licitacoes" element={
            <ProtectedRoute requiredRole={['admin', 'coordinator']}><ModuleErrorBoundary module="default"><Licitacoes /></ModuleErrorBoundary></ProtectedRoute>
          } />
          <Route path="/recebimento" element={
            <ProtectedRoute><ModuleErrorBoundary module="pedidos"><RecebimentoOffline /></ModuleErrorBoundary></ProtectedRoute>
          } />
          <Route path="/admin/telemetria" element={
            <ProtectedRoute requiredRole="admin"><ModuleErrorBoundary module="default"><AdminTelemetria /></ModuleErrorBoundary></ProtectedRoute>
          } />
          <Route path="/admin/dependency-health" element={
            <ProtectedRoute requiredRole="admin"><ModuleErrorBoundary module="default"><DependencyHealth /></ModuleErrorBoundary></ProtectedRoute>
          } />
          <Route path="/admin/sso" element={
            <ProtectedRoute requiredRole="admin"><ModuleErrorBoundary module="default"><SSOConfig /></ModuleErrorBoundary></ProtectedRoute>
          } />
          <Route path="/admin/punchout" element={
            <ProtectedRoute requiredRole="admin"><ModuleErrorBoundary module="default"><PunchOutCatalogs /></ModuleErrorBoundary></ProtectedRoute>
          } />
          <Route path="/admin/erp" element={
            <ProtectedRoute requiredRole="admin"><ModuleErrorBoundary module="default"><ERPConnections /></ModuleErrorBoundary></ProtectedRoute>
          } />
          <Route path="/admin/fiscal" element={
            <ProtectedRoute requiredRole="admin"><ModuleErrorBoundary module="default"><FiscalDashboard /></ModuleErrorBoundary></ProtectedRoute>
          } />
          <Route path="/admin/sourcing-pipeline" element={
            <ProtectedRoute requiredRole="admin"><ModuleErrorBoundary module="default"><SourcingPipeline /></ModuleErrorBoundary></ProtectedRoute>
          } />
          <Route path="/admin/workflows" element={
            <ProtectedRoute requiredRole="admin"><ModuleErrorBoundary module="default"><WorkflowDesigner /></ModuleErrorBoundary></ProtectedRoute>
          } />
          <Route path="/portal-fornecedor" element={
            <ProtectedRoute><ModuleErrorBoundary module="fornecedores"><PortalFornecedor /></ModuleErrorBoundary></ProtectedRoute>
          } />
          <Route path="/configuracoes-centro-custo" element={
            <ProtectedRoute requiredRole={['admin', 'coordinator']}><ModuleErrorBoundary module="default"><ConfiguracoesCentroCusto /></ModuleErrorBoundary></ProtectedRoute>
          } />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </AnimatePresence>
    </div>
  );
};
