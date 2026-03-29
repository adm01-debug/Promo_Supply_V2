import { lazy } from "react";
import { Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ModuleErrorBoundary } from "@/components/ModuleErrorBoundary";

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
const AdminTelemetria = lazy(() => import("@/pages/AdminTelemetria"));
const NotFound = lazy(() => import("@/pages/NotFound"));

export const AnimatedRoutes = () => {
  return (
    <div className="w-full min-h-screen">
      <Routes>
        <Route path="/auth" element={<Auth />} />

        <Route path="/" element={
          <ProtectedRoute><ModuleErrorBoundary module="dashboard"><ComprasDashboard /></ModuleErrorBoundary></ProtectedRoute>
        } />
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
        <Route path="/admin/telemetria" element={
          <ProtectedRoute requiredRole="admin"><ModuleErrorBoundary module="default"><AdminTelemetria /></ModuleErrorBoundary></ProtectedRoute>
        } />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
};
