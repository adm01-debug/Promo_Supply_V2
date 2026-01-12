import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  Loader2,
  Package,
  FileText,
  Users,
  CreditCard,
  BarChart3,
  ShoppingCart,
  Building2,
  ClipboardList
} from 'lucide-react';

// ============================================
// CONTEXTUAL SKELETON TYPES
// ============================================
type SkeletonType = 
  | 'card'
  | 'table'
  | 'list'
  | 'kpi'
  | 'chart'
  | 'form'
  | 'profile'
  | 'kanban';

// ============================================
// SHIMMER EFFECT
// ============================================
const shimmer = `
  relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full 
  before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r 
  before:from-transparent before:via-white/20 before:to-transparent
`;

// ============================================
// PULSE DOT LOADER
// ============================================
export const PulseDotLoader: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2.5 h-2.5 rounded-full bg-primary"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.15,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};

// ============================================
// CIRCULAR PROGRESS
// ============================================
interface CircularProgressProps {
  progress?: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  showPercentage?: boolean;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  progress,
  size = 60,
  strokeWidth = 4,
  className,
  showPercentage = true,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const isIndeterminate = progress === undefined;
  const offset = isIndeterminate ? 0 : circumference - (progress / 100) * circumference;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className={isIndeterminate ? "animate-spin" : ""}>
        {/* Background circle */}
        <circle
          className="text-muted stroke-current"
          strokeWidth={strokeWidth}
          fill="none"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Progress circle */}
        <motion.circle
          className="text-primary stroke-current"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: isIndeterminate ? circumference * 0.75 : offset,
            transformOrigin: '50% 50%',
            transform: 'rotate(-90deg)',
          }}
          initial={!isIndeterminate ? { strokeDashoffset: circumference } : undefined}
          animate={!isIndeterminate ? { strokeDashoffset: offset } : undefined}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </svg>
      {showPercentage && !isIndeterminate && (
        <span className="absolute text-sm font-medium">{Math.round(progress!)}%</span>
      )}
    </div>
  );
};

// ============================================
// SKELETON BASE
// ============================================
interface SkeletonProps {
  className?: string;
  animated?: boolean;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
  className, 
  style,
  animated = true 
}) => {
  return (
    <div
      style={style}
      className={cn(
        "bg-muted rounded",
        animated && shimmer,
        className
      )}
    />
  );
};

// ============================================
// KPI CARD SKELETON
// ============================================
export const KpiCardSkeleton: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={cn("p-6 rounded-xl border bg-card", className)}>
      <div className="flex items-start justify-between mb-4">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-8 w-32 mb-2" />
      <Skeleton className="h-4 w-24" />
    </div>
  );
};

// ============================================
// TABLE SKELETON
// ============================================
interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({
  rows = 5,
  columns = 4,
  className,
}) => {
  return (
    <div className={cn("rounded-lg border overflow-hidden", className)}>
      {/* Header */}
      <div className="bg-muted/50 border-b p-4">
        <div className="flex gap-4">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton 
              key={i} 
              className="h-4" 
              style={{ width: `${100 / columns}%` }}
            />
          ))}
        </div>
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="border-b last:border-0 p-4">
          <div className="flex gap-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton 
                key={colIndex} 
                className="h-4" 
                style={{ width: `${100 / columns}%` }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// ============================================
// LIST SKELETON
// ============================================
interface ListSkeletonProps {
  items?: number;
  withAvatar?: boolean;
  withAction?: boolean;
  className?: string;
}

export const ListSkeleton: React.FC<ListSkeletonProps> = ({
  items = 5,
  withAvatar = true,
  withAction = false,
  className,
}) => {
  return (
    <div className={cn("space-y-4", className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 rounded-lg border">
          {withAvatar && <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          {withAction && <Skeleton className="h-8 w-20 rounded-md" />}
        </div>
      ))}
    </div>
  );
};

// ============================================
// CHART SKELETON
// ============================================
interface ChartSkeletonProps {
  type?: 'bar' | 'line' | 'pie' | 'area';
  className?: string;
}

export const ChartSkeleton: React.FC<ChartSkeletonProps> = ({
  type = 'bar',
  className,
}) => {
  if (type === 'pie') {
    return (
      <div className={cn("flex items-center justify-center p-8", className)}>
        <Skeleton className="h-48 w-48 rounded-full" />
      </div>
    );
  }

  return (
    <div className={cn("p-6 rounded-xl border bg-card", className)}>
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>
      
      <div className="h-64 flex items-end gap-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <motion.div
            key={i}
            className="flex-1 bg-muted rounded-t"
            initial={{ height: 0 }}
            animate={{ height: `${20 + Math.random() * 80}%` }}
            transition={{ duration: 0.5, delay: i * 0.05 }}
          />
        ))}
      </div>
    </div>
  );
};

// ============================================
// KANBAN SKELETON
// ============================================
interface KanbanSkeletonProps {
  columns?: number;
  cardsPerColumn?: number;
  className?: string;
}

