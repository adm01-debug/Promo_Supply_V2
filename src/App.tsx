import { Suspense, lazy, forwardRef } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PWAInstallPrompt } from "@/components/pwa/PWAInstallPrompt";
import { ThemeProvider } from "next-themes";
import { PageLoader } from "@/components/PageLoader";
import { AnimatePresence, motion } from "framer-motion";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { ModuleErrorBoundary } from "@/components/ModuleErrorBoundary";
import { AccessibilityProvider } from "@/components/accessibility/AdvancedAccessibility";

// Lazy load all pages for better initial bundle size
const ComprasDashboard = lazy(() => import("./pages/ComprasDashboard"));
const Cotacao = lazy(() => import("./pages/Cotacao"));
const Solicitacoes = lazy(() => import("./pages/Solicitacoes"));
const Pedidos = lazy(() => import("./pages/Pedidos"));
const Pagamentos = lazy(() => import("./pages/Pagamentos"));
const Fornecedores = lazy(() => import("./pages/Fornecedores"));
const Acompanhamento = lazy(() => import("./pages/Acompanhamento"));
const GerarOrdem = lazy(() => import("./pages/GerarOrdem"));
const Relatorios = lazy(() => import("./pages/Relatorios"));
const RelatorioNegociacoes = lazy(() => import("./pages/RelatorioNegociacoes"));
const Aprovacoes = lazy(() => import("./pages/Aprovacoes"));
const Auditoria = lazy(() => import("./pages/Auditoria"));
const SupplierPerformance = lazy(() => import("./pages/SupplierPerformance"));
const DashboardExecutivo = lazy(() => import("./pages/DashboardExecutivo"));
const BuyerPerformanceDashboard = lazy(() => import("./pages/BuyerPerformanceDashboard"));
const HistoricoCompras = lazy(() => import("./pages/HistoricoCompras"));
const Contratos = lazy(() => import("./pages/Contratos"));
const Auth = lazy(() => import("./pages/Auth"));
const Seguranca = lazy(() => import("./pages/Seguranca"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const RefSafeBrowserRouter = forwardRef<HTMLDivElement, { children: React.ReactNode }>(
  ({ children }, _ref) => <BrowserRouter>{children}</BrowserRouter>
);

RefSafeBrowserRouter.displayName = "RefSafeBrowserRouter";

// Page transition variants
const pageVariants = {
  initial: {
    opacity: 0,
    y: 8,
  },
  enter: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.25,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: {
      duration: 0.15,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
    },
  },
};

// Animated Routes Component
const AnimatedRoutes = forwardRef<HTMLDivElement>((_props, _ref) => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        variants={pageVariants}
        initial="initial"
        animate="enter"
        exit="exit"
        className="w-full min-h-screen"
      >
        <Routes location={location}>
          {/* Public route */}
          <Route path="/auth" element={<Auth />} />
          
          {/* Protected routes with Module Error Boundaries */}
          <Route path="/" element={
            <ProtectedRoute>
              <ModuleErrorBoundary module="dashboard">
                <ComprasDashboard />
              </ModuleErrorBoundary>
            </ProtectedRoute>
          } />
          <Route path="/compras" element={
            <ProtectedRoute>
              <ModuleErrorBoundary module="dashboard">
                <ComprasDashboard />
              </ModuleErrorBoundary>
            </ProtectedRoute>
          } />
          <Route path="/cotacao" element={
            <ProtectedRoute>
              <ModuleErrorBoundary module="cotacoes">
                <Cotacao />
              </ModuleErrorBoundary>
            </ProtectedRoute>
          } />
          <Route path="/cotacao/:id" element={
            <ProtectedRoute>
              <ModuleErrorBoundary module="cotacoes">
                <Cotacao />
              </ModuleErrorBoundary>
            </ProtectedRoute>
          } />
          <Route path="/solicitacoes" element={
            <ProtectedRoute>
              <ModuleErrorBoundary module="solicitacoes">
                <Solicitacoes />
              </ModuleErrorBoundary>
            </ProtectedRoute>
          } />
          <Route path="/pedidos" element={
            <ProtectedRoute>
              <ModuleErrorBoundary module="pedidos">
                <Pedidos />
              </ModuleErrorBoundary>
            </ProtectedRoute>
          } />
          <Route path="/pagamentos" element={
            <ProtectedRoute requiredRole={['admin', 'coordinator', 'finance']}>
              <ModuleErrorBoundary module="pagamentos">
                <Pagamentos />
              </ModuleErrorBoundary>
            </ProtectedRoute>
          } />
          <Route path="/fornecedores" element={
            <ProtectedRoute>
              <ModuleErrorBoundary module="fornecedores">
                <Fornecedores />
              </ModuleErrorBoundary>
            </ProtectedRoute>
          } />
          <Route path="/acompanhamento" element={
            <ProtectedRoute>
              <ModuleErrorBoundary module="pedidos">
                <Acompanhamento />
              </ModuleErrorBoundary>
            </ProtectedRoute>
          } />
          <Route path="/gerar-ordem" element={
            <ProtectedRoute>
              <ModuleErrorBoundary module="pedidos">
                <GerarOrdem />
              </ModuleErrorBoundary>
            </ProtectedRoute>
          } />
          <Route path="/relatorios" element={
            <ProtectedRoute>
              <ModuleErrorBoundary module="relatorios">
                <Relatorios />
              </ModuleErrorBoundary>
            </ProtectedRoute>
          } />
          <Route path="/relatorios/negociacoes" element={
            <ProtectedRoute>
              <ModuleErrorBoundary module="relatorios">
                <RelatorioNegociacoes />
              </ModuleErrorBoundary>
            </ProtectedRoute>
          } />
          <Route path="/aprovacoes" element={
            <ProtectedRoute requiredRole={['admin', 'coordinator']}>
              <ModuleErrorBoundary module="solicitacoes">
                <Aprovacoes />
              </ModuleErrorBoundary>
            </ProtectedRoute>
          } />
          <Route path="/supplier-performance" element={
            <ProtectedRoute>
              <ModuleErrorBoundary module="fornecedores">
                <SupplierPerformance />
              </ModuleErrorBoundary>
            </ProtectedRoute>
          } />
          <Route path="/dashboard-executivo" element={
            <ProtectedRoute requiredRole={['admin', 'coordinator']}>
              <ModuleErrorBoundary module="dashboard">
                <DashboardExecutivo />
              </ModuleErrorBoundary>
            </ProtectedRoute>
          } />
          <Route path="/buyer-performance" element={
            <ProtectedRoute requiredRole={['admin', 'coordinator']}>
              <ModuleErrorBoundary module="dashboard">
                <BuyerPerformanceDashboard />
              </ModuleErrorBoundary>
            </ProtectedRoute>
          } />
          <Route path="/historico-compras" element={
            <ProtectedRoute>
              <ModuleErrorBoundary module="pedidos">
                <HistoricoCompras />
              </ModuleErrorBoundary>
            </ProtectedRoute>
          } />
          <Route path="/contratos" element={
            <ProtectedRoute>
              <ModuleErrorBoundary module="fornecedores">
                <Contratos />
              </ModuleErrorBoundary>
            </ProtectedRoute>
          } />
          <Route path="/auditoria" element={
            <ProtectedRoute requiredRole="admin">
              <ModuleErrorBoundary module="relatorios">
                <Auditoria />
              </ModuleErrorBoundary>
            </ProtectedRoute>
          } />
          <Route path="/seguranca" element={
            <ProtectedRoute>
              <ModuleErrorBoundary module="default">
                <Seguranca />
              </ModuleErrorBoundary>
            </ProtectedRoute>
          } />
          
          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
};

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <div className="min-h-screen">
      <QueryClientProvider client={queryClient}>
        <AccessibilityProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <PWAInstallPrompt />
            <RefSafeBrowserRouter>
              <AuthProvider>
                <Suspense fallback={<PageLoader />}>
                  <AnimatedRoutes />
                </Suspense>
              </AuthProvider>
            </RefSafeBrowserRouter>
          </TooltipProvider>
        </AccessibilityProvider>
      </QueryClientProvider>
    </div>
  </ThemeProvider>
);

export default App;
