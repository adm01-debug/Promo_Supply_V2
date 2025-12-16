import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  LayoutDashboard, 
  Users, 
  DollarSign, 
  Package, 
  TrendingUp,
  Zap,
  Trophy,
  Star
} from "lucide-react";

const modules = [
  { name: "Task Gifts", icon: Trophy, color: "tasks", description: "Gestão de tarefas gamificada" },
  { name: "Fast Gravações", icon: Zap, color: "gravacoes", description: "Gravações e mídia" },
  { name: "Finance Hub", icon: DollarSign, color: "finance", description: "Gestão financeira" },
  { name: "Sales Pro", icon: TrendingUp, color: "sales", description: "CRM de vendas" },
  { name: "Gifts Store", icon: Package, color: "store", description: "Loja de recompensas" },
  { name: "Zapp Web", icon: Users, color: "zapp", description: "Comunicação integrada" },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card shadow-header">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow-primary">
              <LayoutDashboard className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold text-foreground">Estoque e Triagem</h1>
              <p className="text-sm text-muted-foreground">Sistema de Compras</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* XP Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-xp/10 border border-xp/30">
              <Star className="w-4 h-4 text-xp" />
              <span className="text-sm font-medium text-xp-foreground">2.450 XP</span>
            </div>
            
            <Button variant="outline" size="sm" className="hover-lift">
              Minha Conta
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-section">
        {/* Hero Section */}
        <section className="text-center mb-section-lg">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent mb-6 animate-fade-in">
            <Trophy className="w-4 h-4 text-accent-foreground" />
            <span className="text-sm font-medium text-accent-foreground">
              Sistema com Gamificação Pervasiva
            </span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-4 animate-slide-up">
            <span className="text-gradient">Estoque e</span>{" "}
            <span className="text-foreground">Triagem</span>
          </h2>
          
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8 animate-slide-up" style={{ animationDelay: "0.1s" }}>
            Plataforma integrada para gestão empresarial com gamificação. 
            XP, coins, achievements e rankings em todos os módulos.
          </p>

          <div className="flex flex-wrap justify-center gap-4 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <Button size="lg" className="gradient-primary hover-lift shadow-glow-primary">
              Acessar Dashboard
            </Button>
            <Button size="lg" variant="outline" className="hover-lift">
              Ver Documentação
            </Button>
          </div>
        </section>

        {/* Modules Grid */}
        <section className="mb-section-lg">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-display font-semibold mb-2">Módulos Disponíveis</h3>
            <p className="text-muted-foreground">Cada módulo integra XP, coins e achievements</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modules.map((module, index) => (
              <Card 
                key={module.name}
                className="p-card hover-lift hover-glow cursor-pointer group transition-all duration-300 animate-fade-in-scale"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-start gap-4">
                  <div 
                    className={`w-12 h-12 rounded-xl flex items-center justify-center bg-${module.color}/10 group-hover:bg-${module.color}/20 transition-colors`}
                  >
                    <module.icon className={`w-6 h-6 text-${module.color}`} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-display font-semibold text-foreground mb-1">{module.name}</h4>
                    <p className="text-sm text-muted-foreground">{module.description}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Stats Section */}
        <section className="glass rounded-2xl p-card-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="animate-count-up">
              <div className="text-3xl font-display font-bold text-gradient mb-1">7</div>
              <div className="text-sm text-muted-foreground">Módulos Ativos</div>
            </div>
            <div className="animate-count-up" style={{ animationDelay: "0.1s" }}>
              <div className="text-3xl font-display font-bold text-xp mb-1">∞</div>
              <div className="text-sm text-muted-foreground">XP Disponível</div>
            </div>
            <div className="animate-count-up" style={{ animationDelay: "0.2s" }}>
              <div className="text-3xl font-display font-bold text-success mb-1">RLS</div>
              <div className="text-sm text-muted-foreground">Segurança Total</div>
            </div>
            <div className="animate-count-up" style={{ animationDelay: "0.3s" }}>
              <div className="text-3xl font-display font-bold text-info mb-1">100%</div>
              <div className="text-sm text-muted-foreground">TypeScript</div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-section-lg py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Estoque e Triagem • Sistema de Compras • Promo Brindes</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
