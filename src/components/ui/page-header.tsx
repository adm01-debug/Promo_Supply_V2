import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import { ChevronRight, type LucideIcon, ArrowLeft, TrendingUp, TrendingDown, Minus, Sparkles, Info } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useEffect } from "react";

interface PageHeaderAction {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive";
  disabled?: boolean;
  loading?: boolean;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  badge?: {
    label: string;
    variant?: "default" | "secondary" | "destructive" | "outline";
    pulse?: boolean;
  };
  actions?: PageHeaderAction[];
  breadcrumbs?: { label: string; href?: string }[];
  tabs?: React.ReactNode;
  className?: string;
  compact?: boolean;
  showBack?: boolean;
  backHref?: string;
  loading?: boolean;
  gradient?: boolean;
}

export const PageHeader = ({
  title,
  description,
  icon: Icon,
  badge,
  actions,
  breadcrumbs,
  tabs,
  className,
  compact = false,
  showBack = false,
  backHref,
  loading = false,
  gradient = false,
}: PageHeaderProps) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (backHref) {
      navigate(backHref);
    } else {
      navigate(-1);
    }
  };

  if (loading) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-muted animate-pulse" />
          <div className="space-y-2">
            <div className="h-6 w-48 rounded bg-muted animate-pulse" />
            <div className="h-4 w-64 rounded bg-muted animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className={cn(
        "space-y-4 relative",
        gradient && "pb-4",
        className
      )}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Optional gradient background */}
      {gradient && (
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-transparent to-transparent rounded-2xl" />
      )}

      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <motion.nav 
          className="flex items-center gap-1 text-sm text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              {index > 0 && <ChevronRight className="w-4 h-4" />}
              {crumb.href ? (
                <Link 
                  to={crumb.href} 
                  className="hover:text-foreground transition-colors hover:underline underline-offset-4"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-foreground font-medium">{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </motion.nav>
      )}

      {/* Main Header */}
      <div className={cn(
        "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4",
        compact && "sm:items-start"
      )}>
        <div className="flex items-start gap-4">
          {/* Back Button */}
          {showBack && (
            <motion.button
              onClick={handleBack}
              className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-background hover:bg-muted transition-colors"
              whileHover={{ scale: 1.05, x: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              <ArrowLeft className="h-4 w-4" />
            </motion.button>
          )}

          {/* Icon */}
          {Icon && !showBack && (
            <motion.div 
              className={cn(
                "hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
                "bg-gradient-to-br from-primary/20 to-primary/5 text-primary",
                "shadow-lg shadow-primary/10"
              )}
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <Icon className="h-6 w-6" />
            </motion.div>
          )}

          {/* Title & Description */}
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <motion.h1 
                className={cn(
                  "font-bold text-foreground tracking-tight",
                  compact ? "text-xl" : "text-2xl md:text-3xl"
                )}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                {title}
              </motion.h1>
              {badge && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="relative"
                >
                  <Badge 
                    variant={badge.variant || "secondary"}
                    className={cn(
                      badge.pulse && "animate-pulse"
                    )}
                  >
                    {badge.label}
                  </Badge>
                  {badge.pulse && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary rounded-full animate-ping" />
                  )}
                </motion.div>
              )}
            </div>
            {description && (
              <motion.p 
                className="text-sm text-muted-foreground max-w-2xl"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15 }}
              >
                {description}
              </motion.p>
            )}
          </div>
        </div>

        {/* Actions */}
        {actions && actions.length > 0 && (
          <motion.div 
            className="flex items-center gap-2 shrink-0"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            {actions.map((action, index) => {
              const ActionIcon = action.icon;
              return (
                <motion.div
                  key={index}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    variant={action.variant || "default"}
                    onClick={action.onClick}
                    disabled={action.disabled || action.loading}
                    className="gap-2"
                  >
                    {action.loading ? (
                      <motion.div
                        className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      />
                    ) : (
                      ActionIcon && <ActionIcon className="w-4 h-4" />
                    )}
                    {action.label}
                  </Button>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>

      {/* Tabs */}
      {tabs && (
        <>
          <Separator />
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            {tabs}
          </motion.div>
        </>
      )}
    </motion.div>
  );
};

// Animated counter component
function AnimatedCounter({ value, duration = 1 }: { value: number; duration?: number }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));
  const [displayValue, setDisplayValue] = React.useState(0);

  useEffect(() => {
    const animation = animate(count, value, { duration });
    const unsubscribe = rounded.on("change", (latest) => setDisplayValue(latest));
    
    return () => {
      animation.stop();
      unsubscribe();
    };
  }, [value, duration, count, rounded]);

  return <>{displayValue.toLocaleString('pt-BR')}</>;
}

// Stats row for page headers
interface HeaderStatProps {
  label: string;
  value: string | number;
  trend?: {
    value: number;
    direction: "up" | "down" | "neutral";
  };
  icon?: LucideIcon;
  tooltip?: string;
  highlight?: boolean;
  animate?: boolean;
  prefix?: string;
  suffix?: string;
}

export const PageHeaderStats = ({ 
  stats, 
  variant = "default" 
}: { 
  stats: HeaderStatProps[];
  variant?: "default" | "cards" | "minimal";
}) => {
  if (variant === "cards") {
    return (
      <motion.div 
        className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        {stats.map((stat, index) => {
          const StatIcon = stat.icon;
          const TrendIcon = stat.trend?.direction === "up" ? TrendingUp : 
                           stat.trend?.direction === "down" ? TrendingDown : Minus;
          
          return (
            <motion.div 
              key={index}
              className={cn(
                "relative p-3 rounded-xl border bg-card overflow-hidden",
                stat.highlight && "ring-2 ring-primary/20"
              )}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.3 + index * 0.05 }}
              whileHover={{ y: -2, transition: { duration: 0.2 } }}
            >
              {stat.highlight && (
                <div className="absolute top-0 right-0 p-1">
                  <Sparkles className="w-3 h-3 text-primary" />
                </div>
              )}
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    {stat.label}
                    {stat.tooltip && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3 h-3 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs max-w-48">
                          {stat.tooltip}
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </p>
                  <p className="text-lg font-bold text-foreground">
                    {stat.prefix}
                    {stat.animate && typeof stat.value === 'number' ? (
                      <AnimatedCounter value={stat.value} />
                    ) : (
                      stat.value
                    )}
                    {stat.suffix}
                  </p>
                </div>
                {StatIcon && (
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <StatIcon className="w-4 h-4" />
                  </div>
                )}
              </div>
              {stat.trend && (
                <div className={cn(
                  "flex items-center gap-1 mt-2 text-xs font-medium",
                  stat.trend.direction === "up" && "text-success dark:text-success",
                  stat.trend.direction === "down" && "text-destructive dark:text-destructive",
                  stat.trend.direction === "neutral" && "text-muted-foreground"
                )}>
                  <TrendIcon className="w-3 h-3" />
                  <span>{Math.abs(stat.trend.value)}% vs período anterior</span>
                </div>
              )}
            </motion.div>
          );
        })}
      </motion.div>
    );
  }

  if (variant === "minimal") {
    return (
      <motion.div 
        className="flex items-center gap-6 pt-2 text-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        {stats.map((stat, index) => {
          const StatIcon = stat.icon;
          return (
            <motion.div 
              key={index} 
              className="flex items-center gap-1.5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 + index * 0.05 }}
            >
              {StatIcon && <StatIcon className="w-4 h-4 text-muted-foreground" />}
              <span className="text-muted-foreground">{stat.label}:</span>
              <span className="font-semibold text-foreground">
                {stat.prefix}
                {stat.animate && typeof stat.value === 'number' ? (
                  <AnimatedCounter value={stat.value} />
                ) : (
                  stat.value
                )}
                {stat.suffix}
              </span>
            </motion.div>
          );
        })}
      </motion.div>
    );
  }

  // Default variant
  return (
    <motion.div 
      className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-4 md:gap-6 pt-2 overflow-x-auto scrollbar-hide"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
    >
      {stats.map((stat, index) => {
        const StatIcon = stat.icon;
        const TrendIcon = stat.trend?.direction === "up" ? TrendingUp : 
                         stat.trend?.direction === "down" ? TrendingDown : Minus;
        
        return (
          <Tooltip key={index}>
            <TooltipTrigger asChild>
              <motion.div 
                className={cn(
                  "flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg min-w-0 cursor-default transition-colors",
                  stat.highlight 
                    ? "bg-primary/10 border border-primary/20" 
                    : "bg-muted/50 hover:bg-muted/80"
                )}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.05 }}
                whileHover={{ scale: 1.02 }}
              >
                {StatIcon && (
                  <StatIcon className={cn(
                    "w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0",
                    stat.highlight ? "text-primary" : "text-muted-foreground"
                  )} />
                )}
                <span className="text-xs sm:text-sm text-muted-foreground truncate">{stat.label}:</span>
                <span className={cn(
                  "font-semibold text-xs sm:text-sm truncate",
                  stat.highlight ? "text-primary" : "text-foreground"
                )}>
                  {stat.prefix}
                  {stat.animate && typeof stat.value === 'number' ? (
                    <AnimatedCounter value={stat.value} />
                  ) : (
                    stat.value
                  )}
                  {stat.suffix}
                </span>
                {stat.trend && (
                  <span className={cn(
                    "flex items-center gap-0.5 text-[10px] sm:text-xs font-medium px-1 sm:px-1.5 py-0.5 rounded shrink-0",
                    stat.trend.direction === "up" && "text-success dark:text-success bg-success/10",
                    stat.trend.direction === "down" && "text-destructive dark:text-destructive bg-destructive/10",
                    stat.trend.direction === "neutral" && "text-muted-foreground bg-muted"
                  )}>
                    <TrendIcon className="w-2.5 h-2.5" />
                    {Math.abs(stat.trend.value)}%
                  </span>
                )}
              </motion.div>
            </TooltipTrigger>
            {stat.tooltip && (
              <TooltipContent side="bottom" className="text-xs">
                {stat.tooltip}
              </TooltipContent>
            )}
          </Tooltip>
        );
      })}
    </motion.div>
  );
};