export const KanbanSkeleton: React.FC<KanbanSkeletonProps> = ({
  columns = 4,
  cardsPerColumn = 3,
  className,
}) => {
  return (
    <div className={cn("flex gap-4 overflow-x-auto pb-4", className)}>
      {Array.from({ length: columns }).map((_, colIndex) => (
        <div key={colIndex} className="flex-shrink-0 w-72">
          {/* Column Header */}
          <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-muted/50">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-5 rounded-full ml-auto" />
          </div>
          
          {/* Cards */}
          <div className="space-y-3">
            {Array.from({ length: cardsPerColumn }).map((_, cardIndex) => (
              <div 
                key={cardIndex}
                className="p-4 rounded-lg border bg-card"
              >
                <Skeleton className="h-4 w-full mb-3" />
                <Skeleton className="h-3 w-3/4 mb-4" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-6 rounded-full" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// ============================================
// FORM SKELETON
// ============================================
interface FormSkeletonProps {
  fields?: number;
  className?: string;
}

export const FormSkeleton: React.FC<FormSkeletonProps> = ({
  fields = 4,
  className,
}) => {
  return (
    <div className={cn("space-y-6", className)}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      ))}
      <div className="flex gap-3 pt-4">
        <Skeleton className="h-10 w-24 rounded-md" />
        <Skeleton className="h-10 w-20 rounded-md" />
      </div>
    </div>
  );
};

// ============================================
// PROFILE SKELETON
// ============================================
export const ProfileSkeleton: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={cn("p-6 rounded-xl border bg-card", className)}>
      <div className="flex items-center gap-4 mb-6">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================
// CONTEXTUAL LOADER
// ============================================
interface ContextualLoaderProps {
  context: 'pedidos' | 'fornecedores' | 'pagamentos' | 'relatorios' | 'solicitacoes' | 'dashboard';
  message?: string;
  className?: string;
}

const contextConfig = {
  pedidos: {
    icon: Package,
    message: "Carregando pedidos...",
    color: "text-blue-500",
  },
  fornecedores: {
    icon: Building2,
    message: "Carregando fornecedores...",
    color: "text-emerald-500",
  },
  pagamentos: {
    icon: CreditCard,
    message: "Carregando pagamentos...",
    color: "text-purple-500",
  },
  relatorios: {
    icon: BarChart3,
    message: "Gerando relatório...",
    color: "text-amber-500",
  },
  solicitacoes: {
    icon: ClipboardList,
    message: "Carregando solicitações...",
    color: "text-cyan-500",
  },
  dashboard: {
    icon: BarChart3,
    message: "Carregando dashboard...",
    color: "text-primary",
  },
};

export const ContextualLoader: React.FC<ContextualLoaderProps> = ({
  context,
  message,
  className,
}) => {
  const config = contextConfig[context];
  const Icon = config.icon;

  return (
    <motion.div
      className={cn(
        "flex flex-col items-center justify-center py-12",
        className
      )}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className={cn("mb-4", config.color)}
        animate={{ 
          y: [0, -10, 0],
          rotate: [0, 5, -5, 0]
        }}
        transition={{ 
          duration: 2, 
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <Icon className="w-12 h-12" />
      </motion.div>
      
      <PulseDotLoader className="mb-4" />
      
      <p className="text-muted-foreground text-sm">
        {message || config.message}
      </p>
    </motion.div>
  );
};

// ============================================
// LOADING OVERLAY
// ============================================
interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  blur?: boolean;
  className?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  message = "Carregando...",
  blur = true,
  className,
}) => {
  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          className={cn(
            "absolute inset-0 z-50 flex items-center justify-center",
            blur && "backdrop-blur-sm",
            "bg-background/60",
            className
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="flex flex-col items-center gap-4 p-6 rounded-xl bg-card shadow-lg">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm font-medium">{message}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ============================================
// PROGRESS BAR
// ============================================
interface ProgressBarProps {
  progress: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'success' | 'warning' | 'destructive';
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  showLabel = true,
  size = 'md',
  color = 'primary',
  className,
}) => {
  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  const colorClasses = {
    primary: 'bg-primary',
    success: 'bg-green-500',
    warning: 'bg-amber-500',
    destructive: 'bg-destructive',
  };

  return (
    <div className={cn("w-full", className)}>
      {showLabel && (
        <div className="flex justify-between mb-1">
          <span className="text-sm text-muted-foreground">Progresso</span>
          <span className="text-sm font-medium">{Math.round(progress)}%</span>
        </div>
      )}
      <div className={cn("w-full bg-muted rounded-full overflow-hidden", sizeClasses[size])}>
        <motion.div
          className={cn("h-full rounded-full", colorClasses[color])}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
    </div>
  );
};

// ============================================
// STEP PROGRESS
// ============================================
interface Step {
  label: string;
  description?: string;
}

interface StepProgressProps {
  steps: Step[];
  currentStep: number;
  className?: string;
}

export const StepProgress: React.FC<StepProgressProps> = ({
  steps,
  currentStep,
  className,
}) => {
  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;

          return (
            <React.Fragment key={index}>
              {/* Step Circle */}
              <div className="flex flex-col items-center">
                <motion.div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center font-medium",
                    "border-2 transition-colors",
                    isCompleted && "bg-primary border-primary text-primary-foreground",
                    isCurrent && "border-primary text-primary",
                    !isCompleted && !isCurrent && "border-muted text-muted-foreground"
                  )}
                  animate={{
                    scale: isCurrent ? [1, 1.1, 1] : 1,
                  }}
                  transition={{ duration: 0.5, repeat: isCurrent ? Infinity : 0 }}
                >
                  {isCompleted ? '✓' : index + 1}
                </motion.div>
                <div className="mt-2 text-center">
                  <p className={cn(
                    "text-sm font-medium",
                    (isCompleted || isCurrent) ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {step.label}
                  </p>
                  {step.description && (
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  )}
                </div>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="flex-1 h-0.5 mx-2 bg-muted relative">
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: isCompleted ? '100%' : '0%' }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
