import * as React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type StatusType = 
  | "pending" 
  | "processing" 
  | "approved" 
  | "completed" 
  | "cancelled" 
  | "error" 
  | "warning"
  | "info"
  | "draft"
  | "active"
  | "inactive";

interface StatusConfig {
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
  pulseColor?: string;
  icon?: string;
}

const statusConfigs: Record<StatusType, StatusConfig> = {
  pending: {
    label: "Pendente",
    color: "bg-warning",
    bgColor: "bg-warning/10",
    textColor: "text-warning",
    pulseColor: "bg-warning",
  },
  processing: {
    label: "Em Processamento",
    color: "bg-info",
    bgColor: "bg-info/10",
    textColor: "text-info",
    pulseColor: "bg-info",
  },
  approved: {
    label: "Aprovado",
    color: "bg-success",
    bgColor: "bg-success/10",
    textColor: "text-success",
  },
  completed: {
    label: "Concluído",
    color: "bg-success",
    bgColor: "bg-success/10",
    textColor: "text-success",
  },
  cancelled: {
    label: "Cancelado",
    color: "bg-destructive",
    bgColor: "bg-destructive/10",
    textColor: "text-destructive",
  },
  error: {
    label: "Erro",
    color: "bg-destructive",
    bgColor: "bg-destructive/10",
    textColor: "text-destructive",
    pulseColor: "bg-destructive",
  },
  warning: {
    label: "Atenção",
    color: "bg-warning",
    bgColor: "bg-warning/10",
    textColor: "text-warning",
  },
  info: {
    label: "Informação",
    color: "bg-info",
    bgColor: "bg-info/10",
    textColor: "text-info",
  },
  draft: {
    label: "Rascunho",
    color: "bg-muted-foreground",
    bgColor: "bg-muted",
    textColor: "text-muted-foreground",
  },
  active: {
    label: "Ativo",
    color: "bg-success",
    bgColor: "bg-success/10",
    textColor: "text-success",
  },
  inactive: {
    label: "Inativo",
    color: "bg-muted-foreground",
    bgColor: "bg-muted",
    textColor: "text-muted-foreground",
  },
};

interface StatusIndicatorProps {
  status: StatusType;
  label?: string;
  showDot?: boolean;
  showPulse?: boolean;
  size?: "sm" | "default" | "lg";
  tooltip?: string;
  className?: string;
}

export const StatusIndicator = ({
  status,
  label,
  showDot = true,
  showPulse = false,
  size = "default",
  tooltip,
  className,
}: StatusIndicatorProps) => {
  const config = statusConfigs[status];
  const displayLabel = label || config.label;

  const sizes = {
    sm: {
      badge: "text-[10px] px-1.5 py-0.5",
      dot: "w-1.5 h-1.5",
    },
    default: {
      badge: "text-xs px-2 py-0.5",
      dot: "w-2 h-2",
    },
    lg: {
      badge: "text-sm px-2.5 py-1",
      dot: "w-2.5 h-2.5",
    },
  };

  const s = sizes[size];

  const content = (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium",
        config.bgColor,
        config.textColor,
        s.badge,
        className
      )}
    >
      {showDot && (
        <span className="relative flex">
          <span className={cn("rounded-full", config.color, s.dot)} />
          {showPulse && config.pulseColor && (
            <span
              className={cn(
                "absolute inline-flex rounded-full opacity-75 animate-ping",
                config.pulseColor,
                s.dot
              )}
            />
          )}
        </span>
      )}
      {displayLabel}
    </div>
  );

  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent>
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
};

// Priority Indicator
type PriorityLevel = "low" | "medium" | "high" | "urgent";

interface PriorityIndicatorProps {
  priority: PriorityLevel;
  showLabel?: boolean;
  size?: "sm" | "default";
  className?: string;
}

const priorityConfigs: Record<PriorityLevel, { label: string; color: string; bars: number }> = {
  low: { label: "Baixa", color: "bg-muted-foreground", bars: 1 },
  medium: { label: "Média", color: "bg-warning", bars: 2 },
  high: { label: "Alta", color: "bg-orange-500", bars: 3 },
  urgent: { label: "Urgente", color: "bg-destructive", bars: 4 },
};

export const PriorityIndicator = ({
  priority,
  showLabel = true,
  size = "default",
  className,
}: PriorityIndicatorProps) => {
  const config = priorityConfigs[priority];
  const barHeight = size === "sm" ? "h-2" : "h-3";
  const barWidth = size === "sm" ? "w-0.5" : "w-1";

  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      <div className="flex items-end gap-0.5">
        {[1, 2, 3, 4].map((bar) => (
          <div
            key={bar}
            className={cn(
              barWidth,
              barHeight,
              "rounded-full transition-colors",
              bar <= config.bars ? config.color : "bg-muted"
            )}
            style={{ height: `${bar * (size === "sm" ? 3 : 4)}px` }}
          />
        ))}
      </div>
      {showLabel && (
        <span className={cn(
          "font-medium",
          size === "sm" ? "text-[10px]" : "text-xs",
          priority === "urgent" && "text-destructive",
          priority === "high" && "text-orange-500",
          priority === "medium" && "text-warning",
          priority === "low" && "text-muted-foreground"
        )}>
          {config.label}
        </span>
      )}
    </div>
  );
};

// Progress Status
interface ProgressStatusProps {
  current: number;
  total: number;
  label?: string;
  showPercentage?: boolean;
  size?: "sm" | "default";
  variant?: "default" | "success" | "warning" | "destructive";
  className?: string;
}

export const ProgressStatus = ({
  current,
  total,
  label,
  showPercentage = true,
  size = "default",
  variant = "default",
  className,
}: ProgressStatusProps) => {
  const percentage = Math.round((current / total) * 100);
  
  const variantColors = {
    default: "bg-primary",
    success: "bg-success",
    warning: "bg-warning",
    destructive: "bg-destructive",
  };

  const barHeight = size === "sm" ? "h-1.5" : "h-2";

  return (
    <div className={cn("space-y-1", className)}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between text-xs">
          {label && <span className="text-muted-foreground">{label}</span>}
          {showPercentage && (
            <span className="font-medium">{percentage}%</span>
          )}
        </div>
      )}
      <div className={cn("w-full bg-muted rounded-full overflow-hidden", barHeight)}>
        <div
          className={cn("h-full rounded-full transition-all duration-500", variantColors[variant])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
