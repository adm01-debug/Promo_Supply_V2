import * as React from 'react';
import { motion } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Step {
  id: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
}

type StepStatus = 'pending' | 'current' | 'completed' | 'error';

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
  orientation?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
  onStepClick?: (stepIndex: number) => void;
  className?: string;
}

const sizeConfig = {
  sm: { circle: 'w-6 h-6', text: 'text-xs', connector: 'h-0.5', gap: 'gap-1' },
  md: { circle: 'w-8 h-8', text: 'text-sm', connector: 'h-0.5', gap: 'gap-2' },
  lg: { circle: 'w-10 h-10', text: 'text-base', connector: 'h-1', gap: 'gap-3' },
};

export function StepIndicator({
  steps,
  currentStep,
  orientation = 'horizontal',
  size = 'md',
  showLabels = true,
  onStepClick,
  className,
}: StepIndicatorProps) {
  const config = sizeConfig[size];

  const getStepStatus = (index: number): StepStatus => {
    if (index < currentStep) return 'completed';
    if (index === currentStep) return 'current';
    return 'pending';
  };

  return (
    <div
      className={cn(
        "flex",
        orientation === 'vertical' ? 'flex-col' : 'flex-row items-center',
        className
      )}
    >
      {steps.map((step, index) => {
        const status = getStepStatus(index);
        const isLast = index === steps.length - 1;
        const isClickable = onStepClick && index <= currentStep;

        return (
          <React.Fragment key={step.id}>
            <div
              className={cn(
                "flex",
                orientation === 'vertical' 
                  ? 'flex-row items-start' 
                  : 'flex-col items-center',
                config.gap
              )}
            >
              {/* Step circle */}
              <motion.button
                type="button"
                onClick={() => isClickable && onStepClick?.(index)}
                disabled={!isClickable}
                className={cn(
                  "rounded-full flex items-center justify-center font-medium transition-all",
                  config.circle,
                  isClickable && "cursor-pointer hover:scale-110",
                  !isClickable && "cursor-default",
                  status === 'completed' && "bg-primary text-primary-foreground",
                  status === 'current' && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                  status === 'pending' && "bg-muted text-muted-foreground",
                  status === 'error' && "bg-destructive text-destructive-foreground"
                )}
                whileTap={isClickable ? { scale: 0.95 } : {}}
              >
                {status === 'completed' ? (
                  <Check className="w-4 h-4" />
                ) : status === 'current' ? (
                  step.icon || <span>{index + 1}</span>
                ) : (
                  <span>{index + 1}</span>
                )}
              </motion.button>

              {/* Labels */}
              {showLabels && (
                <div className={cn(
                  orientation === 'vertical' ? 'ml-3' : 'mt-2 text-center',
                  "min-w-0"
                )}>
                  <p className={cn(
                    "font-medium truncate",
                    config.text,
                    status === 'current' && "text-primary",
                    status === 'pending' && "text-muted-foreground"
                  )}>
                    {step.title}
                  </p>
                  {step.description && (
                    <p className="text-xs text-muted-foreground truncate">
                      {step.description}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Connector */}
            {!isLast && (
              <div
                className={cn(
                  orientation === 'vertical'
                    ? 'w-0.5 h-8 ml-4 my-1'
                    : cn('flex-1 min-w-8', config.connector),
                  "bg-muted relative overflow-hidden"
                )}
              >
                <motion.div
                  className="absolute inset-0 bg-primary origin-left"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: status === 'completed' ? 1 : 0 }}
                  transition={{ duration: 0.3 }}
                  style={{ transformOrigin: orientation === 'vertical' ? 'top' : 'left' }}
                />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// Progress step with loading state
interface ProgressStepProps {
  steps: Step[];
  currentStep: number;
  isLoading?: boolean;
  className?: string;
}

export function ProgressStep({
  steps,
  currentStep,
  isLoading,
  className,
}: ProgressStepProps) {
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Progress bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>

      {/* Current step info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
          ) : (
            <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
              {currentStep + 1}
            </span>
          )}
          <span className="font-medium">{steps[currentStep]?.title}</span>
        </div>
        <span className="text-sm text-muted-foreground">
          {currentStep + 1} de {steps.length}
        </span>
      </div>
    </div>
  );
}
