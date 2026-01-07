import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";
import { ChevronRight, type LucideIcon, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PageHeaderAction {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive";
  disabled?: boolean;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  badge?: {
    label: string;
    variant?: "default" | "secondary" | "destructive" | "outline";
  };
  actions?: PageHeaderAction[];
  breadcrumbs?: { label: string; href?: string }[];
  tabs?: React.ReactNode;
  className?: string;
  compact?: boolean;
  showBack?: boolean;
  backHref?: string;
  loading?: boolean;
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
      <div className={cn("space-y-4 animate-pulse", className)}>
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-muted" />
          <div className="space-y-2">
            <div className="h-6 w-48 rounded bg-muted" />
            <div className="h-4 w-64 rounded bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className={cn("space-y-4", className)}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
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
                <a 
                  href={crumb.href} 
                  className="hover:text-foreground transition-colors hover:underline underline-offset-4"
                >
                  {crumb.label}
                </a>
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
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ArrowLeft className="h-4 w-4" />
            </motion.button>
          )}

          {/* Icon */}
          {Icon && !showBack && (
            <motion.div 
              className="hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
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
                >
                  <Badge variant={badge.variant || "secondary"}>
                    {badge.label}
                  </Badge>
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
                    disabled={action.disabled}
                    className="gap-2"
                  >
                    {ActionIcon && <ActionIcon className="w-4 h-4" />}
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

// Stats row for page headers
interface HeaderStatProps {
  label: string;
  value: string | number;
  trend?: {
    value: number;
    direction: "up" | "down" | "neutral";
  };
  icon?: LucideIcon;
}

export const PageHeaderStats = ({ stats }: { stats: HeaderStatProps[] }) => (
  <motion.div 
    className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-4 md:gap-6 pt-2 overflow-x-auto scrollbar-hide"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: 0.3 }}
  >
    {stats.map((stat, index) => {
      const StatIcon = stat.icon;
      return (
        <motion.div 
          key={index} 
          className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg bg-muted/50 min-w-0"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 + index * 0.05 }}
        >
          {StatIcon && <StatIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground shrink-0" />}
          <span className="text-xs sm:text-sm text-muted-foreground truncate">{stat.label}:</span>
          <span className="font-semibold text-foreground text-xs sm:text-sm truncate">{stat.value}</span>
          {stat.trend && (
            <span className={cn(
              "text-[10px] sm:text-xs font-medium px-1 sm:px-1.5 py-0.5 rounded shrink-0",
              stat.trend.direction === "up" && "text-success bg-success/10",
              stat.trend.direction === "down" && "text-destructive bg-destructive/10",
              stat.trend.direction === "neutral" && "text-muted-foreground bg-muted"
            )}>
              {stat.trend.direction === "up" ? "↑" : stat.trend.direction === "down" ? "↓" : "→"}
              {Math.abs(stat.trend.value)}%
            </span>
          )}
        </motion.div>
      );
    })}
  </motion.div>
);

// Quick Actions Bar
interface QuickAction {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  variant?: "default" | "primary" | "success" | "warning" | "destructive";
}

export const PageHeaderQuickActions = ({ actions }: { actions: QuickAction[] }) => {
  const variantStyles = {
    default: "bg-muted hover:bg-muted/80 text-foreground",
    primary: "bg-primary/10 hover:bg-primary/20 text-primary",
    success: "bg-success/10 hover:bg-success/20 text-success",
    warning: "bg-warning/10 hover:bg-warning/20 text-warning",
    destructive: "bg-destructive/10 hover:bg-destructive/20 text-destructive",
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
            className={cn(
              "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              variantStyles[action.variant || "default"]
            )}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 + index * 0.05 }}
          >
            <ActionIcon className="w-4 h-4" />
            {action.label}
          </motion.button>
        );
      })}
    </motion.div>
  );
};
