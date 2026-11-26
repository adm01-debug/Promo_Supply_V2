import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Sparkles, Heart, Star } from "lucide-react";

// Enhanced confetti particle component
export const Confetti = ({ 
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
export const Sparkle = ({ delay, size = 'md' }: { delay: number; size?: 'sm' | 'md' | 'lg' }) => {
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
export const FloatingHeart = ({ delay }: { delay: number }) => (
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
export const StarBurst = ({ delay }: { delay: number }) => (
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

export type CelebrationType = 
  | 'success' 
  | 'achievement' 
  | 'milestone' 
  | 'streak' 
  | 'level-up'
  | 'purchase'
  | 'savings'
  | 'record'
  | 'first-time';

export interface CelebrationConfig {
  type: CelebrationType;
  title: string;
  subtitle?: string;
  icon?: React.ElementType;
  duration?: number;
  confettiCount?: number;
  sound?: boolean;
}

import {
  CheckCircle2, Trophy, Target, Flame, Crown, Gift, TrendingUp, Medal, Rocket
} from "lucide-react";

export const celebrationConfigs: Record<CelebrationType, {
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
