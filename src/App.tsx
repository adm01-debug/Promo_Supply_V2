import { Suspense, lazy } from "react";
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
const AnimatedRoutes = () => {
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
          
          {/* Protected routes */}
          <Route path="/" element={<ProtectedRoute><ComprasDashboard /></ProtectedRoute>} />
          <Route path="/compras" element={<ProtectedRoute><ComprasDashboard /></ProtectedRoute>} />
          <Route path="/cotacao" element={<ProtectedRoute><Cotacao /></ProtectedRoute>} />
          <Route path="/cotacao/:id" element={<ProtectedRoute><Cotacao /></ProtectedRoute>} />
          <Route path="/solicitacoes" element={<ProtectedRoute><Solicitacoes /></ProtectedRoute>} />
          <Route path="/pedidos" element={<ProtectedRoute><Pedidos /></ProtectedRoute>} />
          <Route path="/pagamentos" element={<ProtectedRoute requiredRole={['admin', 'coordinator', 'finance']}><Pagamentos /></ProtectedRoute>} />
          <Route path="/fornecedores" element={<ProtectedRoute><Fornecedores /></ProtectedRoute>} />
          <Route path="/acompanhamento" element={<ProtectedRoute><Acompanhamento /></ProtectedRoute>} />
          <Route path="/gerar-ordem" element={<ProtectedRoute><GerarOrdem /></ProtectedRoute>} />
          <Route path="/relatorios" element={<ProtectedRoute><Relatorios /></ProtectedRoute>} />
          <Route path="/relatorios/negociacoes" element={<ProtectedRoute><RelatorioNegociacoes /></ProtectedRoute>} />
          <Route path="/aprovacoes" element={<ProtectedRoute requiredRole={['admin', 'coordinator']}><Aprovacoes /></ProtectedRoute>} />
          <Route path="/supplier-performance" element={<ProtectedRoute><SupplierPerformance /></ProtectedRoute>} />
          <Route path="/dashboard-executivo" element={<ProtectedRoute requiredRole={['admin', 'coordinator']}><DashboardExecutivo /></ProtectedRoute>} />
          <Route path="/buyer-performance" element={<ProtectedRoute requiredRole={['admin', 'coordinator']}><BuyerPerformanceDashboard /></ProtectedRoute>} />
          <Route path="/historico-compras" element={<ProtectedRoute><HistoricoCompras /></ProtectedRoute>} />
          <Route path="/contratos" element={<ProtectedRoute><Contratos /></ProtectedRoute>} />
          <Route path="/auditoria" element={<ProtectedRoute requiredRole="admin"><Auditoria /></ProtectedRoute>} />
          <Route path="/seguranca" element={<ProtectedRoute><Seguranca /></ProtectedRoute>} />
          
          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
};

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <PWAInstallPrompt />
        <BrowserRouter>
          <AuthProvider>
            <Suspense fallback={<PageLoader />}>
              <AnimatedRoutes />
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
