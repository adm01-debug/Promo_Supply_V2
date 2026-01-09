import * as React from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Circle, AlertCircle, ChevronRight, Sparkles, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

// Types
export interface FormStep {
  id: string;
  label: string;
  description?: string;
  optional?: boolean;
  icon?: React.ElementType;
}

interface StepperProps {
  steps: FormStep[];
  currentStep: number;
  completedSteps?: number[];
  errorSteps?: number[];
  orientation?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'pills' | 'minimal' | 'numbered';
  onStepClick?: (stepIndex: number) => void;
  className?: string;
}

interface FormProgressBarProps {
  totalFields: number;
  filledFields: number;
  showPercentage?: boolean;
  showLabel?: boolean;
  variant?: 'default' | 'gradient' | 'segmented';
  className?: string;
}

interface MultiStepFormProps {
  steps: FormStep[];
  currentStep: number;
  children: React.ReactNode;
  onNext?: () => void;
  onPrevious?: () => void;
  onComplete?: () => void;
  isLastStep?: boolean;
  isFirstStep?: boolean;
  className?: string;
}

// Stepper Component
export function Stepper({
  steps,
  currentStep,
  completedSteps = [],
  errorSteps = [],
  orientation = 'horizontal',
  size = 'md',
  variant = 'default',
  onStepClick,
  className
}: StepperProps) {
  const sizeClasses = {
    sm: { circle: 'h-6 w-6 text-xs', line: 'h-0.5', label: 'text-xs', icon: 'w-3 h-3' },
    md: { circle: 'h-8 w-8 text-sm', line: 'h-0.5', label: 'text-sm', icon: 'w-4 h-4' },
    lg: { circle: 'h-10 w-10 text-base', line: 'h-1', label: 'text-base', icon: 'w-5 h-5' }
  };

  const sizes = sizeClasses[size];
  const isHorizontal = orientation === 'horizontal';

  // Pills variant
  if (variant === 'pills') {
    return (
      <div className={cn("flex gap-2 flex-wrap", className)}>
        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(index);
          const isError = errorSteps.includes(index);
          const isCurrent = index === currentStep;
          const isClickable = onStepClick && (isCompleted || index <= currentStep);
          const StepIcon = step.icon;

          return (
            <motion.button
              key={step.id}
              type="button"
              onClick={() => isClickable && onStepClick?.(index)}
              disabled={!isClickable}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                "border",
                isCompleted && "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400",
                isError && "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400",
                isCurrent && !isCompleted && !isError && "bg-primary/10 border-primary/30 text-primary",
                !isCurrent && !isCompleted && !isError && "bg-muted/50 border-transparent text-muted-foreground",
                isClickable && "cursor-pointer hover:scale-105",
                !isClickable && "cursor-default"
              )}
              whileHover={isClickable ? { scale: 1.02 } : undefined}
              whileTap={isClickable ? { scale: 0.98 } : undefined}
            >
              {isCompleted ? (
                <Check className="w-3.5 h-3.5" />
              ) : isError ? (
                <AlertCircle className="w-3.5 h-3.5" />
              ) : StepIcon ? (
                <StepIcon className="w-3.5 h-3.5" />
              ) : (
                <span className="w-4 text-center">{index + 1}</span>
              )}
              <span>{step.label}</span>
              {step.optional && (
                <Badge variant="outline" className="text-[10px] px-1 py-0 ml-1">
                  Opcional
                </Badge>
              )}
            </motion.button>
          );
        })}
      </div>
    );
  }

  // Minimal variant
  if (variant === 'minimal') {
    return (
      <div className={cn("flex items-center gap-4", className)}>
        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(index);
          const isCurrent = index === currentStep;

          return (
            <React.Fragment key={step.id}>
              <motion.div
                className={cn(
                  "flex items-center gap-2 text-sm",
                  isCurrent && "font-medium text-foreground",
                  isCompleted && "text-emerald-600 dark:text-emerald-400",
                  !isCurrent && !isCompleted && "text-muted-foreground"
                )}
                animate={{ opacity: isCurrent ? 1 : 0.7 }}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Circle className={cn("w-4 h-4", isCurrent && "fill-primary text-primary")} />
                )}
                <span>{step.label}</span>
              </motion.div>
              {index < steps.length - 1 && (
                <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  }

  // Default and numbered variants
  return (
    <div className={cn(
      "flex gap-2",
      isHorizontal ? "flex-row items-center" : "flex-col",
      className
    )}>
      {steps.map((step, index) => {
        const isCompleted = completedSteps.includes(index);
        const isError = errorSteps.includes(index);
        const isCurrent = index === currentStep;
        const isClickable = onStepClick && (isCompleted || index <= currentStep);
        const StepIcon = step.icon;

        return (
          <React.Fragment key={step.id}>
            {/* Step */}
            <div 
              className={cn(
                "flex items-center gap-3",
                isHorizontal ? "flex-col" : "flex-row",
                isClickable && "cursor-pointer group"
              )}
              onClick={() => isClickable && onStepClick?.(index)}
            >
              {/* Circle */}
              <motion.div
                initial={false}
                animate={{
                  scale: isCurrent ? 1.1 : 1,
                  backgroundColor: isCompleted 
                    ? 'hsl(var(--kpi-success))' 
                    : isError 
                      ? 'hsl(var(--kpi-danger))' 
                      : isCurrent 
                        ? 'hsl(var(--primary))' 
                        : 'transparent'
                }}
                className={cn(
                  sizes.circle,
                  "rounded-full flex items-center justify-center font-medium transition-all duration-300 relative",
                  "border-2",
                  isCompleted 
                    ? "border-emerald-500 text-white" 
                    : isError 
                      ? "border-red-500 text-white" 
                      : isCurrent 
                        ? "border-primary text-primary-foreground shadow-lg shadow-primary/25" 
                        : "border-muted-foreground/30 text-muted-foreground group-hover:border-muted-foreground/50"
                )}
              >
                {/* Pulsing ring for current step */}
                {isCurrent && (
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-primary"
                    animate={{ scale: [1, 1.3], opacity: [0.5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                )}
                
                <AnimatePresence mode="wait">
                  {isCompleted ? (
                    <motion.div
                      key="check"
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 25 }}
                    >
                      <Check className={sizes.icon} />
                    </motion.div>
                  ) : isError ? (
                    <motion.div
                      key="error"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                    >
                      <AlertCircle className={sizes.icon} />
                    </motion.div>
                  ) : StepIcon && variant === 'default' ? (
                    <motion.div
                      key="icon"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <StepIcon className={sizes.icon} />
                    </motion.div>
                  ) : (
                    <motion.span
                      key="number"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      {index + 1}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Label */}
              <div className={cn(
                "text-center transition-colors",
                isHorizontal ? "max-w-[100px]" : ""
              )}>
                <div className={cn(
                  sizes.label,
                  "font-medium",
                  isCurrent ? "text-foreground" : "text-muted-foreground group-hover:text-foreground/70"
                )}>
                  {step.label}
                  {step.optional && (
                    <span className="text-muted-foreground/60 ml-1 text-xs">(opcional)</span>
                  )}
                </div>
                {step.description && !isHorizontal && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {step.description}
                  </div>
                )}
              </div>
            </div>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div className={cn(
                "flex-1 relative",
                isHorizontal ? "min-w-[40px]" : "ml-4 min-h-[24px]"
              )}>
                <div className={cn(
                  "absolute bg-muted-foreground/20 rounded-full",
                  isHorizontal 
                    ? cn(sizes.line, "w-full top-1/2 -translate-y-1/2")
                    : "w-0.5 h-full left-0"
                )} />
                <motion.div
                  initial={false}
                  animate={{ 
                    [isHorizontal ? 'width' : 'height']: 
                      completedSteps.includes(index) ? '100%' : '0%'
                  }}
                  transition={{ duration: 0.3 }}
                  className={cn(
                    "absolute bg-gradient-to-r from-emerald-500 to-primary rounded-full",
                    isHorizontal 
                      ? cn(sizes.line, "top-1/2 -translate-y-1/2")
                      : "w-0.5 left-0"
                  )}
                />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// Form Progress Bar Component
export function FormProgressBar({
  totalFields,
  filledFields,
  showPercentage = true,
  showLabel = true,
  variant = 'default',
  className
}: FormProgressBarProps) {
  const percentage = totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0;
  
  const getProgressColor = () => {
    if (percentage < 33) return 'from-red-500 to-orange-500';
    if (percentage < 66) return 'from-amber-500 to-yellow-500';
    if (percentage < 100) return 'from-emerald-500 to-teal-500';
    return 'from-emerald-500 to-cyan-500';
  };

  // Segmented variant
  if (variant === 'segmented') {
    return (
      <div className={cn("space-y-2", className)}>
        {showLabel && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-medium text-foreground">{filledFields}/{totalFields}</span>
          </div>
        )}
        <div className="flex gap-1">
          {Array.from({ length: totalFields }, (_, i) => (
            <motion.div
              key={i}
              className={cn(
                "h-2 flex-1 rounded-full transition-colors",
                i < filledFields ? "bg-primary" : "bg-muted"
              )}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: i * 0.05 }}
            />
          ))}
        </div>
      </div>
    );
  }

  // Gradient variant
  if (variant === 'gradient') {
    return (
      <div className={cn("space-y-2", className)}>
        {showLabel && (
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Progresso</span>
              {percentage === 100 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                >
                  <Sparkles className="w-4 h-4 text-amber-500" />
                </motion.div>
              )}
            </div>
            {showPercentage && (
              <motion.span 
                key={percentage}
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "font-bold",
                  percentage === 100 ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
                )}
              >
                {percentage}%
              </motion.span>
            )}
          </div>
        )}
        <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className={cn("h-full rounded-full bg-gradient-to-r", getProgressColor())}
          />
          {/* Shimmer effect */}
          {percentage > 0 && percentage < 100 && (
            <motion.div
              className="absolute inset-y-0 w-12 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              animate={{ x: ['-100%', '400%'] }}
              transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
              style={{ left: 0 }}
            />
          )}
        </div>
        {showLabel && (
          <div className="text-xs text-muted-foreground">
            {filledFields} de {totalFields} campos preenchidos
            {percentage === 100 && (
              <span className="ml-2 text-emerald-600 dark:text-emerald-400 font-medium">
                ✓ Completo!
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  // Default variant
  return (
    <div className={cn("space-y-2", className)}>
      {showLabel && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Progresso do formulário
          </span>
          {showPercentage && (
            <motion.span 
              key={percentage}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-medium text-foreground"
            >
              {percentage}%
            </motion.span>
          )}
        </div>
      )}
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={cn(
            "h-full rounded-full transition-colors",
            percentage < 33 && "bg-red-500",
            percentage >= 33 && percentage < 66 && "bg-amber-500",
            percentage >= 66 && "bg-emerald-500"
          )}
        />
      </div>
      {showLabel && (
        <div className="text-xs text-muted-foreground">
          {filledFields} de {totalFields} campos preenchidos
        </div>
      )}
    </div>
  );
}

// Hook to track form field completion
export function useFormProgress<T extends Record<string, any>>(
  formValues: T,
  requiredFields: (keyof T)[]
) {
  return React.useMemo(() => {
    const totalFields = requiredFields.length;
    const filledFields = requiredFields.filter(field => {
      const value = formValues[field];
      if (value === null || value === undefined) return false;
      if (typeof value === 'string') return value.trim() !== '';
      if (Array.isArray(value)) return value.length > 0;
      return true;
    }).length;

    return {
      totalFields,
      filledFields,
      percentage: totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0,
      isComplete: filledFields === totalFields
    };
  }, [formValues, requiredFields]);
}

// Multi-Step Form Container
export function MultiStepForm({
  steps,
  currentStep,
  children,
  className
}: MultiStepFormProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Stepper */}
      <Stepper
        steps={steps}
        currentStep={currentStep}
        completedSteps={Array.from({ length: currentStep }, (_, i) => i)}
      />

      {/* Form Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// Compact Step Indicator (for mobile or limited space)
export function CompactStepIndicator({
  currentStep,
  totalSteps,
  variant = 'dots',
  className
}: {
  currentStep: number;
  totalSteps: number;
  variant?: 'dots' | 'bar' | 'fraction';
  className?: string;
}) {
  if (variant === 'bar') {
    const percentage = ((currentStep + 1) / totalSteps) * 100;
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <span className="text-xs text-muted-foreground font-medium">
          {currentStep + 1}/{totalSteps}
        </span>
      </div>
    );
  }

  if (variant === 'fraction') {
    return (
      <motion.div 
        className={cn("flex items-center gap-1 text-sm", className)}
        key={currentStep}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <span className="text-2xl font-bold text-primary">{currentStep + 1}</span>
        <span className="text-muted-foreground">/</span>
        <span className="text-muted-foreground">{totalSteps}</span>
      </motion.div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex items-center gap-1">
        {Array.from({ length: totalSteps }, (_, i) => (
          <motion.div
            key={i}
            initial={false}
            animate={{
              backgroundColor: i <= currentStep 
                ? 'hsl(var(--primary))' 
                : 'hsl(var(--muted))',
              scale: i === currentStep ? 1.2 : 1
            }}
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              i === currentStep ? "w-6" : "w-2"
            )}
          />
        ))}
      </div>
      <span className="text-xs text-muted-foreground">
        {currentStep + 1}/{totalSteps}
      </span>
    </div>
  );
}

// Circular Progress for steps
export function CircularStepProgress({
  currentStep,
  totalSteps,
  size = 48,
  strokeWidth = 4,
  className
}: {
  currentStep: number;
  totalSteps: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = ((currentStep + 1) / totalSteps) * 100;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{ strokeDasharray: circumference }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold">{currentStep + 1}/{totalSteps}</span>
      </div>
    </div>
  );
}

// Saving indicator
export function FormSavingIndicator({
  status,
  className
}: {
  status: 'idle' | 'saving' | 'saved' | 'error';
  className?: string;
}) {
  return (
    <AnimatePresence mode="wait">
      {status !== 'idle' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={cn(
            "flex items-center gap-2 text-xs font-medium",
            status === 'saving' && "text-muted-foreground",
            status === 'saved' && "text-emerald-600 dark:text-emerald-400",
            status === 'error' && "text-red-600 dark:text-red-400",
            className
          )}
        >
          {status === 'saving' && (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Salvando...</span>
            </>
          )}
          {status === 'saved' && (
            <>
              <Check className="w-3 h-3" />
              <span>Salvo</span>
            </>
          )}
          {status === 'error' && (
            <>
              <AlertCircle className="w-3 h-3" />
              <span>Erro ao salvar</span>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default Stepper;
