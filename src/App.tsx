import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ComprasDashboard from "./pages/ComprasDashboard";
import Cotacao from "./pages/Cotacao";
import Solicitacoes from "./pages/Solicitacoes";
import Pedidos from "./pages/Pedidos";
import Pagamentos from "./pages/Pagamentos";
import Fornecedores from "./pages/Fornecedores";
import Acompanhamento from "./pages/Acompanhamento";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<ComprasDashboard />} />
          <Route path="/cotacao" element={<Cotacao />} />
          <Route path="/solicitacoes" element={<Solicitacoes />} />
          <Route path="/pedidos" element={<Pedidos />} />
          <Route path="/pagamentos" element={<Pagamentos />} />
          <Route path="/fornecedores" element={<Fornecedores />} />
          <Route path="/acompanhamento" element={<Acompanhamento />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
