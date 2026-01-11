/**
 * Componentes otimizados com React.memo para evitar re-renders desnecessários
 */

import React, { memo, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

// ============================================
// OPTIMIZED STAT CARD
// ============================================

interface OptimizedStatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export const OptimizedStatCard = memo(function OptimizedStatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  className,
}: OptimizedStatCardProps) {
  const formattedValue = useMemo(() => {
    if (typeof value === 'number') {
      return value.toLocaleString('pt-BR');
    }
    return value;
  }, [value]);

  const trendColor = useMemo(() => {
    if (!trend) return '';
    return trend.isPositive ? 'text-success' : 'text-destructive';
  }, [trend]);

  return (
    <Card className={cn("transition-shadow hover:shadow-md", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formattedValue}</div>
        {(description || trend) && (
          <p className="text-xs text-muted-foreground mt-1">
            {trend && (
              <span className={cn("font-medium mr-1", trendColor)}>
                {trend.isPositive ? '+' : ''}{trend.value}%
              </span>
            )}
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
});

// ============================================
// OPTIMIZED LIST ITEM
// ============================================

interface OptimizedListItemProps {
  id: string;
  title: string;
  subtitle?: string;
  status?: string;
  statusVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
  onClick?: (id: string) => void;
  actions?: React.ReactNode;
  className?: string;
}

export const OptimizedListItem = memo(function OptimizedListItem({
  id,
  title,
  subtitle,
  status,
  statusVariant = 'default',
  onClick,
  actions,
  className,
}: OptimizedListItemProps) {
  const handleClick = useCallback(() => {
    onClick?.(id);
  }, [id, onClick]);

  return (
    <div
      className={cn(
        "flex items-center justify-between p-4 border-b last:border-b-0",
        "hover:bg-muted/50 transition-colors",
        onClick && "cursor-pointer",
        className
      )}
      onClick={handleClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{title}</p>
        {subtitle && (
          <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-2 ml-4">
        {status && (
          <Badge variant={statusVariant}>{status}</Badge>
        )}
        {actions}
      </div>
    </div>
  );
});

// ============================================
// OPTIMIZED DATA TABLE ROW
// ============================================

interface OptimizedTableRowProps {
  id: string;
  cells: React.ReactNode[];
  onClick?: (id: string) => void;
  selected?: boolean;
  className?: string;
}

export const OptimizedTableRow = memo(function OptimizedTableRow({
  id,
  cells,
  onClick,
  selected,
  className,
}: OptimizedTableRowProps) {
  const handleClick = useCallback(() => {
    onClick?.(id);
  }, [id, onClick]);

  return (
    <tr
      className={cn(
        "border-b transition-colors",
        "hover:bg-muted/50",
        selected && "bg-primary/5",
        onClick && "cursor-pointer",
        className
      )}
      onClick={handleClick}
    >
      {cells.map((cell, index) => (
        <td key={index} className="p-4">
          {cell}
        </td>
      ))}
    </tr>
  );
});

// ============================================
// OPTIMIZED ACTION BUTTON
// ============================================

interface OptimizedActionButtonProps {
  onClick: () => void;
  icon?: LucideIcon;
  label: string;
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

export const OptimizedActionButton = memo(function OptimizedActionButton({
  onClick,
  icon: Icon,
  label,
  variant = 'default',
  size = 'default',
  disabled,
  loading,
  className,
}: OptimizedActionButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      onClick={onClick}
      disabled={disabled || loading}
      className={className}
    >
      {Icon && <Icon className={cn("h-4 w-4", size !== 'icon' && "mr-2")} />}
      {size !== 'icon' && label}
    </Button>
  );
});

// ============================================
// OPTIMIZED BADGE LIST
// ============================================

interface OptimizedBadgeListProps {
  items: string[];
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  max?: number;
  className?: string;
}

export const OptimizedBadgeList = memo(function OptimizedBadgeList({
  items,
  variant = 'secondary',
  max = 3,
  className,
}: OptimizedBadgeListProps) {
  const visibleItems = useMemo(() => items.slice(0, max), [items, max]);
  const hiddenCount = useMemo(() => Math.max(0, items.length - max), [items.length, max]);

  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {visibleItems.map((item, index) => (
        <Badge key={index} variant={variant}>
          {item}
        </Badge>
      ))}
      {hiddenCount > 0 && (
        <Badge variant="outline">+{hiddenCount}</Badge>
      )}
    </div>
  );
});

// ============================================
// OPTIMIZED CARD SKELETON
// ============================================

export const OptimizedCardSkeleton = memo(function OptimizedCardSkeleton({
  className,
}: {
  className?: string;
}) {
  return (
    <Card className={cn("animate-pulse", className)}>
      <CardHeader className="space-y-2">
        <div className="h-4 w-1/3 bg-muted rounded" />
        <div className="h-3 w-1/2 bg-muted rounded" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="h-8 w-2/3 bg-muted rounded" />
        <div className="h-3 w-full bg-muted rounded" />
        <div className="h-3 w-4/5 bg-muted rounded" />
      </CardContent>
    </Card>
  );
});

// ============================================
// COMPARISON HELPER FOR MEMO
// ============================================

/**
 * Helper para criar comparadores customizados para React.memo
 * Útil quando props contêm objetos/arrays que mudam referência mas não valor
 */
export function createPropsComparator<P extends object>(
  keys: (keyof P)[]
): (prevProps: P, nextProps: P) => boolean {
  return (prevProps, nextProps) => {
    for (const key of keys) {
      const prevValue = prevProps[key];
      const nextValue = nextProps[key];

      // Comparação rasa para primitivos
      if (prevValue !== nextValue) {
        // Se ambos são objetos, faz comparação profunda simples
        if (
          typeof prevValue === 'object' &&
          typeof nextValue === 'object' &&
          prevValue !== null &&
          nextValue !== null
        ) {
          const prevKeys = Object.keys(prevValue);
          const nextKeys = Object.keys(nextValue);

          if (prevKeys.length !== nextKeys.length) return false;

          for (const k of prevKeys) {
            if ((prevValue as Record<string, unknown>)[k] !== (nextValue as Record<string, unknown>)[k]) {
              return false;
            }
          }
        } else {
          return false;
        }
      }
    }
    return true;
  };
}

// ============================================
// VIRTUALIZED LIST HELPER
// ============================================

interface VirtualizedItemProps<T> {
  item: T;
  index: number;
  renderItem: (item: T, index: number) => React.ReactNode;
}

export const VirtualizedItem = memo(function VirtualizedItem<T>({
  item,
  index,
  renderItem,
}: VirtualizedItemProps<T>) {
  return <>{renderItem(item, index)}</>;
}) as <T>(props: VirtualizedItemProps<T>) => React.ReactElement;
