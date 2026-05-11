import { ShoppingBag, TrendingUp, Shield, Sparkles, Package } from "lucide-react";
import { cn } from "@/lib/utils";

const FloatingShape = ({ className, delay = 0 }: { className?: string; delay?: number }) => (
  <div
    className={cn(
      "absolute rounded-full bg-gradient-to-br from-primary/20 to-primary/5 blur-3xl animate-float",
      className
    )}
    style={{ animationDelay: `${delay}s` }}
  />
);

const FeatureCard = ({ icon: Icon, title, description, delay }: {
  icon: typeof ShoppingBag;
  title: string;
  description: string;
  delay: number;
}) => (
  <div
    className="flex items-start gap-3 p-4 rounded-xl border animate-fade-in"
    style={{
      animationDelay: `${delay}ms`,
      background: 'linear-gradient(135deg, hsl(265 90% 66% / 0.08) 0%, hsl(0 0% 100% / 0.03) 100%)',
      borderColor: 'hsl(265 90% 66% / 0.15)',
      backdropFilter: 'blur(12px)',
    }}
  >
    <div className="p-2 rounded-lg" style={{ background: 'hsl(265 90% 66% / 0.2)' }}>
      <Icon className="w-5 h-5 text-primary-foreground" />
    </div>
    <div>
      <h3 className="font-semibold text-primary-foreground text-sm">{title}</h3>
      <p className="text-primary-foreground/60 text-xs mt-0.5">{description}</p>
    </div>
  </div>
);

export const AuthBackground = () => (
  <>
    <FloatingShape className="w-96 h-96 -top-48 -left-48" delay={0} />
    <FloatingShape className="w-64 h-64 top-1/2 -right-32" delay={2} />
    <FloatingShape className="w-80 h-80 -bottom-40 left-1/4" delay={4} />
  </>
);

export const AuthBrandingPanel = () => (
  <div
    className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative p-12 flex-col justify-between overflow-hidden"
    style={{
      background: 'linear-gradient(145deg, hsl(265 90% 20%) 0%, hsl(228 28% 6%) 50%, hsl(265 60% 12%) 100%)',
    }}
  >
    {/* Animated grid pattern */}
    <div className="absolute inset-0 opacity-[0.07]" style={{
      backgroundImage: `linear-gradient(hsl(265 90% 66% / 0.3) 1px, transparent 1px), linear-gradient(90deg, hsl(265 90% 66% / 0.3) 1px, transparent 1px)`,
      backgroundSize: '60px 60px',
    }} />
    <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] rounded-full opacity-20" style={{
      background: 'radial-gradient(circle, hsl(265 90% 66% / 0.6) 0%, transparent 70%)',
    }} />

    {/* Logo & Title */}
    <div className="relative z-10">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-xl border border-white/30">
          <Package className="w-7 h-7 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-primary-foreground">Promo Supply</h1>
          <p className="text-primary-foreground/70 text-sm">Sistema de Gestão de Compras</p>
        </div>
      </div>
      <div className="max-w-md">
        <h2 className="text-4xl font-bold text-primary-foreground mb-4 leading-tight">
          Gerencie suas compras com
          <span className="relative inline-block ml-2">
            inteligência
            <Sparkles className="absolute -top-2 -right-6 w-5 h-5 text-yellow-300 animate-pulse" />
          </span>
        </h2>
        <p className="text-primary-foreground/80 text-lg">
          Plataforma completa para gestão de solicitações, cotações, fornecedores e pagamentos.
        </p>
      </div>
    </div>

    {/* Features */}
    <div className="relative z-10 space-y-4">
      <FeatureCard icon={ShoppingBag} title="Gestão Completa" description="Controle todo o ciclo de compras em um só lugar" delay={100} />
      <FeatureCard icon={TrendingUp} title="Análises em Tempo Real" description="Dashboards e KPIs para tomada de decisão" delay={200} />
      <FeatureCard icon={Shield} title="Segurança Avançada" description="Autenticação robusta e controle de acesso" delay={300} />
    </div>

    <p className="relative z-10 text-primary-foreground/50 text-sm">
      © 2026 Promo Supply. Todos os direitos reservados.
    </p>
  </div>
);
