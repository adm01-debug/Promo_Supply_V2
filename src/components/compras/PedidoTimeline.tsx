import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ClipboardList, 
  Search, 
  CheckCircle2, 
  FileText, 
  CreditCard, 
  Banknote,
  Truck, 
  Package,
  ArrowRight
} from "lucide-react";
import { Solicitacao, getStatusLabel, getTipoLabel } from "@/data/mockData";
import { cn } from "@/lib/utils";

interface PedidoTimelineProps {
  pedidos: Solicitacao[];
}

const statusSteps = [
  { key: 'AGUARDANDO_COTACAO', label: 'Aguardando Cotação', icon: ClipboardList },
  { key: 'EM_COTACAO', label: 'Em Cotação', icon: Search },
  { key: 'FORNECEDOR_SELECIONADO', label: 'Fornecedor Selecionado', icon: CheckCircle2 },
  { key: 'PEDIDO_GERADO', label: 'Pedido Gerado', icon: FileText },
  { key: 'AGUARDANDO_PAGAMENTO', label: 'Aguardando Pagamento', icon: CreditCard },
  { key: 'PAGO', label: 'Pago', icon: Banknote },
  { key: 'EM_TRANSITO', label: 'Em Trânsito', icon: Truck },
  { key: 'ENTREGUE', label: 'Entregue', icon: Package },
];

const getStepIndex = (status: string) => {
  return statusSteps.findIndex(s => s.key === status);
};

const getStatusColorClass = (status: string, isActive: boolean, isCompleted: boolean) => {
  if (!isActive && !isCompleted) return "bg-muted text-muted-foreground";
  
  const colors: Record<string, string> = {
    AGUARDANDO_COTACAO: "bg-amber-500 text-white",
    EM_COTACAO: "bg-yellow-500 text-black",
    FORNECEDOR_SELECIONADO: "bg-blue-500 text-white",
    PEDIDO_GERADO: "bg-indigo-500 text-white",
    AGUARDANDO_PAGAMENTO: "bg-orange-500 text-white",
    PAGO: "bg-cyan-500 text-white",
    EM_TRANSITO: "bg-purple-500 text-white",
    ENTREGUE: "bg-green-500 text-white",
  };
  
  return isCompleted ? "bg-success text-success-foreground" : colors[status] || "bg-muted";
};

export const PedidoTimeline = ({ pedidos }: PedidoTimelineProps) => {
  return (
    <div className="space-y-4">
      {pedidos.map((pedido) => {
        const currentStepIndex = getStepIndex(pedido.status);
        
        return (
          <Card key={pedido.id} className="bg-card border-border overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Package className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-lg">{pedido.produto}</CardTitle>
                      <Badge variant="outline" className="text-xs">
                        {pedido.itemNumber}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{pedido.empresa}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>Qtd: {pedido.quantidade} un</span>
                      <span>•</span>
                      <span>{getTipoLabel(pedido.tipo)}</span>
                      <span>•</span>
                      <span>Prazo: {new Date(pedido.prazoEntrega).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={cn(
                    "text-xs",
                    getStatusColorClass(pedido.status, true, false)
                  )}>
                    {getStatusLabel(pedido.status)}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              {/* Timeline */}
              <div className="relative">
                {/* Progress Bar Background */}
                <div className="absolute top-5 left-0 right-0 h-1 bg-muted rounded-full" />
                
                {/* Progress Bar Fill */}
                <div 
                  className="absolute top-5 left-0 h-1 bg-success rounded-full transition-all duration-500"
                  style={{ width: `${(currentStepIndex / (statusSteps.length - 1)) * 100}%` }}
                />
                
                {/* Steps */}
                <div className="relative flex justify-between">
                  {statusSteps.map((step, index) => {
                    const isCompleted = index < currentStepIndex;
                    const isActive = index === currentStepIndex;
                    const StepIcon = step.icon;
                    
                    return (
                      <div 
                        key={step.key}
                        className="flex flex-col items-center"
                        style={{ width: `${100 / statusSteps.length}%` }}
                      >
                        <div 
                          className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 z-10",
                            isCompleted && "bg-success text-success-foreground",
                            isActive && getStatusColorClass(pedido.status, true, false),
                            !isCompleted && !isActive && "bg-muted text-muted-foreground"
                          )}
                        >
                          <StepIcon className="w-4 h-4" />
                        </div>
                        <span className={cn(
                          "text-[10px] mt-2 text-center leading-tight hidden md:block",
                          (isActive || isCompleted) ? "text-foreground font-medium" : "text-muted-foreground"
                        )}>
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Additional Info */}
              {pedido.fornecedorSelecionado && (
                <div className="mt-6 pt-4 border-t border-border">
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Fornecedor:</span>{" "}
                      <span className="font-medium text-foreground">{pedido.fornecedorSelecionado}</span>
                    </div>
                    {pedido.valorTotal && (
                      <div>
                        <span className="text-muted-foreground">Valor Total:</span>{" "}
                        <span className="font-medium text-success">
                          {pedido.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
      
      {pedidos.length === 0 && (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum pedido encontrado</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
