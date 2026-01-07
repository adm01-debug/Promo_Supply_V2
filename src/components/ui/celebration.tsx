import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  PartyPopper, 
  Trophy, 
  Star, 
  Sparkles,
  CheckCircle2,
  Zap,
  Heart
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useHapticFeedback } from "@/hooks/useMobileGestures";
import { create } from "zustand";

type CelebrationType = 'success' | 'achievement' | 'milestone' | 'streak' | 'level-up';

interface CelebrationConfig {
  type: CelebrationType;
  title: string;
  subtitle?: string;
  icon?: React.ElementType;
  duration?: number;
}

interface CelebrationStore {
  celebration: CelebrationConfig | null;
  show: (config: CelebrationConfig) => void;
  hide: () => void;
}

export const useCelebration = create<CelebrationStore>((set) => ({
  celebration: null,
  show: (config) => set({ celebration: config }),
  hide: () => set({ celebration: null }),
}));

// Confetti particle component
const Confetti = ({ color, delay }: { color: string; delay: number }) => (
  <motion.div
    className={cn("absolute w-3 h-3 rounded-sm", color)}
    initial={{ 
      y: 0, 
      x: Math.random() * 200 - 100,
      opacity: 1,
      rotate: 0,
      scale: 1
    }}
    animate={{ 
      y: [0, -100, 300],
      x: [0, Math.random() * 100 - 50, Math.random() * 200 - 100],
      opacity: [1, 1, 0],
      rotate: [0, 180, 360],
      scale: [1, 1.2, 0.5]
    }}
    transition={{ 
      duration: 2,
      delay,
      ease: "easeOut"
    }}
  />
);

// Sparkle component
const Sparkle = ({ delay }: { delay: number }) => (
  <motion.div
    className="absolute"
    initial={{ scale: 0, opacity: 0 }}
    animate={{ 
      scale: [0, 1.5, 0],
      opacity: [0, 1, 0],
      rotate: [0, 180]
    }}
    transition={{ 
      duration: 0.8,
      delay,
      ease: "easeInOut"
    }}
    style={{
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`
    }}
  >
    <Sparkles className="w-6 h-6 text-warning" />
  </motion.div>
);

const celebrationConfigs: Record<CelebrationType, {
  icon: React.ElementType;
  colors: string[];
  bgGradient: string;
}> = {
  success: {
    icon: CheckCircle2,
    colors: ['bg-success', 'bg-emerald-400', 'bg-green-400'],
    bgGradient: 'from-success/20 to-emerald-500/20'
  },
  achievement: {
    icon: Trophy,
    colors: ['bg-warning', 'bg-amber-400', 'bg-yellow-400'],
    bgGradient: 'from-warning/20 to-amber-500/20'
  },
  milestone: {
    icon: Star,
    colors: ['bg-primary', 'bg-violet-400', 'bg-purple-400'],
    bgGradient: 'from-primary/20 to-violet-500/20'
  },
  streak: {
    icon: Zap,
    colors: ['bg-orange-500', 'bg-red-400', 'bg-amber-400'],
    bgGradient: 'from-orange-500/20 to-red-500/20'
  },
  'level-up': {
    icon: PartyPopper,
    colors: ['bg-info', 'bg-cyan-400', 'bg-blue-400'],
    bgGradient: 'from-info/20 to-cyan-500/20'
  }
};

export function CelebrationOverlay() {
  const { celebration, hide } = useCelebration();
  const { success: hapticSuccess } = useHapticFeedback();
  const [confettiPieces, setConfettiPieces] = useState<number[]>([]);

  useEffect(() => {
    if (celebration) {
      hapticSuccess();
      setConfettiPieces(Array.from({ length: 30 }, (_, i) => i));
      
      const timer = setTimeout(() => {
        hide();
      }, celebration.duration || 3000);

      return () => clearTimeout(timer);
    }
  }, [celebration, hide, hapticSuccess]);

  if (!celebration) return null;

  const config = celebrationConfigs[celebration.type];
  const Icon = celebration.icon || config.icon;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Background overlay */}
        <motion.div
          className={cn(
            "absolute inset-0 bg-gradient-to-b",
            config.bgGradient
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />

        {/* Confetti */}
        <div className="absolute inset-0 overflow-hidden">
          {confettiPieces.map((i) => (
            <Confetti 
              key={i} 
              color={config.colors[i % config.colors.length]}
              delay={i * 0.03}
            />
          ))}
        </div>

        {/* Sparkles */}
        <div className="absolute inset-0">
          {Array.from({ length: 10 }).map((_, i) => (
            <Sparkle key={i} delay={i * 0.1} />
          ))}
        </div>

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
          {/* Icon */}
          <motion.div
            className="w-24 h-24 rounded-full bg-card shadow-2xl flex items-center justify-center mb-6"
            animate={{ 
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0]
            }}
            transition={{ 
              duration: 0.5,
              repeat: 2
            }}
          >
            <Icon className="w-12 h-12 text-primary" />
          </motion.div>

          {/* Title */}
          <motion.h2
            className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2"
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
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Hook for triggering celebrations
export function useTriggerCelebration() {
  const { show } = useCelebration();

  const celebrate = useCallback((config: CelebrationConfig) => {
    show(config);
  }, [show]);

  const celebrateSuccess = useCallback((title: string, subtitle?: string) => {
    show({ type: 'success', title, subtitle });
  }, [show]);

  const celebrateAchievement = useCallback((title: string, subtitle?: string) => {
    show({ type: 'achievement', title, subtitle });
  }, [show]);

  const celebrateMilestone = useCallback((title: string, subtitle?: string) => {
    show({ type: 'milestone', title, subtitle });
  }, [show]);

  return {
    celebrate,
    celebrateSuccess,
    celebrateAchievement,
    celebrateMilestone
  };
}
