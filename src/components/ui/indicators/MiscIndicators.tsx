import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2, Shield, Star } from "lucide-react";

// ConfidenceMeter
interface ConfidenceMeterProps { value: number; label?: string; showValue?: boolean; size?: "sm" | "default" | "lg"; className?: string; }

export function ConfidenceMeter({ value, label, showValue = true, size = "default", className }: ConfidenceMeterProps) {
  const clampedValue = Math.min(100, Math.max(0, value));
  const getColor = (val: number) => val >= 80 ? "bg-success" : val >= 40 ? "bg-warning" : "bg-destructive";
  const heightConfig = { sm: "h-1.5", default: "h-2", lg: "h-3" };
  const textConfig = { sm: "text-xs", default: "text-sm", lg: "text-base" };
  return (
    <div className={cn("w-full space-y-1.5", className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between">
          {label && <span className={cn("text-muted-foreground", textConfig[size])}>{label}</span>}
          {showValue && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={cn("font-semibold", textConfig[size])}>{clampedValue}%</motion.span>}
        </div>
      )}
      <div className={cn("w-full rounded-full bg-muted overflow-hidden", heightConfig[size])}>
        <motion.div initial={{ width: 0 }} animate={{ width: `${clampedValue}%` }} transition={{ duration: 0.8, ease: "easeOut" }} className={cn("h-full rounded-full", getColor(clampedValue))} />
      </div>
    </div>
  );
}

// RatingStars
interface RatingStarsProps { rating: number; maxRating?: number; size?: "sm" | "default" | "lg"; showValue?: boolean; interactive?: boolean; onChange?: (rating: number) => void; className?: string; }

export function RatingStars({ rating, maxRating = 5, size = "default", showValue = false, interactive = false, onChange, className }: RatingStarsProps) {
  const [hoverRating, setHoverRating] = React.useState(0);
  const displayRating = hoverRating || rating;
  const iconSizes = { sm: "h-3 w-3", default: "h-4 w-4", lg: "h-5 w-5" };
  const textSizes = { sm: "text-xs", default: "text-sm", lg: "text-base" };
  return (
    <div className={cn("inline-flex items-center gap-0.5", className)}>
      {Array.from({ length: maxRating }).map((_, i) => {
        const starValue = i + 1;
        const isFilled = starValue <= displayRating;
        return (
          <motion.button key={i} type="button" initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: i * 0.05, type: "spring", stiffness: 500 }}
            whileHover={interactive ? { scale: 1.2 } : {}} whileTap={interactive ? { scale: 0.9 } : {}}
            disabled={!interactive} onClick={() => interactive && onChange?.(starValue)}
            onMouseEnter={() => interactive && setHoverRating(starValue)} onMouseLeave={() => interactive && setHoverRating(0)}
            className={cn("focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded", interactive ? "cursor-pointer" : "cursor-default")}>
            <Star className={cn(iconSizes[size], "transition-colors duration-200", isFilled ? "text-warning fill-warning" : "text-muted-foreground/30")} />
          </motion.button>
        );
      })}
      {showValue && <span className={cn("ml-1.5 font-medium text-muted-foreground", textSizes[size])}>{rating.toFixed(1)}</span>}
    </div>
  );
}

// SecurityScore
interface SecurityScoreProps { score: number; size?: "sm" | "default" | "lg"; showLabel?: boolean; className?: string; }

export function SecurityScore({ score, size = "default", showLabel = true, className }: SecurityScoreProps) {
  const clampedScore = Math.min(100, Math.max(0, score));
  const getLevel = (val: number) => {
    if (val >= 80) return { label: "Excelente", color: "text-success", bg: "bg-success/10", border: "border-success/20" };
    if (val >= 60) return { label: "Bom", color: "text-info", bg: "bg-info/10", border: "border-info/20" };
    if (val >= 40) return { label: "Moderado", color: "text-warning", bg: "bg-warning/10", border: "border-warning/20" };
    return { label: "Crítico", color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/20" };
  };
  const level = getLevel(clampedScore);
  const iconSizes = { sm: "h-4 w-4", default: "h-5 w-5", lg: "h-6 w-6" };
  const textSizes = { sm: "text-xs", default: "text-sm", lg: "text-base" };
  const paddings = { sm: "p-2", default: "p-3", lg: "p-4" };
  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
      className={cn("inline-flex items-center gap-2 rounded-lg border", level.bg, level.border, level.color, paddings[size], className)}>
      <Shield className={iconSizes[size]} />
      <div className="flex flex-col">
        <span className={cn("font-bold", textSizes[size])}>{clampedScore}%</span>
        {showLabel && <span className={cn("opacity-75", size === "sm" ? "text-[10px]" : "text-xs")}>{level.label}</span>}
      </div>
    </motion.div>
  );
}

// AnimatedCounter
interface AnimatedCounterProps { value: number; duration?: number; prefix?: string; suffix?: string; decimals?: number; className?: string; }

