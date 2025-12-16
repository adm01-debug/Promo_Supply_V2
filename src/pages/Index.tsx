import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  ShoppingCart, 
  Package, 
  DollarSign, 
  Truck, 
  TrendingUp,
  Users,
  FileText,
  BarChart3
} from "lucide-react";
import { Link } from "react-router-dom";

const modules = [
  { name: "Dashboard", icon: BarChart3, href: "/compras", description: "Visão geral e KPIs" },
  { name: "Solicitações", icon: FileText, href: "/solicitacoes", description: "Gestão de solicitações" },
  { name: "Cotações", icon: TrendingUp, href: "/cotacao/2638-1", description: "Busca e ranking de preços" },
  { name: "Pedidos", icon: Package, href: "/pedidos", description: "Ordens de compra" },
  { name: "Pagamentos", icon: DollarSign, href: "/pagamentos", description: "Controle financeiro" },
  { name: "Fornecedores", icon: Users, href: "/fornecedores", description: "Cadastro e histórico" },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card shadow-header">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow-primary">
              <ShoppingCart className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold text-foreground">Sistema de Compras</h1>
              <p className="text-sm text-muted-foreground">Promo Brindes</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Link to="/compras">
              <Button variant="outline" size="sm" className="hover-lift">
                Acessar Sistema
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-section">
        {/* Hero Section */}
        <section className="text-center mb-section-lg">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent mb-6 animate-fade-in">
            <Truck className="w-4 h-4 text-accent-foreground" />
            <span className="text-sm font-medium text-accent-foreground">
              Gestão Completa de Compras
            </span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-4 animate-slide-up">
            <span className="text-gradient">Sistema de</span>{" "}
            <span className="text-foreground">Compras</span>
          </h2>
          
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8 animate-slide-up" style={{ animationDelay: "0.1s" }}>
            Plataforma integrada para gestão do ciclo completo de compras.
            Da solicitação à entrega, tudo em um só lugar.
          </p>

          <div className="flex flex-wrap justify-center gap-4 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <Link to="/compras">
              <Button size="lg" className="gradient-primary hover-lift shadow-glow-primary">
                Acessar Dashboard
              </Button>
            </Link>
            <Link to="/solicitacoes">
              <Button size="lg" variant="outline" className="hover-lift">
                Ver Solicitações
              </Button>
            </Link>
          </div>
        </section>

        {/* Modules Grid */}
        <section className="mb-section-lg">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-display font-semibold mb-2">Módulos do Sistema</h3>
            <p className="text-muted-foreground">Acesse cada área do sistema de compras</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modules.map((module, index) => (
              <Link key={module.name} to={module.href}>
                <Card 
                  className="p-card hover-lift hover-glow cursor-pointer group transition-all duration-300 animate-fade-in-scale"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <module.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-display font-semibold text-foreground mb-1">{module.name}</h4>
                      <p className="text-sm text-muted-foreground">{module.description}</p>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* Stats Section */}
        <section className="glass rounded-2xl p-card-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="animate-count-up">
              <div className="text-3xl font-display font-bold text-gradient mb-1">6</div>
              <div className="text-sm text-muted-foreground">Módulos</div>
            </div>
            <div className="animate-count-up" style={{ animationDelay: "0.1s" }}>
              <div className="text-3xl font-display font-bold text-primary mb-1">4</div>
              <div className="text-sm text-muted-foreground">Fornecedores API</div>
            </div>
            <div className="animate-count-up" style={{ animationDelay: "0.2s" }}>
              <div className="text-3xl font-display font-bold text-success mb-1">+12K</div>
              <div className="text-sm text-muted-foreground">Produtos</div>
            </div>
            <div className="animate-count-up" style={{ animationDelay: "0.3s" }}>
              <div className="text-3xl font-display font-bold text-info mb-1">Auto</div>
              <div className="text-sm text-muted-foreground">Cotação</div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-section-lg py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Sistema de Compras • Promo Brindes</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
