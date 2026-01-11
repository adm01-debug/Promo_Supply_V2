import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Info,
  Sparkles,
  PartyPopper,
  ThumbsUp,
  Rocket,
  Star,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { create } from "zustand";

type FeedbackType = 'success' | 'error' | 'warning' | 'info' | 'celebration';

interface FeedbackConfig {
  type: FeedbackType;
  message: string;
  description?: string;
  duration?: number;
  icon?: React.ElementType;
}

interface FeedbackStore {
  feedback: FeedbackConfig | null;
  show: (config: FeedbackConfig) => void;
  hide: () => void;
}

export const useFeedbackStore = create<FeedbackStore>((set) => ({
  feedback: null,
  show: (config) => set({ feedback: config }),
  hide: () => set({ feedback: null }),
}));

// Hook for triggering feedback
export function useSuccessFeedback() {
  const { show, hide } = useFeedbackStore();

  const success = useCallback((message: string, description?: string) => {
    show({ type: 'success', message, description, duration: 3000 });
  }, [show]);

  const error = useCallback((message: string, description?: string) => {
    show({ type: 'error', message, description, duration: 4000 });
  }, [show]);

  const warning = useCallback((message: string, description?: string) => {
    show({ type: 'warning', message, description, duration: 3500 });
  }, [show]);

  const info = useCallback((message: string, description?: string) => {
    show({ type: 'info', message, description, duration: 3000 });
  }, [show]);

  const celebrate = useCallback((message: string, description?: string) => {
    show({ type: 'celebration', message, description, duration: 4000, icon: PartyPopper });
  }, [show]);

  return { success, error, warning, info, celebrate, hide };
}

// Confetti particles for celebration
const ConfettiParticles = () => {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.3,
    duration: 1 + Math.random() * 1,
    color: ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--info))'][Math.floor(Math.random() * 4)],
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute w-2 h-2 rounded-sm"
          style={{ 
            left: `${particle.x}%`,
            backgroundColor: particle.color,
          }}
          initial={{ y: '100%', opacity: 1, rotate: 0 }}
          animate={{ 
            y: '-100%', 
            opacity: 0,
            rotate: 360 + Math.random() * 360,
          }}
          transition={{ 
            duration: particle.duration, 
            delay: particle.delay,
            ease: 'easeOut'
          }}
        />
      ))}
    </div>
  );
};

// Floating stars for success
const FloatingStars = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {[0, 1, 2].map((i) => (
      <motion.div
        key={i}
        className="absolute"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ 
          scale: [0, 1, 0],
          opacity: [0, 1, 0],
          rotate: [0, 180],
        }}
        transition={{ 
          duration: 0.8,
          delay: 0.2 + i * 0.15,
          ease: 'easeOut'
        }}
        style={{
          left: `${20 + i * 30}%`,
          top: `${20 + (i % 2) * 40}%`,
        }}
      >
        <Star className="w-4 h-4 text-warning fill-warning" />
      </motion.div>
    ))}
  </div>
);

const feedbackConfig = {
  success: {
    icon: CheckCircle2,
    bgClass: 'bg-success/10 border-success/30',
    iconClass: 'text-success',
    titleClass: 'text-success',
  },
  error: {
    icon: XCircle,
    bgClass: 'bg-destructive/10 border-destructive/30',
    iconClass: 'text-destructive',
    titleClass: 'text-destructive',
  },
  warning: {
    icon: AlertCircle,
    bgClass: 'bg-warning/10 border-warning/30',
    iconClass: 'text-warning',
    titleClass: 'text-warning',
  },
  info: {
    icon: Info,
    bgClass: 'bg-info/10 border-info/30',
    iconClass: 'text-info',
    titleClass: 'text-info',
  },
  celebration: {
    icon: PartyPopper,
    bgClass: 'bg-primary/10 border-primary/30',
    iconClass: 'text-primary',
    titleClass: 'text-primary',
  },
};