export function AnimatedCounter({ value, duration = 1000, prefix = "", suffix = "", decimals = 0, className }: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = React.useState(0);
  const previousValue = React.useRef(0);
  React.useEffect(() => {
    const startValue = previousValue.current;
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = startValue + (value - startValue) * eased;
      setDisplayValue(current);
      if (progress < 1) requestAnimationFrame(animate);
      else previousValue.current = value;
    };
    requestAnimationFrame(animate);
  }, [value, duration]);
  const formattedValue = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(displayValue);
  return <span className={className}>{prefix}{formattedValue}{suffix}</span>;
}

// ConnectionStatus
interface ConnectionStatusProps { status: 'online' | 'offline' | 'connecting' | 'error'; showLabel?: boolean; size?: 'sm' | 'default' | 'lg'; className?: string; }

const connectionConfigs = {
  online: { label: 'Online', color: 'bg-success', textColor: 'text-success' },
  offline: { label: 'Offline', color: 'bg-muted-foreground', textColor: 'text-muted-foreground' },
  connecting: { label: 'Conectando...', color: 'bg-warning', textColor: 'text-warning' },
  error: { label: 'Erro de conexão', color: 'bg-destructive', textColor: 'text-destructive' },
};

export function ConnectionStatus({ status, showLabel = true, size = 'default', className }: ConnectionStatusProps) {
  const config = connectionConfigs[status];
  const dotSizes = { sm: 'w-1.5 h-1.5', default: 'w-2 h-2', lg: 'w-2.5 h-2.5' };
  const textSizes = { sm: 'text-[10px]', default: 'text-xs', lg: 'text-sm' };
  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      <span className="relative flex">
        <span className={cn("rounded-full", dotSizes[size], config.color)} />
        {(status === 'online' || status === 'connecting') && <span className={cn("absolute inline-flex rounded-full opacity-75 animate-ping", dotSizes[size], config.color)} />}
      </span>
      {showLabel && <span className={cn("font-medium", textSizes[size], config.textColor)}>{config.label}</span>}
    </div>
  );
}

// SLAStatus
interface SLAStatusProps { daysRemaining: number; totalDays: number; showProgress?: boolean; size?: 'sm' | 'default' | 'lg'; className?: string; }

export function SLAStatus({ daysRemaining, totalDays, showProgress = true, size = 'default', className }: SLAStatusProps) {
  const percentage = ((totalDays - daysRemaining) / totalDays) * 100;
  const isOverdue = daysRemaining < 0;
  const isWarning = daysRemaining <= 3 && daysRemaining >= 0;
  const getColor = () => {
    if (isOverdue) return { bg: 'bg-destructive', text: 'text-destructive', badge: 'bg-destructive/10' };
    if (isWarning) return { bg: 'bg-warning', text: 'text-warning', badge: 'bg-warning/10' };
    return { bg: 'bg-success', text: 'text-success', badge: 'bg-success/10' };
  };
  const colors = getColor();
  const textSizes = { sm: 'text-xs', default: 'text-sm', lg: 'text-base' };
  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center justify-between">
        <span className={cn("font-medium", textSizes[size], colors.text)}>
          {isOverdue ? <>Atrasado {Math.abs(daysRemaining)} dia{Math.abs(daysRemaining) !== 1 ? 's' : ''}</> : <>{daysRemaining} dia{daysRemaining !== 1 ? 's' : ''} restante{daysRemaining !== 1 ? 's' : ''}</>}
        </span>
        <Badge variant="outline" className={cn(colors.badge, colors.text, "border-0")}>
          {isOverdue ? 'Atrasado' : isWarning ? 'Urgente' : 'No Prazo'}
        </Badge>
      </div>
      {showProgress && (
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(percentage, 100)}%` }} transition={{ duration: 0.5 }} className={cn("h-full rounded-full", colors.bg)} />
        </div>
      )}
    </div>
  );
}

// SyncStatus
interface SyncStatusProps { lastSynced?: Date; isSyncing?: boolean; hasError?: boolean; size?: 'sm' | 'default' | 'lg'; className?: string; }

export function SyncStatus({ lastSynced, isSyncing = false, hasError = false, size = 'default', className }: SyncStatusProps) {
  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'agora mesmo';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}min atrás`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h atrás`;
    return `${Math.floor(seconds / 86400)}d atrás`;
  };
  const iconSizes = { sm: 'h-3 w-3', default: 'h-4 w-4', lg: 'h-5 w-5' };
  const textSizes = { sm: 'text-[10px]', default: 'text-xs', lg: 'text-sm' };
  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      {isSyncing ? (
        <><Loader2 className={cn(iconSizes[size], "animate-spin text-info")} /><span className={cn(textSizes[size], "text-info")}>Sincronizando...</span></>
      ) : hasError ? (
        <><XCircle className={cn(iconSizes[size], "text-destructive")} /><span className={cn(textSizes[size], "text-destructive")}>Erro ao sincronizar</span></>
      ) : (
        <><CheckCircle2 className={cn(iconSizes[size], "text-success")} /><span className={cn(textSizes[size], "text-muted-foreground")}>Sincronizado {lastSynced ? getTimeAgo(lastSynced) : ''}</span></>
      )}
    </div>
  );
}
