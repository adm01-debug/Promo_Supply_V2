import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  X, ChevronLeft, ChevronRight, Sparkles, 
  Check, Lightbulb, Rocket, Target, Zap,
  PartyPopper, Star
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface TourStep {
  target: string; // CSS selector
  title: string;
  content: string;
  position?: "top" | "bottom" | "left" | "right";
  icon?: React.ElementType; // Changed from React.ReactNode to React.ElementType
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

// Confetti animation component
const Confetti = () => {
  const confettiPieces = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 1 + Math.random() * 2,
    color: [
      'hsl(var(--primary))',
      'hsl(var(--success))',
      'hsl(var(--warning))',
      'hsl(var(--info))',
    ][Math.floor(Math.random() * 4)],
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-[10001] overflow-hidden">
      {confettiPieces.map((piece) => (
        <motion.div
          key={piece.id}
          initial={{ 
            x: `${piece.x}vw`, 
            y: -20, 
            rotate: 0,
            opacity: 1 
          }}
          animate={{ 
            y: '110vh', 
            rotate: 720,
            opacity: 0 
          }}
          transition={{ 
            duration: piece.duration, 
            delay: piece.delay,
            ease: 'linear'
          }}
          className="absolute w-3 h-3 rounded-sm"
          style={{ backgroundColor: piece.color }}
        />
      ))}
    </div>
  );
};