export function SuccessFeedbackOverlay() {
  const { feedback, hide } = useFeedbackStore();

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => {
        hide();
      }, feedback.duration || 3000);

      return () => clearTimeout(timer);
    }
  }, [feedback, hide]);

  return (
    <AnimatePresence>
      {feedback && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-start justify-center pt-20 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className={cn(
              "relative pointer-events-auto rounded-xl border-2 shadow-2xl p-4 max-w-md mx-4",
              feedbackConfig[feedback.type].bgClass
            )}
            initial={{ scale: 0.8, y: -50, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.8, y: -20, opacity: 0 }}
            transition={{ type: 'spring', damping: 15, stiffness: 300 }}
            onClick={() => hide()}
          >
            {/* Celebration effects */}
            {feedback.type === 'celebration' && (
              <>
                <ConfettiParticles />
                <FloatingStars />
              </>
            )}

            {/* Success ring animation */}
            {feedback.type === 'success' && (
              <motion.div
                className="absolute inset-0 rounded-xl"
                initial={{ boxShadow: '0 0 0 0 hsl(var(--success) / 0.7)' }}
                animate={{ 
                  boxShadow: [
                    '0 0 0 0 hsl(var(--success) / 0.7)',
                    '0 0 0 10px hsl(var(--success) / 0)',
                    '0 0 0 0 hsl(var(--success) / 0)',
                  ]
                }}
                transition={{ duration: 0.6 }}
              />
            )}

            <div className="relative flex items-start gap-3">
              {/* Icon */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.1 }}
              >
                {(() => {
                  const Icon = feedback.icon || feedbackConfig[feedback.type].icon;
                  return (
                    <div className={cn(
                      "p-2 rounded-full",
                      feedback.type === 'success' && "bg-success/20",
                      feedback.type === 'error' && "bg-destructive/20",
                      feedback.type === 'warning' && "bg-warning/20",
                      feedback.type === 'info' && "bg-info/20",
                      feedback.type === 'celebration' && "bg-primary/20",
                    )}>
                      <Icon className={cn(
                        "w-6 h-6",
                        feedbackConfig[feedback.type].iconClass
                      )} />
                    </div>
                  );
                })()}
              </motion.div>

              {/* Content */}
              <motion.div
                className="flex-1"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
              >
                <p className={cn(
                  "font-semibold text-base",
                  feedbackConfig[feedback.type].titleClass
                )}>
                  {feedback.message}
                </p>
                {feedback.description && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {feedback.description}
                  </p>
                )}
              </motion.div>

              {/* Sparkle decoration for celebration */}
              {feedback.type === 'celebration' && (
                <motion.div
                  animate={{ rotate: [0, 180, 360], scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Sparkles className="w-5 h-5 text-warning" />
                </motion.div>
              )}
            </div>

            {/* Progress bar */}
            <motion.div
              className={cn(
                "absolute bottom-0 left-0 h-1 rounded-b-xl",
                feedback.type === 'success' && "bg-success",
                feedback.type === 'error' && "bg-destructive",
                feedback.type === 'warning' && "bg-warning",
                feedback.type === 'info' && "bg-info",
                feedback.type === 'celebration' && "bg-primary",
              )}
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: (feedback.duration || 3000) / 1000, ease: 'linear' }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Inline success check animation
export function InlineSuccessCheck({ show, size = 24 }: { show: boolean; size?: number }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: 'spring', damping: 15, stiffness: 300 }}
        >
          <motion.div
            className="rounded-full bg-success p-1"
            animate={{ 
              boxShadow: [
                '0 0 0 0 hsl(var(--success) / 0.7)',
                '0 0 0 8px hsl(var(--success) / 0)',
              ]
            }}
            transition={{ duration: 0.5, repeat: 2 }}
          >
            <CheckCircle2 
              className="text-success-foreground" 
              style={{ width: size, height: size }} 
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Quick action feedback (for buttons, forms, etc.)
export function QuickFeedbackButton({ 
  children, 
  onClick,
  successMessage = "Sucesso!",
  className,
  ...props 
}: { 
  children: React.ReactNode;
  onClick?: () => Promise<void> | void;
  successMessage?: string;
  className?: string;
}) {
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const { success, error } = useSuccessFeedback();

  const handleClick = async () => {
    if (state === 'loading') return;
    
    setState('loading');
    try {
      await onClick?.();
      setState('success');
      success(successMessage);
      setTimeout(() => setState('idle'), 2000);
    } catch (err) {
      setState('error');
      error("Algo deu errado", err instanceof Error ? err.message : undefined);
      setTimeout(() => setState('idle'), 2000);
    }
  };

  return (
    <motion.button
      className={cn(
        "relative inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium",
        "transition-colors duration-200",
        state === 'idle' && "bg-primary text-primary-foreground hover:bg-primary/90",
        state === 'loading' && "bg-primary/80 text-primary-foreground cursor-wait",
        state === 'success' && "bg-success text-success-foreground",
        state === 'error' && "bg-destructive text-destructive-foreground",
        className
      )}
      onClick={handleClick}
      disabled={state === 'loading'}
      whileHover={state === 'idle' ? { scale: 1.02 } : {}}
      whileTap={state === 'idle' ? { scale: 0.98 } : {}}
      animate={state === 'error' ? { x: [0, -5, 5, -5, 5, 0] } : {}}
      transition={{ duration: 0.3 }}
      {...props}
    >
      <AnimatePresence mode="wait">
        {state === 'idle' && (
          <motion.span
            key="idle"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {children}
          </motion.span>
        )}
        {state === 'loading' && (
          <motion.span
            key="loading"
            className="flex items-center gap-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <Zap className="w-4 h-4" />
            </motion.div>
            Processando...
          </motion.span>
        )}
        {state === 'success' && (
          <motion.span
            key="success"
            className="flex items-center gap-2"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            <CheckCircle2 className="w-4 h-4" />
            Sucesso!
          </motion.span>
        )}
        {state === 'error' && (
          <motion.span
            key="error"
            className="flex items-center gap-2"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            <XCircle className="w-4 h-4" />
            Erro!
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

export default SuccessFeedbackOverlay;