// Quick Actions Bar
interface QuickAction {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  variant?: "default" | "primary" | "success" | "warning" | "destructive";
  count?: number;
  disabled?: boolean;
}

export const PageHeaderQuickActions = ({ actions }: { actions: QuickAction[] }) => {
  const variantStyles = {
    default: "bg-muted hover:bg-muted/80 text-foreground",
    primary: "bg-primary/10 hover:bg-primary/20 text-primary",
    success: "bg-success/10 hover:bg-success/20 text-success dark:text-success",
    warning: "bg-warning/10 hover:bg-warning/20 text-warning dark:text-warning",
    destructive: "bg-destructive/10 hover:bg-destructive/20 text-destructive dark:text-destructive",
  };

  return (
    <motion.div 
      className="flex flex-wrap items-center gap-2 pt-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.35 }}
    >
      {actions.map((action, index) => {
        const ActionIcon = action.icon;
        return (
          <motion.button
            key={index}
            onClick={action.onClick}
            disabled={action.disabled}
            className={cn(
              "relative inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              variantStyles[action.variant || "default"],
              action.disabled && "opacity-50 cursor-not-allowed"
            )}
            whileHover={!action.disabled ? { scale: 1.02 } : undefined}
            whileTap={!action.disabled ? { scale: 0.98 } : undefined}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 + index * 0.05 }}
          >
            <ActionIcon className="w-4 h-4" />
            {action.label}
            {action.count !== undefined && action.count > 0 && (
              <motion.span 
                className="absolute -top-1.5 -right-1.5 min-w-5 h-5 flex items-center justify-center text-[10px] font-bold rounded-full bg-primary text-primary-foreground"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 25 }}
              >
                {action.count > 99 ? "99+" : action.count}
              </motion.span>
            )}
          </motion.button>
        );
      })}
    </motion.div>
  );
};

