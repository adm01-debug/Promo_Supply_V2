import { useState, useCallback, ReactNode, createContext, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  AlertCircle,
  Loader2,
  Save,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// ============================================
// TYPES
// ============================================

export interface FormStep {
  id: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  optional?: boolean;
  validate?: (data: Record<string, unknown>) => Promise<Record<string, string> | null>;
  component: ReactNode;
}

export interface MultiStepFormWizardProps {
  steps: FormStep[];
  onComplete: (data: Record<string, unknown>) => Promise<void>;
  onCancel?: () => void;
  onStepChange?: (step: number, data: Record<string, unknown>) => void;
  initialData?: Record<string, unknown>;
  showProgressBar?: boolean;
  allowSkipOptional?: boolean;
  persistDraft?: boolean;
  draftKey?: string;
  className?: string;
}

interface FormContextValue {
  data: Record<string, unknown>;
  errors: Record<string, string>;
  updateField: (field: string, value: unknown) => void;
  updateFields: (fields: Record<string, unknown>) => void;
  setError: (field: string, error: string) => void;
  clearError: (field: string) => void;
  clearAllErrors: () => void;
}

// ============================================
// CONTEXT
// ============================================

const FormContext = createContext<FormContextValue | null>(null);

export const useFormWizard = () => {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error('useFormWizard must be used within a MultiStepFormWizard');
  }
  return context;
};

// ============================================
// STEP INDICATOR
// ============================================

interface StepIndicatorProps {
  steps: FormStep[];
  currentStep: number;
  completedSteps: Set<number>;
  onStepClick?: (step: number) => void;
  variant?: 'dots' | 'numbered' | 'detailed';
}

const StepIndicator = ({ 
  steps, 
  currentStep, 
  completedSteps,
  onStepClick,
  variant = 'detailed'
}: StepIndicatorProps) => {
  if (variant === 'dots') {
    return (
      <div className="flex items-center justify-center gap-2">
        {steps.map((_, index) => (
          <motion.button
            key={index}
            onClick={() => onStepClick?.(index)}
            disabled={!completedSteps.has(index) && index !== currentStep}
            className={cn(
              "w-3 h-3 rounded-full transition-colors",
              index === currentStep && "bg-primary",
              completedSteps.has(index) && index !== currentStep && "bg-primary/50",
              !completedSteps.has(index) && index !== currentStep && "bg-muted"
            )}
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
          />
        ))}
      </div>
    );
  }

  if (variant === 'numbered') {
    return (
      <div className="flex items-center justify-center gap-1">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <motion.button
              onClick={() => onStepClick?.(index)}
              disabled={!completedSteps.has(index) && index !== currentStep}
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                index === currentStep && "bg-primary text-primary-foreground",
                completedSteps.has(index) && index !== currentStep && "bg-primary/20 text-primary",
                !completedSteps.has(index) && index !== currentStep && "bg-muted text-muted-foreground"
              )}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              {completedSteps.has(index) ? (
                <Check className="w-4 h-4" />
              ) : (
                index + 1
              )}
            </motion.button>
            {index < steps.length - 1 && (
              <div className={cn(
                "w-8 h-0.5 mx-1",
                completedSteps.has(index) ? "bg-primary" : "bg-muted"
              )} />
            )}
          </div>
        ))}
      </div>
    );
  }

  // Detailed variant
  return (
    <div className="flex items-center justify-between">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center flex-1">
          <button
            onClick={() => onStepClick?.(index)}
            disabled={!completedSteps.has(index) && index !== currentStep}
            className="flex items-center gap-3 text-left"
          >
            <motion.div
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                index === currentStep && "bg-primary text-primary-foreground",
                completedSteps.has(index) && index !== currentStep && "bg-primary/20 text-primary",
                !completedSteps.has(index) && index !== currentStep && "bg-muted text-muted-foreground"
              )}
              whileHover={{ scale: 1.05 }}
            >
              {completedSteps.has(index) ? (
                <Check className="w-5 h-5" />
              ) : step.icon ? (
                step.icon
              ) : (
                <span className="font-semibold">{index + 1}</span>
              )}
            </motion.div>
            <div className="hidden sm:block">
              <p className={cn(
                "font-medium text-sm",
                index === currentStep ? "text-foreground" : "text-muted-foreground"
              )}>
                {step.title}
              </p>
              {step.description && (
                <p className="text-xs text-muted-foreground">
                  {step.description}
                </p>
              )}
            </div>
          </button>
          {index < steps.length - 1 && (
            <div className={cn(
              "flex-1 h-0.5 mx-4",
              completedSteps.has(index) ? "bg-primary" : "bg-muted"
            )} />
          )}
        </div>
      ))}
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

