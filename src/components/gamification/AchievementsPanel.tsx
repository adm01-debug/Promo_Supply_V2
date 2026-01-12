import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  Star,
  Zap,
  Target,
  Award,
  TrendingUp,
  Clock,
  CheckCircle2,
  Users,
  ShoppingCart,
  DollarSign,
  FileText,
  Flame,
  Crown,
  Medal,
  Sparkles,
  Gift,
  Lock,
  ChevronRight,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// Types
interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  category: 'productivity' | 'savings' | 'quality' | 'speed' | 'collaboration';
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  progress: number;
  target: number;
  unlocked: boolean;
  unlockedAt?: string;
  xpReward: number;
}

interface UserStats {
  level: number;
  currentXP: number;
  nextLevelXP: number;
  totalXP: number;
  streak: number;
  rank: number;
  totalUsers: number;
  achievements: Achievement[];
}

// Tier configuration
const tierConfig = {
  bronze: { color: 'text-amber-600', bg: 'bg-amber-500/10', border: 'border-amber-500/30', gradient: 'from-amber-600 to-amber-800' },
  silver: { color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/30', gradient: 'from-slate-400 to-slate-600' },
  gold: { color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', gradient: 'from-yellow-400 to-yellow-600' },
  platinum: { color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', gradient: 'from-cyan-400 to-blue-500' },
  diamond: { color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30', gradient: 'from-purple-400 to-pink-500' },
};

const categoryConfig = {
  productivity: { label: 'Produtividade', icon: Zap, color: 'text-yellow-500' },
  savings: { label: 'Economia', icon: DollarSign, color: 'text-emerald-500' },
  quality: { label: 'Qualidade', icon: Star, color: 'text-blue-500' },
  speed: { label: 'Velocidade', icon: Clock, color: 'text-orange-500' },
  collaboration: { label: 'Colaboração', icon: Users, color: 'text-purple-500' },
};

// Mock achievements data
const mockAchievements: Achievement[] = [
  {
    id: '1',
    title: 'Primeiro Pedido',
    description: 'Conclua seu primeiro pedido de compra',
    icon: ShoppingCart,
    category: 'productivity',
    tier: 'bronze',
    progress: 1,
    target: 1,
    unlocked: true,
    unlockedAt: '2024-01-15',
    xpReward: 100,
  },
  {
    id: '2',
    title: 'Negociador Expert',
    description: 'Economize R$ 10.000 em negociações',
    icon: DollarSign,
    category: 'savings',
    tier: 'gold',
    progress: 8500,
    target: 10000,
    unlocked: false,
    xpReward: 500,
  },
  {
    id: '3',
    title: 'Velocista',
    description: 'Processe 10 pedidos em um único dia',
    icon: Zap,
    category: 'speed',
    tier: 'silver',
    progress: 7,
    target: 10,
    unlocked: false,
    xpReward: 300,
  },
  {
    id: '4',
    title: 'Qualidade Impecável',
    description: 'Mantenha 100% de aprovação por 30 dias',
    icon: CheckCircle2,
    category: 'quality',
    tier: 'platinum',
    progress: 22,
    target: 30,
    unlocked: false,
    xpReward: 750,
  },
  {
    id: '5',
    title: 'Mestre em Compras',
    description: 'Complete 100 pedidos de compra',
    icon: Crown,
    category: 'productivity',
    tier: 'diamond',
    progress: 45,
    target: 100,
    unlocked: false,
    xpReward: 1000,
  },
  {
    id: '6',
    title: 'Em Chamas',
    description: 'Mantenha um streak de 7 dias consecutivos',
    icon: Flame,
    category: 'productivity',
    tier: 'silver',
    progress: 5,
    target: 7,
    unlocked: false,
    xpReward: 250,
  },
  {
    id: '7',
    title: 'Colaborador',
    description: 'Trabalhe com 5 fornecedores diferentes',
    icon: Users,
    category: 'collaboration',
    tier: 'bronze',
    progress: 5,
    target: 5,
    unlocked: true,
    unlockedAt: '2024-01-20',
    xpReward: 150,
  },
];

const mockUserStats: UserStats = {
  level: 12,
  currentXP: 2850,
  nextLevelXP: 3500,
  totalXP: 15350,
  streak: 5,
  rank: 3,
  totalUsers: 25,
  achievements: mockAchievements,
};

// Achievement Card Component
const AchievementCard = ({ achievement, compact = false }: { achievement: Achievement; compact?: boolean }) => {
  const tier = tierConfig[achievement.tier];
  const category = categoryConfig[achievement.category];
  const progressPercent = Math.min((achievement.progress / achievement.target) * 100, 100);
  const Icon = achievement.icon;

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            whileHover={{ scale: 1.1 }}
            className={cn(
              "relative w-12 h-12 rounded-xl flex items-center justify-center cursor-pointer",
              achievement.unlocked ? tier.bg : "bg-muted/50",
              achievement.unlocked ? tier.border : "border-muted",
              "border"
            )}
          >
            <Icon className={cn("w-6 h-6", achievement.unlocked ? tier.color : "text-muted-foreground")} />
            {!achievement.unlocked && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-xl">
                <Lock className="w-3 h-3 text-muted-foreground" />
              </div>
            )}
          </motion.div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p className="font-semibold">{achievement.title}</p>
          <p className="text-xs text-muted-foreground">{achievement.description}</p>
          {!achievement.unlocked && (
            <p className="text-xs mt-1">
              {achievement.progress.toLocaleString()} / {achievement.target.toLocaleString()}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative p-4 rounded-xl border transition-all",
        achievement.unlocked 
          ? `${tier.bg} ${tier.border} hover:shadow-lg` 
          : "bg-muted/30 border-muted/50 hover:bg-muted/50"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "p-2.5 rounded-lg",
          achievement.unlocked ? tier.bg : "bg-muted"
        )}>
          <Icon className={cn(
            "w-6 h-6",
            achievement.unlocked ? tier.color : "text-muted-foreground"
          )} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className={cn(
              "font-medium truncate",
              achievement.unlocked ? "text-foreground" : "text-muted-foreground"
            )}>
              {achievement.title}
            </h4>
            <Badge variant="outline" className={cn("text-[10px] shrink-0", tier.color, tier.border)}>
              {achievement.tier.toUpperCase()}
            </Badge>
          </div>
          
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
            {achievement.description}
          </p>
          
          {!achievement.unlocked && (
            <div className="mt-2">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Progresso</span>
                <span className={tier.color}>
                  {achievement.progress.toLocaleString()} / {achievement.target.toLocaleString()}
                </span>
              </div>
              <Progress value={progressPercent} className="h-1.5" />
            </div>
          )}
          
          {achievement.unlocked && achievement.unlockedAt && (
            <p className="text-xs text-muted-foreground mt-1">
              Desbloqueado em {new Date(achievement.unlockedAt).toLocaleDateString('pt-BR')}
            </p>
          )}
        </div>
        
        <div className="text-right shrink-0">
          <div className="flex items-center gap-1 text-amber-500">
            <Sparkles className="w-3 h-3" />
            <span className="text-xs font-medium">+{achievement.xpReward} XP</span>
          </div>
        </div>
      </div>
      
      {!achievement.unlocked && (
        <div className="absolute inset-0 bg-background/10 rounded-xl pointer-events-none" />
      )}
    </motion.div>
  );
};

// Level Badge Component
const LevelBadge = ({ level, size = 'md' }: { level: number; size?: 'sm' | 'md' | 'lg' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-lg',
  };

  return (
    <motion.div
      whileHover={{ rotate: [0, -5, 5, 0] }}
      className={cn(
        "relative rounded-full flex items-center justify-center font-bold",
        "bg-gradient-to-br from-primary to-primary/70",
        "text-primary-foreground shadow-lg",
        sizeClasses[size]
      )}
    >
      {level}
      <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping opacity-20" />
    </motion.div>
  );
};

// Streak Indicator Component
const StreakIndicator = ({ streak }: { streak: number }) => (
  <motion.div
    animate={{ scale: [1, 1.05, 1] }}
    transition={{ repeat: Infinity, duration: 2 }}
    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/30"
  >
    <Flame className="w-4 h-4 text-orange-500" />
    <span className="text-sm font-medium text-orange-500">{streak} dias</span>
  </motion.div>
);

// Main Achievements Panel Component
export const AchievementsPanel = () => {
  const [stats] = useState<UserStats>(mockUserStats);
  const [activeTab, setActiveTab] = useState<string>('all');

  const filteredAchievements = useMemo(() => {
    if (activeTab === 'all') return stats.achievements;
    if (activeTab === 'unlocked') return stats.achievements.filter(a => a.unlocked);
    if (activeTab === 'locked') return stats.achievements.filter(a => !a.unlocked);
    return stats.achievements.filter(a => a.category === activeTab);
  }, [stats.achievements, activeTab]);

  const unlockedCount = stats.achievements.filter(a => a.unlocked).length;
  const xpProgress = (stats.currentXP / stats.nextLevelXP) * 100;

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Level Card */}
        <Card className="p-4 col-span-2">
          <div className="flex items-center gap-4">
            <LevelBadge level={stats.level} size="lg" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">Nível {stats.level}</span>
                <span className="text-xs text-muted-foreground">
                  {stats.currentXP.toLocaleString()} / {stats.nextLevelXP.toLocaleString()} XP
                </span>
              </div>
              <Progress value={xpProgress} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                Faltam {(stats.nextLevelXP - stats.currentXP).toLocaleString()} XP para o próximo nível
              </p>
            </div>
          </div>
        </Card>

        {/* Streak Card */}
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <Flame className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.streak}</p>
              <p className="text-xs text-muted-foreground">Dias consecutivos</p>
            </div>
          </div>
        </Card>

        {/* Rank Card */}
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Trophy className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">#{stats.rank}</p>
              <p className="text-xs text-muted-foreground">de {stats.totalUsers} usuários</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Achievements Section */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" />
              Conquistas
            </h3>
            <p className="text-sm text-muted-foreground">
              {unlockedCount} de {stats.achievements.length} desbloqueadas
            </p>
          </div>
          <Badge variant="secondary">
            {stats.totalXP.toLocaleString()} XP Total
          </Badge>
        </div>

        {/* Category Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
          <TabsList className="flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="all" className="text-xs">Todas</TabsTrigger>
            <TabsTrigger value="unlocked" className="text-xs">Desbloqueadas</TabsTrigger>
            <TabsTrigger value="locked" className="text-xs">Bloqueadas</TabsTrigger>
            {Object.entries(categoryConfig).map(([key, config]) => (
              <TabsTrigger key={key} value={key} className="text-xs gap-1">
                <config.icon className="w-3 h-3" />
                {config.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Achievements Grid */}
        <ScrollArea className="h-[400px]">
          <div className="grid gap-3">
            <AnimatePresence mode="popLayout">
              {filteredAchievements.map((achievement) => (
                <AchievementCard key={achievement.id} achievement={achievement} />
              ))}
            </AnimatePresence>
            
            {filteredAchievements.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Award className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p>Nenhuma conquista encontrada</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </Card>

      {/* Quick Achievement Badges */}
      <Card className="p-4">
        <h4 className="text-sm font-medium mb-3">Próximas Conquistas</h4>
        <div className="flex flex-wrap gap-2">
          {stats.achievements
            .filter(a => !a.unlocked)
            .sort((a, b) => (b.progress / b.target) - (a.progress / a.target))
            .slice(0, 6)
            .map(achievement => (
              <AchievementCard key={achievement.id} achievement={achievement} compact />
            ))}
        </div>
      </Card>
    </div>
  );
};

