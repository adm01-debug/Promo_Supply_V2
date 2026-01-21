import { cn } from '@/lib/utils';
import { 
  FileText, 
  Search, 
  CheckCircle2, 
  ShoppingCart, 
  Truck, 
  CreditCard,
  Clock,
  XCircle,
  AlertTriangle,
  Package
} from 'lucide-react';

export type SolicitacaoStatus = 
  | 'rascunho'
  | 'pendente'
  | 'em_analise'
  | 'aprovada'
  | 'rejeitada'
  | 'em_cotacao'
  | 'em_andamento'
  | 'concluida'
  | 'cancelada';

export type PedidoStatus = 
  | 'pendente'
  | 'aprovado'
  | 'enviado'
  | 'em_transito'
  | 'entregue'
  | 'parcial'
  | 'cancelado';

export type PagamentoStatus = 
  | 'pendente'
  | 'aprovado'
  | 'agendado'
  | 'pago'
  | 'atrasado'
  | 'cancelado';

interface TimelineStep {
  key: string;
  label: string;
  icon: React.ElementType;
  status: 'completed' | 'current' | 'pending' | 'error' | 'warning';
  date?: string;
  description?: string;
}

interface StatusTimelineProps {
  type: 'solicitacao' | 'pedido' | 'pagamento';
  currentStatus: string;
  dates?: Record<string, string>;
  className?: string;
  orientation?: 'horizontal' | 'vertical';
  compact?: boolean;
}

// Mapeamento de status para steps da solicitação
const SOLICITACAO_STEPS: Array<{ key: SolicitacaoStatus; label: string; icon: React.ElementType }> = [
  { key: 'rascunho', label: 'Rascunho', icon: FileText },
  { key: 'pendente', label: 'Pendente', icon: Clock },
  { key: 'em_analise', label: 'Em Análise', icon: Search },
  { key: 'aprovada', label: 'Aprovada', icon: CheckCircle2 },
  { key: 'em_cotacao', label: 'Em Cotação', icon: Search },
  { key: 'em_andamento', label: 'Em Andamento', icon: ShoppingCart },
  { key: 'concluida', label: 'Concluída', icon: CheckCircle2 },
];

// Mapeamento de status para steps do pedido
const PEDIDO_STEPS: Array<{ key: PedidoStatus; label: string; icon: React.ElementType }> = [
  { key: 'pendente', label: 'Pendente', icon: Clock },
  { key: 'aprovado', label: 'Aprovado', icon: CheckCircle2 },
  { key: 'enviado', label: 'Enviado', icon: Package },
  { key: 'em_transito', label: 'Em Trânsito', icon: Truck },
  { key: 'entregue', label: 'Entregue', icon: CheckCircle2 },
];

// Mapeamento de status para steps do pagamento
const PAGAMENTO_STEPS: Array<{ key: PagamentoStatus; label: string; icon: React.ElementType }> = [
  { key: 'pendente', label: 'Pendente', icon: Clock },
  { key: 'aprovado', label: 'Aprovado', icon: CheckCircle2 },
  { key: 'agendado', label: 'Agendado', icon: Clock },
  { key: 'pago', label: 'Pago', icon: CreditCard },
];

// Status que indicam erro ou cancelamento
const ERROR_STATUS = ['rejeitada', 'cancelada', 'cancelado'];
const WARNING_STATUS = ['atrasado', 'parcial'];

function getStepStatus(
  stepKey: string, 
  currentStatus: string, 
  stepIndex: number, 
  currentIndex: number
): TimelineStep['status'] {
  if (ERROR_STATUS.includes(currentStatus)) {
    if (stepIndex <= currentIndex) return 'error';
    return 'pending';
  }

  if (WARNING_STATUS.includes(currentStatus) && stepIndex === currentIndex) {
    return 'warning';
  }

  if (stepIndex < currentIndex) return 'completed';
  if (stepIndex === currentIndex) return 'current';
  return 'pending';
}

