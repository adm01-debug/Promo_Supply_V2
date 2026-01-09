import { forwardRef } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface WidgetCardProps extends Omit<HTMLMotionProps<"div">, 'title'> {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: string;
  badge?: {
    text: string;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  };
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  noPadding?: boolean;
  loading?: boolean;
  compact?: boolean;
}

export const WidgetCard = forwardRef<HTMLDivElement, WidgetCardProps>(({
  title,
  subtitle,
  icon: Icon,
  iconColor = 'text-primary',
  badge,
  headerAction,
  children,
  noPadding = false,
  loading = false,
  compact = false,
  className,
  ...props
}, ref) => {
  return (
    <motion.div
      ref={ref}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className="h-full"
      {...props}
    >
      <Card className={cn("h-full transition-shadow hover:shadow-lg", className)}>
        <CardHeader className={cn(compact ? "pb-2" : "pb-4")}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {Icon && (
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <Icon className={cn("w-4 h-4", iconColor)} />
                </div>
              )}
              <div>
                <CardTitle className={cn(compact ? "text-sm" : "text-base", "font-semibold")}>
                  {title}
                </CardTitle>
                {subtitle && (
                  <p className="text-xs text-muted-foreground">{subtitle}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {badge && (
                <Badge variant={badge.variant || 'secondary'}>
                  {badge.text}
                </Badge>
              )}
              {headerAction}
            </div>
          </div>
        </CardHeader>
        <CardContent className={cn(noPadding && "p-0", compact && "pt-0")}>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent" />
            </div>
          ) : (
            children
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
});

WidgetCard.displayName = 'WidgetCard';