// Hero section for special pages
interface PageHeroProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  illustration?: React.ReactNode;
  actions?: PageHeaderAction[];
  gradient?: "primary" | "success" | "warning" | "info";
}

export const PageHero = ({
  title,
  description,
  icon: Icon,
  illustration,
  actions,
  gradient = "primary"
}: PageHeroProps) => {
  const gradientStyles = {
    primary: "from-primary/20 via-primary/5 to-transparent",
    success: "from-emerald-500/20 via-emerald-500/5 to-transparent",
    warning: "from-amber-500/20 via-amber-500/5 to-transparent",
    info: "from-blue-500/20 via-blue-500/5 to-transparent"
  };

  return (
    <motion.div 
      className={cn(
        "relative overflow-hidden rounded-2xl p-6 sm:p-8 bg-gradient-to-br",
        gradientStyles[gradient]
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div className="flex items-start gap-4">
          {Icon && (
            <motion.div 
              className="hidden sm:flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-background/80 backdrop-blur-sm shadow-lg"
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
            >
              <Icon className="h-8 w-8 text-primary" />
            </motion.div>
          )}
          <div className="space-y-2">
            <motion.h1 
              className="text-2xl sm:text-3xl font-bold text-foreground"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
            >
              {title}
            </motion.h1>
            <motion.p 
              className="text-muted-foreground max-w-xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {description}
            </motion.p>
          </div>
        </div>

        {actions && actions.length > 0 && (
          <motion.div 
            className="flex items-center gap-2 shrink-0"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 }}
          >
            {actions.map((action, index) => {
              const ActionIcon = action.icon;
              return (
                <motion.div
                  key={index}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    variant={action.variant || "default"}
                    onClick={action.onClick}
                    disabled={action.disabled}
                    className="gap-2"
                    size="lg"
                  >
                    {ActionIcon && <ActionIcon className="w-5 h-5" />}
                    {action.label}
                  </Button>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>

      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 opacity-10 pointer-events-none">
        {illustration || (Icon && <Icon className="w-full h-full" />)}
      </div>
    </motion.div>
  );
};
