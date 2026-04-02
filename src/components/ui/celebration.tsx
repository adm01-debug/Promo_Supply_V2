import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  PartyPopper, 
  Trophy, 
  Star, 
  Sparkles,
  CheckCircle2,
  Zap,
  Heart,
  Rocket,
  Crown,
  Gift,
  Medal,
  Target,
  TrendingUp,
  Flame
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useHapticFeedback } from "@/hooks/useMobileGestures";
import { create } from "zustand";

type CelebrationType = 
  | 'success' 
  | 'achievement' 
  | 'milestone' 
  | 'streak' 
  | 'level-up'
  | 'purchase'
  | 'savings'
  | 'record'
  | 'first-time';

interface CelebrationConfig {
  type: CelebrationType;
  title: string;
  subtitle?: string;
  icon?: React.ElementType;
  duration?: number;
  confettiCount?: number;
  sound?: boolean;
}

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

// Enhanced confetti particle component
const Confetti = ({ 
  color, 
  delay, 
  startX,
  shape = 'square' 
}: { 
  color: string; 
  delay: number;
  startX: number;
  shape?: 'square' | 'circle' | 'star';
}) => {
  const shapes = {
    square: "rounded-sm",
    circle: "rounded-full",
    star: "clip-path-star",
  };

  return (
    <motion.div
      className={cn("absolute w-3 h-3", shapes[shape], color)}
      initial={{ 
        y: '50%', 
        x: startX,
        opacity: 1,
        rotate: 0,
        scale: 1
      }}
      animate={{ 
        y: [0, -150, 400],
        x: [startX, startX + (Math.random() * 150 - 75), startX + (Math.random() * 200 - 100)],
        opacity: [1, 1, 0],
        rotate: [0, 180 + Math.random() * 360, 720],
        scale: [1, 1.3, 0.5]
      }}
      transition={{ 
        duration: 2.5,
        delay,
        ease: "easeOut"
      }}
    />
  );
};

// Sparkle component
const Sparkle = ({ delay, size = 'md' }: { delay: number; size?: 'sm' | 'md' | 'lg' }) => {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' };
  
  return (
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
      <Sparkles className={cn(sizes[size], "text-warning")} />
    </motion.div>
  );
};

// Floating hearts for special celebrations
const FloatingHeart = ({ delay }: { delay: number }) => (
  <motion.div
    className="absolute"
    initial={{ 
      y: '100%', 
      x: `${Math.random() * 100}%`,
      opacity: 0,
      scale: 0
    }}
    animate={{ 
      y: '-100%',
      opacity: [0, 1, 1, 0],
      scale: [0, 1, 1.2, 0.8]
    }}
    transition={{ 
      duration: 3,
      delay,
      ease: "easeOut"
    }}
  >
    <Heart className="w-6 h-6 text-rose-500 fill-rose-500" />
  </motion.div>
);

// Star burst effect
const StarBurst = ({ delay }: { delay: number }) => (
  <motion.div
    className="absolute left-1/2 top-1/2"
    initial={{ scale: 0, opacity: 0 }}
    animate={{ 
      scale: [0, 2, 0],
      opacity: [0, 1, 0],
      rotate: [0, 180]
    }}
    transition={{ 
      duration: 0.6,
      delay,
      ease: "easeOut"
    }}
  >
    <Star className="w-12 h-12 text-warning fill-warning" />
  </motion.div>
);

const celebrationConfigs: Record<CelebrationType, {
  icon: React.ElementType;
  colors: string[];
  bgGradient: string;
  particles: 'confetti' | 'hearts' | 'stars' | 'mixed';
}> = {
  success: {
    icon: CheckCircle2,
    colors: ['bg-success', 'bg-emerald-400', 'bg-green-400', 'bg-teal-400'],
    bgGradient: 'from-success/20 to-emerald-500/20',
    particles: 'confetti'
  },
  achievement: {
    icon: Trophy,
    colors: ['bg-warning', 'bg-amber-400', 'bg-yellow-400', 'bg-orange-400'],
    bgGradient: 'from-warning/20 to-amber-500/20',
    particles: 'stars'
  },
  milestone: {
    icon: Target,
    colors: ['bg-primary', 'bg-violet-400', 'bg-purple-400', 'bg-indigo-400'],
    bgGradient: 'from-primary/20 to-violet-500/20',
    particles: 'confetti'
  },
  streak: {
    icon: Flame,
    colors: ['bg-warning', 'bg-red-400', 'bg-amber-400', 'bg-warning'],
    bgGradient: 'from-orange-500/20 to-red-500/20',
    particles: 'mixed'
  },
  'level-up': {
    icon: Crown,
    colors: ['bg-primary', 'bg-cyan-400', 'bg-blue-400', 'bg-violet-400'],
    bgGradient: 'from-primary/20 to-cyan-500/20',
    particles: 'stars'
  },
  purchase: {
    icon: Gift,
    colors: ['bg-success', 'bg-emerald-400', 'bg-teal-400'],
    bgGradient: 'from-success/20 to-teal-500/20',
    particles: 'confetti'
  },
  savings: {
    icon: TrendingUp,
    colors: ['bg-success', 'bg-green-400', 'bg-emerald-400'],
    bgGradient: 'from-success/20 to-green-500/20',
    particles: 'confetti'
  },
  record: {
    icon: Medal,
    colors: ['bg-amber-400', 'bg-yellow-400', 'bg-orange-400'],
    bgGradient: 'from-amber-400/20 to-orange-500/20',
    particles: 'stars'
  },
  'first-time': {
    icon: Rocket,
    colors: ['bg-info', 'bg-cyan-400', 'bg-blue-400'],
    bgGradient: 'from-info/20 to-cyan-500/20',
    particles: 'mixed'
  }
};

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