export function StatusTimeline({
  type,
  currentStatus,
  dates = {},
  className,
  orientation = 'horizontal',
  compact = false,
}: StatusTimelineProps) {
  // Selecionar steps baseado no tipo
  const stepsConfig = type === 'solicitacao' 
    ? SOLICITACAO_STEPS 
    : type === 'pedido' 
      ? PEDIDO_STEPS 
      : PAGAMENTO_STEPS;

  // Encontrar índice do status atual
  const currentIndex = stepsConfig.findIndex(s => s.key === currentStatus);
  
  // Converter para TimelineStep[]
  const steps: TimelineStep[] = stepsConfig.map((step, index) => ({
    ...step,
    status: getStepStatus(step.key, currentStatus, index, currentIndex),
    date: dates[step.key],
  }));

  // Se status é de erro/cancelamento, adicionar step especial
  if (ERROR_STATUS.includes(currentStatus) && currentIndex === -1) {
    steps.push({
      key: currentStatus,
      label: currentStatus === 'cancelada' || currentStatus === 'cancelado' ? 'Cancelado' : 'Rejeitada',
      icon: XCircle,
      status: 'error',
      date: dates[currentStatus],
    });
  }

  // Se status é atrasado, adicionar indicador
  if (currentStatus === 'atrasado') {
    const lastIndex = steps.length - 1;
    steps[lastIndex] = {
      ...steps[lastIndex],
      key: 'atrasado',
      label: 'Atrasado',
      icon: AlertTriangle,
      status: 'warning',
    };
  }

  const getStatusColors = (status: TimelineStep['status']) => {
    switch (status) {
      case 'completed':
        return {
          bg: 'bg-green-500',
          border: 'border-green-500',
          text: 'text-green-600',
          line: 'bg-green-500',
        };
      case 'current':
        return {
          bg: 'bg-blue-500',
          border: 'border-blue-500',
          text: 'text-blue-600',
          line: 'bg-gray-300',
        };
      case 'error':
        return {
          bg: 'bg-red-500',
          border: 'border-red-500',
          text: 'text-red-600',
          line: 'bg-red-300',
        };
      case 'warning':
        return {
          bg: 'bg-yellow-500',
          border: 'border-yellow-500',
          text: 'text-yellow-600',
          line: 'bg-yellow-300',
        };
      default:
        return {
          bg: 'bg-gray-200',
          border: 'border-gray-300',
          text: 'text-gray-400',
          line: 'bg-gray-200',
        };
    }
  };

  if (orientation === 'vertical') {
    return (
      <div className={cn("flex flex-col", className)}>
        {steps.map((step, index) => {
          const colors = getStatusColors(step.status);
          const Icon = step.icon;
          const isLast = index === steps.length - 1;

          return (
            <div key={step.key} className="flex gap-3">
              {/* Linha e ícone */}
              <div className="flex flex-col items-center">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center border-2",
                  colors.border,
                  step.status === 'pending' ? 'bg-white' : colors.bg
                )}>
                  <Icon className={cn(
                    "w-4 h-4",
                    step.status === 'pending' ? colors.text : 'text-white'
                  )} />
                </div>
                {!isLast && (
                  <div className={cn(
                    "w-0.5 h-12 -my-1",
                    step.status === 'completed' ? 'bg-green-500' : 'bg-gray-200'
                  )} />
                )}
              </div>

              {/* Conteúdo */}
              <div className={cn("pb-8", isLast && "pb-0")}>
                <p className={cn(
                  "font-medium text-sm",
                  step.status === 'pending' ? 'text-gray-400' : colors.text
                )}>
                  {step.label}
                </p>
                {step.date && (
                  <p className="text-xs text-muted-foreground">
                    {new Date(step.date).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Horizontal (default)
  return (
    <div className={cn("w-full", className)}>
      <div className={cn(
        "flex items-center justify-between",
        compact ? "gap-1" : "gap-2"
      )}>
        {steps.map((step, index) => {
          const colors = getStatusColors(step.status);
          const Icon = step.icon;
          const isLast = index === steps.length - 1;

          return (
            <div key={step.key} className="flex items-center flex-1 last:flex-none">
              {/* Step */}
              <div className="flex flex-col items-center">
                <div className={cn(
                  "rounded-full flex items-center justify-center border-2 transition-all",
                  colors.border,
                  step.status === 'pending' ? 'bg-white' : colors.bg,
                  compact ? "w-6 h-6" : "w-10 h-10"
                )}>
                  <Icon className={cn(
                    step.status === 'pending' ? colors.text : 'text-white',
                    compact ? "w-3 h-3" : "w-5 h-5"
                  )} />
                </div>
                
                {!compact && (
                  <div className="mt-2 text-center">
                    <p className={cn(
                      "text-xs font-medium",
                      step.status === 'pending' ? 'text-gray-400' : colors.text
                    )}>
                      {step.label}
                    </p>
                    {step.date && (
                      <p className="text-xs text-muted-foreground">
                        {new Date(step.date).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Linha conectora */}
              {!isLast && (
                <div className={cn(
                  "flex-1 h-0.5 mx-1",
                  step.status === 'completed' ? colors.line : 'bg-gray-200'
                )} />
              )}
            </div>
          );
        })}
      </div>

      {/* Tooltip para modo compacto */}
      {compact && (
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>{steps[0].label}</span>
          <span className="font-medium text-foreground">
            {steps.find(s => s.status === 'current' || s.status === 'warning' || s.status === 'error')?.label}
          </span>
          <span>{steps[steps.length - 1].label}</span>
        </div>
      )}
    </div>
  );
}

// Componente simplificado para uso em listas
export function StatusBadgeTimeline({
  type,
  currentStatus,
  className,
}: {
  type: 'solicitacao' | 'pedido' | 'pagamento';
  currentStatus: string;
  className?: string;
}) {
  const stepsConfig = type === 'solicitacao' 
    ? SOLICITACAO_STEPS 
    : type === 'pedido' 
      ? PEDIDO_STEPS 
      : PAGAMENTO_STEPS;

  const currentIndex = stepsConfig.findIndex(s => s.key === currentStatus);
  const totalSteps = stepsConfig.length;
  const progress = currentIndex >= 0 ? ((currentIndex + 1) / totalSteps) * 100 : 0;

  const isError = ERROR_STATUS.includes(currentStatus);
  const isWarning = WARNING_STATUS.includes(currentStatus);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className={cn(
            "h-full rounded-full transition-all",
            isError ? "bg-red-500" :
            isWarning ? "bg-yellow-500" :
            "bg-green-500"
          )}
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {currentIndex + 1}/{totalSteps}
      </span>
    </div>
  );
}
