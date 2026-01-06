import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";

interface TourStep {
  target: string; // CSS selector
  title: string;
  content: string;
  position?: "top" | "bottom" | "left" | "right";
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface OnboardingTourProps {
  steps: TourStep[];
  isOpen: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

export const OnboardingTour = ({ steps, isOpen, onComplete, onSkip }: OnboardingTourProps) => {
  const [currentStep, setCurrentStep] = React.useState(0);
  const [tooltipPosition, setTooltipPosition] = React.useState({ top: 0, left: 0 });
  const [highlightRect, setHighlightRect] = React.useState<DOMRect | null>(null);

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  React.useEffect(() => {
    if (!isOpen || !step) return;

    const targetElement = document.querySelector(step.target);
    if (!targetElement) return;

    // Scroll target into view
    targetElement.scrollIntoView({ behavior: "smooth", block: "center" });

    // Get target position
    const rect = targetElement.getBoundingClientRect();
    setHighlightRect(rect);

    // Calculate tooltip position
    const padding = 16;
    let top = rect.bottom + padding;
    let left = rect.left + rect.width / 2;

    if (step.position === "top") {
      top = rect.top - padding - 200;
    } else if (step.position === "left") {
      left = rect.left - padding - 300;
      top = rect.top + rect.height / 2 - 100;
    } else if (step.position === "right") {
      left = rect.right + padding;
      top = rect.top + rect.height / 2 - 100;
    }

    setTooltipPosition({ top, left });
  }, [isOpen, step, currentStep]);

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop Overlay */}
      <div className="fixed inset-0 z-[9998] bg-background/80 backdrop-blur-sm" />

      {/* Highlight Cutout */}
      {highlightRect && (
        <div
          className="fixed z-[9999] rounded-lg ring-4 ring-primary ring-offset-4 ring-offset-background animate-pulse-ring pointer-events-none"
          style={{
            top: highlightRect.top - 4,
            left: highlightRect.left - 4,
            width: highlightRect.width + 8,
            height: highlightRect.height + 8,
          }}
        />
      )}

      {/* Tooltip */}
      <div
        className="fixed z-[10000] w-80 bg-card rounded-xl border shadow-xl animate-scale-in"
        style={{
          top: tooltipPosition.top,
          left: tooltipPosition.left,
          transform: "translateX(-50%)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              Passo {currentStep + 1} de {steps.length}
            </span>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onSkip}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          <h3 className="font-semibold text-foreground">{step.title}</h3>
          <p className="text-sm text-muted-foreground">{step.content}</p>
          
          {step.action && (
            <Button size="sm" variant="outline" onClick={step.action.onClick} className="mt-2">
              {step.action.label}
            </Button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="px-4 pb-2">
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-muted/30">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrev}
            disabled={isFirstStep}
            className="gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            Anterior
          </Button>
          <Button size="sm" onClick={handleNext} className="gap-1">
            {isLastStep ? "Concluir" : "Próximo"}
            {!isLastStep && <ChevronRight className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </>
  );
};

// Hook to manage tour state
export const useOnboardingTour = (tourKey: string) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const storageKey = `onboarding-${tourKey}-completed`;

  React.useEffect(() => {
    const completed = localStorage.getItem(storageKey);
    if (!completed) {
      // Delay start for better UX
      const timer = setTimeout(() => setIsOpen(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [storageKey]);

  const complete = () => {
    localStorage.setItem(storageKey, "true");
    setIsOpen(false);
  };

  const skip = () => {
    localStorage.setItem(storageKey, "true");
    setIsOpen(false);
  };

  const restart = () => {
    localStorage.removeItem(storageKey);
    setIsOpen(true);
  };

  return { isOpen, complete, skip, restart };
};

// Predefined tour steps for main features
export const dashboardTourSteps: TourStep[] = [
  {
    target: "[data-tour='sidebar']",
    title: "Menu de Navegação",
    content: "Acesse todas as funcionalidades do sistema através do menu lateral. Os itens são organizados por categoria para facilitar a navegação.",
    position: "right",
  },
  {
    target: "[data-tour='global-search']",
    title: "Busca Global",
    content: "Encontre rapidamente solicitações, fornecedores e pedidos usando a busca global. Use Ctrl+K para abrir a qualquer momento.",
    position: "bottom",
  },
  {
    target: "[data-tour='kpi-cards']",
    title: "Indicadores de Performance",
    content: "Monitore os principais KPIs do setor de compras em tempo real. Clique em cada card para ver detalhes e drill-down.",
    position: "bottom",
  },
  {
    target: "[data-tour='notifications']",
    title: "Central de Notificações",
    content: "Acompanhe alertas importantes, aprovações pendentes e atualizações de pedidos. Nunca perca uma ação crítica!",
    position: "left",
  },
];
