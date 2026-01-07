import * as React from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Circle, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

// Types
export interface FormStep {
  id: string;
  label: string;
  description?: string;
  optional?: boolean;
}

interface StepperProps {
  steps: FormStep[];
  currentStep: number;
  completedSteps?: number[];
  errorSteps?: number[];
  orientation?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md' | 'lg';
  onStepClick?: (stepIndex: number) => void;
  className?: string;
}

interface FormProgressBarProps {
  totalFields: number;
  filledFields: number;
  showPercentage?: boolean;
  showLabel?: boolean;
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
  onStepClick,
  className
}: StepperProps) {
  const sizeClasses = {
    sm: { circle: 'h-6 w-6 text-xs', line: 'h-0.5', label: 'text-xs' },
    md: { circle: 'h-8 w-8 text-sm', line: 'h-0.5', label: 'text-sm' },
    lg: { circle: 'h-10 w-10 text-base', line: 'h-1', label: 'text-base' }
  };

  const sizes = sizeClasses[size];
  const isHorizontal = orientation === 'horizontal';

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

        return (
          <React.Fragment key={step.id}>
            {/* Step */}
            <div 
              className={cn(
                "flex items-center gap-3",
                isHorizontal ? "flex-col" : "flex-row",
                isClickable && "cursor-pointer"
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
                  "rounded-full flex items-center justify-center font-medium transition-all duration-300",
                  "border-2",
                  isCompleted 
                    ? "border-kpi-success text-kpi-success-foreground" 
                    : isError 
                      ? "border-kpi-danger text-kpi-danger-foreground" 
                      : isCurrent 
                        ? "border-primary text-primary-foreground" 
                        : "border-muted-foreground/30 text-muted-foreground"
                )}
              >
                <AnimatePresence mode="wait">
                  {isCompleted ? (
                    <motion.div
                      key="check"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                    >
                      <Check className="h-4 w-4" />
                    </motion.div>
                  ) : isError ? (
                    <motion.div
                      key="error"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                    >
                      <AlertCircle className="h-4 w-4" />
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
                "text-center",
                isHorizontal ? "max-w-[100px]" : ""
              )}>
                <div className={cn(
                  sizes.label,
                  "font-medium",
                  isCurrent ? "text-foreground" : "text-muted-foreground"
                )}>
                  {step.label}
                  {step.optional && (
                    <span className="text-muted-foreground/60 ml-1">(opcional)</span>
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
                  "absolute bg-muted-foreground/20",
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
                    "absolute bg-primary",
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
  className
}: FormProgressBarProps) {
  const percentage = totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0;
  
  const getProgressColor = () => {
    if (percentage < 33) return 'bg-kpi-danger';
    if (percentage < 66) return 'bg-kpi-warning';
    return 'bg-kpi-success';
  };

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
          className={cn("h-full rounded-full transition-colors", getProgressColor())}
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
  className
}: {
  currentStep: number;
  totalSteps: number;
  className?: string;
}) {
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
                : 'hsl(var(--muted))'
            }}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              i === currentStep ? "w-6" : "w-1.5"
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

export default Stepper;
