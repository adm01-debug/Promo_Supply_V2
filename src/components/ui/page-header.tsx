import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";
import { ChevronRight, type LucideIcon, ArrowLeft } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";

// Re-export sub-components for backward compatibility
export { PageHeaderStats, PageHeaderQuickActions, PageHero } from "./page-header-extras";

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
  title, description, icon: Icon, badge, actions, breadcrumbs, tabs,
  className, compact = false, showBack = false, backHref, loading = false, gradient = false,
}: PageHeaderProps) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (backHref) { navigate(backHref); } else { navigate(-1); }
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
      className={cn("space-y-4 relative", gradient && "pb-4", className)}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {gradient && (
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-transparent to-transparent rounded-2xl" />
      )}

      {breadcrumbs && breadcrumbs.length > 0 && (
        <motion.nav className="flex items-center gap-1 text-sm text-muted-foreground" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              {index > 0 && <ChevronRight className="w-4 h-4" />}
              {crumb.href ? (
                <Link to={crumb.href} className="hover:text-foreground transition-colors hover:underline underline-offset-4">{crumb.label}</Link>
              ) : (
                <span className="text-foreground font-medium">{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </motion.nav>
      )}

      <div className={cn("flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4", compact && "sm:items-start")}>
        <div className="flex items-start gap-4">
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

          {Icon && !showBack && (
            <motion.div 
              className={cn("hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-xl", "bg-gradient-to-br from-primary/20 to-primary/5 text-primary", "shadow-lg shadow-primary/10")}
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <Icon className="h-6 w-6" />
            </motion.div>
          )}

          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <motion.h1 
                className={cn("font-bold text-foreground tracking-tight", compact ? "text-xl" : "text-2xl md:text-3xl")}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                {title}
              </motion.h1>
              {badge && (
                <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="relative">
                  <Badge variant={badge.variant || "secondary"} className={cn(badge.pulse && "animate-pulse")}>{badge.label}</Badge>
                  {badge.pulse && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary rounded-full animate-ping" />}
                </motion.div>
              )}
            </div>
            {description && (
              <motion.p className="text-sm text-muted-foreground max-w-2xl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
                {description}
              </motion.p>
            )}
          </div>
        </div>

        {actions && actions.length > 0 && (
          <motion.div className="flex items-center gap-2 shrink-0" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            {actions.map((action, index) => {
              const ActionIcon = action.icon;
              return (
                <motion.div key={index} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button variant={action.variant || "default"} onClick={action.onClick} disabled={action.disabled || action.loading} className="gap-2">
                    {action.loading ? (
                      <motion.div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
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

      {tabs && (
        <>
          <Separator />
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            {tabs}
          </motion.div>
        </>
      )}
    </motion.div>
  );
};
