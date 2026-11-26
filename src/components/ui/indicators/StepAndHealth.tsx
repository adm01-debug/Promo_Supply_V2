import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, Loader2, Minus, AlertTriangle } from "lucide-react";

// StepStatus
interface Step {
  label: string;
  description?: string;
  status: 'pending' | 'current' | 'completed' | 'error';
}

interface StepStatusProps {
  steps: Step[];
  orientation?: 'horizontal' | 'vertical';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export function StepStatus({ steps, orientation = 'horizontal', size = 'default', className }: StepStatusProps) {
  const isHorizontal = orientation === 'horizontal';
  const dotSizes = { sm: 'w-6 h-6', default: 'w-8 h-8', lg: 'w-10 h-10' };
  const iconSizes = { sm: 'h-3 w-3', default: 'h-4 w-4', lg: 'h-5 w-5' };
  const textSizes = { sm: 'text-xs', default: 'text-sm', lg: 'text-base' };

  const getStepStyles = (status: Step['status']) => {
    switch (status) {
      case 'completed': return { bg: 'bg-success', text: 'text-success', icon: CheckCircle2 };
      case 'current': return { bg: 'bg-primary', text: 'text-primary', icon: null };
      case 'error': return { bg: 'bg-destructive', text: 'text-destructive', icon: XCircle };
      default: return { bg: 'bg-muted', text: 'text-muted-foreground', icon: null };
    }
  };

  return (
    <div className={cn("flex", isHorizontal ? "flex-row items-start" : "flex-col", className)}>
      {steps.map((step, index) => {
        const styles = getStepStyles(step.status);
        const Icon = styles.icon;
        const isLast = index === steps.length - 1;
        return (
          <div key={index} className={cn("flex", isHorizontal ? "flex-col items-center flex-1" : "flex-row items-start gap-4")}>
            <div className={cn("flex items-center", isHorizontal ? "flex-col" : "flex-row")}>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: index * 0.1, type: "spring" }}
                className={cn("rounded-full flex items-center justify-center font-medium text-primary-foreground relative z-10", dotSizes[size], styles.bg, step.status === 'current' && "ring-4 ring-primary/20")}>
                {Icon ? <Icon className={iconSizes[size]} /> : <span className={textSizes[size]}>{index + 1}</span>}
              </motion.div>
              {!isLast && <div className={cn(isHorizontal ? "w-full h-0.5" : "w-0.5 h-full min-h-8", step.status === 'completed' ? "bg-success" : "bg-muted")} />}
            </div>
            <div className={cn(isHorizontal ? "text-center mt-2 px-2" : "pb-8")}>
              <p className={cn("font-medium", textSizes[size], styles.text)}>{step.label}</p>
              {step.description && <p className={cn("text-muted-foreground mt-0.5", size === 'sm' ? 'text-[10px]' : 'text-xs')}>{step.description}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// HealthCheck
interface HealthCheckProps {
  items: Array<{ name: string; status: 'healthy' | 'degraded' | 'down' | 'checking'; latency?: number; }>;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export function HealthCheck({ items, size = 'default', className }: HealthCheckProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'healthy': return { color: 'bg-success', text: 'text-success', label: 'Saudável', icon: CheckCircle2 };
      case 'degraded': return { color: 'bg-warning', text: 'text-warning', label: 'Degradado', icon: AlertTriangle };
      case 'down': return { color: 'bg-destructive', text: 'text-destructive', label: 'Indisponível', icon: XCircle };
      default: return { color: 'bg-info', text: 'text-info', label: 'Verificando', icon: Loader2 };
    }
  };
  const textSizes = { sm: 'text-xs', default: 'text-sm', lg: 'text-base' };
  const dotSizes = { sm: 'w-2 h-2', default: 'w-2.5 h-2.5', lg: 'w-3 h-3' };

  return (
    <div className={cn("space-y-2", className)}>
      {items.map((item, index) => {
        const config = getStatusConfig(item.status);
        return (
          <motion.div key={item.name} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }}
            className="flex items-center justify-between py-1.5">
            <div className="flex items-center gap-2">
              <span className={cn("rounded-full", dotSizes[size], config.color)} />
              <span className={cn("font-medium", textSizes[size])}>{item.name}</span>
            </div>
            <div className="flex items-center gap-2">
              {item.latency !== undefined && <span className={cn("text-muted-foreground", size === 'sm' ? 'text-[10px]' : 'text-xs')}>{item.latency}ms</span>}
              <span className={cn("font-medium", size === 'sm' ? 'text-[10px]' : 'text-xs', config.text)}>{config.label}</span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
