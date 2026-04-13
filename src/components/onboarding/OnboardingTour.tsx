import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  X, ChevronLeft, ChevronRight, Sparkles, 
  Check, Lightbulb, Rocket, Target, Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSwipeGesture, useHapticFeedback } from "@/hooks/useMobileGestures";
import { useIsMobile } from "@/hooks/use-mobile";
import { Spotlight, StepIndicators, CompletionModal } from "./TourVisualComponents";

export interface TourStep {
  target: string;
  title: string;
  content: string;
  position?: "top" | "bottom" | "left" | "right";
  icon?: React.ElementType;
  highlight?: "primary" | "success" | "warning" | "info";
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

// Visual components (Confetti, Spotlight, StepIndicators, CompletionModal) imported from TourVisualComponents

// CompletionModal is imported from TourVisualComponents

export const OnboardingTour = ({ steps, isOpen, onComplete, onSkip }: OnboardingTourProps) => {
  const [currentStep, setCurrentStep] = React.useState(0);
  const [tooltipPosition, setTooltipPosition] = React.useState({ top: 0, left: 0 });
  const [highlightRect, setHighlightRect] = React.useState<DOMRect | null>(null);
  const [showCompletion, setShowCompletion] = React.useState(false);
  const [direction, setDirection] = React.useState(1); // 1 = forward, -1 = backward
  
  const isMobile = useIsMobile();
  const { lightTap } = useHapticFeedback();

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;
  
  // Swipe handlers for mobile navigation
  const { swipeState, handlers: swipeHandlers } = useSwipeGesture(
    {
      onSwipeLeft: () => {
        if (!isLastStep) {
          lightTap();
          setDirection(1);
          setCurrentStep((prev) => prev + 1);
        } else {
          lightTap();
          setShowCompletion(true);
        }
      },
      onSwipeRight: () => {
        if (!isFirstStep) {
          lightTap();
          setDirection(-1);
          setCurrentStep((prev) => prev - 1);
        }
      },
    },
    { threshold: 50, enabled: isOpen && isMobile }
  );

  React.useEffect(() => {
    if (!isOpen || !step) return;

    const updatePosition = () => {
      const targetElement = document.querySelector(step.target);
      if (!targetElement) {
        // If target not found, show tooltip in center
        setHighlightRect(null);
        setTooltipPosition({ 
          top: window.innerHeight / 2, 
          left: window.innerWidth / 2 
        });
        return;
      }

      // Scroll target into view
      targetElement.scrollIntoView({ behavior: "smooth", block: "center" });

      // Get target position after scroll
      setTimeout(() => {
        const rect = targetElement.getBoundingClientRect();
        setHighlightRect(rect);

        // Calculate tooltip position
        const padding = 20;
        const tooltipWidth = 360;
        const tooltipHeight = 280;
        let top = rect.bottom + padding;
        let left = rect.left + rect.width / 2;

        // Adjust based on position preference
        if (step.position === "top") {
          top = rect.top - padding - tooltipHeight;
        } else if (step.position === "left") {
          left = rect.left - padding - tooltipWidth / 2;
          top = rect.top + rect.height / 2 - tooltipHeight / 2;
        } else if (step.position === "right") {
          left = rect.right + padding + tooltipWidth / 2;
          top = rect.top + rect.height / 2 - tooltipHeight / 2;
        }

        // Keep tooltip in viewport
        const viewportPadding = 16;
        top = Math.max(viewportPadding, Math.min(top, window.innerHeight - tooltipHeight - viewportPadding));
        left = Math.max(tooltipWidth / 2 + viewportPadding, Math.min(left, window.innerWidth - tooltipWidth / 2 - viewportPadding));

        setTooltipPosition({ top, left });
      }, 300);
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [isOpen, step, currentStep]);

  const handleNext = () => {
    if (isLastStep) {
      setShowCompletion(true);
    } else {
      setDirection(1);
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setDirection(-1);
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleStepClick = (index: number) => {
    setDirection(index > currentStep ? 1 : -1);
    setCurrentStep(index);
  };

  const handleCompletionClose = () => {
    setShowCompletion(false);
    onComplete();
  };

  if (!isOpen) return null;

  const stepIcons = [Sparkles, Lightbulb, Target, Zap, Rocket];
  const StepIcon: React.ElementType = step.icon || stepIcons[currentStep % stepIcons.length];

  const tooltipVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 80 : -80,
      opacity: 0,
      scale: 0.92,
      filter: 'blur(8px)',
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      filter: 'blur(0px)',
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -80 : 80,
      opacity: 0,
      scale: 0.92,
      filter: 'blur(8px)',
    }),
  };

  const contentVariants = {
    hidden: { opacity: 0, y: 15, scale: 0.95 },
    visible: (delay: number) => ({
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        delay: delay * 0.08,
        duration: 0.4,
        ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
      },
    }),
  };

  const springTransition = {
    type: 'spring' as const,
    stiffness: 300,
    damping: 30,
    mass: 0.8,
  };

  return (
    <>
      {/* Backdrop Overlay - transparent, spotlight creates its own overlay via box-shadow */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9998] pointer-events-auto" 
        onClick={(e) => e.stopPropagation()}
      />

      {/* Spotlight Highlight */}
      <AnimatePresence mode="wait">
        <Spotlight 
          key={currentStep}
          rect={highlightRect} 
          highlight={step.highlight || "primary"} 
        />
      </AnimatePresence>

      {/* Tooltip with adjacent card previews */}
      <div
        className="fixed z-[10000]"
        style={{
          top: tooltipPosition.top,
          left: tooltipPosition.left,
          transform: 'translateX(-50%)',
        }}
        onTouchStart={(e) => swipeHandlers.onTouchStart(e.nativeEvent)}
        onTouchMove={(e) => swipeHandlers.onTouchMove(e.nativeEvent)}
        onTouchEnd={() => swipeHandlers.onTouchEnd()}
      >
        {/* Previous card preview (shown during swipe right) */}
        {isMobile && !isFirstStep && swipeState.swiping && swipeState.deltaX > 0 && steps[currentStep - 1] && (() => {
          const prevStep = steps[currentStep - 1];
          const prevIndex = currentStep - 1;
          const PrevIcon = prevStep.icon || stepIcons[Math.abs(prevIndex) % stepIcons.length];
          return (
            <motion.div
              initial={{ opacity: 0, x: -100, scale: 0.85 }}
              animate={{ 
                opacity: Math.min(swipeState.deltaX / 100, 0.7),
                x: -380 + swipeState.deltaX * 0.4,
                scale: Math.min(0.85 + (swipeState.deltaX / 500), 1),
              }}
              className="absolute w-[360px] bg-card/80 rounded-2xl border shadow-xl overflow-hidden backdrop-blur-sm"
              style={{ top: 0 }}
            >
              <div className="h-2 bg-gradient-to-r from-primary/50 via-info/50 to-success/50" />
              <div className="p-4 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <PrevIcon className="w-5 h-5 text-primary/70" />
                  </div>
                  <span className="text-xs text-muted-foreground">Passo {currentStep} de {steps.length}</span>
                </div>
                <h3 className="text-lg font-semibold text-foreground/70">{prevStep.title}</h3>
                <p className="text-sm text-muted-foreground/60 line-clamp-2">{prevStep.content}</p>
              </div>
            </motion.div>
          );
        })()}

        {/* Next card preview (shown during swipe left) */}
        {isMobile && !isLastStep && swipeState.swiping && swipeState.deltaX < 0 && steps[currentStep + 1] && (() => {
          const nextStep = steps[currentStep + 1];
          const nextIndex = currentStep + 1;
          const NextIcon = nextStep.icon || stepIcons[nextIndex % stepIcons.length];
          return (
            <motion.div
              initial={{ opacity: 0, x: 100, scale: 0.85 }}
              animate={{ 
                opacity: Math.min(Math.abs(swipeState.deltaX) / 100, 0.7),
                x: 380 + swipeState.deltaX * 0.4,
                scale: Math.min(0.85 + (Math.abs(swipeState.deltaX) / 500), 1),
              }}
              className="absolute w-[360px] bg-card/80 rounded-2xl border shadow-xl overflow-hidden backdrop-blur-sm"
              style={{ top: 0 }}
            >
              <div className="h-2 bg-gradient-to-r from-primary/50 via-info/50 to-success/50" />
              <div className="p-4 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <NextIcon className="w-5 h-5 text-primary/70" />
                  </div>
                  <span className="text-xs text-muted-foreground">Passo {currentStep + 2} de {steps.length}</span>
                </div>
                <h3 className="text-lg font-semibold text-foreground/70">{nextStep.title}</h3>
                <p className="text-sm text-muted-foreground/60 line-clamp-2">{nextStep.content}</p>
              </div>
            </motion.div>
          );
        })()}

        {/* Main current card */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={tooltipVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={springTransition}
            className="w-[360px] bg-card rounded-2xl border shadow-2xl overflow-hidden touch-pan-y"
            style={{
              transform: swipeState.swiping ? `translateX(${swipeState.deltaX * 0.5}px) rotate(${swipeState.deltaX * 0.02}deg) scale(${1 - Math.abs(swipeState.deltaX) / 1000})` : undefined,
              transition: swipeState.swiping ? 'none' : 'transform 0.3s ease-out',
            }}
          >
            {/* Gradient Header */}
            <div className="relative h-2 bg-gradient-to-r from-primary via-info to-success" />

            {/* Header */}
            <div className="flex items-center justify-between p-4 pb-3">
              <div className="flex items-center gap-3">
                <motion.div 
                  key={`icon-${currentStep}`}
                  initial={{ scale: 0, rotate: -180, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.1 }}
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    step.highlight === "success" ? "bg-success/10" :
                    step.highlight === "warning" ? "bg-warning/10" :
                    step.highlight === "info" ? "bg-info/10" :
                    "bg-primary/10"
                  )}
                >
                  <StepIcon className={cn(
                    "w-5 h-5",
                    step.highlight === "success" ? "text-success" :
                    step.highlight === "warning" ? "text-warning" :
                    step.highlight === "info" ? "text-info" :
                    "text-primary"
                  )} />
                </motion.div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground">
                    Passo {currentStep + 1} de {steps.length}
                  </span>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive" 
                onClick={onSkip}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="px-4 pb-4 space-y-3">
              <motion.h3 
                key={`title-${currentStep}`}
                custom={1}
                variants={contentVariants}
                initial="hidden"
                animate="visible"
                className="text-lg font-semibold text-foreground"
              >
                {step.title}
              </motion.h3>
              <motion.p 
                key={`content-${currentStep}`}
                custom={2}
                variants={contentVariants}
                initial="hidden"
                animate="visible"
                className="text-sm text-muted-foreground leading-relaxed"
              >
                {step.content}
              </motion.p>
              
              {step.action && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={step.action.onClick} 
                    className="mt-2 gap-2"
                  >
                    <Zap className="w-3 h-3" />
                    {step.action.label}
                  </Button>
                </motion.div>
              )}
            </div>

            {/* Step Indicators */}
            <div className="px-4 pb-3">
              <StepIndicators 
                total={steps.length} 
                current={currentStep}
                onStepClick={handleStepClick}
              />
              {/* Mobile swipe hint */}
              {isMobile && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: swipeState.swiping ? 0 : 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-xs text-muted-foreground/60 text-center mt-2"
                >
                  ← Deslize para navegar →
                </motion.p>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 pt-3 border-t bg-muted/30">
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
              
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button 
                  size="sm" 
                  onClick={handleNext} 
                  className={cn(
                    "gap-1",
                    isLastStep && "bg-gradient-to-r from-primary to-primary-glow hover:from-primary/90 hover:to-primary-glow/90"
                  )}
                >
                  {isLastStep ? (
                    <>
                      <Check className="w-4 h-4" />
                      Concluir
                    </>
                  ) : (
                    <>
                      Próximo
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Completion Modal */}
      <AnimatePresence>
        {showCompletion && (
          <CompletionModal onClose={handleCompletionClose} />
        )}
      </AnimatePresence>
    </>
  );
};

// Re-export the database-backed hook for managing tour state
export { useTourPreferences as useOnboardingTour } from '@/hooks/useTourPreferences';

// Re-export tour step definitions from dedicated file
export {
  dashboardTourSteps,
  cotacaoTourSteps,
  fornecedorTourSteps,
  pedidosTourSteps,
  solicitacoesTourSteps,
} from './tourStepDefinitions';