// Compact Widget for Dashboard
export const AchievementsWidget = () => {
  const [stats] = useState<UserStats>(mockUserStats);
  const xpProgress = (stats.currentXP / stats.nextLevelXP) * 100;

  const nearCompletion = stats.achievements
    .filter(a => !a.unlocked && (a.progress / a.target) >= 0.7)
    .slice(0, 3);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <LevelBadge level={stats.level} size="md" />
          <div>
            <h4 className="font-medium">Nível {stats.level}</h4>
            <p className="text-xs text-muted-foreground">{stats.currentXP} / {stats.nextLevelXP} XP</p>
          </div>
        </div>
        <StreakIndicator streak={stats.streak} />
      </div>

      <Progress value={xpProgress} className="h-2 mb-4" />

      {nearCompletion.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2">Quase lá:</p>
          <div className="space-y-2">
            {nearCompletion.map(achievement => {
              const tier = tierConfig[achievement.tier];
              const Icon = achievement.icon;
              const progressPercent = (achievement.progress / achievement.target) * 100;
              
              return (
                <div key={achievement.id} className="flex items-center gap-2">
                  <Icon className={cn("w-4 h-4", tier.color)} />
                  <span className="text-xs truncate flex-1">{achievement.title}</span>
                  <span className="text-xs text-muted-foreground">{Math.round(progressPercent)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Dialog>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full mt-3">
            Ver todas conquistas
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Minhas Conquistas</DialogTitle>
          </DialogHeader>
          <AchievementsPanel />
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default AchievementsPanel;
