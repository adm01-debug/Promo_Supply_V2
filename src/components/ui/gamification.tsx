import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { 
  Trophy, 
  Star, 
  Zap, 
  Award, 
  Target,
  TrendingUp,
  Medal,
  Crown,
  Flame,
  Shield,
  Gem,
  Rocket
} from "lucide-react";
import { Progress } from "./progress";
import { Badge } from "./badge";
import { useTriggerCelebration } from "./celebration";

// ============================================
// XP PROGRESS BAR
// ============================================

interface XPProgressBarProps {
  currentXP: number;
  requiredXP: number;
  level: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function XPProgressBar({
  currentXP,
  requiredXP,
  level,
  showLabel = true,
  size = 'md',
  className,
}: XPProgressBarProps) {
  const progress = (currentXP / requiredXP) * 100;
  const heights = { sm: 'h-2', md: 'h-3', lg: 'h-4' };

  return (
    <div className={cn("space-y-1.5", className)}>
      {showLabel && (
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground font-bold text-xs">
              {level}
            </div>
            <span className="font-medium">Nível {level}</span>
          </div>
          <span className="text-muted-foreground">
            {currentXP.toLocaleString()} / {requiredXP.toLocaleString()} XP
          </span>
        </div>
      )}
      <div className={cn("relative bg-muted rounded-full overflow-hidden", heights[size])}>
        <motion.div
          className="h-full bg-gradient-to-r from-primary via-primary to-primary-glow rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
        {/* Shimmer effect */}
        <motion.div
          className="absolute inset-y-0 w-20 bg-gradient-to-r from-transparent via-white/30 to-transparent"
          animate={{ x: ['-100%', '500%'] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
        />
      </div>
    </div>
  );
}

// ============================================
// ACHIEVEMENT BADGE
// ============================================

type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary';

interface AchievementBadgeProps {
  icon: React.ElementType;
  title: string;
  description?: string;
  rarity: AchievementRarity;
  unlocked?: boolean;
  progress?: number; // 0-100
  unlockedAt?: Date;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

const rarityConfig = {
  common: { 
    color: 'from-gray-400 to-gray-500',
    border: 'border-gray-400',
    glow: 'shadow-gray-400/30',
    label: 'Comum'
  },
  rare: { 
    color: 'from-blue-400 to-blue-600',
    border: 'border-blue-400',
    glow: 'shadow-blue-400/30',
    label: 'Raro'
  },
  epic: { 
    color: 'from-purple-400 to-purple-600',
    border: 'border-purple-400',
    glow: 'shadow-purple-400/30',
    label: 'Épico'
  },
  legendary: { 
    color: 'from-amber-400 to-orange-500',
    border: 'border-amber-400',
    glow: 'shadow-amber-400/30',
    label: 'Lendário'
  },
};

export function AchievementBadge({
  icon: Icon,
  title,
  description,
  rarity,
  unlocked = false,
  progress,
  unlockedAt,
  size = 'md',
  onClick,
}: AchievementBadgeProps) {
  const config = rarityConfig[rarity];
  const sizes = {
    sm: { wrapper: 'w-12 h-12', icon: 'w-5 h-5' },
    md: { wrapper: 'w-16 h-16', icon: 'w-7 h-7' },
    lg: { wrapper: 'w-20 h-20', icon: 'w-9 h-9' },
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center text-center group cursor-pointer",
        !unlocked && "opacity-50 grayscale"
      )}
    >
      {/* Badge icon */}
      <motion.div
        className={cn(
          "relative rounded-full border-2 flex items-center justify-center",
          sizes[size].wrapper,
          unlocked ? config.border : 'border-muted',
          unlocked && `shadow-lg ${config.glow}`
        )}
        animate={unlocked ? {
          boxShadow: [
            `0 0 15px hsla(var(--primary) / 0.3)`,
            `0 0 25px hsla(var(--primary) / 0.5)`,
            `0 0 15px hsla(var(--primary) / 0.3)`,
          ]
        } : undefined}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {/* Background gradient */}
        {unlocked && (
          <div className={cn(
            "absolute inset-0 rounded-full bg-gradient-to-br opacity-20",
            config.color
          )} />
        )}
        
        <Icon className={cn(
          sizes[size].icon,
          unlocked ? 'text-foreground' : 'text-muted-foreground'
        )} />

        {/* Locked overlay */}
        {!unlocked && progress === undefined && (
          <div className="absolute inset-0 rounded-full bg-muted/50 flex items-center justify-center">
            <Shield className="w-4 h-4 text-muted-foreground" />
          </div>
        )}

        {/* Progress overlay */}
        {!unlocked && progress !== undefined && (
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="8"
            />
            <motion.circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="8"
              strokeDasharray={`${progress * 2.89} 289`}
              strokeLinecap="round"
              initial={{ strokeDasharray: '0 289' }}
              animate={{ strokeDasharray: `${progress * 2.89} 289` }}
              transition={{ duration: 0.5 }}
            />
          </svg>
        )}
      </motion.div>

      {/* Title and description */}
      <div className="mt-2 space-y-0.5">
        <p className="text-sm font-medium line-clamp-1">{title}</p>
        {description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{description}</p>
        )}
        <Badge 
          variant="outline" 
          className={cn(
            "text-[10px] px-1.5 py-0",
            unlocked && rarity === 'legendary' && 'border-amber-400 text-amber-500'
          )}
        >
          {config.label}
        </Badge>
      </div>
    </motion.button>
  );
}

// ============================================
// STREAK COUNTER
// ============================================

interface StreakCounterProps {
  count: number;
  label?: string;
  maxStreak?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function StreakCounter({
  count,
  label = "dias consecutivos",
  maxStreak,
  size = 'md',
  className,
}: StreakCounterProps) {
  const isHot = count >= 7;
  const sizes = {
    sm: { wrapper: 'gap-1', icon: 'w-5 h-5', count: 'text-xl', label: 'text-xs' },
    md: { wrapper: 'gap-2', icon: 'w-7 h-7', count: 'text-3xl', label: 'text-sm' },
    lg: { wrapper: 'gap-3', icon: 'w-10 h-10', count: 'text-5xl', label: 'text-base' },
  };

  return (
    <motion.div
      className={cn(
        "flex items-center",
        sizes[size].wrapper,
        className
      )}
      animate={isHot ? { scale: [1, 1.02, 1] } : undefined}
      transition={{ duration: 0.5, repeat: Infinity }}
    >
      <motion.div
        animate={isHot ? {
          rotate: [-5, 5, -5],
          filter: ['brightness(1)', 'brightness(1.2)', 'brightness(1)']
        } : undefined}
        transition={{ duration: 0.3, repeat: Infinity }}
      >
        <Flame className={cn(
          sizes[size].icon,
          isHot ? 'text-orange-500' : 'text-muted-foreground'
        )} />
      </motion.div>
      <div className="flex flex-col">
        <motion.span
          key={count}
          initial={{ scale: 1.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={cn("font-bold font-display", sizes[size].count)}
        >
          {count}
        </motion.span>
        <span className={cn("text-muted-foreground", sizes[size].label)}>
          {label}
        </span>
      </div>
      {maxStreak && count > 0 && (
        <Badge variant="secondary" className="ml-2 text-xs">
          Máx: {maxStreak}
        </Badge>
      )}
    </motion.div>
  );
}

// ============================================
// LEADERBOARD ITEM
// ============================================

interface LeaderboardItemProps {
  rank: number;
  name: string;
  score: number;
  avatar?: string;
  isCurrentUser?: boolean;
  change?: 'up' | 'down' | 'same';
  changeAmount?: number;
  className?: string;
}

export function LeaderboardItem({
  rank,
  name,
  score,
  avatar,
  isCurrentUser,
  change,
  changeAmount,
  className,
}: LeaderboardItemProps) {
  const getRankIcon = () => {
    if (rank === 1) return <Crown className="w-5 h-5 text-amber-400" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
    return <span className="font-bold text-muted-foreground">#{rank}</span>;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ scale: 1.02, x: 4 }}
      className={cn(
        "flex items-center gap-4 p-3 rounded-xl transition-colors",
        isCurrentUser ? "bg-primary/10 border border-primary/30" : "hover:bg-muted",
        rank <= 3 && "bg-gradient-to-r from-transparent to-amber-500/5",
        className
      )}
    >
      {/* Rank */}
      <div className="w-10 flex items-center justify-center">
        {getRankIcon()}
      </div>

      {/* Avatar */}
      <div className="relative">
        {avatar ? (
          <img 
            src={avatar} 
            alt={name} 
            className="w-10 h-10 rounded-full object-cover border-2 border-background"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
            {name.charAt(0).toUpperCase()}
          </div>
        )}
        {isCurrentUser && (
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center"
          >
            <Star className="w-2.5 h-2.5 text-primary-foreground" />
          </motion.div>
        )}
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          "font-medium truncate",
          isCurrentUser && "text-primary"
        )}>
          {name}
        </p>
        {change && (
          <div className={cn(
            "flex items-center gap-1 text-xs",
            change === 'up' && "text-success",
            change === 'down' && "text-destructive",
            change === 'same' && "text-muted-foreground"
          )}>
            <TrendingUp className={cn(
              "w-3 h-3",
              change === 'down' && "rotate-180"
            )} />
            {changeAmount && <span>{change === 'down' ? '-' : '+'}{changeAmount}</span>}
          </div>
        )}
      </div>

      {/* Score */}
      <div className="text-right">
        <p className="font-bold">{score.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground">pontos</p>
      </div>
    </motion.div>
  );
}

// ============================================
// POINTS EARNED POPUP
// ============================================

interface PointsEarnedPopupProps {
  points: number;
  reason?: string;
  icon?: React.ElementType;
  onComplete?: () => void;
}

export function PointsEarnedPopup({
  points,
  reason,
  icon: Icon = Star,
  onComplete,
}: PointsEarnedPopupProps) {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onComplete?.();
    }, 2000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.8 }}
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
    >
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 0.5, repeat: 2 }}
        className="bg-card border shadow-2xl rounded-2xl px-6 py-4 flex items-center gap-3"
      >
        <motion.div
          animate={{ rotate: [0, 360], scale: [1, 1.2, 1] }}
          transition={{ duration: 0.5 }}
          className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center"
        >
          <Icon className="w-6 h-6 text-primary" />
        </motion.div>
        <div>
          <motion.p
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="text-2xl font-bold text-primary"
          >
            +{points} XP
          </motion.p>
          {reason && (
            <p className="text-sm text-muted-foreground">{reason}</p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================
// MISSION CARD
// ============================================

interface MissionCardProps {
  title: string;
  description: string;
  reward: number;
  progress: number;
  target: number;
  icon?: React.ElementType;
  difficulty?: 'easy' | 'medium' | 'hard';
  timeLeft?: string;
  onClaim?: () => void;
}

const difficultyConfig = {
  easy: { color: 'text-success', bg: 'bg-success/10', label: 'Fácil' },
  medium: { color: 'text-warning', bg: 'bg-warning/10', label: 'Médio' },
  hard: { color: 'text-destructive', bg: 'bg-destructive/10', label: 'Difícil' },
};

export function MissionCard({
  title,
  description,
  reward,
  progress,
  target,
  icon: Icon = Target,
  difficulty = 'medium',
  timeLeft,
  onClaim,
}: MissionCardProps) {
  const isComplete = progress >= target;
  const percentage = Math.min((progress / target) * 100, 100);
  const diffConfig = difficultyConfig[difficulty];
  const { celebrateAchievement } = useTriggerCelebration();

  const handleClaim = () => {
    onClaim?.();
    celebrateAchievement('Missão Concluída!', `+${reward} XP`);
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={cn(
        "relative p-4 rounded-xl border bg-card overflow-hidden",
        isComplete && "border-success/50"
      )}
    >
      {/* Completion glow */}
      {isComplete && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-success/5 to-transparent"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}

      <div className="relative space-y-3">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center",
            diffConfig.bg
          )}>
            <Icon className={cn("w-5 h-5", diffConfig.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-medium truncate">{title}</h4>
              <Badge variant="outline" className={cn("text-[10px]", diffConfig.color)}>
                {diffConfig.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-1">{description}</p>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-medium">{progress}/{target}</span>
          </div>
          <Progress value={percentage} className="h-2" />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Gem className="w-4 h-4 text-primary" />
            <span className="font-bold text-primary">+{reward} XP</span>
          </div>
          {timeLeft && !isComplete && (
            <span className="text-xs text-muted-foreground">{timeLeft}</span>
          )}
          {isComplete && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleClaim}
              className="px-3 py-1.5 rounded-lg bg-success text-success-foreground text-sm font-medium"
            >
              Resgatar
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// LEVEL UP OVERLAY
// ============================================

interface LevelUpOverlayProps {
  level: number;
  rewards?: string[];
  onClose: () => void;
}

export function LevelUpOverlay({ level, rewards, onClose }: LevelUpOverlayProps) {
  React.useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="relative bg-card rounded-3xl p-8 text-center shadow-2xl border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Particles */}
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-primary"
            initial={{ 
              x: 0, 
              y: 0, 
              opacity: 1 
            }}
            animate={{ 
              x: (Math.random() - 0.5) * 300,
              y: (Math.random() - 0.5) * 300,
              opacity: 0,
              scale: 0
            }}
            transition={{ 
              duration: 1,
              delay: i * 0.05
            }}
            style={{ left: '50%', top: '50%' }}
          />
        ))}

        {/* Level badge */}
        <motion.div
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
          className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-lg"
        >
          <span className="text-4xl font-display font-bold text-primary-foreground">
            {level}
          </span>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-2xl font-display font-bold mb-2">
            Nível {level} Alcançado! 🎉
          </h2>
          <p className="text-muted-foreground mb-4">
            Parabéns pelo seu progresso!
          </p>
        </motion.div>

        {/* Rewards */}
        {rewards && rewards.length > 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="space-y-2 mt-4 pt-4 border-t"
          >
            <p className="text-sm font-medium">Recompensas desbloqueadas:</p>
            {rewards.map((reward, i) => (
              <motion.div
                key={reward}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.7 + i * 0.1 }}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <Star className="w-4 h-4 text-warning" />
                {reward}
              </motion.div>
            ))}
          </motion.div>
        )}

        <motion.button
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
          className="mt-6 px-6 py-2 rounded-full bg-primary text-primary-foreground font-medium"
        >
          <Rocket className="w-4 h-4 inline mr-2" />
          Continuar
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
