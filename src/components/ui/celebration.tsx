import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHapticFeedback } from "@/hooks/useMobileGestures";
import { create } from "zustand";
import {
  type CelebrationType,
  type CelebrationConfig,
  celebrationConfigs,
  Confetti,
  Sparkle,
  FloatingHeart,
  StarBurst,
} from "./celebration-particles";

export type { CelebrationType, CelebrationConfig };

interface CelebrationStore {
  celebration: CelebrationConfig | null;
  queue: CelebrationConfig[];
  show: (config: CelebrationConfig) => void;
  hide: () => void;
  queueCelebration: (config: CelebrationConfig) => void;
}

export const useCelebration = create<CelebrationStore>((set, get) => ({
  celebration: null,
  queue: [],
  show: (config) => set({ celebration: config }),
  hide: () => {
    const { queue } = get();
    if (queue.length > 0) {
      const [next, ...rest] = queue;
      set({ celebration: next, queue: rest });
    } else {
      set({ celebration: null });
    }
  },
  queueCelebration: (config) => {
    const { celebration, queue } = get();
    if (!celebration) {
      set({ celebration: config });
    } else {
      set({ queue: [...queue, config] });
    }
  },
}));

export function CelebrationOverlay() {
  const { celebration, hide } = useCelebration();
  const { success: hapticSuccess } = useHapticFeedback();
  const [confettiPieces, setConfettiPieces] = useState<{ id: number; x: number; shape: 'square' | 'circle' | 'star' }[]>([]);

  useEffect(() => {
    if (celebration) {
      hapticSuccess();
      
      const count = celebration.confettiCount || 40;
      setConfettiPieces(
        Array.from({ length: count }, (_, i) => ({
          id: i,
          x: Math.random() * window.innerWidth,
          shape: ['square', 'circle', 'star'][Math.floor(Math.random() * 3)] as 'square' | 'circle' | 'star'
        }))
      );
      
      const timer = setTimeout(() => {
        hide();
      }, celebration.duration || 3500);

      return () => clearTimeout(timer);
    }
  }, [celebration, hide, hapticSuccess]);

  if (!celebration) return null;

  const config = celebrationConfigs[celebration.type];
  const Icon = celebration.icon || config.icon;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Background overlay with gradient */}
        <motion.div
          className={cn(
            "absolute inset-0 bg-gradient-to-b",
            config.bgGradient
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />

        {/* Radial glow effect */}
        <motion.div
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.3, 0] }}
          transition={{ duration: 1.5 }}
          style={{
            background: 'radial-gradient(circle at center, hsl(var(--primary) / 0.3) 0%, transparent 70%)'
          }}
        />

        {/* Confetti particles */}
        {(config.particles === 'confetti' || config.particles === 'mixed') && (
          <div className="absolute inset-0 overflow-hidden">
            {confettiPieces.map((piece) => (
              <Confetti 
                key={piece.id} 
                color={config.colors[piece.id % config.colors.length]}
                delay={piece.id * 0.02}
                startX={piece.x}
                shape={piece.shape}
              />
            ))}
          </div>
        )}

        {/* Stars */}
        {(config.particles === 'stars' || config.particles === 'mixed') && (
          <div className="absolute inset-0">
            {Array.from({ length: 12 }).map((_, i) => (
              <Sparkle key={i} delay={i * 0.08} size={['sm', 'md', 'lg'][i % 3] as 'sm' | 'md' | 'lg'} />
            ))}
            {Array.from({ length: 5 }).map((_, i) => (
              <StarBurst key={`star-${i}`} delay={0.3 + i * 0.15} />
            ))}
          </div>
        )}

        {/* Hearts for special celebrations */}
        {config.particles === 'mixed' && (
          <div className="absolute inset-0 overflow-hidden">
            {Array.from({ length: 8 }).map((_, i) => (
              <FloatingHeart key={i} delay={i * 0.2} />
            ))}
          </div>
        )}

        {/* Main content */}
        <motion.div
          className="relative flex flex-col items-center text-center px-8"
          initial={{ scale: 0, rotate: -10 }}
          animate={{ 
            scale: 1, 
            rotate: 0,
            transition: {
              type: "spring",
              stiffness: 200,
              damping: 15
            }
          }}
          exit={{ scale: 0, opacity: 0 }}
        >
          {/* Icon with pulsing ring */}
          <motion.div className="relative">
            {/* Outer ring */}
            <motion.div
              className="absolute inset-0 rounded-full bg-primary/20"
              animate={{ 
                scale: [1, 1.5, 1],
                opacity: [0.5, 0, 0.5]
              }}
              transition={{ 
                duration: 1.5,
                repeat: Infinity
              }}
              style={{ width: 96, height: 96, left: -12, top: -12 }}
            />
            
            <motion.div
              className="w-24 h-24 rounded-full bg-card shadow-2xl flex items-center justify-center relative z-10"
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ 
                duration: 0.5,
                repeat: 3
              }}
            >
              <Icon className="w-12 h-12 text-primary" />
            </motion.div>
          </motion.div>

          {/* Title with gradient text */}
          <motion.h2
            className="text-3xl md:text-4xl font-display font-bold mt-6 mb-2 bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {celebration.title}
          </motion.h2>

          {/* Subtitle */}
          {celebration.subtitle && (
            <motion.p
              className="text-lg text-muted-foreground"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {celebration.subtitle}
            </motion.p>
          )}

          {/* Animated stars row */}
          <motion.div
            className="flex items-center gap-1 mt-4"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {Array.from({ length: 5 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.5 + i * 0.1, type: "spring" }}
              >
                <Star className="w-5 h-5 text-warning fill-warning" />
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Enhanced hook for triggering celebrations
export function useTriggerCelebration() {
  const { show, queueCelebration } = useCelebration();

  const celebrate = useCallback((config: CelebrationConfig) => {
    show(config);
  }, [show]);

  const celebrateSuccess = useCallback((title: string, subtitle?: string) => {
    show({ type: 'success', title, subtitle });
  }, [show]);

  const celebrateAchievement = useCallback((title: string, subtitle?: string) => {
    show({ type: 'achievement', title, subtitle, confettiCount: 50 });
  }, [show]);

  const celebrateMilestone = useCallback((title: string, subtitle?: string) => {
    show({ type: 'milestone', title, subtitle });
  }, [show]);

  const celebrateLevelUp = useCallback((level: number) => {
    show({ 
      type: 'level-up', 
      title: `Nível ${level}!`,
      subtitle: 'Você subiu de nível!',
      duration: 4000,
      confettiCount: 60
    });
  }, [show]);

  const celebratePurchase = useCallback((value?: string) => {
    show({ 
      type: 'purchase', 
      title: 'Compra Realizada!',
      subtitle: value ? `Economia de ${value}` : undefined
    });
  }, [show]);

  const celebrateSavings = useCallback((amount: string) => {
    show({ 
      type: 'savings', 
      title: 'Economia Registrada!',
      subtitle: `Você economizou ${amount}`
    });
  }, [show]);

  const celebrateRecord = useCallback((title: string, subtitle?: string) => {
    show({ 
      type: 'record', 
      title,
      subtitle,
      confettiCount: 50
    });
  }, [show]);

  const celebrateFirstTime = useCallback((action: string) => {
    show({ 
      type: 'first-time', 
      title: 'Primeira vez!',
      subtitle: action
    });
  }, [show]);

  const queueMultiple = useCallback((configs: CelebrationConfig[]) => {
    configs.forEach((config, i) => {
      if (i === 0) {
        show(config);
      } else {
        queueCelebration(config);
      }
    });
  }, [show, queueCelebration]);

  return {
    celebrate,
    celebrateSuccess,
    celebrateAchievement,
    celebrateMilestone,
    celebrateLevelUp,
    celebratePurchase,
    celebrateSavings,
    celebrateRecord,
    celebrateFirstTime,
    queueMultiple
  };
}
