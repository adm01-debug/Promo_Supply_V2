import { ShoppingBag, TrendingUp, Package } from "lucide-react";

import { EliteBackground } from "@/components/layout/EliteBackground";

export const AuthBackground = () => <EliteBackground />;

const FeatureRow = ({ icon: Icon, title, description }: {
  icon: typeof ShoppingBag;
  title: string;
  description: string;
}) => (
  <div className="group flex items-center gap-5 p-4 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-violet-500/20 transition-all">
    <div className="w-12 h-12 shrink-0 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-300 group-hover:scale-110 transition-transform">
      <Icon className="w-6 h-6" strokeWidth={1.5} />
    </div>
    <div>
      <h3 className="font-semibold text-zinc-100 text-[15px]">{title}</h3>
      <p className="text-sm text-zinc-500 mt-0.5">{description}</p>
    </div>
  </div>
);

export const AuthBrandingPanel = () => (
  <div className="relative hidden lg:flex flex-col justify-between w-[55%] p-16 z-10">
    <div className="flex items-center gap-3">
      <div className="w-11 h-11 bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/30">
        <Package className="w-6 h-6 text-white" strokeWidth={1.75} />
      </div>
      <div>
        <h1 className="text-xl font-bold tracking-tight text-white leading-none" style={{ fontFamily: 'Outfit, sans-serif' }}>
          PROMO <span className="text-violet-400">SUPPLY</span>
        </h1>
        <p className="text-[10px] tracking-[0.22em] uppercase text-zinc-500 font-semibold mt-1">
          Gestão de Compras
        </p>
      </div>
    </div>

    <div className="max-w-xl">
      <h2 className="text-5xl font-bold leading-[1.1] mb-6 text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
        Gerencie suas compras com{' '}
        <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-400">
          inteligência
        </span>
      </h2>
      <p className="text-zinc-400 text-lg leading-relaxed mb-12 max-w-md">
        Plataforma completa para gestão de solicitações, cotações, fornecedores e pagamentos.
      </p>

      <div className="space-y-4">
        <FeatureRow icon={ShoppingBag} title="Gestão Completa" description="Controle todo o ciclo de compras em um só lugar" />
        <FeatureRow icon={TrendingUp} title="Análises em Tempo Real" description="Dashboards e KPIs para tomada de decisão" />
      </div>
    </div>

    <div className="text-xs text-zinc-600">
      © 2026 PROMO SUPPLY. Todos os direitos reservados.
    </div>
  </div>
);
