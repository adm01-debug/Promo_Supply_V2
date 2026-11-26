import { Check, Clock, Package, CreditCard, Truck, MapPin, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EtapaPipeline {
  id: string;
  nome: string;
  status: 'concluido' | 'atual' | 'pendente';
  data?: string;
  descricao?: string;
}

interface PedidoTimelineProps {
  etapas: EtapaPipeline[];
  orientacao?: 'horizontal' | 'vertical';
}

const iconesPorEtapa: Record<string, typeof Check> = {
  solicitacao: Clock,
  cotacao: Package,
  pedido: CreditCard,
  pagamento: CreditCard,
  transito: Truck,
  coleta: MapPin,
  entregue: CheckCircle2,
};

export const PedidoTimeline = ({ etapas, orientacao = 'horizontal' }: PedidoTimelineProps) => {
  if (orientacao === 'vertical') {
    return (
      <div className="relative">
        {etapas.map((etapa, index) => {
          const Icone = iconesPorEtapa[etapa.id] || Check;
          const isLast = index === etapas.length - 1;
          
          return (
            <div key={etapa.id} className="flex gap-4">
              {/* Linha vertical e círculo */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all z-10",
                    etapa.status === 'concluido' && "bg-success border-success text-success-foreground",
                    etapa.status === 'atual' && "bg-primary border-primary text-primary-foreground animate-pulse",
                    etapa.status === 'pendente' && "bg-muted border-border text-muted-foreground"
                  )}
                >
                  {etapa.status === 'concluido' ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <Icone className="w-5 h-5" />
                  )}
                </div>
                {!isLast && (
                  <div
                    className={cn(
                      "w-0.5 h-16 transition-colors",
                      etapa.status === 'concluido' ? "bg-success" : "bg-border"
                    )}
                  />
                )}
              </div>

              {/* Conteúdo */}
              <div className="flex-1 pb-8">
                <div className="flex items-center gap-2">
                  <h4
                    className={cn(
                      "font-medium",
                      etapa.status === 'concluido' && "text-success",
                      etapa.status === 'atual' && "text-primary",
                      etapa.status === 'pendente' && "text-muted-foreground"
                    )}
                  >
                    {etapa.nome}
                  </h4>
                  {etapa.status === 'atual' && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                      Em andamento
                    </span>
                  )}
                </div>
                {etapa.data && (
                  <p className="text-xs text-muted-foreground mt-1">{etapa.data}</p>
                )}
                {etapa.descricao && (
                  <p className="text-sm text-muted-foreground mt-1">{etapa.descricao}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Orientação horizontal
  return (
    <div className="relative">
      {/* Linha de conexão */}
      <div className="absolute top-5 left-0 right-0 h-0.5 bg-border" />
      
      {/* Barra de progresso */}
      <div
        className="absolute top-5 left-0 h-0.5 bg-success transition-all duration-500"
        style={{
          width: `${(etapas.filter(e => e.status === 'concluido').length / (etapas.length - 1)) * 100}%`,
        }}
      />

      <div className="relative flex justify-between">
        {etapas.map((etapa) => {
          const Icone = iconesPorEtapa[etapa.id] || Check;

          return (
            <div key={etapa.id} className="flex flex-col items-center">
              {/* Círculo */}
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 bg-card transition-all z-10",
                  etapa.status === 'concluido' && "bg-success border-success text-success-foreground",
                  etapa.status === 'atual' && "bg-primary border-primary text-primary-foreground animate-pulse",
                  etapa.status === 'pendente' && "bg-muted border-border text-muted-foreground"
                )}
              >
                {etapa.status === 'concluido' ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <Icone className="w-5 h-5" />
                )}
              </div>

              {/* Label */}
              <div className="mt-3 text-center">
                <p
                  className={cn(
                    "text-xs font-medium",
                    etapa.status === 'concluido' && "text-success",
                    etapa.status === 'atual' && "text-primary",
                    etapa.status === 'pendente' && "text-muted-foreground"
                  )}
                >
                  {etapa.nome}
                </p>
                {etapa.data && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">{etapa.data}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