export const MultiStepFormWizard = ({
  steps,
  onComplete,
  onCancel,
  onStepChange,
  initialData = {},
  showProgressBar = true,
  allowSkipOptional = true,
  persistDraft = false,
  draftKey = 'form_draft',
  className
}: MultiStepFormWizardProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<Record<string, unknown>>(() => {
    if (persistDraft) {
      const saved = localStorage.getItem(draftKey);
      return saved ? { ...JSON.parse(saved), ...initialData } : initialData;
    }
    return initialData;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [direction, setDirection] = useState(0);

  const currentStepData = steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;
  const progress = ((currentStep + 1) / steps.length) * 100;

  // Save draft to localStorage
  const saveDraft = useCallback((newData: Record<string, unknown>) => {
    if (persistDraft) {
      localStorage.setItem(draftKey, JSON.stringify(newData));
    }
  }, [persistDraft, draftKey]);

  // Update single field
  const updateField = useCallback((field: string, value: unknown) => {
    setData(prev => {
      const newData = { ...prev, [field]: value };
      saveDraft(newData);
      return newData;
    });
    // Clear error when field is updated
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [errors, saveDraft]);

  // Update multiple fields
  const updateFields = useCallback((fields: Record<string, unknown>) => {
    setData(prev => {
      const newData = { ...prev, ...fields };
      saveDraft(newData);
      return newData;
    });
  }, [saveDraft]);

  // Error handlers
  const setError = useCallback((field: string, error: string) => {
    setErrors(prev => ({ ...prev, [field]: error }));
  }, []);

  const clearError = useCallback((field: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors({});
  }, []);

  // Validate current step
  const validateStep = useCallback(async (): Promise<boolean> => {
    const step = steps[currentStep];
    if (!step.validate) return true;

    setIsValidating(true);
    try {
      const validationErrors = await step.validate(data);
      if (validationErrors && Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return false;
      }
      return true;
    } catch {
      return false;
    } finally {
      setIsValidating(false);
    }
  }, [currentStep, data, steps]);

  // Navigate to next step
  const goToNextStep = useCallback(async () => {
    const isValid = await validateStep();
    if (!isValid) return;

    setCompletedSteps(prev => new Set([...prev, currentStep]));

    if (isLastStep) {
      setIsSubmitting(true);
      try {
        await onComplete(data);
        if (persistDraft) {
          localStorage.removeItem(draftKey);
        }
      } catch (error) {
        // Handle error
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setDirection(1);
      setCurrentStep(prev => prev + 1);
      onStepChange?.(currentStep + 1, data);
    }
  }, [validateStep, currentStep, isLastStep, data, onComplete, persistDraft, draftKey, onStepChange]);

  // Navigate to previous step
  const goToPreviousStep = useCallback(() => {
    if (isFirstStep) return;
    setDirection(-1);
    setCurrentStep(prev => prev - 1);
    onStepChange?.(currentStep - 1, data);
  }, [isFirstStep, currentStep, data, onStepChange]);

  // Skip optional step
  const skipStep = useCallback(() => {
    if (!currentStepData.optional || !allowSkipOptional) return;
    setDirection(1);
    setCurrentStep(prev => prev + 1);
    onStepChange?.(currentStep + 1, data);
  }, [currentStepData.optional, allowSkipOptional, currentStep, data, onStepChange]);

  // Jump to specific step
  const goToStep = useCallback((step: number) => {
    if (step < 0 || step >= steps.length) return;
    if (!completedSteps.has(step) && step > currentStep) return;
    
    setDirection(step > currentStep ? 1 : -1);
    setCurrentStep(step);
    onStepChange?.(step, data);
  }, [steps.length, completedSteps, currentStep, data, onStepChange]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    if (Object.keys(data).length > Object.keys(initialData).length) {
      setShowExitDialog(true);
    } else {
      onCancel?.();
    }
  }, [data, initialData, onCancel]);

  const confirmExit = useCallback(() => {
    if (persistDraft) {
      localStorage.removeItem(draftKey);
    }
    onCancel?.();
  }, [persistDraft, draftKey, onCancel]);

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 100 : -100,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 100 : -100,
      opacity: 0
    })
  };

  return (
    <FormContext.Provider value={{
      data,
      errors,
      updateField,
      updateFields,
      setError,
      clearError,
      clearAllErrors
    }}>
      <Card className={cn("overflow-hidden", className)}>
        {/* Header with step indicator */}
        <div className="p-6 border-b border-border">
          <StepIndicator
            steps={steps}
            currentStep={currentStep}
            completedSteps={completedSteps}
            onStepClick={goToStep}
          />
          
          {showProgressBar && (
            <Progress value={progress} className="mt-4 h-2" />
          )}
        </div>

        {/* Step content */}
        <div className="relative overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="p-6"
            >
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">
                      {currentStepData.title}
                    </h2>
                    {currentStepData.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {currentStepData.description}
                      </p>
                    )}
                  </div>
                  {currentStepData.optional && (
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                      Opcional
                    </span>
                  )}
                </div>
              </div>

              {/* Error summary */}
              {Object.keys(errors).length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg"
                >
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-medium">Corrija os erros abaixo:</span>
                  </div>
                  <ul className="mt-2 text-sm text-destructive space-y-1">
                    {Object.values(errors).map((error, i) => (
                      <li key={i}>• {error}</li>
                    ))}
                  </ul>
                </motion.div>
              )}

              {currentStepData.component}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer with navigation */}
        <div className="p-6 border-t border-border bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {onCancel && (
                <Button 
                  variant="ghost" 
                  onClick={handleCancel}
                  disabled={isSubmitting}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
              )}
              
              {persistDraft && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Save className="w-3 h-3" />
                  Rascunho salvo automaticamente
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={goToPreviousStep}
                disabled={isFirstStep || isSubmitting}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>

              {currentStepData.optional && allowSkipOptional && !isLastStep && (
                <Button
                  variant="ghost"
                  onClick={skipStep}
                  disabled={isSubmitting}
                >
                  Pular
                </Button>
              )}

              <Button
                onClick={goToNextStep}
                disabled={isSubmitting || isValidating}
              >
                {isSubmitting || isValidating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {isValidating ? 'Validando...' : 'Enviando...'}
                  </>
                ) : isLastStep ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Concluir
                  </>
                ) : (
                  <>
                    Próximo
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Exit confirmation dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deseja sair do formulário?</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem alterações não salvas. Se sair agora, todas as informações 
              preenchidas serão perdidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar editando</AlertDialogCancel>
            <AlertDialogAction onClick={confirmExit}>
              Sair sem salvar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </FormContext.Provider>
  );
};

export { StepIndicator };
