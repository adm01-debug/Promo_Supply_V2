import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ShoppingCart, 
  Package, 
  DollarSign, 
  Truck, 
  TrendingUp,
  Users,
  FileText,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  Zap,
  Shield,
  Clock,
  Star
} from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const modules = [
  { name: "Dashboard", icon: BarChart3, href: "/compras", description: "Visão geral e KPIs", badge: "Popular" },
  { name: "Solicitações", icon: FileText, href: "/solicitacoes", description: "Gestão de solicitações" },
  { name: "Cotações", icon: TrendingUp, href: "/cotacao/2638-1", description: "Busca e ranking de preços", badge: "Novo" },
  { name: "Pedidos", icon: Package, href: "/pedidos", description: "Ordens de compra" },
  { name: "Pagamentos", icon: DollarSign, href: "/pagamentos", description: "Controle financeiro" },
  { name: "Fornecedores", icon: Users, href: "/fornecedores", description: "Cadastro e histórico" },
];

const benefits = [
  { icon: Zap, text: "Cotação automática", description: "Economize até 40% do tempo" },
  { icon: Shield, text: "100% Seguro", description: "Dados criptografados" },
  { icon: Clock, text: "Tempo real", description: "Atualizações instantâneas" },
];

const testimonials = [
  { name: "Carlos Silva", role: "Gerente de Compras", text: "Reduziu nosso tempo de cotação em 60%", rating: 5 },
  { name: "Ana Souza", role: "Coordenadora", text: "Sistema intuitivo e eficiente", rating: 5 },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring" as const, stiffness: 100 }
  }
};

const Index = () => {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Header - More Compact */}
      <motion.header 
        className="border-b border-border bg-card/80 backdrop-blur-md shadow-header sticky top-0 z-50"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 100 }}
      >
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div 
              className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow-primary"
              whileHover={{ scale: 1.05, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <ShoppingCart className="w-5 h-5 text-primary-foreground" />
            </motion.div>
            <div>
              <h1 className="text-lg font-display font-bold text-foreground">Sistema de Compras</h1>
              <p className="text-xs text-muted-foreground">Promo Brindes</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost" size="sm" className="hidden sm:flex">
                Entrar
              </Button>
            </Link>
            <Link to="/compras">
              <Button size="sm" className="gradient-primary hover-lift shadow-glow-primary">
                Acessar Sistema
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </motion.header>

      {/* Hero Section - Split Layout 60/40 */}
      <section className="relative">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-info/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        </div>

        <div className="container mx-auto px-4 py-16 md:py-24 relative">
          <div className="grid lg:grid-cols-5 gap-12 items-center">
            {/* Left Content - 60% */}
            <div className="lg:col-span-3 space-y-8">
              <motion.div 
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent border border-accent-foreground/20"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Truck className="w-4 h-4 text-accent-foreground" />
                <span className="text-sm font-medium text-accent-foreground">
                  +500 empresas já utilizam
                </span>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h2 className="text-5xl md:text-6xl lg:text-7xl font-display font-bold leading-tight">
                  <span className="text-gradient">Gestão de</span>
                  <br />
                  <span className="text-foreground">Compras</span>
                  <br />
                  <span className="text-primary">Inteligente</span>
                </h2>
              </motion.div>
              
              <motion.p 
                className="text-xl text-muted-foreground max-w-xl leading-relaxed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                Plataforma completa para automatizar seu ciclo de compras. 
                Da solicitação à entrega, com <span className="text-foreground font-semibold">cotação automática</span> e análise inteligente.
              </motion.p>

              <motion.div 
                className="flex flex-wrap gap-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Link to="/compras">
                  <Button size="lg" className="gradient-primary hover-lift shadow-glow-primary text-lg px-8 py-6">
                    Começar Agora
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <Link to="/solicitacoes">
                  <Button size="lg" variant="outline" className="hover-lift text-lg px-8 py-6">
                    Ver Demonstração
                  </Button>
                </Link>
              </motion.div>

              {/* Social Proof */}
              <motion.div 
                className="flex items-center gap-6 pt-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div 
                      key={i} 
                      className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-info border-2 border-background flex items-center justify-center text-xs font-bold text-white"
                    >
                      {String.fromCharCode(64 + i)}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className="w-4 h-4 fill-warning text-warning" />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">4.9/5</span> de mais de 500 avaliações
                  </p>
                </div>
              </motion.div>
            </div>

            {/* Right Content - 40% - Benefits Cards */}
            <motion.div 
              className="lg:col-span-2 space-y-4"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {benefits.map((benefit, index) => (
                <motion.div
                  key={benefit.text}
                  variants={itemVariants}
                  whileHover={{ x: 10, scale: 1.02 }}
                  className="p-5 rounded-xl bg-card border border-border shadow-lg hover:shadow-xl transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shrink-0">
                      <benefit.icon className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div>
                      <h3 className="font-display font-semibold text-foreground">{benefit.text}</h3>
                      <p className="text-sm text-muted-foreground">{benefit.description}</p>
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                  </div>
                </motion.div>
              ))}

              {/* Mini Testimonial */}
              <motion.div
                variants={itemVariants}
                className="p-5 rounded-xl bg-gradient-to-br from-primary/10 to-info/10 border border-primary/20"
              >
                <p className="text-sm italic text-muted-foreground mb-3">
                  "{testimonials[0].text}"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                    CS
                  </div>
                  <div>
                    <p className="text-sm font-medium">{testimonials[0].name}</p>
                    <p className="text-xs text-muted-foreground">{testimonials[0].role}</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Modules Grid */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h3 className="text-3xl md:text-4xl font-display font-bold mb-3">Módulos do Sistema</h3>
            <p className="text-lg text-muted-foreground">Tudo que você precisa para gerenciar compras</p>
          </motion.div>

          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {modules.map((module, index) => (
              <motion.div key={module.name} variants={itemVariants}>
                <Link to={module.href}>
                  <Card 
                    className="p-6 hover-lift hover-glow cursor-pointer group transition-all duration-300 h-full relative overflow-hidden"
                  >
                    {module.badge && (
                      <Badge 
                        variant="secondary" 
                        className="absolute top-3 right-3 bg-primary/10 text-primary"
                      >
                        {module.badge}
                      </Badge>
                    )}
                    <div className="flex items-start gap-4">
                      <motion.div 
                        className="w-14 h-14 rounded-xl flex items-center justify-center bg-primary/10 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300"
                        whileHover={{ rotate: 10 }}
                      >
                        <module.icon className="w-7 h-7 text-primary group-hover:text-primary-foreground transition-colors" />
                      </motion.div>
                      <div className="flex-1">
                        <h4 className="font-display font-semibold text-lg text-foreground mb-1 group-hover:text-primary transition-colors">
                          {module.name}
                        </h4>
                        <p className="text-sm text-muted-foreground">{module.description}</p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <motion.div 
            className="glass rounded-3xl p-8 md:p-12"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {[
                { value: "6", label: "Módulos", color: "text-gradient" },
                { value: "4", label: "Fornecedores API", color: "text-primary" },
                { value: "+12K", label: "Produtos", color: "text-success" },
                { value: "Auto", label: "Cotação", color: "text-info" },
              ].map((stat, index) => (
                <motion.div 
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className={`text-4xl md:text-5xl font-display font-bold ${stat.color} mb-2`}>
                    {stat.value}
                  </div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                <ShoppingCart className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-sm text-muted-foreground">
                Sistema de Compras • Promo Brindes
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 Todos os direitos reservados
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
