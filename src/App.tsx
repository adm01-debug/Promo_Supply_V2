import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import ComprasDashboard from "./pages/ComprasDashboard";
import Cotacao from "./pages/Cotacao";
import Solicitacoes from "./pages/Solicitacoes";
import Pedidos from "./pages/Pedidos";
import Pagamentos from "./pages/Pagamentos";
import Fornecedores from "./pages/Fornecedores";
import Acompanhamento from "./pages/Acompanhamento";
import GerarOrdem from "./pages/GerarOrdem";
import Relatorios from "./pages/Relatorios";
import RelatorioNegociacoes from "./pages/RelatorioNegociacoes";
import Aprovacoes from "./pages/Aprovacoes";
import Auditoria from "./pages/Auditoria";
import SupplierPerformance from "./pages/SupplierPerformance";
import DashboardExecutivo from "./pages/DashboardExecutivo";
import BuyerPerformanceDashboard from "./pages/BuyerPerformanceDashboard";
import HistoricoCompras from "./pages/HistoricoCompras";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
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
            <Route path="/auditoria" element={<ProtectedRoute requiredRole="admin"><Auditoria /></ProtectedRoute>} />
            
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
