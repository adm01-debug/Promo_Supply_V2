import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ChevronRight, type LucideIcon } from "lucide-react";

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
}: PageHeaderProps) => {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1 text-sm text-muted-foreground">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              {index > 0 && <ChevronRight className="w-4 h-4" />}
              {crumb.href ? (
                <a 
                  href={crumb.href} 
                  className="hover:text-foreground transition-colors"
                >
                  {crumb.label}
                </a>
              ) : (
                <span className="text-foreground font-medium">{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      {/* Main Header */}
      <div className={cn(
        "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4",
        compact && "sm:items-start"
      )}>
        <div className="flex items-start gap-4">
          {/* Icon */}
          {Icon && (
            <div className="hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-6 w-6" />
            </div>
          )}

          {/* Title & Description */}
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className={cn(
                "font-bold text-foreground tracking-tight",
                compact ? "text-xl" : "text-2xl"
              )}>
                {title}
              </h1>
              {badge && (
                <Badge variant={badge.variant || "secondary"}>
                  {badge.label}
                </Badge>
              )}
            </div>
            {description && (
              <p className="text-sm text-muted-foreground max-w-2xl">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        {actions && actions.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            {actions.map((action, index) => {
              const ActionIcon = action.icon;
              return (
                <Button
                  key={index}
                  variant={action.variant || "default"}
                  onClick={action.onClick}
                  disabled={action.disabled}
                  className="gap-2"
                >
                  {ActionIcon && <ActionIcon className="w-4 h-4" />}
                  {action.label}
                </Button>
              );
            })}
          </div>
        )}
      </div>

      {/* Tabs */}
      {tabs && (
        <>
          <Separator />
          {tabs}
        </>
      )}
    </div>
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
}

export const PageHeaderStats = ({ stats }: { stats: HeaderStatProps[] }) => (
  <div className="flex flex-wrap items-center gap-6 pt-2">
    {stats.map((stat, index) => (
      <div key={index} className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{stat.label}:</span>
        <span className="font-semibold text-foreground">{stat.value}</span>
        {stat.trend && (
          <span className={cn(
            "text-xs font-medium",
            stat.trend.direction === "up" && "text-success",
            stat.trend.direction === "down" && "text-destructive",
            stat.trend.direction === "neutral" && "text-muted-foreground"
          )}>
            {stat.trend.direction === "up" ? "↑" : stat.trend.direction === "down" ? "↓" : "→"}
            {Math.abs(stat.trend.value)}%
          </span>
        )}
      </div>
    ))}
  </div>
);
