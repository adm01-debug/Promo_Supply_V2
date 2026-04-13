import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle2, Clock, AlertTriangle, XCircle, Loader2, Zap, Minus } from "lucide-react";

export type StatusType =
  | "pending" | "processing" | "approved" | "completed" | "cancelled"
  | "error" | "warning" | "info" | "draft" | "active" | "inactive"
  | "success" | "neutral";

export interface StatusConfig {
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
  pulseColor?: string;
  icon?: React.ElementType;
}

export const statusConfigs: Record<StatusType, StatusConfig> = {
  pending: { label: "Pendente", color: "bg-warning", bgColor: "bg-warning/10", textColor: "text-warning", pulseColor: "bg-warning", icon: Clock },
  processing: { label: "Em Processamento", color: "bg-info", bgColor: "bg-info/10", textColor: "text-info", pulseColor: "bg-info", icon: Loader2 },
  approved: { label: "Aprovado", color: "bg-success", bgColor: "bg-success/10", textColor: "text-success", icon: CheckCircle2 },
  completed: { label: "Concluído", color: "bg-success", bgColor: "bg-success/10", textColor: "text-success", icon: CheckCircle2 },
  cancelled: { label: "Cancelado", color: "bg-destructive", bgColor: "bg-destructive/10", textColor: "text-destructive", icon: XCircle },
  error: { label: "Erro", color: "bg-destructive", bgColor: "bg-destructive/10", textColor: "text-destructive", pulseColor: "bg-destructive", icon: XCircle },
  warning: { label: "Atenção", color: "bg-warning", bgColor: "bg-warning/10", textColor: "text-warning", icon: AlertTriangle },
  info: { label: "Informação", color: "bg-info", bgColor: "bg-info/10", textColor: "text-info", icon: Zap },
  draft: { label: "Rascunho", color: "bg-muted-foreground", bgColor: "bg-muted", textColor: "text-muted-foreground", icon: Clock },
  active: { label: "Ativo", color: "bg-success", bgColor: "bg-success/10", textColor: "text-success", icon: CheckCircle2 },
  inactive: { label: "Inativo", color: "bg-muted-foreground", bgColor: "bg-muted", textColor: "text-muted-foreground", icon: Minus },
  success: { label: "Sucesso", color: "bg-success", bgColor: "bg-success/10", textColor: "text-success", icon: CheckCircle2 },
  neutral: { label: "Neutro", color: "bg-muted-foreground", bgColor: "bg-muted", textColor: "text-muted-foreground", icon: Minus },
};

interface StatusIndicatorProps {
  status: StatusType;
  label?: string;
  showDot?: boolean;
  showPulse?: boolean;
  showIcon?: boolean;
  size?: "sm" | "default" | "lg";
  tooltip?: string;
  animated?: boolean;
  className?: string;
}

export const StatusIndicator = ({
  status, label, showDot = true, showPulse = false, showIcon = false,
  size = "default", tooltip, animated = true, className,
}: StatusIndicatorProps) => {
  const config = statusConfigs[status];
  const displayLabel = label || config.label;
  const Icon = config.icon;

  const sizes = {
    sm: { badge: "text-[10px] px-1.5 py-0.5", dot: "w-1.5 h-1.5", icon: "h-3 w-3" },
    default: { badge: "text-xs px-2 py-0.5", dot: "w-2 h-2", icon: "h-3.5 w-3.5" },
    lg: { badge: "text-sm px-2.5 py-1", dot: "w-2.5 h-2.5", icon: "h-4 w-4" },
  };

  const s = sizes[size];
  const isProcessing = status === "processing";
  const Wrapper = animated ? motion.div : "div";
  const wrapperProps = animated ? {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.9 },
    transition: { duration: 0.2 }
  } : {};

  const content = (
    <Wrapper {...wrapperProps} className={cn("inline-flex items-center gap-1.5 rounded-full font-medium", config.bgColor, config.textColor, s.badge, className)}>
      {showIcon && Icon && <Icon className={cn(s.icon, isProcessing && "animate-spin")} />}
      {showDot && !showIcon && (
        <span className="relative flex">
          <span className={cn("rounded-full", config.color, s.dot)} />
          {showPulse && config.pulseColor && (
            <span className={cn("absolute inline-flex rounded-full opacity-75 animate-ping", config.pulseColor, s.dot)} />
          )}
        </span>
      )}
      {displayLabel}
    </Wrapper>
  );

  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent><p>{tooltip}</p></TooltipContent>
      </Tooltip>
    );
  }

  return content;
};