// Spotlight effect component with cutout
const Spotlight = ({ rect, highlight = "primary" }: { rect: DOMRect | null; highlight?: string }) => {
  if (!rect) return null;
  
  const padding = 8;
  const borderRadius = 12;

  return (
    <>
      {/* Highlight ring around target */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.05 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="fixed z-[9999] pointer-events-none rounded-xl border-2 border-primary"
        style={{
          top: rect.top - padding,
          left: rect.left - padding,
          width: rect.width + padding * 2,
          height: rect.height + padding * 2,
          boxShadow: `0 0 0 9999px rgba(0, 0, 0, 0.75), 0 0 30px hsl(var(--primary) / 0.5)`,
          borderRadius: borderRadius,
        }}
      >
        {/* Pulsing glow effect */}
        <motion.div
          animate={{ 
            boxShadow: [
              `0 0 15px hsl(var(--primary) / 0.4), inset 0 0 15px hsl(var(--primary) / 0.1)`,
              `0 0 30px hsl(var(--primary) / 0.6), inset 0 0 20px hsl(var(--primary) / 0.15)`,
              `0 0 15px hsl(var(--primary) / 0.4), inset 0 0 15px hsl(var(--primary) / 0.1)`,
            ]
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute inset-0 rounded-xl"
        />
      </motion.div>
    </>
  );
};

// Step indicator dots
const StepIndicators = ({ 
  total, 
  current, 
  onStepClick 
}: { 
  total: number; 
  current: number;
  onStepClick: (index: number) => void;
}) => (
  <div className="flex items-center gap-2 justify-center">
    {Array.from({ length: total }, (_, i) => (
      <motion.button
        key={i}
        onClick={() => onStepClick(i)}
        whileHover={{ scale: 1.2 }}
        whileTap={{ scale: 0.9 }}
        className={cn(
          "h-2 rounded-full transition-all duration-300 cursor-pointer",
          i === current 
            ? "w-6 bg-primary" 
            : i < current 
              ? "w-2 bg-primary/60" 
              : "w-2 bg-muted-foreground/30"
        )}
      />
    ))}
  </div>
);

// Completion celebration modal
const CompletionModal = ({ onClose }: { onClose: () => void }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-[10000] flex items-center justify-center bg-background/80 backdrop-blur-md"
  >
    <Confetti />
    <motion.div
      initial={{ scale: 0.5, opacity: 0, y: 50 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.8, opacity: 0 }}
      transition={{ type: 'spring', damping: 15 }}
      className="bg-card border rounded-2xl shadow-2xl p-8 max-w-md mx-4 text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: 'spring', damping: 10 }}
        className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center"
      >
        <PartyPopper className="w-10 h-10 text-primary-foreground" />
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-2xl font-bold mb-2"
      >
        🎉 Tour Concluído!
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-muted-foreground mb-6"
      >
        Você está pronto para explorar todas as funcionalidades do sistema. 
        Boas compras!
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex items-center justify-center gap-2 mb-6"
      >
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.6 + i * 0.1, type: 'spring' }}
          >
            <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        <Button onClick={onClose} size="lg" className="gap-2">
          <Rocket className="w-4 h-4" />
          Começar a Usar
        </Button>
      </motion.div>
    </motion.div>
  </motion.div>
);

export const OnboardingTour = ({ steps, isOpen, onComplete, onSkip }: OnboardingTourProps) => {
  const [currentStep, setCurrentStep] = React.useState(0);
  const [tooltipPosition, setTooltipPosition] = React.useState({ top: 0, left: 0 });
  const [highlightRect, setHighlightRect] = React.useState<DOMRect | null>(null);
  const [showCompletion, setShowCompletion] = React.useState(false);
  const [direction, setDirection] = React.useState(1); // 1 = forward, -1 = backward

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

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
      x: direction > 0 ? 50 : -50,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -50 : 50,
      opacity: 0,
    }),
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

      {/* Tooltip */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={currentStep}
          custom={direction}
          variants={tooltipVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="fixed z-[10000] w-[360px] bg-card rounded-2xl border shadow-2xl overflow-hidden"
          style={{
            top: tooltipPosition.top,
            left: tooltipPosition.left,
            transform: "translateX(-50%)",
          }}
        >
          {/* Gradient Header */}
          <div className="relative h-2 bg-gradient-to-r from-primary via-info to-success" />

          {/* Header */}
          <div className="flex items-center justify-between p-4 pb-3">
            <div className="flex items-center gap-3">
              <motion.div 
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', damping: 10 }}
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
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-lg font-semibold text-foreground"
            >
              {step.title}
            </motion.h3>
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
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

// Predefined tour steps for main features
export const dashboardTourSteps: TourStep[] = [
  {
    target: "[data-tour='sidebar']",
    title: "Menu de Navegação",
    content: "Acesse todas as funcionalidades do sistema através do menu lateral. Os itens são organizados por categoria para facilitar a navegação.",
    position: "right",
    highlight: "primary",
  },
  {
    target: "[data-tour='global-search']",
    title: "Busca Global Inteligente",
    content: "Encontre rapidamente solicitações, fornecedores e pedidos. Use Ctrl+K (ou Cmd+K no Mac) para abrir a qualquer momento!",
    position: "bottom",
    highlight: "info",
  },
  {
    target: "[data-tour='kpi-cards']",
    title: "Indicadores em Tempo Real",
    content: "Monitore os principais KPIs do setor de compras. Clique em cada card para ver detalhes, tendências e drill-down de dados.",
    position: "bottom",
    highlight: "success",
  },
  {
    target: "[data-tour='notifications']",
    title: "Central de Notificações",
    content: "Acompanhe alertas importantes, aprovações pendentes e atualizações de pedidos. Configure suas preferências para nunca perder uma ação crítica!",
    position: "left",
    highlight: "warning",
  },
  {
    target: "[data-tour='theme-toggle']",
    title: "Personalize sua Experiência",
    content: "Alterne entre os modos claro e escuro conforme sua preferência. O sistema lembra sua escolha automaticamente.",
    position: "left",
    highlight: "primary",
  },
];

// Cotação page tour
export const cotacaoTourSteps: TourStep[] = [
  {
    target: "[data-tour='cotacao-produto']",
    title: "Detalhes do Produto",
    content: "Visualize todas as informações da solicitação: produto, quantidade, prazo e valor estimado. Essencial para comparar cotações.",
    position: "bottom",
    highlight: "primary",
  },
  {
    target: "[data-tour='cotacao-busca']",
    title: "Busca Automática de Preços",
    content: "Clique para buscar cotações automaticamente em todos os fornecedores integrados por API. O sistema consulta preços em tempo real!",
    position: "bottom",
    highlight: "info",
  },
  {
    target: "[data-tour='cotacao-manual']",
    title: "Cotações Manuais",
    content: "Adicione cotações recebidas por WhatsApp, email ou telefone. Centralize todas as propostas em um só lugar.",
    position: "top",
    highlight: "success",
  },
];

// Fornecedores page tour
export const fornecedorTourSteps: TourStep[] = [
  {
    target: "[data-tour='fornecedor-header']",
    title: "Gestão de Fornecedores",
    content: "Gerencie todos os seus fornecedores em um só lugar. Cadastre novos, edite informações e acompanhe o desempenho de cada um.",
    position: "bottom",
    highlight: "primary",
  },
  {
    target: "[data-tour='fornecedor-kpis']",
    title: "Indicadores de Fornecedores",
    content: "Acompanhe métricas importantes: total de fornecedores, integrações ativas e avaliação média.",
    position: "bottom",
    highlight: "info",
  },
  {
    target: "[data-tour='fornecedor-filtros']",
    title: "Filtros Inteligentes",
    content: "Busque por nome, CNPJ ou filtre por tipo de fornecedor. Encontre rapidamente quem você precisa.",
    position: "bottom",
    highlight: "success",
  },
  {
    target: "[data-tour='fornecedor-tabela']",
    title: "Lista de Fornecedores",
    content: "Veja todos os fornecedores com suas informações, contatos e rating. Clique para editar ou ver histórico de compras.",
    position: "top",
    highlight: "warning",
  },
];

// Pedidos page tour
export const pedidosTourSteps: TourStep[] = [
  {
    target: "[data-tour='pedidos-header']",
    title: "Central de Pedidos",
    content: "Acompanhe todos os pedidos de compra em um único lugar. Visualize status, valores e prazos de entrega.",
    position: "bottom",
    highlight: "primary",
  },
  {
    target: "[data-tour='pedidos-kpis']",
    title: "Resumo dos Pedidos",
    content: "Veja o panorama geral: total de pedidos, pendentes, em trânsito, entregues e valor total comprometido.",
    position: "bottom",
    highlight: "info",
  },
  {
    target: "[data-tour='pedidos-filtros']",
    title: "Filtros Avançados",
    content: "Filtre por status, fornecedor ou busque por número do pedido. Encontre qualquer pedido em segundos.",
    position: "bottom",
    highlight: "success",
  },
  {
    target: "[data-tour='pedidos-tabela']",
    title: "Acompanhamento de Pedidos",
    content: "Clique em qualquer pedido para ver detalhes completos, atualizar status ou entrar em contato com o fornecedor.",
    position: "top",
    highlight: "warning",
  },
];

// Solicitações page tour
export const solicitacoesTourSteps: TourStep[] = [
  {
    target: "[data-tour='solicitacoes-header']",
    title: "Central de Solicitações",
    content: "Gerencie todo o ciclo de vida das suas solicitações de compra. Desde a criação até a aprovação e conclusão.",
    position: "bottom",
    highlight: "primary",
  },
  {
    target: "[data-tour='solicitacoes-stats']",
    title: "Estatísticas Rápidas",
    content: "Acompanhe o resumo das solicitações: total, pendentes, em andamento e valor total comprometido.",
    position: "bottom",
    highlight: "info",
  },
  {
    target: "[data-tour='solicitacoes-busca']",
    title: "Busca e Filtros",
    content: "Encontre solicitações por produto, empresa ou ID. Use os filtros de status e tipo para refinar sua busca.",
    position: "bottom",
    highlight: "success",
  },
  {
    target: "[data-tour='solicitacoes-nova']",
    title: "Nova Solicitação",
    content: "Clique aqui para criar uma nova solicitação de compra. Preencha os dados do produto, quantidade e prazo desejado.",
    position: "left",
    highlight: "warning",
  },
  {
    target: "[data-tour='solicitacoes-kanban']",
    title: "Visualização Kanban",
    content: "Arraste e solte cards entre as colunas para mudar o status. Visualize o fluxo completo das solicitações de forma intuitiva.",
    position: "top",
    highlight: "primary",
  },
];
